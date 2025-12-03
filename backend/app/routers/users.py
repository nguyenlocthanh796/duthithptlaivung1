"""
User management API endpoints
Quản lý users từ Firebase Auth
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from app.sql_database import db
from app.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


class UserCreate(BaseModel):
    uid: str
    email: str
    name: Optional[str] = None
    role: str = "student"
    photo_url: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    photo_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    uid: str
    email: str
    name: Optional[str]
    role: str
    photo_url: Optional[str]
    created_at: str
    updated_at: str


@router.get("/me", response_model=Dict[str, Any])
async def get_current_user_info(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lấy thông tin user hiện tại từ Firebase token và database."""
    try:
        uid = current_user.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Unauthenticated")

        # Tìm user trong database
        users = db.query("users", filters=[("uid", "==", uid)], limit=1)
        if users:
            user_data = dict(users[0])
            user_data.pop("id", None)
            return {
                "id": users[0].get("id"),
                "uid": uid,
                "email": current_user.get("email", ""),
                "name": user_data.get("name") or current_user.get("name") or current_user.get("email", ""),
                "role": user_data.get("role", "student"),
                "photo_url": user_data.get("photo_url") or current_user.get("picture"),
                "created_at": user_data.get("createdAt") or user_data.get("created_at"),
                "updated_at": user_data.get("updatedAt") or user_data.get("updated_at"),
            }

        # Nếu chưa có trong database, tạo mới từ Firebase token
        now_iso = datetime.now().isoformat()
        user_data = {
            "uid": uid,
            "email": current_user.get("email", ""),
            "name": current_user.get("name") or current_user.get("email", ""),
            "role": "student",  # Default role
            "photo_url": current_user.get("picture"),
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
        user_id = db.create("users", user_data, doc_id=uid)

        return {
            "id": user_id,
            **user_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Tạo user mới trong database (tự động khi đăng nhập lần đầu)."""
    try:
        uid = current_user.get("uid")
        if not uid or uid != user.uid:
            raise HTTPException(status_code=403, detail="Cannot create user for different UID")

        # Kiểm tra user đã tồn tại chưa
        existing = db.read("users", user.uid)
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")

        now_iso = datetime.now().isoformat()
        user_data = {
            "uid": user.uid,
            "email": user.email,
            "name": user.name or user.email,
            "role": user.role,
            "photo_url": user.photo_url,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
        user_id = db.create("users", user_data, doc_id=user.uid)

        return UserResponse(
            id=user_id,
            uid=user.uid,
            email=user.email,
            name=user.name,
            role=user.role,
            photo_url=user.photo_url,
            created_at=now_iso,
            updated_at=now_iso,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/me", response_model=Dict[str, Any])
async def update_current_user(
    payload: UserUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cập nhật thông tin user hiện tại."""
    try:
        uid = current_user.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Unauthenticated")

        user = db.read("users", uid)
        if not user:
            # Tạo user nếu chưa có
            now_iso = datetime.now().isoformat()
            user_data = {
                "uid": uid,
                "email": current_user.get("email", ""),
                "name": payload.name or current_user.get("name") or current_user.get("email", ""),
                "role": payload.role or "student",
                "photo_url": payload.photo_url or current_user.get("picture"),
                "createdAt": now_iso,
                "updatedAt": now_iso,
            }
            user_id = db.create("users", user_data, doc_id=uid)
            return {"id": user_id, **user_data}

        updates: Dict[str, Any] = {}
        if payload.name is not None:
            updates["name"] = payload.name
        if payload.role is not None:
            updates["role"] = payload.role
        if payload.photo_url is not None:
            updates["photo_url"] = payload.photo_url

        if not updates:
            return user

        updates["updatedAt"] = datetime.now().isoformat()
        db.update("users", uid, updates)

        updated = db.read("users", uid)
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to load updated user")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}", response_model=Dict[str, Any])
async def get_user(user_id: str):
    """Lấy thông tin user theo ID."""
    try:
        user = db.read("users", user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[Dict[str, Any]])
async def list_users(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    role: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lấy danh sách users (chỉ admin)."""
    try:
        user_role = current_user.get("role") or "student"
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        
        filters = []
        if role:
            filters.append(("role", "==", role))
        if search:
            # Search in name or email
            users = db.query("users", filters=filters, limit=limit, offset=offset)
            # Filter by search term
            filtered = []
            search_lower = search.lower()
            for user in users:
                name = (user.get("name") or "").lower()
                email = (user.get("email") or "").lower()
                if search_lower in name or search_lower in email:
                    filtered.append(user)
            return filtered[:limit]
        
        return db.query("users", filters=filters, limit=limit, offset=offset)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}/role", response_model=Dict[str, Any])
async def update_user_role(
    user_id: str,
    payload: Dict[str, str] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cập nhật role của user (chỉ admin)."""
    try:
        user_role = current_user.get("role") or "student"
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        
        new_role = payload.get("role")
        if not new_role or new_role not in ["student", "teacher", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        user = db.read("users", user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        db.update("users", user_id, {
            "role": new_role,
            "updatedAt": datetime.now().isoformat()
        })
        
        updated = db.read("users", user_id)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Xóa user (chỉ admin)."""
    try:
        user_role = current_user.get("role") or "student"
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        
        current_uid = current_user.get("uid")
        if user_id == current_uid:
            raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
        user = db.read("users", user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        deleted = db.delete("users", user_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete user")
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

