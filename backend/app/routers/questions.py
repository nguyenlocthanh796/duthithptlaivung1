import json
import logging
import re
from typing import Any

from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..schemas import QuestionCloneRequest, QuestionCloneResult
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


async def generate_with_gemini(prompt: str, temperature: float = 0.5, max_tokens: int = 800) -> str:
    """Generate text using Gemini API with automatic multi-key rotation."""
    gemini = get_gemini_client()
    if not gemini:
        raise HTTPException(
            status_code=503,
            detail="Gemini API not available. Please set GEMINI_API_KEY or GEMINI_API_KEYS in .env"
        )
    
    try:
        logger.info("Generating with Gemini API")
        result = await gemini.generate(prompt, temperature, max_tokens)
        logger.info("Successfully generated with Gemini")
        return result
    except Exception as e:
        logger.error(f"Gemini generation failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Không thể kết nối đến Gemini API. Vui lòng kiểm tra cấu hình: {str(e)}"
        ) from e


@router.post("/clone", response_model=QuestionCloneResult)
async def clone_question(payload: QuestionCloneRequest):
    """Clone a question and generate variants with distractors."""
    # Validation
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="Câu hỏi không được để trống")
    
    if not payload.correct_answer or not payload.correct_answer.strip():
        raise HTTPException(status_code=400, detail="Đáp án đúng không được để trống")
    
    prompt = PROMPT_TEMPLATE.format(
        question=payload.question.strip(),
        answer=payload.correct_answer.strip()
    )
    
    try:
        logger.info(f"Generating variants for question: {payload.question[:50]}...")
        raw = await generate_with_gemini(prompt, temperature=0.5, max_tokens=800)
        
        if not raw or not raw.strip():
            raise HTTPException(
                status_code=502,
                detail="AI không trả về kết quả. Vui lòng thử lại."
            )
        
        logger.info(f"AI response received, length: {len(raw)}")
        
        # Try to extract JSON from response
        try:
            data = extract_json_from_text(raw)
        except json.JSONDecodeError as json_error:
            logger.error(f"Failed to parse JSON from AI response: {json_error}")
            logger.error(f"Raw response: {raw[:500]}")
            raise HTTPException(
                status_code=502,
                detail="AI trả về dữ liệu không đúng định dạng. Vui lòng thử lại."
            ) from json_error
        
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
