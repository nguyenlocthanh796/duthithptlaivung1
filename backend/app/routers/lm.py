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
        
        prompt = f"""Bạn là trợ lý giải đáp câu hỏi học tập THPT. Hãy trả lời NGẮN GỌN, GỌN GÀNG, TẬP TRUNG VÀO ĐÁP ÁN:

{post_text}

FORMAT YÊU CẦU (BẮT BUỘC):
1. Đáp án/Kết quả: Viết ngắn gọn, đi thẳng vào vấn đề
2. Giải thích ngắn (nếu cần): Tối đa 2-3 câu, cực kỳ xúc tích
3. KẾT LUẬN: Phải in đậm bằng **text** (markdown bold)

VÍ DỤ FORMAT ĐÚNG:
**Đáp án: Hóa trị Fe có thể là II hoặc III.**

FeCl₂ (Fe có hóa trị II), FeCl₃ (Fe có hóa trị III).

**Kết luận: Hóa trị Fe = 2, 3 là đúng.**

QUAN TRỌNG:
- Tổng độ dài: 50-100 từ, cực kỳ ngắn gọn
- Kết luận PHẢI in đậm bằng **text**
- KHÔNG giải thích dài dòng
- KHÔNG viết "Hy vọng bạn đã hiểu", "Chúc bạn học tốt"
- Công thức toán học dùng LaTeX: $x^2$ hoặc $$\\int_0^1 x dx$$
- Sắp xếp gọn gàng: Đáp án → Giải thích ngắn → Kết luận (in đậm)"""
        
        logger.info(f"Solving post with text length: {len(post_text)}")
        answer = await generate_chat_with_gemini(prompt, temperature=0.2, max_tokens=300)
        logger.info(f"Successfully generated solution, length: {len(answer)}")
        return {"solution": answer, "solvedAt": None}
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
        
        prompt = f"""Bạn là trợ lý giải đáp câu hỏi học tập THPT. Hãy trả lời NGẮN GỌN, GỌN GÀNG, TẬP TRUNG VÀO ĐÁP ÁN:
{comment_text}

FORMAT YÊU CẦU (BẮT BUỘC):
1. Đáp án/Kết quả: Viết ngắn gọn, đi thẳng vào vấn đề
2. Giải thích ngắn (nếu cần): Tối đa 1-2 câu, cực kỳ xúc tích
3. KẾT LUẬN: Phải in đậm bằng **text** (markdown bold)

QUAN TRỌNG:
- Tổng độ dài: 30-60 từ, cực kỳ ngắn gọn
- Kết luận PHẢI in đậm bằng **text**
- KHÔNG giải thích dài dòng
- Công thức toán học dùng LaTeX: $x^2$
- Sắp xếp gọn gàng: Đáp án → Kết luận (in đậm)"""
        
        answer = await generate_chat_with_gemini(prompt, temperature=0.2, max_tokens=200)
        return {"solution": answer}
    except HTTPException:
        raise
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=500, detail=str(exc)) from exc
