"""
AI Analysis API endpoints for posts and images
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import requests
import base64
import json
import re

from app.config import settings

router = APIRouter(prefix="/api/ai-analysis", tags=["ai-analysis"])


class AnalysisRequest(BaseModel):
    content: Optional[str] = None  # Text content
    image_urls: Optional[List[str]] = []  # Image URLs
    post_id: Optional[str] = None


class PostMetadata(BaseModel):
    subject: Optional[str] = None  # Môn học
    grade: Optional[int] = None  # Lớp
    topic: Optional[str] = None  # Chủ đề
    tags: Optional[List[str]] = None  # Tags do AI sinh ra


class PostModerationResult(BaseModel):
    is_educational: bool
    moderation_status: str  # clean | needs_review | rejected
    reason: Optional[str] = None
    metadata: Optional[PostMetadata] = None
    anh_tho_comment: Optional[str] = None
    content_warning: Optional[str] = None
    code_solution_refused: Optional[bool] = False


class CommentItem(BaseModel):
    author: Optional[str] = None
    content: str


class CommentSummaryRequest(BaseModel):
    post_id: Optional[str] = None
    comments: List[CommentItem]


def get_gemini_api_key():
    """Get Gemini API key from settings"""
    if settings.GEMINI_API_KEY:
        return settings.GEMINI_API_KEY
    
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        return api_key
    
    return None


def download_image_as_base64(image_url: str) -> Optional[str]:
    """Download image and convert to base64"""
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        
        # Check if image
        content_type = response.headers.get('content-type', '')
        if not content_type.startswith('image/'):
            return None
        
        # Convert to base64
        image_data = base64.b64encode(response.content).decode('utf-8')
        return f"data:{content_type};base64,{image_data}"
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None


SYSTEM_INSTRUCTION_ANH_THO = """
Bạn là AI phân loại nội dung cho mạng xã hội học tập \"EduSystem\".
Đầu vào sẽ là văn bản và/hoặc hình ảnh từ bài đăng của học sinh THPT.

Nhiệm vụ của bạn:
1. Xác định xem nội dung có phải HỌC TẬP/NGHIÊN CỨU không.
2. Trích xuất Môn học, Lớp (nếu đoán được), Chủ đề ngắn gọn và các thẻ (tags).
3. Đóng vai \"Anh Thơ\" - một bạn học nữ thông minh, thân thiện để viết một câu bình luận ngắn gợi ý cách giải (tối đa 2 câu).

QUY TẮC TUYỆT ĐỐI:
- Nếu người dùng nhờ VIẾT CODE (Python, C/C++, Java, v.v.): KHÔNG được trả về code hoàn chỉnh.
  Hãy chỉ giải thích thuật toán hoặc viết mã giả (pseudocode) ở dạng mô tả, không phải code thật.
- Nếu nội dung đồi trụy, bạo lực, game thuần giải trí, chính trị, spam:
  đặt is_educational = false và moderation_status = \"rejected\".

- Khi cần hiển thị công thức Toán/Lý/Hóa trong anh_tho_comment, hãy dùng cú pháp LaTeX trong cặp `$...$` hoặc `$$...$$`
  để front-end có thể render đẹp, ví dụ: `$x^2 + y^2 = 1$`, `$\int_0^1 x^2 dx$`, `\ce{H2 + O2 -> H2O}`, `F = ma`.

ĐỊNH DẠNG OUTPUT BẮT BUỘC (JSON chuẩn, không giải thích thêm):
{
  \"is_educational\": true/false,
  \"moderation_status\": \"clean\" | \"needs_review\" | \"rejected\",
  \"reason\": \"Lý do nếu bị từ chối hoặc cần xem lại\" hoặc null,
  \"metadata\": {
    \"subject\": \"Toán học\" | \"Vật lý\" | ... hoặc null,
    \"grade\": 10 | 11 | 12 hoặc null,
    \"topic\": \"Chuỗi số\" hoặc null,
    \"tags\": [\"#ToanHoc\", \"#Lop12\", \"#Logarit\"] hoặc []
  },
  \"anh_tho_comment\": \"Một câu bình luận gợi ý của Anh Thơ hoặc null\",
  \"content_warning\": \"Cảnh báo nhẹ nếu có\" hoặc null,
  \"code_solution_refused\": true/false
}
""".strip()


def run_post_analysis(content: Optional[str], image_urls: Optional[List[str]]) -> Dict[str, Any]:
    """Thực thi gọi Gemini để phân tích bài đăng, dùng lại cho cả API và background task."""
    api_key = get_gemini_api_key()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured"
        )

    model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    # Build parts: system instruction + nội dung
    parts: List[Dict[str, Any]] = [
        {"text": SYSTEM_INSTRUCTION_ANH_THO}
    ]

    if content:
        parts.append({"text": f"\nNỘI DUNG BÀI ĐĂNG:\n{content}"})

    if image_urls:
        parts.append({"text": "\nCÁC HÌNH ẢNH ĐÍNH KÈM:"})
        for img_url in image_urls[:3]:
            img_base64 = download_image_as_base64(img_url)
            if img_base64:
                # Lấy mime type từ prefix
                header, data = img_base64.split(",", 1)
                mime_type = header.split(";")[0].replace("data:", "") or "image/jpeg"
                parts.append(
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": data,
                        }
                    }
                )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": parts,
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "topK": 20,
            "topP": 0.8,
            "maxOutputTokens": 600,
        },
    }

    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()

    data = response.json()
    if "candidates" not in data or not data["candidates"]:
        raise HTTPException(status_code=500, detail="No response from Gemini API")

    ai_response = data["candidates"][0]["content"]["parts"][0]["text"]

    # Cố gắng parse JSON trực tiếp
    try:
        return json.loads(ai_response)
    except Exception:
        # Tìm khối JSON trong text nếu có
        json_match = re.search(r"\{[\s\S]*\}", ai_response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except Exception:
                pass

    # Fallback: tạo JSON tối thiểu
    fallback: Dict[str, Any] = {
        "is_educational": True,
        "moderation_status": "clean",
        "reason": None,
        "metadata": {
            "subject": None,
            "grade": None,
            "topic": None,
            "tags": [],
        },
        "anh_tho_comment": ai_response.strip(),
        "content_warning": None,
        "code_solution_refused": False,
    }
    return fallback


@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_post(request: AnalysisRequest):
    """Phân tích nội dung bài đăng và trả về JSON moderation chuẩn hóa."""
    try:
        result = run_post_analysis(request.content, request.image_urls or [])
        return result
    except HTTPException:
        raise
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Error calling Gemini API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/health")
async def ai_analysis_health():
    """Check if AI analysis is available"""
    api_key = get_gemini_api_key()
    
    model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
    return {
        "available": api_key is not None,
        "model": model_name if api_key else None
    }


@router.post("/comments-summary", response_model=Dict[str, Any])
async def summarize_comments(request: CommentSummaryRequest):
    """Summarize a comment thread using Gemini"""
    api_key = get_gemini_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")

    if not request.comments:
        raise HTTPException(status_code=400, detail="Danh sách bình luận trống")

    try:
        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        formatted_comments = "\n".join(
            [
                f"- {comment.author or 'Người dùng'}: {comment.content.strip()}"
                for comment in request.comments[:30]
                if comment.content
            ]
        )

        prompt = """Bạn là trợ lý AI hỗ trợ tổng hợp thảo luận cho học sinh THPT.
YÊU CẦU:
1. Tóm tắt nội dung chính của luồng bình luận trong tối đa 3 bullet.
2. Nêu ra các gợi ý / bước tiếp theo quan trọng (1-2 bullet) nếu có.
3. Giữ văn phong ngắn gọn, rõ ràng, đúng chuẩn tiếng Việt.
4. Không thêm thông tin ngoài dữ liệu được cung cấp.

Trả về JSON với format:
{
  "summary": ["bullet 1", "bullet 2", ...],
  "action_points": ["gợi ý 1", "gợi ý 2"]
}
Nếu không thể tóm tắt, hãy trả về lý do trong summary.

Nội dung bình luận:
"""

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt + "\n" + formatted_comments}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                "topK": 20,
                "topP": 0.8,
                "maxOutputTokens": 400,
            }
        }

        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()

        if "candidates" in data and len(data["candidates"]) > 0:
            ai_response = data["candidates"][0]["content"]["parts"][0]["text"]
            import json
            import re

            json_match = re.search(r'\{[\s\S]*\}', ai_response, re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group())
                    if "summary" not in result:
                        raise ValueError("Missing summary field")
                    return {
                        "summary": result.get("summary", []),
                        "action_points": result.get("action_points", []),
                    }
                except Exception:
                    pass

            # fallback
            bullets = [line.strip("-• ").strip() for line in ai_response.split("\n") if line.strip()]
            return {
                "summary": bullets[:3],
                "action_points": bullets[3:5],
            }
        else:
            raise HTTPException(status_code=500, detail="No response from Gemini API")

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Error calling Gemini API: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

