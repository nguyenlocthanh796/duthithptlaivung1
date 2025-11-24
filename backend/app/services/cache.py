"""
Cache Service for Gemini API Responses
Reduces API calls and improves response time by caching similar prompts
"""
import hashlib
import json
import logging
from functools import lru_cache
from typing import Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# In-memory cache with TTL (Time To Live)
_cache: dict[str, dict] = {}
_cache_ttl = timedelta(hours=24)  # Cache for 24 hours
_max_cache_size = 100  # Maximum number of cached items


def _generate_cache_key(prompt: str, temperature: float, max_tokens: int) -> str:
    """Generate a unique cache key from prompt and parameters"""
    cache_data = {
        "prompt": prompt.strip().lower(),  # Normalize prompt
        "temperature": round(temperature, 2),  # Round to avoid float precision issues
        "max_tokens": max_tokens
    }
    cache_string = json.dumps(cache_data, sort_keys=True)
    return hashlib.md5(cache_string.encode()).hexdigest()


def _is_cache_valid(cache_entry: dict) -> bool:
    """Check if cache entry is still valid (not expired)"""
    if "timestamp" not in cache_entry:
        return False
    
    cache_time = datetime.fromisoformat(cache_entry["timestamp"])
    age = datetime.now() - cache_time
    return age < _cache_ttl


def _cleanup_cache():
    """Remove expired entries and oldest entries if cache is too large"""
    global _cache
    
    # Remove expired entries
    expired_keys = [
        key for key, entry in _cache.items()
        if not _is_cache_valid(entry)
    ]
    for key in expired_keys:
        del _cache[key]
    
    # If still too large, remove oldest entries
    if len(_cache) > _max_cache_size:
        # Sort by timestamp and remove oldest
        sorted_entries = sorted(
            _cache.items(),
            key=lambda x: x[1].get("timestamp", ""),
            reverse=True
        )
        # Keep only the newest _max_cache_size entries
        _cache = dict(sorted_entries[:_max_cache_size])
        logger.info(f"Cache cleanup: removed {len(sorted_entries) - _max_cache_size} old entries")


def get_cached_response(prompt: str, temperature: float, max_tokens: int) -> Optional[str]:
    """
    Get cached response if available and valid
    
    Args:
        prompt: The prompt text
        temperature: Temperature parameter
        max_tokens: Max tokens parameter
    
    Returns:
        Cached response if found and valid, None otherwise
    """
    cache_key = _generate_cache_key(prompt, temperature, max_tokens)
    
    if cache_key in _cache:
        entry = _cache[cache_key]
        if _is_cache_valid(entry):
            logger.debug(f"Cache HIT for key: {cache_key[:8]}...")
            return entry["response"]
        else:
            # Remove expired entry
            del _cache[cache_key]
            logger.debug(f"Cache EXPIRED for key: {cache_key[:8]}...")
    
    logger.debug(f"Cache MISS for key: {cache_key[:8]}...")
    return None


def set_cached_response(prompt: str, temperature: float, max_tokens: int, response: str):
    """
    Cache a response
    
    Args:
        prompt: The prompt text
        temperature: Temperature parameter
        max_tokens: Max tokens parameter
        response: The response to cache
    """
    cache_key = _generate_cache_key(prompt, temperature, max_tokens)
    
    # Cleanup before adding new entry
    _cleanup_cache()
    
    _cache[cache_key] = {
        "response": response,
        "timestamp": datetime.now().isoformat(),
        "prompt_preview": prompt[:100]  # Store preview for debugging
    }
    
    logger.debug(f"Cached response for key: {cache_key[:8]}... (Cache size: {len(_cache)})")


def clear_cache():
    """Clear all cached responses"""
    global _cache
    _cache.clear()
    logger.info("Cache cleared")


def get_cache_stats() -> dict:
    """Get cache statistics"""
    valid_entries = sum(1 for entry in _cache.values() if _is_cache_valid(entry))
    return {
        "total_entries": len(_cache),
        "valid_entries": valid_entries,
        "expired_entries": len(_cache) - valid_entries,
        "max_size": _max_cache_size,
        "ttl_hours": _cache_ttl.total_seconds() / 3600
    }

