import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import health, lm, files, questions, ai_tutor, teacher_documents
from .schemas import ExamGenerateRequest, ExamGenerateResponse, ExamQuestion, ExamFullGenerateRequest, ExamFullGenerateResponse, QuestionCompleteRequest, QuestionCompleteResponse
from .services.gemini_client import get_gemini_client
import json
import re
import logging

# Optimize logging for production (e2-micro)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

settings = get_settings()

# Optimize FastAPI for e2-micro (1GB RAM)
app = FastAPI(
    title="DuThi THPT Platform API",
    version="0.1.0",
    docs_url="/docs" if settings.fastapi_host == "0.0.0.0" else None,  # Disable docs in production
    redoc_url=None
)

# CORS configuration - MUST include Firebase Hosting URLs
allowed_origins = settings.get_allowed_origins_list()
# Ensure localhost variants are always included for development
localhost_origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
# Firebase Hosting URLs - CRITICAL for production
firebase_hosting_origins = [
    "https://gen-lang-client-0581370080.web.app",
    "https://gen-lang-client-0581370080.firebaseapp.com"
]
# Cloudflare Pages URLs (if used)
cloudflare_pages_origins = [
    "https://duthi-frontend.pages.dev",
]
# Combine all origins and remove duplicates
all_origins = list(set(allowed_origins + localhost_origins + firebase_hosting_origins + cloudflare_pages_origins))
logger.info(f"CORS allowed origins: {all_origins}")

# CORS Middleware - MUST be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    # Support Cloudflare Pages preview deployments with regex
    allow_origin_regex=r"https://.*\.pages\.dev",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

app.include_router(health.router)
app.include_router(lm.router, prefix="/ai", tags=["lm"])
app.include_router(ai_tutor.router, prefix="/ai", tags=["ai-tutor"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(questions.router, prefix="/questions", tags=["questions"])
app.include_router(teacher_documents.router, prefix="/teacher", tags=["teacher"])


@app.post("/api/generate-exam", response_model=ExamGenerateResponse)
async def generate_exam_api(payload: ExamGenerateRequest):
    """Generate exam questions using AI - Compatible with frontend ExamSystemPage."""
    try:
        # Map độ khó sang tiếng Việt
        difficulty_map = {
            'De': 'Dễ',
            'TB': 'Trung bình',
            'Kho': 'Khó',
            'SieuKho': 'Vận dụng cao'
        }
        difficulty_text = difficulty_map.get(payload.difficulty, 'Trung bình')

        # Tạo prompt cho Gemini
        prompt = f"""Hãy tạo {payload.count} câu hỏi trắc nghiệm về chủ đề "{payload.topic}" với độ khó {difficulty_text}.

Yêu cầu:
- Mỗi câu hỏi có 4 đáp án (A, B, C, D)
- Chỉ có 1 đáp án đúng
- Câu hỏi phải rõ ràng, chính xác, phù hợp với học sinh THPT
- Đáp án phải hợp lý và có tính phân loại
- Câu hỏi phải có tính giáo dục, không vi phạm đạo đức

Trả về dưới dạng JSON array với format:
[
  {{
    "text": "Nội dung câu hỏi?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correct": 0
  }}
]
Trong đó "correct" là index của đáp án đúng (0=A, 1=B, 2=C, 3=D).

Chỉ trả về JSON array, không có text thêm, không có markdown code blocks."""

        logger.info(f"Generating {payload.count} exam questions for topic: {payload.topic}")
        
        # Gọi Gemini API
        gemini = get_gemini_client()
        if not gemini:
            raise HTTPException(
                status_code=503,
                detail="Gemini API not available. Please set GEMINI_API_KEY or GEMINI_API_KEYS in environment variables."
            )
        
        raw = await gemini.generate(prompt, temperature=0.7, max_tokens=2048)
        
        if not raw or not raw.strip():
            logger.warning("AI returned empty response")
            raise HTTPException(
                status_code=502,
                detail="AI không trả về kết quả. Vui lòng thử lại."
            )
        
        logger.info(f"AI response received, length: {len(raw)}")
        
        # Parse JSON từ response
        try:
            # Tìm JSON array trong response
            json_match = re.search(r'\[[\s\S]*\]', raw)
            if json_match:
                questions_data = json.loads(json_match.group(0))
            else:
                # Thử parse toàn bộ response
                questions_data = json.loads(raw.strip())
            
            # Validate và convert sang ExamQuestion
            questions = []
            for i, q in enumerate(questions_data[:payload.count]):
                if not isinstance(q, dict):
                    continue
                if 'text' not in q or 'options' not in q or 'correct' not in q:
                    continue
                if not isinstance(q['options'], list) or len(q['options']) != 4:
                    continue
                if not isinstance(q['correct'], int) or q['correct'] < 0 or q['correct'] > 3:
                    continue
                
                questions.append(ExamQuestion(
                    text=q['text'],
                    options=q['options'],
                    correct=q['correct']
                ))
            
            if not questions:
                raise ValueError("No valid questions found in AI response")
            
            # Đảm bảo đủ số lượng
            while len(questions) < payload.count:
                questions.append(ExamQuestion(
                    text=f"Câu hỏi {len(questions) + 1} về {payload.topic}?",
                    options=["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                    correct=0
                ))
            
            logger.info(f"Successfully generated {len(questions)} exam questions")
            return ExamGenerateResponse(questions=questions[:payload.count])
            
        except json.JSONDecodeError as json_error:
            logger.error(f"Failed to parse JSON from AI response: {json_error}")
            logger.error(f"Raw response (first 1000 chars): {raw[:1000]}")
            raise HTTPException(
                status_code=502,
                detail=f"AI trả về dữ liệu không đúng định dạng JSON. Vui lòng thử lại."
            ) from json_error
        except Exception as parse_error:
            logger.error(f"Error parsing exam questions: {parse_error}")
            raise HTTPException(
                status_code=502,
                detail=f"Lỗi khi xử lý phản hồi từ AI: {str(parse_error)}"
            ) from parse_error
            
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected error in generate_exam_api: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi không xác định: {str(exc)}"
        ) from exc


@app.post("/api/generate-full-exam", response_model=ExamFullGenerateResponse)
async def generate_full_exam(payload: ExamFullGenerateRequest):
    """Generate full exam with title and questions (for ExamCreator)."""
    try:
        gemini = get_gemini_client()
        if not gemini:
            raise HTTPException(
                status_code=503,
                detail="Gemini API not available. Please set GEMINI_API_KEY or GEMINI_API_KEYS in environment variables."
            )
        
        prompt = f"""Bạn là chuyên gia soạn đề Toán/Lý/Hóa. Tạo danh sách câu hỏi kiểm tra dạng JSON.

Cấu trúc: {{ "title": "...", "questions": [ {{ "text": "...", "options": ["..."], "correctIndex": 0, "points": 1, "explanation": "..." }} ] }}

Yêu cầu: 
- Chủ đề "{payload.topic}", Độ khó {payload.difficulty}, {payload.quantity} câu, Loại {payload.type}.
- Nếu có công thức toán học, BẮT BUỘC dùng định dạng LaTeX kẹp giữa dấu $. Ví dụ: $\\frac{{1}}{{2}}$, $\\sqrt{{x}}$.
- QUAN TRỌNG: Trả về JSON thuần hợp lệ. Nếu dùng dấu gạch chéo ngược (backslash) trong text, hãy double escape nó (ví dụ: \\\\frac{{1}}{{2}}).
- Tiếng Việt.

Tạo bộ câu hỏi về {payload.topic}"""
        
        raw = await gemini.generate(
            prompt=prompt,
            temperature=0.7,
            max_tokens=4096,
            model="gemini-2.5-flash-lite"
        )
        
        if not raw or not raw.strip():
            raise HTTPException(status_code=502, detail="AI không trả về kết quả. Vui lòng thử lại.")
        
        # Parse JSON
        try:
            # Remove markdown code blocks if present
            clean_text = raw.strip().replace('```json', '').replace('```', '').strip()
            data = json.loads(clean_text)
            
            # Normalize questions
            questions = []
            for q in data.get('questions', []):
                questions.append({
                    'text': q.get('text', ''),
                    'options': q.get('options', ['A', 'B', 'C', 'D']),
                    'correctIndex': q.get('correctIndex', q.get('correct', 0)),
                    'points': q.get('points', 1),
                    'explanation': q.get('explanation', ''),
                    'type': q.get('type', payload.type)
                })
            
            return ExamFullGenerateResponse(
                title=data.get('title', f'Kiểm tra {payload.topic}'),
                questions=questions
            )
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            raise HTTPException(status_code=502, detail=f"Lỗi parse JSON: {str(e)}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating full exam: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(exc)}")


@app.post("/api/complete-question", response_model=QuestionCompleteResponse)
async def complete_question(payload: QuestionCompleteRequest):
    """Complete a draft question using AI."""
    try:
        gemini = get_gemini_client()
        if not gemini:
            raise HTTPException(
                status_code=503,
                detail="Gemini API not available."
            )
        
        prompt = f"""Hoàn thiện câu hỏi nháp thành JSON hợp lệ. Dùng LaTeX ($...$) cho công thức toán.

Đầu vào: "{payload.draftText}"
Loại: {payload.type}

Output JSON: {{ "text": "...", "options": ["..."], "correctIndex": 0, "explanation": "..." }}

Lưu ý: Escape các ký tự đặc biệt cẩn thận (ví dụ: \\\\ cho backslash).

Hoàn thiện câu hỏi này: {payload.draftText}"""
        
        raw = await gemini.generate(
            prompt=prompt,
            temperature=0.7,
            max_tokens=1024,
            model="gemini-2.5-flash-lite"
        )
        
        if not raw or not raw.strip():
            raise HTTPException(status_code=502, detail="AI không trả về kết quả.")
        
        try:
            clean_text = raw.strip().replace('```json', '').replace('```', '').strip()
            data = json.loads(clean_text)
            
            return QuestionCompleteResponse(
                text=data.get('text', payload.draftText),
                options=data.get('options'),
                correctIndex=data.get('correctIndex', 0),
                explanation=data.get('explanation', '')
            )
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            raise HTTPException(status_code=502, detail=f"Lỗi parse JSON: {str(e)}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error completing question: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(exc)}")


@app.get("/", tags=["root"])
async def root():
    return {"message": "API is running"}
