from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from google import genai
from google.genai import types

from ..config import get_settings
from .cache import get_cached_response, set_cached_response

logger = logging.getLogger(__name__)
# Reduced workers for e2-micro (1GB RAM) - optimize memory usage
_executor = ThreadPoolExecutor(max_workers=2)


class GeminiClient:
    def __init__(self) -> None:
        self._api_keys: List[str] = []
        self._current_key_index = 0
        self._client = None
        self._current_api_key = None
        # Default model - use gemini-2.5-flash-lite (latest stable model)
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

    def _generate_sync(self, prompt: str, temperature: float = 0.4, max_tokens: int = 512, model: Optional[str] = None, image_url: Optional[str] = None) -> str:
        """Generate with automatic API key rotation on failure - optimized for multi-key usage"""
        last_error = None
        total_keys = len(self._api_keys) if self._api_keys else 0
        
        if total_keys == 0:
            raise ValueError("No Gemini API keys configured")
        
        # Use provided model or default
        model_name = model or self.model
        
        # Try all API keys with round-robin
        for attempt in range(total_keys):
            try:
                # Get API key for this attempt (round-robin)
                api_key = self._api_keys[(self._current_key_index + attempt) % total_keys]
                
                # Create client with this key (don't cache to save memory)
                client = genai.Client(api_key=api_key)
                
                # Build parts list - include image if provided
                # Nếu có hình ảnh, đặt hình ảnh TRƯỚC text để Gemini ưu tiên phân tích hình ảnh
                parts = []
                if image_url:
                    try:
                        # Try to use from_uri for public URLs (Firebase Storage, etc.)
                        # Note: Gemini API may require specific URL format or authentication
                        # If from_uri fails, we'll include URL in text prompt as fallback
                        try:
                            # Đặt hình ảnh TRƯỚC text để Gemini ưu tiên đọc hình ảnh
                            # Detect MIME type from URL or default to image/jpeg
                            mime_type = "image/jpeg"
                            if image_url.lower().endswith('.png'):
                                mime_type = "image/png"
                            elif image_url.lower().endswith('.webp'):
                                mime_type = "image/webp"
                            elif image_url.lower().endswith('.gif'):
                                mime_type = "image/gif"
                            
                            parts.append(types.Part.from_uri(uri=image_url, mime_type=mime_type))
                            parts.append(types.Part.from_text(text=prompt))
                            logger.info(f"Including image in prompt via from_uri (priority): {image_url}, mime_type: {mime_type}")
                        except (AttributeError, TypeError, ValueError) as uri_error:
                            # from_uri might not be available or URL format incorrect
                            # Fallback: include image URL in text prompt
                            logger.warning(f"from_uri failed for {image_url}: {uri_error}, adding URL to text prompt")
                            parts.append(types.Part.from_text(text=f"{prompt}\n\n[Hình ảnh đính kèm: {image_url}]"))
                    except Exception as img_error:
                        logger.warning(f"Failed to include image {image_url}: {img_error}, continuing with text only")
                        parts.append(types.Part.from_text(text=prompt))
                else:
                    # Không có hình ảnh, chỉ dùng text
                    parts.append(types.Part.from_text(text=prompt))
                
                contents = [
                    types.Content(
                        role="user",
                        parts=parts,
                    ),
                ]
                
                logger.debug(f"Attempting with {model_name} (API key #{attempt + 1}/{total_keys})")
                config = types.GenerateContentConfig()
                
                # Validate model name - fallback to default if invalid
                valid_models = ["gemini-2.5-flash-preview-image", "gemini-2.5-flash-lite", "gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
                if model_name and model_name not in valid_models:
                    logger.warning(f"Model {model_name} may not be valid, using default: {self.model}")
                    model_name = self.model
                
                # If using gemini-2.5-flash-preview-image, prepare fallback
                fallback_model = "gemini-2.5-flash-lite" if model_name == "gemini-2.5-flash-preview-image" else None
                
                try:
                    response = client.models.generate_content_stream(
                        model=model_name,
                        contents=contents,
                        config=config,
                    )
                    
                    # Stream response to save memory
                    full_text = ""
                    for chunk in response:
                        if chunk.text:
                            full_text += chunk.text
                    
                    logger.info(f"Successfully generated {len(full_text)} chars with {model_name} (API key #{attempt + 1})")
                    # Update current key index for next request (round-robin)
                    self._current_key_index = (self._current_key_index + attempt + 1) % total_keys
                    self._current_api_key = api_key
                    self._client = client
                    return full_text.strip()
                except Exception as model_error:
                    error_msg = str(model_error).lower()
                    # If model not found/invalid and we have fallback, try fallback
                    if fallback_model and ("model" in error_msg or "not found" in error_msg or "invalid" in error_msg or "404" in error_msg):
                        logger.warning(f"Model {model_name} failed, trying fallback {fallback_model}: {model_error}")
                        try:
                            response = client.models.generate_content_stream(
                                model=fallback_model,
                                contents=contents,
                                config=config,
                            )
                            full_text = ""
                            for chunk in response:
                                if chunk.text:
                                    full_text += chunk.text
                            logger.info(f"Successfully generated {len(full_text)} chars with fallback {fallback_model} (API key #{attempt + 1})")
                            self._current_key_index = (self._current_key_index + attempt + 1) % total_keys
                            self._current_api_key = api_key
                            self._client = client
                            return full_text.strip()
                        except Exception as fallback_error:
                            # Fallback also failed, raise original error
                            raise model_error from fallback_error
                    else:
                        # Not a model error or no fallback, re-raise
                        raise
                
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

    def _generate_image_sync(self, prompt: str, temperature: float = 0.4, max_tokens: int = 1024) -> str:
        """Generate image illustration using gemini-2.5-flash-preview-image (with fallback to gemini-2.5-flash-lite)"""
        # Use enhanced prompt for mathematical illustrations
        enhanced_prompt = f"""Tạo một mô tả chi tiết về minh họa toán học dựa trên nội dung sau. 
Hãy mô tả một hình ảnh minh họa rõ ràng, dễ hiểu cho học sinh THPT, bao gồm biểu đồ, hình vẽ, sơ đồ.

Nội dung cần minh họa:
{prompt}

Yêu cầu mô tả:
- Mô tả minh họa phải chính xác về mặt toán học, vật lý, hóa học
- Mô tả biểu đồ, hình vẽ, sơ đồ chi tiết
- Mô tả màu sắc rõ ràng, dễ phân biệt
- Mô tả nhãn và chú thích rõ ràng
- Phù hợp với trình độ THPT
- Mô tả bằng văn bản chi tiết để có thể vẽ lại hoặc tạo hình ảnh"""
        
        # Try gemini-2.5-flash-preview-image first (better for diagrams/illustrations)
        # Will automatically fallback to gemini-2.5-flash-lite if preview-image fails
        return self._generate_sync(enhanced_prompt, temperature, max_tokens, model="gemini-2.5-flash-preview-image")

    async def generate(self, prompt: str, temperature: float = 0.4, max_tokens: int = 512, model: Optional[str] = None, image_url: Optional[str] = None) -> str:
        """
        Async wrapper for generation with caching and memory optimization
        
        Checks cache first, then generates if cache miss
        """
        # Check cache first (include model and image_url in cache key)
        cache_key = f"{prompt}|{temperature}|{max_tokens}|{model or self.model}|{image_url or ''}"
        cached_response = get_cached_response(cache_key, temperature, max_tokens)
        if cached_response:
            logger.info("Returning cached response")
            return cached_response
        
        # Cache miss - generate new response
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(_executor, self._generate_sync, prompt, temperature, max_tokens, model, image_url)
        
        # Cache the response
        set_cached_response(cache_key, temperature, max_tokens, response)
        
        return response

    async def generate_image_illustration(self, prompt: str, temperature: float = 0.4, max_tokens: int = 1024) -> str:
        """
        Generate image illustration description using gemini-2.5-flash-lite
        For mathematical content visualization (returns text description)
        Falls back to default model if gemini-2.5-flash-lite fails
        """
        # Don't cache image generation (too dynamic)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(_executor, self._generate_image_sync, prompt, temperature, max_tokens)
        return response


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
