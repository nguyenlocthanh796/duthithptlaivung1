"""
Post-related API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from app.sql_database import db
from app.auth import get_current_user
from app.routers.ai_analysis import run_post_analysis

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


class PostUpdate(BaseModel):
    content: Optional[str] = None
    subject: Optional[str] = None
    post_type: Optional[str] = None
    image_url: Optional[str] = None


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
    # Cho phép thiếu user_id trong body, sẽ tự lấy từ current_user nếu không gửi lên
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    reaction: Optional[str] = "like"


class CommentCreate(BaseModel):
    content: str


class CommentUpdate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: str
    post_id: str
    author_id: str
    author_name: str
    author_role: str
    content: str
    is_ai_generated: bool = False
    created_at: str
    updated_at: str


# Bộ reaction theo ngữ cảnh học tập
# idea: 💡 hiểu bài / sáng tạo
# thinking: 🤔 đang suy ngẫm / thắc mắc
# resource: 📚 tài liệu hay
# motivation: 🔥 cố lên / động viên
ALLOWED_REACTIONS = ["idea", "thinking", "resource", "motivation"]


@router.get("/", response_model=List[Dict[str, Any]])
async def get_posts(
    subject: Optional[str] = None,
    author_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """Get list of posts with optional filters"""
    try:
        filters = []
        if subject and subject != 'all':
            filters.append(('subject', '==', subject))
        if author_id:
            filters.append(('author_id', '==', author_id))

        # Không trả các bài đã bị từ chối bởi AI (status = rejected)
        filters.append(('status', '!=', 'rejected'))

        posts = db.query('posts', filters=filters, order_by='createdAt', limit=limit + offset)
        # Áp dụng offset ở phía server để sau này hỗ trợ phân trang/infinite scroll
        sliced = posts[offset:offset + limit] if offset > 0 else posts[:limit]

        # Chuẩn hóa một số field cho frontend (snake_case timestamps, AI fields)
        normalized = []
        for p in sliced:
          data = dict(p)
          # Đồng bộ created_at / updated_at
          created = data.get("createdAt") or data.get("created_at")
          updated = data.get("updatedAt") or data.get("updated_at")
          if created:
              data["created_at"] = created
          if updated:
              data["updated_at"] = updated

          # Đảm bảo luôn có các field AI mới để frontend không phải check null quá nhiều
          data.setdefault("status", "pending")
          data.setdefault("isEducational", None)
          data.setdefault("aiTags", [])
          data.setdefault("aiComment", None)

          normalized.append(data)

        return normalized
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


@router.get("/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    post_id: str,
    limit: int = 50,
    offset: int = 0,
):
    """Lấy danh sách comment cho một post (mặc định mới nhất trước)."""
    try:
        # Kiểm tra post tồn tại
        post = db.read("posts", post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        filters = [("post_id", "==", post_id)]
        comments = db.query("comments", filters=filters, order_by="createdAt", limit=limit + offset)
        sliced = comments[offset:offset + limit] if offset > 0 else comments[:limit]

        normalized: List[CommentResponse] = []
        for c in sliced:
            data = dict(c)
            cid = data.pop("id")
            created = data.get("createdAt") or data.get("created_at")
            updated = data.get("updatedAt") or data.get("updated_at")
            normalized.append(
                CommentResponse(
                    id=cid,
                    post_id=data.get("post_id"),
                    author_id=data.get("author_id"),
                    author_name=data.get("author_name"),
                    author_role=data.get("author_role", "student"),
                    content=data.get("content", ""),
                    is_ai_generated=bool(data.get("is_ai_generated", False)),
                    created_at=created or "",
                    updated_at=updated or created or "",
                )
            )

        # Trả comment mới nhất trước
        normalized.sort(key=lambda x: x.created_at, reverse=True)
        return normalized
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _process_post_ai_moderation(post_id: str, post_data: Dict[str, Any]):
    """Background task: gọi Gemini để phân tích bài và cập nhật metadata AI."""
    try:
        content = post_data.get("content")
        image_url = post_data.get("image_url")
        image_urls = [image_url] if image_url else []

        result = run_post_analysis(content, image_urls)

        # Chuẩn hóa một số field
        is_educational = bool(result.get("is_educational", True))
        moderation_status = result.get("moderation_status") or ("clean" if is_educational else "rejected")

        metadata = result.get("metadata") or {}
        subject = metadata.get("subject")
        grade = metadata.get("grade")
        topic = metadata.get("topic")
        tags = metadata.get("tags") or []

        # Chuẩn hóa subject đơn giản: bỏ dấu / viết thường (backend hiện tại lưu text thô)
        if isinstance(subject, str):
            subject_normalized = subject.strip()
        else:
            subject_normalized = None

        updates: Dict[str, Any] = {
            "isEducational": is_educational,
            "status": moderation_status,
            "subject": subject_normalized or post_data.get("subject"),
            "grade": grade,
            "topic": topic,
            "aiTags": tags,
            "aiModeration": result,
            "updatedAt": datetime.now().isoformat(),
        }

        # Nếu có comment của Anh Thơ thì lưu kèm vào post (sau này UI hiển thị như comment đầu tiên)
        anh_tho_comment = result.get("anh_tho_comment")
        if anh_tho_comment:
            updates["aiComment"] = anh_tho_comment

        db.update("posts", post_id, updates)
    except Exception as e:
        # Không làm hỏng request chính; chỉ log
        print(f"[AI_MODERATION_ERROR] post_id={post_id}: {e}")


@router.post("/", response_model=Dict[str, Any])
async def create_post(
    post: PostCreate,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new post (AI phân tích chạy bất đồng bộ ở background)."""
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

        now_iso = datetime.now().isoformat()
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
            # Fields phục vụ AI moderation
            "status": "pending",
            "isEducational": None,
            "aiTags": [],
            "aiModeration": None,
            "aiComment": None,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
        post_id = db.create("posts", post_data)

        # Trigger AI moderation ở background, không chặn request
        background_tasks.add_task(_process_post_ai_moderation, post_id, post_data)

        return {"id": post_id, **post_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{post_id}", response_model=Dict[str, Any])
async def update_post(
    post_id: str,
    payload: PostUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cập nhật nội dung bài viết (chỉ tác giả hoặc admin/teacher)."""
    try:
        post = db.read("posts", post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        uid = current_user.get("uid")
        role = current_user.get("role") or "student"
        if not uid:
            raise HTTPException(status_code=401, detail="Unauthenticated")

        if post.get("author_id") != uid and role not in ("teacher", "admin"):
            raise HTTPException(status_code=403, detail="Not allowed to edit this post")

        updates: Dict[str, Any] = {}
        if payload.content is not None:
            text = payload.content.strip()
            if not text:
                raise HTTPException(status_code=400, detail="Content cannot be empty")
            updates["content"] = text
        if payload.subject is not None:
            updates["subject"] = payload.subject
        if payload.post_type is not None:
            updates["post_type"] = payload.post_type
        if payload.image_url is not None:
            updates["image_url"] = payload.image_url

        if not updates:
            return post

        updates["updatedAt"] = datetime.now().isoformat()
        db.update("posts", post_id, updates)

        updated = db.read("posts", post_id)
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to load updated post")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Xoá bài viết (chỉ tác giả hoặc admin/teacher)."""
    try:
        post = db.read("posts", post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        uid = current_user.get("uid")
        role = current_user.get("role") or "student"
        if not uid:
            raise HTTPException(status_code=401, detail="Unauthenticated")

        if post.get("author_id") != uid and role not in ("teacher", "admin"):
            raise HTTPException(status_code=403, detail="Not allowed to delete this post")

        deleted = db.delete("posts", post_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete post")

        return {"message": "Post deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{post_id}/comments", response_model=CommentResponse)
async def create_comment(
    post_id: str,
    payload: CommentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Tạo comment mới cho một bài viết."""
    try:
        post = db.read("posts", post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        uid = current_user.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Unauthenticated")

        author_name = current_user.get("name") or current_user.get("email") or "Người dùng"
        author_role = current_user.get("role") or "student"

        now_iso = datetime.now().isoformat()
        comment_data: Dict[str, Any] = {
            "post_id": post_id,
            "author_id": uid,
            "author_name": author_name,
            "author_role": author_role,
            "content": payload.content.strip(),
            "is_ai_generated": False,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
        comment_id = db.create("comments", comment_data)

        # Cập nhật số comment trên post (đơn giản: +1)
        current_comments = post.get("comments", 0) or 0
        db.update(
            "posts",
            post_id,
            {"comments": current_comments + 1, "updatedAt": datetime.now().isoformat()},
        )

        return CommentResponse(
            id=comment_id,
            post_id=post_id,
            author_id=uid,
            author_name=author_name,
            author_role=author_role,
            content=comment_data["content"],
            is_ai_generated=False,
            created_at=now_iso,
            updated_at=now_iso,
        )
    except HTTPException:
        raise
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
    """React to a post với bộ reaction học tập (idea, thinking, resource, motivation)."""
    # Default user_id from authenticated user if not provided
    if not payload.user_id:
        if not current_user.get("uid"):
            raise HTTPException(status_code=400, detail="user_id is required")
        payload.user_id = current_user["uid"]

    reaction_type = payload.reaction or "idea"
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
        # likes giờ là tổng số reaction (để dùng nhanh cho UI)
        likes = data.get("likes", 0)

        # Remove reaction if selecting the same one
        removed = False
        if previous_reaction == reaction_type:
            reaction_counts[reaction_type] = max(
                0, reaction_counts.get(reaction_type, 0) - 1
            )
            user_reactions.pop(payload.user_id, None)
            likes = max(0, likes - 1)
            removed = True
            new_reaction = None
        else:
            # Adjust counts if switching from another reaction
            if previous_reaction:
                reaction_counts[previous_reaction] = max(
                    0, reaction_counts.get(previous_reaction, 0) - 1
                )
                likes = max(0, likes - 1)

            reaction_counts[reaction_type] = reaction_counts.get(reaction_type, 0) + 1
            user_reactions[payload.user_id] = reaction_type
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


@router.put("/{post_id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    post_id: str,
    comment_id: str,
    payload: CommentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Sửa nội dung comment (chỉ tác giả)."""
    try:
        comment = db.read("comments", comment_id)
        if not comment or comment.get("post_id") != post_id:
            raise HTTPException(status_code=404, detail="Comment not found")

        uid = current_user.get("uid")
        if not uid or comment.get("author_id") != uid:
            raise HTTPException(status_code=403, detail="Not allowed to edit this comment")

        new_content = payload.content.strip()
        if not new_content:
            raise HTTPException(status_code=400, detail="Content cannot be empty")

        now_iso = datetime.now().isoformat()
        db.update(
            "comments",
            comment_id,
            {"content": new_content, "updatedAt": now_iso},
        )

        # Đọc lại comment sau update
        updated = db.read("comments", comment_id) or {}
        created = updated.get("createdAt") or updated.get("created_at") or now_iso
        return CommentResponse(
            id=comment_id,
            post_id=post_id,
            author_id=updated.get("author_id", uid),
            author_name=updated.get("author_name", current_user.get("name") or current_user.get("email") or ""),
            author_role=updated.get("author_role", current_user.get("role") or "student"),
            content=new_content,
            is_ai_generated=bool(updated.get("is_ai_generated", False)),
            created_at=created,
            updated_at=now_iso,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{post_id}/comments/{comment_id}")
async def delete_comment(
    post_id: str,
    comment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Xoá comment (tác giả hoặc admin/teacher)."""
    try:
        comment = db.read("comments", comment_id)
        if not comment or comment.get("post_id") != post_id:
            raise HTTPException(status_code=404, detail="Comment not found")

        uid = current_user.get("uid")
        role = current_user.get("role") or "student"
        if not uid:
            raise HTTPException(status_code=401, detail="Unauthenticated")

        if comment.get("author_id") != uid and role not in ("teacher", "admin"):
            raise HTTPException(status_code=403, detail="Not allowed to delete this comment")

        # Xoá comment
        deleted = db.delete("comments", comment_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete comment")

        # Giảm số comment trên post (không cho xuống <0)
        post = db.read("posts", post_id)
        if post:
            current_comments = post.get("comments", 0) or 0
            db.update(
                "posts",
                post_id,
                {
                    "comments": max(0, current_comments - 1),
                    "updatedAt": datetime.now().isoformat(),
                },
            )

        return {"message": "Comment deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

