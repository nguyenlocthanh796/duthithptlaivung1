"""
Logging Middleware for API requests
"""
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("api")


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log all API requests with timing and status"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            f"Response: {request.method} {request.url.path} "
            f"Status: {response.status_code} "
            f"Duration: {duration:.3f}s"
        )
        
        # Add timing header
        response.headers["X-Response-Time"] = f"{duration:.3f}"
        
        return response

