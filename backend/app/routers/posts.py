"""
Post-related API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from app.sql_database import db
from app.auth import get_current_user

router = APIRouter(prefix="/api/posts", tags=["posts"])


class PostCreate(BaseModel):
    content: str
    authorId: Optional[str] = None
    author_id: Optional[str] = None
    authorName: Optional[str] = None
    author_name: Optional[str] = None
    authorEmail: Optional[str] = None
    author_email: Optional[str] = None
    authorRole: Optional[str] = None
    author_role: str = "student"
    subject: Optional[str] = None
    post_type: str = "text"
    image_url: Optional[str] = None
    hasQuestion: Optional[bool] = False
    has_question: Optional[bool] = False


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


class ReactionRequest(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    reaction: Optional[str] = "like"


ALLOWED_REACTIONS = ["like", "love", "care", "haha", "wow", "sad", "angry"]


@router.get("/", response_model=List[Dict[str, Any]])
async def get_posts(
    subject: Optional[str] = None,
    author_id: Optional[str] = None,
    limit: int = 50
):
    """Get list of posts with optional filters"""
    try:
        filters = []
        if subject and subject != 'all':
            filters.append(('subject', '==', subject))
        if author_id:
            filters.append(('author_id', '==', author_id))
        
        posts = db.query('posts', filters=filters, order_by='createdAt', limit=limit)
        return posts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{post_id}", response_model=Dict[str, Any])
async def get_post(post_id: str):
    """Get post by ID"""
    try:
        post = db.read('posts', post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return post
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Dict[str, Any])
async def create_post(
    post: PostCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new post"""
    try:
        # Handle both camelCase and snake_case
        # Prefer data from authenticated user if not explicitly provided
        author_id = post.author_id or post.authorId or current_user.get("uid")
        author_name = (
            post.author_name
            or post.authorName
            or current_user.get("name")
            or current_user.get("email")
        )
        author_email = post.author_email or post.authorEmail or current_user.get("email")
        author_role = post.author_role or post.authorRole or "student"
        has_question = post.has_question or post.hasQuestion or False
        
        post_data = {
            "content": post.content,
            "author_id": author_id,
            "author_name": author_name,
            "author_email": author_email,
            "author_role": author_role,
            "subject": post.subject,
            "post_type": post.post_type,
            "image_url": post.image_url,
            "likes": 0,
            "comments": 0,
            "shares": 0,
            "hasQuestion": has_question,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }
        post_id = db.create('posts', post_data)
        return {"id": post_id, **post_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{post_id}/like")
async def like_post(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Like a post"""
    try:
        post = db.read('posts', post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        current_likes = post.get('likes', 0)
        db.update('posts', post_id, {
            'likes': current_likes + 1,
            'updatedAt': datetime.now().isoformat()
        })
        return {"message": "Post liked successfully", "likes": current_likes + 1}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{post_id}/reaction")
async def react_to_post(
    post_id: str,
    payload: ReactionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """React to a post with Facebook-style reactions"""
    # Default user_id from authenticated user if not provided
    if not payload.user_id:
        if not current_user.get("uid"):
            raise HTTPException(status_code=400, detail="user_id is required")
        payload.user_id = current_user["uid"]

    reaction_type = payload.reaction or "like"
    if reaction_type not in ALLOWED_REACTIONS:
        raise HTTPException(status_code=400, detail="Invalid reaction type")

    try:
        post = db.read("posts", post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        data = dict(post)
        data_id = data.pop("id", None)

        reaction_counts = data.get("reactionCounts") or {}
        user_reactions = data.get("userReactions") or {}

        # Ensure all reaction keys exist
        for key in ALLOWED_REACTIONS:
            reaction_counts.setdefault(key, 0)

        previous_reaction = user_reactions.get(payload.user_id)
        likes = data.get("likes", 0)

        # Remove reaction if selecting the same one
        removed = False
        if previous_reaction == reaction_type:
            reaction_counts[reaction_type] = max(
                0, reaction_counts.get(reaction_type, 0) - 1
            )
            user_reactions.pop(payload.user_id, None)
            if reaction_type == "like":
                likes = max(0, likes - 1)
            removed = True
            new_reaction = None
        else:
            # Adjust counts if switching from another reaction
            if previous_reaction:
                reaction_counts[previous_reaction] = max(
                    0, reaction_counts.get(previous_reaction, 0) - 1
                )
                if previous_reaction == "like":
                    likes = max(0, likes - 1)

            reaction_counts[reaction_type] = reaction_counts.get(reaction_type, 0) + 1
            user_reactions[payload.user_id] = reaction_type
            if reaction_type == "like":
                likes += 1
            new_reaction = reaction_type

        updates = {
            "reactionCounts": reaction_counts,
            "userReactions": user_reactions,
            "likes": likes,
            "updatedAt": datetime.now().isoformat(),
        }

        db.update("posts", post_id, updates)

        result = {
            "user_id": payload.user_id,
            "previous_reaction": previous_reaction,
            "new_reaction": new_reaction,
            "removed": removed,
            "reaction_counts": reaction_counts,
        }
        return {
            "message": "Reaction updated successfully",
            **result,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

