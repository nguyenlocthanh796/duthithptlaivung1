"""
Enhanced Posts Router with optimized queries for large-scale data
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

try:
    from app.sql_database_enhanced import db
except ImportError:
    from app.sql_database import db
from app.auth import get_current_user

router = APIRouter(prefix="/api/posts", tags=["posts"])


class PostResponse(BaseModel):
    id: str
    content: str
    author_id: str
    author_name: str
    author_role: str
    subject: Optional[str]
    post_type: str
    likes: int = 0
    comments: int = 0
    shares: int = 0
    created_at: str
    updated_at: str


class PostsListResponse(BaseModel):
    posts: List[Dict[str, Any]]
    total: int
    limit: int
    offset: int
    has_more: bool


@router.get("/", response_model=PostsListResponse)
async def get_posts_enhanced(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    author_id: Optional[str] = Query(None, description="Filter by author"),
    status: Optional[str] = Query("approved", description="Filter by status"),
    limit: int = Query(20, ge=1, le=100, description="Number of posts per page"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    search: Optional[str] = Query(None, description="Search term for full-text search"),
):
    """
    Get posts with enhanced pagination and search.
    Optimized for large datasets.
    """
    try:
        filters = []
        
        if subject and subject != 'all':
            filters.append(('subject', '==', subject))
        if author_id:
            filters.append(('author_id', '==', author_id))
        if status:
            filters.append(('status', '==', status))
        else:
            # Exclude rejected by default
            filters.append(('status', '!=', 'rejected'))

        # Use search if provided
        if search:
            posts = db.search('posts', search, fields=['content', 'author_name'], limit=limit)
            total = len(posts)  # Approximate for search
        else:
            # Optimized query with proper pagination
            posts = db.query(
                'posts',
                filters=filters,
                order_by='createdAt',
                limit=limit,
                offset=offset,
                use_cache=True,  # Cache small queries
            )
            # Get total count (cached separately)
            total = db.count('posts', filters=filters)

        # Normalize data
        normalized = []
        for p in posts:
            data = dict(p)
            created = data.get("createdAt") or data.get("created_at")
            updated = data.get("updatedAt") or data.get("updated_at")
            if created:
                data["created_at"] = created
            if updated:
                data["updated_at"] = updated

            data.setdefault("status", "pending")
            data.setdefault("isEducational", None)
            data.setdefault("aiTags", [])
            data.setdefault("aiComment", None)
            data.setdefault("reactionCounts", {})
            data.setdefault("userReactions", {})

            normalized.append(data)

        has_more = (offset + limit) < total

        return PostsListResponse(
            posts=normalized,
            total=total,
            limit=limit,
            offset=offset,
            has_more=has_more,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_posts_stats():
    """Get statistics about posts collection"""
    try:
        stats = db.get_stats('posts')
        
        # Additional stats
        total_posts = stats['total_documents']
        approved = db.count('posts', [('status', '==', 'approved')])
        pending = db.count('posts', [('status', '==', 'pending')])
        rejected = db.count('posts', [('status', '==', 'rejected')])
        
        return {
            **stats,
            "by_status": {
                "approved": approved,
                "pending": pending,
                "rejected": rejected,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

