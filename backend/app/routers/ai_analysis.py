"""
AI Analysis API endpoints for posts and images
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import requests
import base64

from app.config import settings

router = APIRouter(prefix="/api/ai-analysis", tags=["ai-analysis"])


class AnalysisRequest(BaseModel):
    content: Optional[str] = None  # Text content
    image_urls: Optional[List[str]] = []  # Image URLs
    post_id: Optional[str] = None


class AnalysisResponse(BaseModel):
    subject: Optional[str] = None  # Môn học
    grade: Optional[str] = None  # Lớp
    answer: Optional[str] = None  # Đáp án
    conclusion: Optional[str] = None  # Kết luận
    is_educational: bool = False  # Có liên quan học tập không


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


@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_post(request: AnalysisRequest):
    """Analyze post content and images to extract educational information"""
    api_key = get_gemini_api_key()
    
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured"
        )
    
    try:
        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        
        # Build prompt
        prompt = """Bạn là trợ lý AI chuyên phân tích nội dung học tập THPT. 
Nhiệm vụ: Phân tích nội dung và đưa ra kết quả ngắn gọn, tập trung vào đáp án và kết luận.

YÊU CẦU:
1. Xác định môn học: Toán, Lý, Hóa, Sinh, Văn, Anh, Sử, Địa, GDCD, hoặc "Không xác định"
2. Xác định lớp: 10, 11, 12, hoặc "Không xác định"
3. Nếu có câu hỏi/bài tập: Đưa ra đáp án ngắn gọn, rõ ràng
4. Đưa ra kết luận ngắn gọn (tối đa 2-3 câu, tập trung vào điểm chính)
5. Chỉ phân tích nếu nội dung liên quan học tập THPT

QUAN TRỌNG:
- Đáp án phải chính xác, ngắn gọn
- Kết luận phải in đậm, nổi bật
- Nếu không liên quan học tập, trả về is_educational: false

FORMAT OUTPUT (JSON):
{
  "subject": "Môn học",
  "grade": "Lớp",
  "answer": "Đáp án ngắn gọn (nếu có)",
  "conclusion": "**Kết luận ngắn gọn** (in đậm)",
  "is_educational": true/false
}

Ví dụ:
- Nếu là bài toán: subject="Toán", grade="12", answer="x = 5", conclusion="**Đây là phương trình bậc hai, nghiệm là x = 5**"
- Nếu không liên quan: {"is_educational": false, "conclusion": "Nội dung không liên quan học tập"}

Hãy phân tích và trả về JSON hợp lệ."""

        # Prepare content parts
        parts = [{"text": prompt}]
        
        # Add text content if available
        if request.content:
            parts.append({"text": f"\n\nNội dung:\n{request.content}"})
        
        # Add images if available
        if request.image_urls:
            parts.append({"text": "\n\nHình ảnh:"})
            for img_url in request.image_urls[:3]:  # Limit to 3 images
                img_base64 = download_image_as_base64(img_url)
                if img_base64:
                    parts.append({
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": img_base64.split(",")[1]  # Remove data:image/jpeg;base64, prefix
                        }
                    })
        
        payload = {
            "contents": [{
                "role": "user",
                "parts": parts
            }],
            "generationConfig": {
                "temperature": 0.3,
                "topK": 20,
                "topP": 0.8,
                "maxOutputTokens": 500,  # Keep it short
            }
        }
        
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract response text
        if "candidates" in data and len(data["candidates"]) > 0:
            ai_response = data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Try to parse JSON from response
            import json
            import re
            
            # Extract JSON from response
            json_match = re.search(r'\{[^{}]*\}', ai_response, re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group())
                    return result
                except:
                    pass
            
            # If JSON parsing fails, try to extract information manually
            result = {
                "is_educational": True,
                "subject": "Không xác định",
                "grade": "Không xác định",
                "answer": None,
                "conclusion": ai_response.strip()
            }
            
            # Try to extract subject
            subjects = ["Toán", "Lý", "Hóa", "Sinh", "Văn", "Anh", "Sử", "Địa", "GDCD"]
            for subj in subjects:
                if subj.lower() in ai_response.lower():
                    result["subject"] = subj
                    break
            
            # Try to extract grade
            for grade in ["10", "11", "12"]:
                if grade in ai_response:
                    result["grade"] = grade
                    break
            
            return result
        else:
            raise HTTPException(status_code=500, detail="No response from Gemini API")
        
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

