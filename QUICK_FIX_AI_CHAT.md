# Hướng dẫn khắc phục lỗi AI Chat

## Vấn đề
AI Chat trả về lỗi 500 từ backend localhost:8000

## Giải pháp (chọn 1 trong 3)

### Giải pháp 1: Chạy Backend Local (Khuyến nghị cho development)

1. Mở terminal mới
2. Chạy backend:
```bash
cd backend
python start.py
# hoặc
uvicorn app.main:app --reload --port 8000
```

3. Đảm bảo file `.env` trong `backend/` có:
```env
GEMINI_API_KEY=your-api-key-here
```

### Giải pháp 2: Dùng Production Backend (Tự động fallback)

Frontend đã được cấu hình để tự động fallback sang production backend nếu localhost fail.

Production backend: `https://duthi-backend-626004693464.us-central1.run.app`

**Không cần làm gì thêm** - hệ thống sẽ tự động thử production backend.

### Giải pháp 3: Dùng Direct Gemini API

1. Tạo file `.env` trong thư mục `frontend/`:
```env
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

2. Restart dev server:
```bash
npm run dev
```

Frontend sẽ tự động dùng direct API nếu backend không khả dụng.

## Kiểm tra

1. Mở AI Chat popup
2. Gửi một câu hỏi test
3. Xem console để kiểm tra:
   - Nếu thấy "trying production backend" → đang dùng production
   - Nếu thấy "trying direct API" → đang dùng direct API
   - Nếu vẫn lỗi → kiểm tra API key

## Lưu ý

- Production backend có thể có rate limit
- Direct API cần API key hợp lệ
- Backend local cần cấu hình đúng `.env`

