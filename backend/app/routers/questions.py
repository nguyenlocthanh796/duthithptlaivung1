import json
import logging
import re
from typing import Any

from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..schemas import QuestionCloneRequest, QuestionCloneResult, ExamGenerateRequest, ExamGenerateResponse, ExamQuestion, ExamFullGenerateRequest, ExamFullGenerateResponse, QuestionCompleteRequest, QuestionCompleteResponse
from ..services.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)

router = APIRouter()

PROMPT_TEMPLATE = """
Bạn là trợ lý tạo đề thi trắc nghiệm THPT. Với câu hỏi gốc và đáp án đúng,
hãy tạo các đáp án nhiễu (distractors) thông minh - những đáp án gần đúng nhưng sai,
để học sinh phải suy nghĩ kỹ và hiểu rõ kiến thức mới chọn đúng.

Hãy trả về JSON với cấu trúc:
{
  "distractors": ["đáp án nhiễu 1 (gần đúng nhưng sai)", "đáp án nhiễu 2", "đáp án nhiễu 3"],
  "variants": ["câu hỏi biến thể 1 (giữ nguyên ý nghĩa nhưng thay đổi cách hỏi)", ..., "câu hỏi biến thể 10"]
}

Yêu cầu:
- Đáp án nhiễu phải hợp lý, gần với đáp án đúng nhưng vẫn sai
- Câu hỏi biến thể phải giữ nguyên mức độ khó và kiến thức cần kiểm tra
- Tất cả bằng tiếng Việt, không giải thích thêm

Câu hỏi: {question}
Đáp án đúng: {answer}
"""


def extract_json_from_text(text: str) -> dict:
    """Extract JSON from text that might contain markdown code blocks or extra text."""
    # Try to find JSON in code blocks
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group(1))
    
    # Try to find JSON object directly
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass
    
    # Last resort: try to parse the whole text
    return json.loads(text)


async def generate_with_gemini(prompt: str, temperature: float = 0.5, max_tokens: int = 800, model: str = None) -> str:
    """Generate text using Gemini API with automatic multi-key rotation."""
    try:
        gemini = get_gemini_client()
        if not gemini:
            logger.error("Gemini client not available")
            raise HTTPException(
                status_code=503,
                detail="Gemini API not available. Please set GEMINI_API_KEY or GEMINI_API_KEYS in environment variables."
            )
        
        logger.info(f"Generating with Gemini API (model: {model or 'default'})")
        result = await gemini.generate(prompt, temperature, max_tokens, model)
        logger.info(f"Successfully generated {len(result)} characters with Gemini")
        return result
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except ValueError as e:
        logger.error(f"Gemini API key error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail=f"API key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại cấu hình: {str(e)}"
        ) from e
    except Exception as e:
        logger.error(f"Gemini generation failed: {e}", exc_info=True)
        error_msg = str(e).lower()
        if 'quota' in error_msg or '429' in error_msg or 'resource exhausted' in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Đã vượt quá giới hạn API. Vui lòng thử lại sau."
            ) from e
        elif 'permission denied' in error_msg or '403' in error_msg:
            raise HTTPException(
                status_code=403,
                detail="API key không hợp lệ hoặc đã bị rò rỉ. Vui lòng kiểm tra lại API key trong cấu hình."
            ) from e
        else:
            raise HTTPException(
                status_code=503,
                detail=f"Không thể kết nối đến Gemini API. Vui lòng kiểm tra cấu hình: {str(e)}"
            ) from e


@router.post("/clone", response_model=QuestionCloneResult)
async def clone_question(payload: QuestionCloneRequest):
    """Clone a question and generate variants with distractors."""
    try:
        # Validation
        if not payload.question or not payload.question.strip():
            raise HTTPException(status_code=400, detail="Câu hỏi không được để trống")
        
        if not payload.correct_answer or not payload.correct_answer.strip():
            raise HTTPException(status_code=400, detail="Đáp án đúng không được để trống")
        
        prompt = PROMPT_TEMPLATE.format(
            question=payload.question.strip(),
            answer=payload.correct_answer.strip()
        )
        
        logger.info(f"Generating variants for question: {payload.question[:50]}...")
        # Use default model for question cloning (will use gemini-2.5-flash-lite if available)
        raw = await generate_with_gemini(prompt, temperature=0.5, max_tokens=800)
        
        if not raw or not raw.strip():
            logger.warning("AI returned empty response")
            raise HTTPException(
                status_code=502,
                detail="AI không trả về kết quả. Vui lòng thử lại."
            )
        
        logger.info(f"AI response received, length: {len(raw)}")
        
        # Try to extract JSON from response
        try:
            data = extract_json_from_text(raw)
            logger.info(f"Successfully parsed JSON from AI response")
        except json.JSONDecodeError as json_error:
            logger.error(f"Failed to parse JSON from AI response: {json_error}")
            logger.error(f"Raw response (first 1000 chars): {raw[:1000]}")
            # Try to provide more helpful error message
            raise HTTPException(
                status_code=502,
                detail=f"AI trả về dữ liệu không đúng định dạng JSON. Vui lòng thử lại. Lỗi: {str(json_error)}"
            ) from json_error
        except Exception as parse_error:
            logger.error(f"Unexpected error parsing JSON: {parse_error}")
            logger.error(f"Raw response (first 1000 chars): {raw[:1000]}")
            raise HTTPException(
                status_code=502,
                detail=f"Lỗi khi xử lý phản hồi từ AI: {str(parse_error)}"
            ) from parse_error
        
        # Validate and extract data
        distractors = data.get("distractors", [])
        variants = data.get("variants", [])
        
        if not isinstance(distractors, list):
            distractors = []
        if not isinstance(variants, list):
            variants = []
        
        # Ensure we have at least some data
        if not distractors and not variants:
            raise HTTPException(
                status_code=502,
                detail="AI không tạo được biến thể. Vui lòng thử lại với câu hỏi khác."
            )
        
        result = QuestionCloneResult(
            correct_answer=payload.correct_answer.strip(),
            distractors=distractors[:3] if distractors else [],
            variants=variants[:10] if variants else [],
        )
        
        logger.info(f"Successfully generated {len(result.variants)} variants and {len(result.distractors)} distractors")
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as exc:
        logger.error(f"Unexpected error in clone_question: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi không xác định: {str(exc)}"
        ) from exc


@router.post("/generate-exam", response_model=ExamGenerateResponse)
async def generate_exam(payload: ExamGenerateRequest):
    """Generate exam questions using AI."""
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
        raw = await generate_with_gemini(prompt, temperature=0.7, max_tokens=2048)
        
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
        logger.error(f"Unexpected error in generate_exam: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi không xác định: {str(exc)}"
        ) from exc


@router.post("/generate-full-exam", response_model=ExamFullGenerateResponse)
async def generate_full_exam(payload: ExamFullGenerateRequest):
    """Generate full exam with title and questions (for ExamCreator)."""
    try:
        prompt = f"""Bạn là chuyên gia soạn đề Toán/Lý/Hóa. Tạo danh sách câu hỏi kiểm tra dạng JSON.

Cấu trúc: {{ "title": "...", "questions": [ {{ "text": "...", "options": ["..."], "correctIndex": 0, "points": 1, "explanation": "..." }} ] }}

Yêu cầu: 
- Chủ đề "{payload.topic}", Độ khó {payload.difficulty}, {payload.quantity} câu, Loại {payload.type}.
- Nếu có công thức toán học, BẮT BUỘC dùng định dạng LaTeX kẹp giữa dấu $. Ví dụ: $\\frac{{1}}{{2}}$, $\\sqrt{{x}}$.
- QUAN TRỌNG: Trả về JSON thuần hợp lệ. Nếu dùng dấu gạch chéo ngược (backslash) trong text, hãy double escape nó (ví dụ: \\\\frac{{1}}{{2}}).
- Tiếng Việt.

Tạo bộ câu hỏi về {payload.topic}"""
        
        raw = await generate_with_gemini(
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


@router.post("/complete-question", response_model=QuestionCompleteResponse)
async def complete_question(payload: QuestionCompleteRequest):
    """Complete a draft question using AI."""
    try:
        prompt = f"""Hoàn thiện câu hỏi nháp thành JSON hợp lệ. Dùng LaTeX ($...$) cho công thức toán.

Đầu vào: "{payload.draftText}"
Loại: {payload.type}

Output JSON: {{ "text": "...", "options": ["..."], "correctIndex": 0, "explanation": "..." }}

Lưu ý: Escape các ký tự đặc biệt cẩn thận (ví dụ: \\\\ cho backslash).

Hoàn thiện câu hỏi này: {payload.draftText}"""
        
        raw = await generate_with_gemini(
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
