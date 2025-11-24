"""
Teacher Document Processing Pipeline
Bước 1: Trích xuất nội dung (Extract)
Bước 2: Phân tích & Bóc tách cấu trúc (Analyze)
Bước 3: Chuyển đổi định dạng (Convert)
"""
import json
import logging
import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, Body

from ..services.gemini_client import get_gemini_client
from ..routers.files import extract_text_from_file
from ..config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = Path("tmp_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/process-document")
async def process_document(file: UploadFile = File(...)):
    """
    Pipeline xử lý tài liệu cho giáo viên:
    Bước 1: Trích xuất nội dung (Extract)
    Bước 2: Phân tích & Bóc tách cấu trúc (Analyze) - gemini-2.5-flash-lite
    Bước 3: Chuyển đổi định dạng (Convert) - gemini-2.5-flash-preview-image cho nội dung phức tạp
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed types: {', '.join(ALLOWED_DOCUMENT_EXTENSIONS)}"
        )

    temp_path = None
    try:
        # Read and save file
        content = await file.read()
        file_size = len(content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024):.0f}MB"
            )
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        temp_path = UPLOAD_DIR / f"{uuid4()}-{file.filename}"
        temp_path.write_bytes(content)
        logger.info(f"File saved for processing: {temp_path}, size: {file_size} bytes")
        
        # ========== BƯỚC 1: TRÍCH XUẤT NỘI DUNG ==========
        logger.info("Bước 1: Trích xuất nội dung từ file...")
        extracted_text = await extract_text_from_file(temp_path)
        
        if not extracted_text or len(extracted_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract sufficient text from file. File may be empty or corrupted."
            )
        
        logger.info(f"Extracted {len(extracted_text)} characters from file")
        
        # ========== BƯỚC 2: PHÂN TÍCH & BÓC TÁCH CẤU TRÚC ==========
        logger.info("Bước 2: Phân tích và bóc tách cấu trúc bằng Gemini...")
        
        gemini = get_gemini_client()
        if not gemini:
            raise HTTPException(status_code=503, detail="Gemini API not available")
        
        # Analyze document structure using default model
        analysis_prompt = f"""Bạn là trợ lý giáo viên chuyên phân tích đề thi và tài liệu học tập.

Hãy phân tích nội dung sau và trích xuất các thành phần:
1. Câu hỏi (questions)
2. Đáp án (answers)
3. Lời giải (solutions)
4. Điểm số (scores)
5. Chủ đề (topics)
6. Độ khó (difficulty)

Nội dung:
{extracted_text[:8000]}  # Limit to avoid token limits

Hãy trả về JSON với cấu trúc:
{{
  "metadata": {{
    "title": "Tiêu đề đề thi",
    "subject": "Môn học",
    "grade": "Lớp",
    "totalQuestions": 0,
    "totalPoints": 0
  }},
  "questions": [
    {{
      "id": 1,
      "question": "Nội dung câu hỏi",
      "type": "multiple_choice|essay|true_false",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": "Đáp án đúng",
      "solution": "Lời giải chi tiết",
      "points": 1,
      "difficulty": "easy|medium|hard",
      "topic": "Chủ đề",
      "hasMath": true/false,
      "hasImage": true/false
    }}
  ]
}}

Chỉ trả về JSON, không giải thích thêm."""
        
        try:
            analysis_result = await gemini.generate(
                prompt=analysis_prompt,
                temperature=0.3,
                max_tokens=4000,
            )
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"AI analysis failed: {str(e)}"
            ) from e
        
        # Parse JSON from analysis
        json_match = re.search(r'\{.*\}', analysis_result, re.DOTALL)
        parsed_data = None
        if json_match:
            try:
                parsed_data = json.loads(json_match.group(0))
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON from analysis, using raw text")
        
        # ========== BƯỚC 3: CHUYỂN ĐỔI ĐỊNH DẠNG ==========
        logger.info("Bước 3: Chuyển đổi định dạng và xử lý nội dung phức tạp...")
        
        # Check if document has complex content (math, physics)
        has_complex_content = False
        if parsed_data and "questions" in parsed_data:
            for q in parsed_data.get("questions", []):
                if q.get("hasMath") or q.get("hasImage"):
                    has_complex_content = True
                    break
        
        # If has complex content, generate illustrations
        illustrations = {}
        if has_complex_content:
            logger.info("Detected complex content, generating illustrations...")
            for q in parsed_data.get("questions", []):
                if q.get("hasMath") and q.get("question"):
                    try:
                        # Generate illustration for math content
                        illustration = await gemini.generate_image_illustration(
                            prompt=q.get("question", ""),
                            temperature=0.7,
                            max_tokens=1024,
                        )
                        illustrations[q.get("id", 0)] = illustration
                        logger.info(f"Generated illustration for question {q.get('id')}")
                    except Exception as e:
                        logger.warning(f"Failed to generate illustration for question {q.get('id')}: {e}")
        
        # Convert to final format (JSON/XML for online exam)
        final_format = {
            "source": file.filename,
            "extractedText": extracted_text[:1000] + "..." if len(extracted_text) > 1000 else extracted_text,
            "analysis": parsed_data if parsed_data else {"raw": analysis_result},
            "illustrations": illustrations,
            "processing": {
                "extractionMethod": "PyMuPDF" if suffix == ".pdf" else "python-docx",
                "analysisModel": "gemini-2.5-flash-lite",
                "illustrationModel": "gemini-2.5-flash-lite" if illustrations else None,
            }
        }
        
        return {
            "success": True,
            "data": final_format,
            "summary": {
                "totalQuestions": len(parsed_data.get("questions", [])) if parsed_data else 0,
                "totalIllustrations": len(illustrations),
                "hasComplexContent": has_complex_content,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        ) from e
    finally:
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass

