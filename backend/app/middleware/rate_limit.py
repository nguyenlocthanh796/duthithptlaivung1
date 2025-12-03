"""
Rate Limiting Middleware
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import time


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting.
    For production, consider using Redis-based rate limiting.
    """
    
    def __init__(self, app, requests_per_minute: int = 60, requests_per_hour: int = 1000):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.minute_requests: Dict[str, list] = defaultdict(list)
        self.hour_requests: Dict[str, list] = defaultdict(list)
        self.cleanup_interval = 300  # Clean up every 5 minutes
        self.last_cleanup = time.time()
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier (IP address or user ID)"""
        # Try to get user ID from token if available
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            # In production, decode token to get user ID
            # For now, use IP address
            pass
        
        # Use IP address as fallback
        client_ip = request.client.host if request.client else "unknown"
        return client_ip
    
    def _cleanup_old_requests(self):
        """Remove old request timestamps"""
        now = time.time()
        if now - self.last_cleanup < self.cleanup_interval:
            return
        
        cutoff_minute = now - 60
        cutoff_hour = now - 3600
        
        # Clean minute requests
        for client_id in list(self.minute_requests.keys()):
            self.minute_requests[client_id] = [
                ts for ts in self.minute_requests[client_id] if ts > cutoff_minute
            ]
            if not self.minute_requests[client_id]:
                del self.minute_requests[client_id]
        
        # Clean hour requests
        for client_id in list(self.hour_requests.keys()):
            self.hour_requests[client_id] = [
                ts for ts in self.hour_requests[client_id] if ts > cutoff_hour
            ]
            if not self.hour_requests[client_id]:
                del self.hour_requests[client_id]
        
        self.last_cleanup = now
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/", "/docs", "/openapi.json", "/redoc"]:
            return await call_next(request)
        
        client_id = self._get_client_id(request)
        now = time.time()
        
        # Cleanup old requests periodically
        self._cleanup_old_requests()
        
        # Check minute limit
        minute_requests = self.minute_requests[client_id]
        minute_requests = [ts for ts in minute_requests if ts > now - 60]
        
        if len(minute_requests) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {self.requests_per_minute} requests per minute"
            )
        
        # Check hour limit
        hour_requests = self.hour_requests[client_id]
        hour_requests = [ts for ts in hour_requests if ts > now - 3600]
        
        if len(hour_requests) >= self.requests_per_hour:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {self.requests_per_hour} requests per hour"
            )
        
        # Record request
        minute_requests.append(now)
        hour_requests.append(now)
        self.minute_requests[client_id] = minute_requests
        self.hour_requests[client_id] = hour_requests
        
        # Add rate limit headers
        response = await call_next(request)
        response.headers["X-RateLimit-Limit-Minute"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining-Minute"] = str(self.requests_per_minute - len(minute_requests))
        response.headers["X-RateLimit-Limit-Hour"] = str(self.requests_per_hour)
        response.headers["X-RateLimit-Remaining-Hour"] = str(self.requests_per_hour - len(hour_requests))
        
        return response

