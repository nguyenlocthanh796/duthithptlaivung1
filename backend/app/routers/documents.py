"""
Document-related API endpoints
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from app.sql_database import db
from app.auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentCreate(BaseModel):
    title: str
    category: str
    subject: Optional[str] = None
    description: Optional[str] = None
    file_type: str
    file_size: int
    author: str
    author_id: Optional[str] = None
    is_premium: bool = False


class DocumentResponse(BaseModel):
    id: str
    title: str
    category: str
    subject: Optional[str]
    description: Optional[str]
    file_type: str
    file_size: int
    author: str
    downloads: int = 0
    is_premium: bool
    created_at: str
    updated_at: str


@router.get("/", response_model=List[Dict[str, Any]])
async def get_documents(
    category: Optional[str] = None,
    subject: Optional[str] = None,
    limit: int = 50
):
    """Get list of documents with optional filters"""
    try:
        filters = []
        if category and category != 'all':
            filters.append(('category', '==', category))
        if subject:
            filters.append(('subject', '==', subject))
        
        documents = db.query('documents', filters=filters, order_by='createdAt', limit=limit)
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}", response_model=Dict[str, Any])
async def get_document(document_id: str):
    """Get document by ID"""
    try:
        document = db.read('documents', document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        return document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Dict[str, Any])
async def create_document(
    document: DocumentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new document"""
    try:
        document_data = {
            **document.dict(),
            "downloads": 0,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }
        doc_id = db.create('documents', document_data)
        return {"id": doc_id, **document_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Increment download count"""
    try:
        document = db.read('documents', document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        current_downloads = document.get('downloads', 0)
        db.update('documents', document_id, {
            'downloads': current_downloads + 1,
            'updatedAt': datetime.now().isoformat()
        })
        return {"message": "Download recorded", "downloads": current_downloads + 1}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a document"""
    try:
        success = db.delete('documents', document_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"message": "Document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

