"""
File upload endpoints for media (images, documents)
Lưu tạm trên Cloud VM cho dự thi
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Dict, Any
import os
import uuid
from pathlib import Path
from datetime import datetime

from app.auth import get_current_user

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

# Thư mục lưu file trên VM (tạo nếu chưa có)
MEDIA_DIR = Path("media")
MEDIA_DIR.mkdir(exist_ok=True)
IMAGES_DIR = MEDIA_DIR / "images"
IMAGES_DIR.mkdir(exist_ok=True)
DOCS_DIR = MEDIA_DIR / "docs"
DOCS_DIR.mkdir(exist_ok=True)

# Allowed file types
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("/doc")
async def upload_document(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Upload tài liệu (PDF/Word) lên VM.
    Trả về metadata để frontend gắn vào post.
    """
    if not file.content_type or file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ chấp nhận file PDF hoặc Word (.pdf, .doc, .docx). Loại file hiện tại: {file.content_type}",
        )

    try:
        # Tạo tên file unique
        file_ext = Path(file.filename or "file").suffix or ".pdf"
        file_id = str(uuid.uuid4())
        file_name = f"{file_id}{file_ext}"
        file_path = DOCS_DIR / file_name

        # Lưu file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        file_size = len(content)

        # Trả về metadata
        return {
            "url": f"/media/docs/{file_name}",  # URL tương đối, frontend sẽ ghép với API_BASE_URL
            "file_name": file.filename or file_name,
            "file_type": file.content_type,
            "file_size": file_size,
            "uploaded_at": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi upload tài liệu: {str(e)}")


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Upload ảnh lên VM (backup nếu frontend không nén được).
    Khuyến khích frontend nén WebP trước khi gửi base64 vào post.
    """
    if not file.content_type or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF). Loại file hiện tại: {file.content_type}",
        )

    try:
        file_ext = Path(file.filename or "image").suffix or ".jpg"
        file_id = str(uuid.uuid4())
        file_name = f"{file_id}{file_ext}"
        file_path = IMAGES_DIR / file_name

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        file_size = len(content)

        return {
            "url": f"/media/images/{file_name}",
            "file_name": file.filename or file_name,
            "file_type": file.content_type,
            "file_size": file_size,
            "uploaded_at": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi upload ảnh: {str(e)}")

