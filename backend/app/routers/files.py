import json
import logging
import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..services.drive_client import get_drive_client
from ..services.gemini_client import get_gemini_client
from ..config import get_settings

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("tmp_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

router = APIRouter()


ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp", ".gif"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload file to Google Drive and return the shareable link.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not supported. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    temp_path = None
    try:
        # Read file content
        content = await file.read()
        
        # Check file size
        file_size = len(content)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024):.0f}MB"
            )
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Save to temporary file
        temp_path = UPLOAD_DIR / f"{uuid4()}-{file.filename}"
        temp_path.write_bytes(content)
        logger.info(f"File saved to temp path: {temp_path}, size: {file_size} bytes")
        
        # Get Google Drive client
        drive_client = None
        drive_link = None
        
        try:
            drive_client = get_drive_client()
        except FileNotFoundError as e:
            logger.warning(f"Google Drive credentials not found: {e}")
            logger.warning("File will be saved locally but not uploaded to Google Drive")
            # Continue without Google Drive - return local file info
        except Exception as e:
            logger.warning(f"Error initializing Google Drive client: {e}")
            logger.warning("File will be saved locally but not uploaded to Google Drive")
            # Continue without Google Drive
        
        # Upload to Google Drive if available
        if drive_client:
            try:
                logger.info(f"Uploading file to Google Drive: {file.filename}")
                settings = get_settings()
                # Folder ID mới: 1GgsmXUHK3kXHAPVTFk0DKss_DsxZDkNZ
                folder_id = settings.google_drive_folder_id if settings.google_drive_folder_id else "1GgsmXUHK3kXHAPVTFk0DKss_DsxZDkNZ"
                logger.info(f"Uploading to folder ID: {folder_id}")
                # Set timeout to 120 seconds for large files
                drive_link = drive_client.upload_file(temp_path, parent_folder_id=folder_id)
                logger.info(f"File uploaded successfully. Drive link: {drive_link}")
            except ValueError as e:
                # ValueError from drive_client contains user-friendly message
                error_msg = str(e)
                logger.error(f"Error uploading to Google Drive: {error_msg}")
                if "storage quota" in error_msg.lower():
                    logger.warning("Google Drive upload failed - permissions may not be synced yet. File saved locally.")
                else:
                    logger.warning("Continuing without Google Drive upload")
                # Continue without Google Drive - don't fail the request
            except Exception as e:
                logger.error(f"Error uploading to Google Drive: {e}", exc_info=True)
                logger.warning("Continuing without Google Drive upload")
                # Continue without Google Drive - don't fail the request
        
        # Return response - with or without Google Drive link
        if drive_link:
            # Clean up temp file after successful upload
            if temp_path and temp_path.exists():
                try:
                    temp_path.unlink()
                    logger.info(f"Temporary file deleted: {temp_path}")
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {temp_path}: {e}")
            
            return {
                "fileName": file.filename,
                "driveLink": drive_link,
                "fileSize": file_size,
                "uploaded": True
            }
        else:
            # Return local file path as fallback
            # Keep temp file for potential retry or manual upload
            logger.warning(f"File saved locally at: {temp_path}. Google Drive upload unavailable.")
            return {
                "fileName": file.filename,
                "driveLink": None,
                "fileSize": file_size,
                "uploaded": False,
                "localPath": str(temp_path),
                "message": "File saved locally. Google Drive upload unavailable. Please configure credentials.json"
            }
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error during file upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        ) from e
    finally:
        # Temp file cleanup is handled in the main logic above
        # Only clean up here if there was an exception before upload attempt
        pass


async def extract_text_from_file(file_path: Path) -> str:
    """Extract text from PDF, DOC, or DOCX file."""
    suffix = file_path.suffix.lower()
    
    if suffix == ".pdf":
        try:
            import PyPDF2
            text = ""
            with open(file_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text.strip()
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="PyPDF2 library not installed. Please install it: pip install PyPDF2"
            )
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract text from PDF: {str(e)}"
            )
    
    elif suffix in [".doc", ".docx"]:
        try:
            from docx import Document
            doc = Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text.strip()
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="python-docx library not installed. Please install it: pip install python-docx"
            )
        except Exception as e:
            logger.error(f"Error extracting text from DOC/DOCX: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract text from document: {str(e)}"
            )
    
    else:
        raise HTTPException(
            status_code=400,
            detail=f"File type {suffix} not supported for text extraction"
        )


@router.post("/extract-questions")
async def extract_questions_from_file(file: UploadFile = File(...)):
    """
    Upload a PDF/DOC/DOCX file, extract text, and use AI to extract questions.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    suffix = Path(file.filename).suffix.lower()
    if suffix not in [".pdf", ".doc", ".docx"]:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOC, and DOCX files are supported for question extraction"
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
        logger.info(f"File saved for extraction: {temp_path}, size: {file_size} bytes")
        
        # Extract text
        logger.info("Extracting text from file...")
        extracted_text = await extract_text_from_file(temp_path)
        
        if not extracted_text or len(extracted_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract sufficient text from file. File may be empty or corrupted."
            )
        
        logger.info(f"Extracted {len(extracted_text)} characters from file")
        
        # Use AI to extract questions
        prompt = f"""Bạn là trợ lý giáo viên chuyên phân tích đề thi. Hãy phân tích nội dung sau và trích xuất các câu hỏi trắc nghiệm.

Nội dung:
{extracted_text[:5000]}  # Limit to first 5000 chars to avoid token limits

Hãy trả về JSON với cấu trúc:
{{
  "questions": [
    {{
      "question": "Nội dung câu hỏi",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correct_answer": "Đáp án đúng",
      "explanation": "Giải thích ngắn gọn (nếu có)"
    }}
  ]
}}

Chỉ trả về JSON, không giải thích thêm. Nếu không tìm thấy câu hỏi, trả về {{"questions": []}}."""
        
        gemini = get_gemini_client()
        if not gemini:
            raise HTTPException(
                status_code=503,
                detail="Gemini API not available. Please set GEMINI_API_KEY or GEMINI_API_KEYS in .env"
            )

        try:
            logger.info("Using Gemini to extract questions")
            ai_response = await gemini.generate(prompt, temperature=0.3, max_tokens=2000)
        except Exception as e:
            logger.error(f"Gemini failed: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"AI service unavailable: {str(e)}"
            ) from e
        
        # Parse JSON response
        # Try to extract JSON from response
        json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(0))
                questions = data.get("questions", [])
                
                return {
                    "extractedText": extracted_text[:1000] + "..." if len(extracted_text) > 1000 else extracted_text,
                    "questions": questions,
                    "totalQuestions": len(questions)
                }
            except json.JSONDecodeError:
                pass
        
        # If JSON parsing fails, return raw text for manual processing
        return {
            "extractedText": extracted_text,
            "questions": [],
            "totalQuestions": 0,
            "rawAIResponse": ai_response[:500] if ai_response else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting questions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        )
    finally:
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass
