"""
Standardized API Response Utilities
"""
from typing import Any, Optional, Dict
from pydantic import BaseModel


class APIResponse(BaseModel):
    """Standardized API response format"""
    success: bool = True
    data: Optional[Any] = None
    message: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class PaginatedResponse(BaseModel):
    """Paginated response format"""
    success: bool = True
    data: list
    pagination: Dict[str, Any]
    meta: Optional[Dict[str, Any]] = None


def success_response(
    data: Any = None,
    message: str = None,
    meta: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Create success response"""
    response = {"success": True}
    
    if data is not None:
        response["data"] = data
    
    if message:
        response["message"] = message
    
    if meta:
        response["meta"] = meta
    
    return response


def paginated_response(
    data: list,
    total: int,
    limit: int,
    offset: int,
    meta: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Create paginated response"""
    has_more = (offset + limit) < total
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    current_page = (offset // limit) + 1 if limit > 0 else 1
    
    return {
        "success": True,
        "data": data,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": has_more,
            "total_pages": total_pages,
            "current_page": current_page
        },
        "meta": meta or {}
    }

