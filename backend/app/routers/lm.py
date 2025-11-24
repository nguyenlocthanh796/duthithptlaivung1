import logging

from fastapi import APIRouter, HTTPException, Body

from ..config import get_settings
from ..schemas import PromptRequest, PromptResponse
from ..services.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)
router = APIRouter()


async def generate_chat_with_gemini(prompt: str, temperature: float = 0.4, max_tokens: int = 512) -> str:
    """Chat AI chỉ dùng Gemini, không fallback sang LM Studio"""
    gemini = get_gemini_client()
    if not gemini:
        raise HTTPException(status_code=503, detail="Gemini API not available. Please set GEMINI_API_KEY in .env")
    return await gemini.generate(prompt, temperature, max_tokens)


@router.get("/test")
async def ai_test():
    try:
        answer = await generate_chat_with_gemini("1+1 bằng mấy?", temperature=0.0, max_tokens=16)
        return {"question": "1+1?", "answer": answer}
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chat", response_model=PromptResponse)
async def chat(request: PromptRequest):
    try:
        # Enhanced prompt for educational content only, no programming
        enhanced_prompt = f"""Bạn là trợ lý AI học tập chuyên về kiến thức THPT (Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Anh).

YÊU CẦU:
- CHỈ trả lời các câu hỏi về HỌC TẬP, KIẾN THỨC THPT
- KHÔNG hỗ trợ code lập trình, lập trình, programming
- Nếu câu hỏi về lập trình, từ chối lịch sự và hướng dẫn học tập thay thế
- Trả lời chính xác, đầy đủ, có công thức toán học nếu cần (dùng LaTeX)
- Giải thích rõ ràng, dễ hiểu

Câu hỏi của người dùng:
{request.prompt}

Hãy trả lời:"""
        
        answer = await generate_chat_with_gemini(
            prompt=enhanced_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        return PromptResponse(answer=answer)
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def is_educational_content(text: str) -> bool:
    """Kiểm tra xem nội dung có liên quan đến học tập không"""
    if not text or len(text.strip()) < 10:
        return False
    
    # Từ khóa liên quan đến học tập
    educational_keywords = [
        'giải', 'tính', 'tìm', 'chứng minh', 'chứng minh rằng',
        'phương trình', 'bất phương trình', 'hệ phương trình',
        'hàm số', 'đạo hàm', 'tích phân', 'nguyên hàm',
        'lượng giác', 'sin', 'cos', 'tan', 'cot',
        'logarit', 'mũ', 'căn', 'sqrt',
        'hình học', 'tọa độ', 'vectơ', 'đường thẳng', 'mặt phẳng',
        'xác suất', 'tổ hợp', 'chỉnh hợp',
        'đề bài', 'bài tập', 'câu hỏi', 'đề thi',
        'toán', 'lý', 'hóa', 'sinh', 'văn', 'anh', 'sử', 'địa'
    ]
    
    text_lower = text.lower()
    # Kiểm tra có chứa từ khóa học tập
    has_keyword = any(keyword in text_lower for keyword in educational_keywords)
    
    # Kiểm tra có công thức toán học (LaTeX)
    has_math = '$' in text or '\\' in text
    
    # Kiểm tra có số và ký tự toán học
    has_math_chars = any(char in text for char in ['+', '-', '×', '*', '/', '=', '√', '∫', '∑', 'π'])
    
    return has_keyword or has_math or has_math_chars


@router.post("/solve-post")
async def solve_post(request: dict = Body(...)):
    """Giải đáp câu hỏi trong bài viết bằng Gemini"""
    try:
        post_text = request.get("postText", "")
        if not post_text:
            raise HTTPException(status_code=400, detail="postText is required")
        
        # Kiểm tra nội dung có liên quan đến học tập
        if not is_educational_content(post_text):
            raise HTTPException(
                status_code=400, 
                detail="Chỉ giải đáp các câu hỏi liên quan đến học tập. Vui lòng đảm bảo nội dung có đề bài, câu hỏi toán học, hoặc công thức."
            )
        
        prompt = f"""Bạn là trợ lý giải đáp câu hỏi học tập THPT. Hãy trả lời NGẮN GỌN, GỌN GÀNG, MẠCH LẠC, TẬP TRUNG VÀO ĐÁP ÁN:

{post_text}

FORMAT YÊU CẦU (BẮT BUỘC - PHẢI TUÂN THỦ):
1. **Đáp án trực tiếp**: Viết ngắn gọn, đi thẳng vào vấn đề (1-2 câu)
2. **Cách xác định** (nếu cần): Dùng heading ## Cách xác định và danh sách số thứ tự (1., 2., 3.) để liệt kê, mỗi số thứ tự phải xuống dòng riêng
3. **Quy tắc** (nếu cần): Dùng heading ## Quy tắc và danh sách số thứ tự (1., 2., 3.) để liệt kê, mỗi số thứ tự phải xuống dòng riêng
4. **Ví dụ** (nếu cần): Dùng heading ## Ví dụ và danh sách số thứ tự (1., 2., 3.) để liệt kê, mỗi số thứ tự phải xuống dòng riêng
5. **Kết luận**: PHẢI in đậm bằng **Kết luận: [nội dung]** hoặc **Kết luận:** [nội dung in đậm]

VÍ DỤ FORMAT ĐÚNG:
**Đáp án: Hóa trị Fe có thể là II hoặc III.**

## Cách xác định hóa trị
1. Dựa vào công thức hợp chất
2. Áp dụng quy tắc hóa trị
3. Xem xét các hợp chất phổ biến

## Quy tắc hóa trị
1. Tổng hóa trị của các nguyên tố = 0
2. Fe trong FeCl₂ có hóa trị II
3. Fe trong FeCl₃ có hóa trị III

## Ví dụ
1. FeCl₂: Fe có hóa trị II
2. Fe₂O₃: Fe có hóa trị III

**Kết luận: Hóa trị Fe = 2, 3 là đúng.**

QUAN TRỌNG:
- Tổng độ dài: 80-150 từ, ngắn gọn nhưng đầy đủ
- Dùng markdown: ## cho headings, - cho lists, **text** cho bold
- KHÔNG giải thích dài dòng, KHÔNG viết "Hy vọng bạn đã hiểu"
- Công thức toán học dùng LaTeX: $x^2$ hoặc $$\\int_0^1 x dx$$
- Sắp xếp: Đáp án → Cách xác định → Quy tắc → Ví dụ → Kết luận (in đậm)
- Mỗi phần phải rõ ràng, gọn gàng, dễ đọc"""
        
        logger.info(f"Solving post with text length: {len(post_text)}")
        try:
            answer = await generate_chat_with_gemini(prompt, temperature=0.2, max_tokens=300)
            logger.info(f"Successfully generated solution, length: {len(answer)}")
            return {"solution": answer, "solvedAt": None}
        except HTTPException as http_exc:
            # Re-raise HTTP exceptions (like 503 for API unavailable)
            raise http_exc
        except Exception as gemini_exc:
            # Handle Gemini API errors specifically
            error_msg = str(gemini_exc)
            logger.error(f"Gemini API error: {error_msg}", exc_info=True)
            
            # Check for specific error types
            if "PERMISSION_DENIED" in error_msg or "403" in error_msg or "leaked" in error_msg.lower():
                raise HTTPException(
                    status_code=403,
                    detail="API key không hợp lệ hoặc đã bị rò rỉ. Vui lòng kiểm tra lại API key trong cấu hình."
                ) from gemini_exc
            elif "QUOTA_EXCEEDED" in error_msg or "429" in error_msg:
                raise HTTPException(
                    status_code=429,
                    detail="Đã vượt quá giới hạn API. Vui lòng thử lại sau."
                ) from gemini_exc
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Lỗi khi gọi Gemini API: {error_msg}"
                ) from gemini_exc
    except HTTPException:
        raise
    except Exception as exc:  # pylint: disable=broad-except
        logger.error(f"Error solving post: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi khi giải bài tập: {str(exc)}") from exc


@router.post("/solve-comment")
async def solve_comment(request: dict = Body(...)):
    """Giải đáp câu hỏi trong bình luận bằng Gemini"""
    try:
        comment_text = request.get("commentText", "")
        if not comment_text:
            raise HTTPException(status_code=400, detail="commentText is required")
        
        # Kiểm tra nội dung có liên quan đến học tập
        if not is_educational_content(comment_text):
            raise HTTPException(
                status_code=400, 
                detail="Chỉ giải đáp các câu hỏi liên quan đến học tập. Vui lòng đảm bảo nội dung có đề bài, câu hỏi toán học, hoặc công thức."
            )
        
        prompt = f"""Bạn là trợ lý giải đáp câu hỏi học tập THPT. Hãy trả lời NGẮN GỌN, GỌN GÀNG, MẠCH LẠC, TẬP TRUNG VÀO ĐÁP ÁN:
{comment_text}

FORMAT YÊU CẦU (BẮT BUỘC - PHẢI TUÂN THỦ):
1. **Đáp án trực tiếp**: Viết ngắn gọn, đi thẳng vào vấn đề (1 câu)
2. **Giải thích ngắn** (nếu cần): Tối đa 1-2 câu, cực kỳ xúc tích
3. **Kết luận**: Phải in đậm bằng **Kết luận: [nội dung]**

VÍ DỤ FORMAT ĐÚNG:
**Đáp án: Hóa trị Fe có thể là II hoặc III.**

FeCl₂ (Fe có hóa trị II), FeCl₃ (Fe có hóa trị III).

**Kết luận: Hóa trị Fe = 2, 3 là đúng.**

QUAN TRỌNG:
- Tổng độ dài: 40-80 từ, ngắn gọn nhưng đầy đủ
- Dùng markdown: **text** cho bold
- KHÔNG giải thích dài dòng, KHÔNG viết "Hy vọng bạn đã hiểu"
- Công thức toán học dùng LaTeX: $x^2$ hoặc $$\\int_0^1 x dx$$
- Sắp xếp: Đáp án → Giải thích ngắn → Kết luận (in đậm)
- Mỗi phần phải rõ ràng, gọn gàng, dễ đọc"""
        
        try:
            answer = await generate_chat_with_gemini(prompt, temperature=0.2, max_tokens=200)
            return {"solution": answer}
        except HTTPException as http_exc:
            raise http_exc
        except Exception as gemini_exc:
            error_msg = str(gemini_exc)
            logger.error(f"Gemini API error in solve-comment: {error_msg}", exc_info=True)
            
            if "PERMISSION_DENIED" in error_msg or "403" in error_msg or "leaked" in error_msg.lower():
                raise HTTPException(
                    status_code=403,
                    detail="API key không hợp lệ hoặc đã bị rò rỉ. Vui lòng kiểm tra lại API key trong cấu hình."
                ) from gemini_exc
            elif "QUOTA_EXCEEDED" in error_msg or "429" in error_msg:
                raise HTTPException(
                    status_code=429,
                    detail="Đã vượt quá giới hạn API. Vui lòng thử lại sau."
                ) from gemini_exc
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Lỗi khi gọi Gemini API: {error_msg}"
                ) from gemini_exc
    except HTTPException:
        raise
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=500, detail=str(exc)) from exc
