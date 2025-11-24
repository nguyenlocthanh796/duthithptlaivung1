from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from google import genai
from google.genai import types

from ..config import get_settings

logger = logging.getLogger(__name__)
# Reduced workers for e2-micro (1GB RAM) - optimize memory usage
_executor = ThreadPoolExecutor(max_workers=2)


class GeminiClient:
    def __init__(self) -> None:
        self._api_keys: List[str] = []
        self._current_key_index = 0
        self._client = None
        self._current_api_key = None
        # Use gemini-2.5-flash-lite - latest stable model
        self.model = "gemini-2.5-flash-lite"
        self._load_api_keys()

    def _load_api_keys(self):
        """Load API keys from config, support multiple keys"""
        settings = get_settings()
        
        # Load multiple keys from GEMINI_API_KEYS (comma-separated)
        if settings.gemini_api_keys:
            keys = [key.strip() for key in settings.gemini_api_keys.split(",") if key.strip()]
            self._api_keys.extend(keys)
        
        # Also add single GEMINI_API_KEY if provided
        if settings.gemini_api_key:
            if settings.gemini_api_key not in self._api_keys:
                self._api_keys.append(settings.gemini_api_key)
        
        if not self._api_keys:
            logger.warning("No Gemini API keys found")
        else:
            logger.info(f"Loaded {len(self._api_keys)} Gemini API key(s)")

    def _get_next_api_key(self) -> Optional[str]:
        """Get next API key with rotation"""
        if not self._api_keys:
            return None
        
        key = self._api_keys[self._current_key_index]
        self._current_key_index = (self._current_key_index + 1) % len(self._api_keys)
        return key

    @property
    def api_key(self) -> str:
        if self._current_api_key is None:
            self._current_api_key = self._get_next_api_key()
            if not self._current_api_key:
                raise ValueError("GEMINI_API_KEY or GEMINI_API_KEYS not set")
        return self._current_api_key

    def _reset_client(self):
        """Reset client to use new API key"""
        self._client = None
        self._current_api_key = None

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def _generate_sync(self, prompt: str, temperature: float = 0.4, max_tokens: int = 512) -> str:
        """Generate with automatic API key rotation on failure - optimized for multi-key usage"""
        last_error = None
        total_keys = len(self._api_keys) if self._api_keys else 0
        
        if total_keys == 0:
            raise ValueError("No Gemini API keys configured")
        
        # Try all API keys with round-robin
        for attempt in range(total_keys):
            try:
                # Get API key for this attempt (round-robin)
                api_key = self._api_keys[(self._current_key_index + attempt) % total_keys]
                
                # Create client with this key (don't cache to save memory)
                client = genai.Client(api_key=api_key)
                
                contents = [
                    types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=prompt)],
                    ),
                ]
                
                # Use gemini-2.5-flash-lite directly (latest stable model)
                logger.debug(f"Attempting with gemini-2.5-flash-lite (API key #{attempt + 1}/{total_keys})")
                config = types.GenerateContentConfig()
                response = client.models.generate_content_stream(
                    model="gemini-2.5-flash-lite",  # Latest stable model
                    contents=contents,
                    config=config,
                )
                
                # Stream response to save memory
                full_text = ""
                for chunk in response:
                    if chunk.text:
                        full_text += chunk.text
                
                logger.info(f"Successfully generated {len(full_text)} chars with API key #{attempt + 1}")
                # Update current key index for next request (round-robin)
                self._current_key_index = (self._current_key_index + attempt + 1) % total_keys
                self._current_api_key = api_key
                self._client = client
                return full_text.strip()
                
            except Exception as e:
                last_error = e
                error_msg = str(e).lower()
                # Check if it's a quota/rate limit error
                if any(keyword in error_msg for keyword in ['quota', 'rate limit', '429', 'resource exhausted', 'permission denied']):
                    logger.warning(f"API key #{attempt + 1} quota/limit exceeded, trying next key")
                    continue
                # For other errors, log and try next key
                logger.warning(f"API key #{attempt + 1} failed: {e}, trying next key")
                continue
        
        # All keys failed
        logger.error(f"All {total_keys} API keys failed. Last error: {last_error}")
        raise last_error or Exception("All Gemini API keys failed")

    async def generate(self, prompt: str, temperature: float = 0.4, max_tokens: int = 512) -> str:
        """Async wrapper for generation with memory optimization"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_executor, self._generate_sync, prompt, temperature, max_tokens)


gemini_client = None


def get_gemini_client() -> GeminiClient | None:
    global gemini_client
    if gemini_client is None:
        try:
            gemini_client = GeminiClient()
        except (ValueError, Exception) as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            return None
    return gemini_client
