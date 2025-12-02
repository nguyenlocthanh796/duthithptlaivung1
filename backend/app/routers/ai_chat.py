"""
AI Chat API endpoints using Gemini
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import requests

from app.config import settings
from app.sql_database import db

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
    # Ngữ cảnh thêm từ frontend (vd: nội dung bài đăng, môn, lớp...)
    context: Optional[str] = None
    # ID bài viết (nếu câu hỏi đến từ nút "Giải giúp mình với")
    post_id: Optional[str] = None


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
        
        # Chuẩn hoá message cuối cùng gửi cho Gemini, có kèm ngữ cảnh nếu có.
        if request.context:
            full_message = (
                "Ngữ cảnh bài đăng của học sinh:\n"
                f"{request.context.strip()}\n\n"
                "Câu hỏi hiện tại của học sinh:\n"
                f"{request.message.strip()}"
            )
        else:
            full_message = request.message.strip()

        # Để tránh lỗi 400 lặp lại ở các lượt chat sau, tạm thời KHÔNG gửi toàn bộ history lên Gemini
        # mà chỉ gửi message hiện tại (stateless chat).
        contents = [{
            "role": "user",
            "parts": [{"text": full_message}]
        }]
        
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
            # Không bao giờ trả raw message (có thể lộ API key) ra frontend.
            # Ghi log đơn giản ở server, trả lời thân thiện cho người dùng.
            print(f"[AI_CHAT_HTTP_ERROR] {e}")

            conversation_id = request.conversation_id or f"conv_{hash(full_message) % 1000000}"
            model_name = settings.GEMINI_MODEL or "gemini-2.0-flash-exp"

            safe_msg = (
                "Anh Thơ đang hơi bận hoặc câu hỏi này chưa được hỗ trợ hoàn toàn. "
                "Cậu thử ghi rõ đề bài hơn, rút gọn nội dung hoặc gửi lại sau một lúc nhé."
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
        conversation_id = request.conversation_id or f"conv_{hash(full_message) % 1000000}"
        
        model_name = settings.GEMINI_MODEL or "gemini-2.0-flash-exp"

        # Lưu log đơn giản cho lần chat này (phục vụ hồ sơ học tập / lịch sử theo bài đăng)
        try:
            log_data: Dict[str, Any] = {
                "message": request.message,
                "context": request.context,
                "post_id": request.post_id,
                "conversation_id": conversation_id,
                "model": model_name,
                "ai_response": ai_response,
            }
            db.create("ai_chat_logs", log_data)
        except Exception as log_err:
            # Không làm hỏng flow chính nếu ghi log thất bại
            print(f"[AI_CHAT_LOG_ERROR] {log_err}")

        return {
            "response": ai_response,
            "conversation_id": conversation_id,
            "model": model_name
        }
        
    except requests.exceptions.RequestException as e:
        # Lỗi mạng / timeout khi gọi Gemini → không trả 503 nữa, trả câu trả lời an toàn.
        print(f"[AI_CHAT_REQUEST_ERROR] {e}")
        conversation_id = request.conversation_id or f"conv_{hash(request.message) % 1000000}"
        model_name = settings.GEMINI_MODEL or "gemini-2.0-flash-exp"
        safe_msg = (
            "Hiện tại kết nối tới dịch vụ AI đang không ổn định nên Anh Thơ tạm thời không trả lời được. "
            "Cậu thử gửi lại sau một lúc, hoặc tiếp tục xem các bài trên Bảng tin nhé."
        )
        return {
            "response": safe_msg,
            "conversation_id": conversation_id,
            "model": model_name,
        }
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

