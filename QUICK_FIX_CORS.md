# 🔧 Quick Fix: CORS và 500 Error

## ⚠️ Lỗi

1. **CORS Policy**: `Access to XMLHttpRequest ... has been blocked by CORS policy`
2. **500 Error**: `POST .../questions/clone net::ERR_FAILED 500`

## ✅ Giải pháp nhanh

### Bước 1: Deploy lại Backend

Code đã được cập nhật với:
- ✅ CORS đã bao gồm Firebase URLs
- ✅ Error handling cải thiện cho `/questions/clone`

**Deploy:**
```powershell
python deploy.py
# Chọn option 1: Deploy Backend
```

### Bước 2: Kiểm tra API Key trên Cloud Run

Lỗi 500 thường do API key không hợp lệ:

```powershell
# Xem logs để biết lỗi cụ thể
gcloud run services logs read duthi-backend --region us-central1 --limit=50

# Update API key nếu cần
gcloud run services update duthi-backend \
  --region us-central1 \
  --update-env-vars GEMINI_API_KEY=your_new_key
```

### Bước 3: Kiểm tra CORS

Sau khi deploy, test:

```bash
curl -X OPTIONS https://duthi-backend-626004693464.us-central1.run.app/questions/clone \
  -H "Origin: https://gen-lang-client-0581370080.web.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Phải thấy header: `Access-Control-Allow-Origin: https://gen-lang-client-0581370080.web.app`

## 📝 Code Changes

### Backend (`backend/app/main.py`)
- ✅ CORS đã bao gồm Firebase URLs
- ✅ Logging CORS origins

### Backend (`backend/app/routers/questions.py`)
- ✅ Cải thiện error handling
- ✅ Xử lý lỗi API key, quota, permission

### Backend (`backend/app/routers/lm.py`)
- ✅ Hỗ trợ `imageUrl` trong chat endpoint
- ✅ Logging chi tiết

## 🚀 Next Steps

1. **Deploy backend:**
   ```powershell
   python deploy.py
   ```

2. **Test lại:**
   - Mở: https://gen-lang-client-0581370080.web.app
   - Thử chức năng clone question
   - Kiểm tra console không còn lỗi

3. **Nếu vẫn lỗi:**
   - Xem logs: `gcloud run services logs read duthi-backend --region us-central1`
   - Kiểm tra API key trên Cloud Run
   - Xem file `FIX_CORS_500_ERROR.md` để biết chi tiết

