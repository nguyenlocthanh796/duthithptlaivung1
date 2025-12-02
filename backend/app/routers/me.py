"""
Endpoints tổng quan cho người dùng hiện tại (học sinh).
"""
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException

from app.sql_database import db
from app.auth import get_current_user


router = APIRouter(prefix="/api/me", tags=["me"])


@router.get("/overview")
async def get_my_overview(current_user: Dict[str, Any] = Depends(get_current_user)):
  """
  Trả về tổng quan hoạt động học tập của user hiện tại dựa trên posts + comments.
  """
  uid = current_user.get("uid")
  name = current_user.get("name") or current_user.get("email") or "Học sinh"

  if not uid:
    raise HTTPException(status_code=401, detail="Unauthenticated")

  try:
    # Bài viết do user tạo
    my_posts = db.query("posts", filters=[("author_id", "==", uid)])
    total_posts = len(my_posts)

    # Bình luận do user tạo
    my_comments = db.query("comments", filters=[("author_id", "==", uid)])
    total_comments = len(my_comments)

    # Thống kê theo môn từ posts
    subject_counts: Dict[str, int] = {}
    for p in my_posts:
      subj = (p.get("subject") or "").strip()
      if not subj:
        continue
      subject_counts[subj] = subject_counts.get(subj, 0) + 1

    favorite_subject = None
    if subject_counts:
      favorite_subject = max(subject_counts.items(), key=lambda kv: kv[1])[0]

    # Lấy 5 bài gần nhất (sort theo createdAt)
    sorted_posts = sorted(
      my_posts,
      key=lambda p: p.get("createdAt") or p.get("created_at") or "",
      reverse=True,
    )
    recent_posts = []
    for p in sorted_posts[:5]:
      recent_posts.append(
        {
          "id": p.get("id"),
          "content": p.get("content", "")[:200],
          "subject": p.get("subject"),
          "created_at": p.get("createdAt") or p.get("created_at"),
          "comments": p.get("comments", 0),
          "likes": p.get("likes", 0),
        }
      )

    overview = {
      "user": {
        "id": uid,
        "name": name,
      },
      "stats": {
        "total_posts": total_posts,
        "total_comments": total_comments,
        "favorite_subject": favorite_subject,
      },
      "recent_posts": recent_posts,
    }

    return overview
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))


