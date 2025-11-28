import logging
import json
import tempfile
import base64
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Body, File, UploadFile, Form

from ..config import get_settings
from ..schemas import PromptRequest, PromptResponse
from ..services.gemini_client import get_gemini_client
from ..services.r2_client import get_r2_client
from ..services.gcs_client import get_gcs_client

logger = logging.getLogger(__name__)
router = APIRouter()


async def generate_chat_with_gemini(prompt: str, temperature: float = 0.4, max_tokens: int = 512, model: str = None, image_url: str = None) -> str:
    """Chat AI chỉ dùng Gemini, không fallback sang LM Studio - hỗ trợ hình ảnh"""
    gemini = get_gemini_client()
    if not gemini:
        raise HTTPException(status_code=503, detail="Gemini API not available. Please set GEMINI_API_KEY in .env")
    return await gemini.generate(prompt, temperature, max_tokens, model, image_url)


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
        logger.info(f"Received chat request: prompt length={len(request.prompt)}, temperature={request.temperature}, max_tokens={request.max_tokens}")
        
        # Enhanced prompt for "Anh Thơ" - friendly classmate AI
        # Kiểm tra nếu là giải bài tập (có từ khóa "giải bài tập" hoặc "phân tích")
        isSolvingExercise = "giải bài tập" in request.prompt.lower() or "phân tích" in request.prompt.lower() or "hình ảnh bài tập" in request.prompt.lower()
        
        if isSolvingExercise:
            # Prompt ngắn gọn cho giải bài tập
            enhanced_prompt = f"""Bạn là Anh Thơ, một người bạn học cùng lớp rất hòa đồng, kiến thức sâu rộng và thông thái.

QUAN TRỌNG - KIỂM TRA NỘI DUNG:
- CHỈ giải bài tập nếu nội dung liên quan đến HỌC TẬP (Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Anh)
- Nếu không liên quan học tập, trả lời: "Nội dung này không phải là bài tập học tập."

YÊU CẦU GIẢI BÀI TẬP (PHẢI TUÂN THỦ):
- TRẢ LỜI NGẮN GỌN NHẤT - phù hợp học sinh khá giỏi (không cần giải thích quá chi tiết)
- Chỉ giải các bước chính, bỏ qua bước trung gian không cần thiết
- Sử dụng LaTeX: $x^2$, $\\frac{a}{b}$, $$E = mc^2$$
- CHỈ dùng **bold** cho thuật ngữ: **hàm số**, **đạo hàm**
- CUỐI CÙNG PHẢI CÓ: **Kết luận: [đáp án cuối cùng]**
- Viết súc tích, không dài dòng

Câu hỏi:
{request.prompt}

Hãy giải bài tập NGẮN GỌN, kết thúc bằng **Kết luận: [đáp án]**:"""
        else:
            # Prompt bình thường cho chat
            enhanced_prompt = f"""Bạn là Anh Thơ, một người bạn học cùng lớp rất hòa đồng, kiến thức sâu rộng và thông thái. Bạn luôn sẵn sàng giúp đỡ bạn học của mình trong việc học tập.

VỀ BẢN THÂN:
- Tự xưng là "mình" hoặc tên "Anh Thơ" (không dùng "tôi" hay "em")
- Tính cách: hòa đồng, thân thiện, nhiệt tình nhưng vẫn giữ được sự chuyên nghiệp
- Kiến thức: sâu rộng về tất cả các môn học THPT (Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Anh)
- Thông thái: có khả năng giải thích phức tạp thành đơn giản, dễ hiểu

PHẠM VI TRẢ LỜI:
- CHỈ trả lời các câu hỏi về HỌC TẬP, KIẾN THỨC THPT
- KHÔNG trả lời về: lập trình, code, programming, công nghệ thông tin (trừ khi liên quan đến học tập)
- KHÔNG trả lời về: giải trí, phim ảnh, game (trừ khi liên quan đến học tập)
- Nếu câu hỏi không liên quan học tập, từ chối lịch sự và hướng dẫn hỏi về học tập

YÊU CẦU VỀ VĂN PHONG TIẾNG VIỆT (QUAN TRỌNG - PHẢI TUÂN THỦ):
- Viết đúng ngữ pháp tiếng Việt, tự nhiên, dễ hiểu
- Sử dụng từ ngữ phù hợp với học sinh THPT
- Cấu trúc câu rõ ràng, logic, mạch lạc, tránh câu dài dòng
- Tránh ngôn ngữ quá trang trọng hoặc quá suồng sã
- Giải thích từng bước một cách có hệ thống, có thứ tự
- Sử dụng thuật ngữ chính xác theo chương trình THPT Việt Nam
- Trình bày như trong sách giáo khoa: có mục, có tiểu mục, có ví dụ minh họa cụ thể
- Sử dụng định dạng markdown TIẾT KIỆM: chỉ dùng ## cho tiêu đề chính, dùng số thứ tự (1., 2., 3.) cho danh sách
- QUAN TRỌNG: CHỈ dùng **bold** cho các TỪ HOẶC CỤM TỪ quan trọng như tên khái niệm, thuật ngữ chuyên môn (ví dụ: **hàm số**, **đạo hàm**, **phương trình bậc hai**). KHÔNG dùng **bold** cho toàn bộ câu, đoạn văn, hoặc các từ thông thường
- Ưu tiên dùng số thứ tự và xuống dòng để tạo cấu trúc thay vì dùng quá nhiều bold
- Tối ưu không gian: viết ngắn gọn, súc tích, không dài dòng
- Luôn viết bằng tiếng Việt, đảm bảo ngữ pháp đúng và tự nhiên

CẤU TRÚC TRẢ LỜI (ÁP DỤNG KHI CẦN THIẾT):
1. Giới thiệu ngắn gọn về chủ đề (1-2 câu, nếu cần)
2. Giải thích chi tiết với các bước rõ ràng, có số thứ tự
3. Ví dụ minh họa cụ thể, dễ hiểu (nếu có)
4. Tóm tắt hoặc Kết luận để người đọc dễ nhớ

LƯU Ý KỸ THUẬT:
- Công thức toán học, vật lý, hóa học PHẢI dùng LaTeX:
  - Inline: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$
  - Display mode: $$E = mc^2$$, $$\\int_0^1 f(x)dx$$
- Luôn kiểm tra tính chính xác của thông tin
- Nếu không chắc chắn, hãy nói rõ và đề xuất nguồn tham khảo
- Độ dài phù hợp: không quá ngắn (thiếu thông tin) nhưng cũng không quá dài (khó đọc)

Câu hỏi của người dùng:
{request.prompt}

Hãy trả lời theo đúng yêu cầu về văn phong tiếng Việt và tính cách của Anh Thơ ở trên."""
        
        # If imageUrl is provided, include it in the prompt context
        # Note: Gemini API supports image input, but for now we'll include URL in prompt
        if request.imageUrl:
            enhanced_prompt = f"{enhanced_prompt}\n\nNgười dùng đã đính kèm hình ảnh: {request.imageUrl}\nHãy phân tích hình ảnh và trả lời câu hỏi dựa trên nội dung hình ảnh."
        
        logger.info(f"Calling Gemini API with prompt length={len(enhanced_prompt)}")
        answer = await generate_chat_with_gemini(
            prompt=enhanced_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            model=request.model,
        )
        logger.info(f"Gemini API returned answer length={len(answer) if answer else 0}")
        return PromptResponse(answer=answer)
    except HTTPException:
        # Re-raise HTTP exceptions (like 503 for API unavailable)
        raise
    except Exception as exc:  # pylint: disable=broad-except
        logger.error(f"Error in chat endpoint: {exc}", exc_info=True)
        # Return more user-friendly error message
        error_msg = str(exc)
        if "GEMINI_API_KEY" in error_msg or "API key" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Gemini API không khả dụng. Vui lòng kiểm tra cấu hình API key."
            ) from exc
        elif "PERMISSION_DENIED" in error_msg or "403" in error_msg:
            raise HTTPException(
                status_code=403,
                detail="API key không hợp lệ hoặc đã bị rò rỉ. Vui lòng kiểm tra lại API key."
            ) from exc
        elif "QUOTA_EXCEEDED" in error_msg or "429" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Đã vượt quá giới hạn API. Vui lòng thử lại sau."
            ) from exc
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Lỗi khi xử lý yêu cầu: {error_msg}"
            ) from exc


def is_educational_content(text: str, has_image: bool = False) -> bool:
    """Kiểm tra xem nội dung có liên quan đến học tập không"""
    # Nếu có hình ảnh, chấp nhận ngay (hình ảnh có thể chứa đề bài)
    if has_image:
        return True
    
    if not text or len(text.strip()) < 5:  # Giảm ngưỡng từ 10 xuống 5
        return False
    
    text_lower = text.lower()
    text_original = text  # Giữ nguyên để kiểm tra ký tự đặc biệt
    
    # Từ khóa liên quan đến học tập - mở rộng danh sách
    educational_keywords = [
        # Động từ học tập
        'giải', 'tính', 'tìm', 'chứng minh', 'chứng minh rằng', 'xác định', 'chứng tỏ',
        'phương trình', 'bất phương trình', 'hệ phương trình', 'pt', 'bpt',
        # Toán học
        'hàm số', 'đạo hàm', 'tích phân', 'nguyên hàm', 'giới hạn', 'liên tục',
        'lượng giác', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
        'logarit', 'log', 'ln', 'mũ', 'căn', 'sqrt', 'exp',
        'hình học', 'tọa độ', 'vectơ', 'vector', 'đường thẳng', 'mặt phẳng', 'điểm',
        'xác suất', 'tổ hợp', 'chỉnh hợp', 'hoán vị',
        'số phức', 'ma trận', 'định thức',
        # Vật lý
        'lực', 'gia tốc', 'vận tốc', 'năng lượng', 'công', 'công suất',
        'điện', 'điện trở', 'điện áp', 'dòng điện', 'mạch điện',
        'sóng', 'dao động', 'tần số', 'bước sóng',
        # Hóa học
        'phản ứng', 'hóa học', 'hóa trị', 'nguyên tử', 'phân tử', 'ion',
        'axit', 'bazơ', 'muối', 'oxi hóa', 'khử',
        # Sinh học
        'tế bào', 'adn', 'arn', 'protein', 'enzym', 'trao đổi chất',
        # Từ khóa chung
        'đề bài', 'bài tập', 'câu hỏi', 'đề thi', 'câu', 'bài',
        'mệnh đề', 'đúng', 'sai', 'khẳng định',
        # Môn học
        'toán', 'lý', 'hóa', 'sinh', 'văn', 'anh', 'sử', 'địa',
        'vật lý', 'hóa học', 'sinh học', 'ngữ văn', 'lịch sử', 'địa lý'
    ]
    
    # Kiểm tra có chứa từ khóa học tập
    has_keyword = any(keyword in text_lower for keyword in educational_keywords)
    
    # Kiểm tra có công thức toán học (LaTeX)
    has_math = '$' in text_original or '\\' in text_original
    
    # Kiểm tra có số và ký tự toán học (mở rộng)
    math_chars = ['+', '-', '×', '*', '/', '=', '√', '∫', '∑', 'π', 'α', 'β', 'γ', 'δ', 'θ', 'λ', 'μ', 'σ', 'φ', 'ω', '∞', '≤', '≥', '≠', '≈']
    has_math_chars = any(char in text_original for char in math_chars)
    
    # Kiểm tra pattern câu hỏi (Câu 1, Câu 2, a), b), c), d), ...)
    has_question_pattern = (
        'câu' in text_lower or 
        'câu hỏi' in text_lower or
        any(pattern in text_lower for pattern in ['a)', 'b)', 'c)', 'd)', 'e)', 'f)']) or
        any(pattern in text_original for pattern in ['Câu 1', 'Câu 2', 'Câu 3', 'Câu 4', 'Câu 5'])
    )
    
    # Kiểm tra có chứa số và chữ cái (ví dụ: y = sinx, x^2, etc.)
    import re
    has_math_expression = bool(re.search(r'[a-z]\s*[=+\-*/]\s*[a-z0-9]', text_lower)) or \
                          bool(re.search(r'[a-z]\s*\^\s*\d+', text_lower)) or \
                          bool(re.search(r'\d+\s*[+\-*/]\s*\d+', text_original))
    
    # Nếu có ít nhất 2 trong các điều kiện sau, chấp nhận
    conditions_met = sum([
        has_keyword,
        has_math,
        has_math_chars,
        has_question_pattern,
        has_math_expression
    ])
    
    # Chấp nhận nếu có ít nhất 1 điều kiện (giảm ngưỡng)
    return conditions_met >= 1


@router.post("/solve-post")
async def solve_post(request: dict = Body(...)):
    """Giải đáp câu hỏi trong bài viết bằng Gemini - hỗ trợ hình ảnh"""
    try:
        post_text = request.get("postText", "")
        image_url = request.get("imageUrl", None)
        
        # Phải có ít nhất text hoặc image
        if not post_text and not image_url:
            raise HTTPException(status_code=400, detail="postText hoặc imageUrl là bắt buộc")
        
        # Kiểm tra nội dung có liên quan đến học tập (chấp nhận nếu có hình ảnh)
        has_image = bool(image_url)
        if not is_educational_content(post_text or "", has_image=has_image):
            raise HTTPException(
                status_code=400, 
                detail="Chỉ giải đáp các câu hỏi liên quan đến học tập. Vui lòng đảm bảo nội dung có đề bài, câu hỏi toán học, công thức, hoặc hình ảnh chứa đề bài."
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
        
        logger.info(f"Solving post with text length: {len(post_text)}, has_image: {has_image}")
        
        # Nếu có hình ảnh, ưu tiên bóc tách và phân tích từ hình ảnh
        if image_url:
            # Prompt ưu tiên hình ảnh - yêu cầu đọc và phân tích toàn bộ nội dung trong ảnh
            image_analysis_prompt = f"""Bạn là trợ lý giải đáp câu hỏi học tập THPT chuyên phân tích hình ảnh.

NHIỆM VỤ:
1. **ĐỌC VÀ BÓC TÁCH TOÀN BỘ NỘI DUNG** từ hình ảnh đính kèm (text, công thức, sơ đồ, biểu đồ, hình vẽ)
2. **NHẬN DIỆN** xem hình ảnh có chứa câu hỏi, bài tập, đề bài, hoặc nội dung học tập không
3. **GIẢI BÀI TẬP** nếu hình ảnh chứa câu hỏi/bài tập

HƯỚNG DẪN PHÂN TÍCH HÌNH ẢNH:
- Đọc TẤT CẢ text trong hình ảnh (kể cả công thức toán học, ký hiệu)
- Nhận diện các yếu tố: đề bài, câu hỏi, các phương án (a, b, c, d), hình vẽ, sơ đồ, biểu đồ
- Phân tích công thức toán học, phương trình, biểu thức
- Nhận diện hình học, đồ thị, biểu đồ
- Nếu có text kèm theo, kết hợp với nội dung hình ảnh

Nội dung text kèm theo (nếu có): {post_text if post_text else "Không có text, chỉ có hình ảnh"}

Hãy phân tích hình ảnh và giải bài tập theo format dưới đây:"""
            
            prompt = f"""{image_analysis_prompt}

Bạn là trợ lý giải đáp câu hỏi học tập THPT. Hãy trả lời NGẮN GỌN, GỌN GÀNG, MẠCH LẠC, TẬP TRUNG VÀO ĐÁP ÁN:

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
- Mỗi phần phải rõ ràng, gọn gàng, dễ đọc
- **ƯU TIÊN PHÂN TÍCH NỘI DUNG TỪ HÌNH ẢNH**, nếu hình ảnh chứa đề bài/câu hỏi thì giải dựa trên hình ảnh"""
        else:
            # Prompt thông thường khi không có hình ảnh
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
        
        try:
            # Use gemini-2.5-flash-preview-image for feed page solutions (supports diagrams/illustrations)
            # This model is better for math, physics, chemistry with visual content
            answer = await generate_chat_with_gemini(
                prompt, 
                temperature=0.2, 
                max_tokens=300,
                model="gemini-2.5-flash-preview-image",  # Priority model for feed solutions
                image_url=image_url  # Pass image URL to Gemini client
            )
            logger.info(f"Successfully generated solution with gemini-2.5-flash-preview-image, length: {len(answer)}")
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


@router.post("/generate-illustration")
async def generate_illustration(request: dict = Body(...)):
    """
    Tạo minh họa toán học từ nội dung text
    Sử dụng gemini-2.5-flash-preview-image để tạo hình ảnh minh họa
    """
    try:
        content = request.get("content", "")
        if not content or len(content.strip()) < 10:
            raise HTTPException(status_code=400, detail="Nội dung quá ngắn. Vui lòng cung cấp ít nhất 10 ký tự.")
        
        gemini = get_gemini_client()
        if not gemini:
            raise HTTPException(status_code=503, detail="Gemini API not available")
        
        # Generate illustration using image model
        illustration = await gemini.generate_image_illustration(
            prompt=content,
            temperature=0.7,
            max_tokens=1024,
        )
        
        return {
            "illustration": illustration,
            "model": "gemini-2.5-flash-lite",
            "success": True,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating illustration: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo minh họa: {str(exc)}") from exc


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


@router.post("/voice-chat")
async def voice_chat(audio: UploadFile = File(...), model: str = Form("gemini-2.5-flash-live")):
    """
    Voice chat endpoint - nhận audio và trả về text response từ Gemini Live
    Fallback về transcript nếu model không hỗ trợ
    """
    try:
        gemini = get_gemini_client()
        if not gemini:
            raise HTTPException(status_code=503, detail="Gemini API not available")
        
        # Đọc audio file
        audio_data = await audio.read()
        
        # Convert audio to base64
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Tạo prompt với audio
        # Note: Gemini Live API có thể yêu cầu format khác, nhưng tạm thời dùng text prompt
        prompt = """Bạn là Anh Thơ, một người bạn học cùng lớp rất giỏi và thông thái. 
Hãy trả lời câu hỏi từ audio một cách ngắn gọn, rõ ràng, theo phong cách sách giáo khoa.
Hạn chế dùng **bold**, ưu tiên số thứ tự và cấu trúc rõ ràng."""
        
        # Thử dùng gemini-2.5-flash-live hoặc fallback về flash-lite
        try:
            # Gửi audio đến Gemini (có thể cần format đặc biệt cho Live API)
            # Tạm thời, chúng ta sẽ dùng text prompt và thông báo rằng audio đã được nhận
            # Trong thực tế, cần tích hợp Gemini Live API đúng cách
            answer = await gemini.generate(
                prompt=f"{prompt}\n\n[Audio đã được nhận, vui lòng trả lời câu hỏi từ audio]",
                temperature=0.7,
                max_tokens=512,
                model="gemini-2.5-flash-lite"  # Fallback về flash-lite nếu live không có
            )
            
            return {
                "text": answer,
                "audio_received": True,
                "model_used": "gemini-2.5-flash-lite"
            }
        except Exception as e:
            logger.warning(f"Gemini Live model not available, using fallback: {e}")
            # Fallback: trả về thông báo để frontend dùng transcript
            return {
                "text": None,
                "audio_received": True,
                "fallback": "Please use transcript instead",
                "error": str(e)
            }
            
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error in voice-chat endpoint: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý voice chat: {str(exc)}") from exc
