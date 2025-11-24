"""
AI Tutor Router - Giải thích tại sao học sinh sai
Giai đoạn 1: "Gia sư AI" - Killer Feature
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)
router = APIRouter()


class ExplainWrongAnswerRequest(BaseModel):
    question: str
    studentAnswer: str
    correctAnswer: str
    subject: str = "Toán"


@router.post("/explain-wrong-answer")
async def explain_wrong_answer(request: ExplainWrongAnswerRequest):
    """
    Giải thích tại sao học sinh sai và gợi ý cách giải đúng
    Giọng văn: Hài hước, động viên, dễ hiểu
    """
    try:
        gemini = get_gemini_client()
        if not gemini:
            raise HTTPException(
                status_code=503,
                detail="Gemini API not available"
            )

        # Tạo prompt thân thiện, động viên
        prompt = f"""Bạn là một gia sư AI thân thiện và hài hước, chuyên giúp học sinh THPT hiểu bài.

Học sinh đã làm sai câu hỏi sau:

**Câu hỏi:** {request.question}

**Đáp án học sinh chọn:** {request.studentAnswer}
**Đáp án đúng:** {request.correctAnswer}
**Môn học:** {request.subject}

Hãy giải thích:
1. Tại sao đáp án {request.studentAnswer} là SAI? (Giải thích ngắn gọn, dễ hiểu)
2. Tại sao đáp án {request.correctAnswer} là ĐÚNG? (Hướng dẫn cách giải)
3. Mẹo nhớ hoặc lưu ý để không mắc lỗi tương tự

**Yêu cầu:**
- Giọng văn: Hài hước, động viên, thân thiện (như một người bạn)
- Độ dài: 100-150 từ
- Không dùng ký hiệu toán phức tạp, viết bằng tiếng Việt dễ hiểu
- Kết thúc bằng câu động viên tích cực

Ví dụ giọng văn: "Ồ, bạn đã chọn {request.studentAnswer} rồi! Không sao cả, lỗi này rất phổ biến. Hãy cùng mình tìm hiểu nhé..."

Hãy trả lời bằng tiếng Việt, giọng văn tự nhiên và thân thiện."""

        # Gọi Gemini API
        explanation = await gemini.generate(
            prompt,
            temperature=0.7,  # Sáng tạo hơn cho giọng văn tự nhiên
            max_tokens=300
        )

        # Extract hints (nếu có)
        hints = []
        if "mẹo" in explanation.lower() or "lưu ý" in explanation.lower():
            # Try to extract hints
            lines = explanation.split('\n')
            for line in lines:
                if any(keyword in line.lower() for keyword in ['mẹo', 'lưu ý', 'nhớ', 'tip']):
                    hints.append(line.strip())

        return {
            "explanation": explanation.strip(),
            "hints": hints[:3] if hints else [],  # Max 3 hints
            "subject": request.subject,
        }

    except Exception as e:
        logger.error(f"AI explanation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Không thể tạo lời giải thích: {str(e)}"
        )


@router.post("/analyze-weakness")
async def analyze_weakness(weakness_data: dict):
    """
    Phân tích điểm yếu của học sinh dựa trên lịch sử làm bài
    Giai đoạn 3: Cá nhân hóa
    """
    try:
        gemini = get_gemini_client()
        if not gemini:
            raise HTTPException(
                status_code=503,
                detail="Gemini API not available"
            )

        weaknesses = weakness_data.get("weaknesses", {})
        strengths = weakness_data.get("strengths", {})

        # Tạo prompt phân tích
        prompt = f"""Bạn là một gia sư AI chuyên phân tích điểm mạnh/yếu của học sinh THPT.

**Điểm yếu của học sinh:**
{weaknesses}

**Điểm mạnh của học sinh:**
{strengths}

Hãy phân tích và đưa ra:
1. 3 điểm yếu cần cải thiện nhất (ưu tiên)
2. Lời khuyên cụ thể để cải thiện từng điểm yếu
3. Kế hoạch học tập ngắn gọn (1-2 tuần)

**Yêu cầu:**
- Giọng văn: Động viên, tích cực
- Độ dài: 200-250 từ
- Viết bằng tiếng Việt, dễ hiểu

Trả lời bằng tiếng Việt."""

        analysis = await gemini.generate(
            prompt,
            temperature=0.6,
            max_tokens=400
        )

        return {
            "analysis": analysis.strip(),
            "recommendations": extract_recommendations(analysis),
        }

    except Exception as e:
        logger.error(f"Weakness analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Không thể phân tích: {str(e)}"
        )


def extract_recommendations(text: str) -> list:
    """Extract recommendations from AI response"""
    recommendations = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if line and (line.startswith('-') or line.startswith('•') or line[0].isdigit()):
            recommendations.append(line)
    
    return recommendations[:5]  # Max 5 recommendations

