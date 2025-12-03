"""
Admin API endpoints - Quản lý toàn bộ hệ thống
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.sql_database import db
from app.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Dependency để kiểm tra admin role."""
    role = current_user.get("role") or "student"
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
async def get_admin_stats(
    current_user: Dict[str, Any] = Depends(require_admin),
):
    """Lấy thống kê tổng quan cho admin."""
    try:
        # Count users
        users = db.get_all("users")
        users_by_role = {}
        for user in users:
            role = user.get("role", "student")
            users_by_role[role] = users_by_role.get(role, 0) + 1
        
        # Count posts
        posts = db.get_all("posts")
        posts_by_subject = {}
        posts_by_status = {}
        for post in posts:
            subject = post.get("subject", "unknown")
            posts_by_subject[subject] = posts_by_subject.get(subject, 0) + 1
            
            status = post.get("status", "approved")
            posts_by_status[status] = posts_by_status.get(status, 0) + 1
        
        # Count comments
        comments = db.get_all("comments")
        
        return {
            "users": {
                "total": len(users),
                "by_role": users_by_role,
            },
            "posts": {
                "total": len(posts),
                "by_subject": posts_by_subject,
                "by_status": posts_by_status,
            },
            "comments": {
                "total": len(comments),
            },
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts/all")
async def get_all_posts(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    subject: Optional[str] = None,
    status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_admin),
):
    """Lấy tất cả posts với filters (admin only)."""
    try:
        filters = []
        if subject:
            filters.append(("subject", "==", subject))
        if status:
            filters.append(("status", "==", status))
        
        posts = db.query("posts", filters=filters, limit=limit, offset=offset)
        
        if search:
            search_lower = search.lower()
            filtered = []
            for post in posts:
                content = (post.get("content") or "").lower()
                author_name = (post.get("author_name") or "").lower()
                if search_lower in content or search_lower in author_name:
                    filtered.append(post)
            return filtered[:limit]
        
        return posts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/posts/{post_id}")
async def admin_delete_post(
    post_id: str,
    current_user: Dict[str, Any] = Depends(require_admin),
):
    """Xóa post bất kỳ (admin only)."""
    try:
        post = db.read("posts", post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        deleted = db.delete("posts", post_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete post")
        
        return {"message": "Post deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/posts/{post_id}/status")
async def update_post_status(
    post_id: str,
    payload: Dict[str, str] = Body(...),
    current_user: Dict[str, Any] = Depends(require_admin),
):
    """Cập nhật status của post (admin only)."""
    try:
        status = payload.get("status")
        if status not in ["pending", "approved", "rejected"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        post = db.read("posts", post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        db.update("posts", post_id, {
            "status": status,
            "updatedAt": datetime.now().isoformat()
        })
        
        updated = db.read("posts", post_id)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

