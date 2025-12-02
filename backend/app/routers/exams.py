"""
Exam-related API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from app.sql_database import db
from app.auth import get_current_user

router = APIRouter(prefix="/api/exams", tags=["exams"])


class ExamCreate(BaseModel):
    title: str
    subject: str
    duration: int  # minutes
    questions_count: int
    difficulty: str = "medium"
    description: Optional[str] = None
    is_premium: bool = False


class ExamResponse(BaseModel):
    id: str
    title: str
    subject: str
    duration: int
    questions_count: int
    difficulty: str
    description: Optional[str]
    is_premium: bool
    rating: Optional[float] = None
    created_at: str
    updated_at: str


@router.get("/", response_model=List[Dict[str, Any]])
async def get_exams(
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 50
):
    """Get list of exams with optional filters"""
    try:
        filters = []
        if subject and subject != 'all':
            filters.append(('subject', '==', subject))
        if difficulty:
            filters.append(('difficulty', '==', difficulty))
        
        exams = db.query('exams', filters=filters, order_by='createdAt', limit=limit)
        return exams
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{exam_id}", response_model=Dict[str, Any])
async def get_exam(exam_id: str):
    """Get exam by ID"""
    try:
        exam = db.read('exams', exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        return exam
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Dict[str, Any])
async def create_exam(
    exam: ExamCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new exam"""
    try:
        exam_data = {
            **exam.dict(),
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "rating": None,
        }
        exam_id = db.create('exams', exam_data)
        return {"id": exam_id, **exam_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{exam_id}", response_model=Dict[str, Any])
async def update_exam(
    exam_id: str,
    exam: ExamCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update an exam"""
    try:
        exam_data = {
            **exam.dict(),
            "updatedAt": datetime.now().isoformat(),
        }
        success = db.update('exams', exam_id, exam_data)
        if not success:
            raise HTTPException(status_code=404, detail="Exam not found")
        return {"id": exam_id, **exam_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete an exam"""
    try:
        success = db.delete('exams', exam_id)
        if not success:
            raise HTTPException(status_code=404, detail="Exam not found")
        return {"message": "Exam deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

