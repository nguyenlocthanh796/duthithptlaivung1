"""
AI Chat API endpoints using Gemini
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import requests

from app.config import settings

router = APIRouter(prefix="/api/ai-chat", tags=["ai-chat"])


# ===================== ANH THƠ PERSONA =====================
ANH_THO_SYSTEM_PROMPT = """
Bạn là \"Anh Thơ\" – bạn học cùng lớp, đồng hành học tập với học sinh THPT.

TÍNH CÁCH:
- Thông thái, nhẹ nhàng, khiêm tốn, hơi mọt sách (nerdy) nhưng thân thiện.
- Xưng hô ngang hàng: dùng \"tớ\" / \"mình\" và \"cậu\"; tuyệt đối KHÔNG dùng Thầy/Cô/Em.

PHẠM VI NHIỆM VỤ:
- Chỉ hỗ trợ các chủ đề liên quan đến HỌC TẬP và NGHIÊN CỨU:
  + Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Anh, Tin...
  + Kỹ năng làm bài thi, ôn tập, tư duy logic, phương pháp ghi nhớ.
  + Kiến thức khoa học, công nghệ, đời sống có liên quan đến chương trình học.

GUARDRAILS:
1. Nếu người dùng hỏi về chủ đề ngoài học tập (showbiz, drama, chính trị, gossip, game thuần giải trí...):
   - Từ chối nhẹ nhàng và hướng lại về việc học.
   - Ví dụ câu trả lời: \"Chủ đề này mình không rành lắm, hay là tụi mình quay lại luyện bài học hoặc ôn Toán/Văn lúc nãy nhé?\"

2. KHÔNG VIẾT CODE HOÀN CHỈNH:
   - Nếu người dùng yêu cầu viết code (Python, C/C++, Java, JS, v.v.):
     + KHÔNG được cung cấp đoạn code hoàn chỉnh có thể copy-paste để nộp bài.
     + Thay vào đó:
       * Giải thích thuật toán, tư duy, cách phân tích đề.
       * Có thể đưa ra pseudocode (mã giả) hoặc mô tả từng bước bằng tiếng Việt.
       * Khuyến khích người dùng tự viết lại code dựa trên hướng dẫn.

3. Khi giải thích:
   - Ưu tiên rõ ràng, từng bước, dễ hiểu cho học sinh THPT.
   - Với bài khó, nên bắt đầu từ ví dụ đơn giản tương tự rồi mới nâng dần độ khó.
   - Khi cần viết công thức Toán/Lý/Hóa, hãy dùng cú pháp LaTeX trong cặp `$...$` (inline) hoặc `$$...$$` (block),
     ví dụ: `$x^2 + y^2 = 1$`, `$\int_0^1 x^2 dx$`, `\ce{H2 + O2 -> H2O}`, `F = ma`.
""".strip()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    response: str
    conversation_id: str


def get_gemini_api_key():
    """Get Gemini API key from settings"""
    if settings.GEMINI_API_KEY:
        return settings.GEMINI_API_KEY
    
    # Try to get from environment variable
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        return api_key
    
    return None


@router.post("/chat", response_model=Dict[str, Any])
async def chat_with_ai(request: ChatRequest):
    """Chat with AI using Gemini API"""
    api_key = get_gemini_api_key()
    
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Please set GEMINI_API_KEY in environment variables."
        )
    
    try:
        # Prepare messages for Gemini API
        # Gemini API format: https://ai.google.dev/api/generate-content
        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        
        # Build conversation history
        contents = []
        for msg in request.history[-10:]:  # Last 10 messages for context
            # Gemini v1 sử dụng role "user" và "model" thay vì "assistant"
            role = "user" if msg.role == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.content}]
            })
        
        # Add current user message
        contents.append({
            "role": "user",
            "parts": [{"text": request.message}]
        })
        
        # System instruction cho persona Anh Thơ
        system_instruction = {
            "role": "system",
            "parts": [{"text": ANH_THO_SYSTEM_PROMPT}]
        }
        
        payload = {
            "systemInstruction": system_instruction,
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            }
        }
        
        response = requests.post(url, json=payload, timeout=30)
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            # Trả lỗi Gemini dưới dạng câu trả lời của Anh Thơ (200 OK) thay vì 503,
            # giúp frontend hiển thị thân thiện hơn.
            error_msg = ""
            try:
                data = response.json()
                error_msg = data.get("error", {}).get("message") or str(e)
            except Exception:
                error_msg = response.text or str(e)

            conversation_id = request.conversation_id or f"conv_{hash(request.message) % 1000000}"
            model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"

            safe_msg = (
                "Anh Thơ không thể trả lời câu này vì yêu cầu gửi tới Gemini bị lỗi: "
                f"{error_msg}. Cậu thử rút gọn lại đề bài hoặc hỏi theo cách khác nhé."
            )
            return {
                "response": safe_msg,
                "conversation_id": conversation_id,
                "model": model_name,
            }

        data = response.json()
        
        # Extract response text
        if "candidates" in data and len(data["candidates"]) > 0:
            ai_response = data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise HTTPException(status_code=500, detail="No response from Gemini API")
        
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or f"conv_{hash(request.message) % 1000000}"
        
        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
        return {
            "response": ai_response,
            "conversation_id": conversation_id,
            "model": model_name
        }
        
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
async def ai_chat_health():
    """Check if AI chat is available"""
    api_key = get_gemini_api_key()
    
    model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
    return {
        "available": api_key is not None,
        "model": model_name if api_key else None
    }

