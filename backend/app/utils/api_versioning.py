"""
API Versioning Utilities
"""
from fastapi import APIRouter, Request
from typing import Callable, Dict
import re


def create_versioned_router(version: str) -> APIRouter:
    """Create a versioned router"""
    return APIRouter(prefix=f"/api/v{version}", tags=[f"v{version}"])


def get_api_version(request: Request) -> str:
    """Extract API version from request path"""
    path = request.url.path
    
    # Match /api/v1/, /api/v2/, etc.
    match = re.match(r"/api/v(\d+)/", path)
    if match:
        return match.group(1)
    
    # Default to v1
    return "1"


class VersionedRouter:
    """Helper for managing multiple API versions"""
    
    def __init__(self):
        self.routers: Dict[str, APIRouter] = {}
    
    def register(self, version: str, router: APIRouter):
        """Register a versioned router"""
        self.routers[version] = router
    
    def get_latest_version(self) -> str:
        """Get latest API version"""
        if not self.routers:
            return "1"
        return max(self.routers.keys(), key=lambda v: int(v))
    
    def get_router(self, version: str = None) -> APIRouter:
        """Get router for specific version or latest"""
        version = version or self.get_latest_version()
        return self.routers.get(version, self.routers.get("1"))

