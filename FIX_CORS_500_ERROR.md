# 🔧 Khắc phục lỗi CORS và 500 Error

## ⚠️ Lỗi hiện tại

1. **CORS Policy Error**: `Access to XMLHttpRequest ... has been blocked by CORS policy`
2. **500 Internal Server Error**: `POST .../questions/clone net::ERR_FAILED 500`

## 🔍 Nguyên nhân

### CORS Error
- Backend (Cloud Run) đang từ chối kết nối từ Frontend (Firebase Hosting)
- CORS middleware có thể chưa được cấu hình đúng hoặc thiếu Firebase URLs

### 500 Error
- Backend crash khi xử lý `/questions/clone`
- Có thể do:
  - API Key không hợp lệ hoặc hết hạn
  - Gemini API call fail
  - Logic xử lý JSON response bị lỗi

## ✅ Giải pháp

### Bước 1: Kiểm tra CORS Configuration

File `backend/app/main.py` đã được cập nhật với Firebase URLs:

```python
firebase_hosting_origins = [
    "https://gen-lang-client-0581370080.web.app",
    "https://gen-lang-client-0581370080.firebaseapp.com"
]
```

**Nếu vẫn lỗi CORS, kiểm tra:**

1. **Deploy lại backend:**
   ```powershell
   python deploy.py
   # Chọn option 1: Deploy Backend
   ```

2. **Kiểm tra Cloud Run Environment Variables:**
   ```powershell
   gcloud run services describe duthi-backend --region=us-central1 --format="value(spec.template.spec.containers[0].env)"
   ```

3. **Đảm bảo `ALLOWED_ORIGINS` có Firebase URLs:**
   ```
   ALLOWED_ORIGINS=https://gen-lang-client-0581370080.web.app,https://gen-lang-client-0581370080.firebaseapp.com
   ```

### Bước 2: Sửa lỗi 500 trong `/questions/clone`

**Nguyên nhân có thể:**
- API Key không hợp lệ
- Gemini API không trả về JSON đúng format
- Error handling chưa đầy đủ

**Đã cập nhật:**
- Cải thiện error handling trong `backend/app/routers/questions.py`
- Thêm logging chi tiết
- Xử lý các trường hợp lỗi API key, quota, permission

**Kiểm tra:**

1. **Xem logs Cloud Run:**
   ```powershell
   gcloud run services logs read duthi-backend --region=us-central1 --limit=50
   ```

2. **Kiểm tra API Key:**
   - Đảm bảo `GEMINI_API_KEY` hoặc `GEMINI_API_KEYS` đã được set trên Cloud Run
   - Xem hướng dẫn: `UPDATE_API_KEY.md`

3. **Test endpoint:**
   ```bash
   curl -X POST https://duthi-backend-626004693464.us-central1.run.app/questions/clone \
     -H "Content-Type: application/json" \
     -d '{"question":"Test question","correct_answer":"Test answer"}'
   ```

### Bước 3: Deploy lại Backend

Sau khi sửa code:

```powershell
python deploy.py
# Chọn option 1: Deploy Backend
```

Hoặc deploy thủ công:

```powershell
cd backend
gcloud run deploy duthi-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

## 🛠️ Troubleshooting

### CORS vẫn lỗi sau khi deploy?

1. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) hoặc `Cmd+Shift+R` (Mac)

2. **Kiểm tra Network tab:**
   - Xem request có header `Access-Control-Allow-Origin` không
   - Xem preflight OPTIONS request có thành công không

3. **Test với curl:**
   ```bash
   curl -X OPTIONS https://duthi-backend-626004693464.us-central1.run.app/questions/clone \
     -H "Origin: https://gen-lang-client-0581370080.web.app" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

### 500 Error vẫn xuất hiện?

1. **Xem logs chi tiết:**
   ```powershell
   gcloud run services logs read duthi-backend --region=us-central1 --limit=100
   ```

2. **Kiểm tra API Key:**
   - Tạo API key mới tại: https://aistudio.google.com/apikey
   - Update trên Cloud Run:
     ```powershell
     gcloud run services update duthi-backend \
       --region us-central1 \
       --update-env-vars GEMINI_API_KEY=your_new_key
     ```

3. **Test Gemini API trực tiếp:**
   ```python
   from google import genai
   client = genai.Client(api_key="your_key")
   # Test call
   ```

## 📝 Code Changes

### Backend (`backend/app/main.py`)
- ✅ Đã cập nhật CORS với Firebase URLs
- ✅ Thêm logging cho CORS origins

### Backend (`backend/app/routers/questions.py`)
- ✅ Cải thiện error handling
- ✅ Thêm logging chi tiết
- ✅ Xử lý các trường hợp lỗi API key, quota, permission

## 🚀 Next Steps

1. **Deploy backend:**
   ```powershell
   python deploy.py
   ```

2. **Test lại:**
   - Mở: https://gen-lang-client-0581370080.web.app
   - Thử chức năng clone question
   - Kiểm tra console không còn lỗi CORS

3. **Nếu vẫn lỗi:**
   - Xem logs Cloud Run
   - Kiểm tra API key
   - Kiểm tra Firestore permissions (lỗi "Missing or insufficient permissions")

