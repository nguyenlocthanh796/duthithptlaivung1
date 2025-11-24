# 🔑 Hướng dẫn cập nhật API Key trên Cloud Run

## ⚠️ Vấn đề hiện tại
API key bị leak hoặc không hợp lệ, gây ra lỗi **403 PERMISSION_DENIED** khi gọi Gemini API.

## ✅ Giải pháp

### Bước 1: Tạo API Key mới
1. Truy cập: https://aistudio.google.com/apikey
2. Click **"Create API Key"**
3. Chọn project: `gen-lang-client-0581370080`
4. Copy API key mới

### Bước 2: Cập nhật `backend/env.yaml`

Mở file `backend/env.yaml` và cập nhật:

```yaml
GEMINI_API_KEY: "your_new_api_key_here"
# Hoặc dùng nhiều keys để rotation (khuyến nghị):
GEMINI_API_KEYS: "key1,key2,key3"
GOOGLE_DRIVE_FOLDER_ID: "your_folder_id"
FIREBASE_PROJECT_ID: "gen-lang-client-0581370080"
FASTAPI_HOST: "0.0.0.0"
FASTAPI_PORT: "8000"
ALLOWED_ORIGINS: "https://gen-lang-client-0581370080.web.app,https://gen-lang-client-0581370080.firebaseapp.com,http://localhost:5173"
```

**Lưu ý:**
- Nếu dùng `GEMINI_API_KEYS`, format: `"key1,key2,key3"` (comma-separated, có dấu ngoặc kép)
- Backend sẽ tự động rotate giữa các keys
- Nếu một key bị lỗi, sẽ tự động thử key tiếp theo

### Bước 3: Redeploy Backend

**Option 1: Dùng deploy script (Khuyến nghị)**
```powershell
python deploy.py
# Chọn option 1: Deploy Backend
```

**Option 2: Deploy thủ công**
```powershell
cd backend
gcloud run deploy duthi-backend `
  --source . `
  --region us-central1 `
  --project gen-lang-client-0581370080 `
  --allow-unauthenticated `
  --max-instances 1 `
  --memory 1Gi `
  --cpu 1 `
  --timeout 300 `
  --env-vars-file env.yaml
```

### Bước 4: Kiểm tra

1. **Kiểm tra logs:**
```powershell
gcloud run services logs read duthi-backend --region=us-central1 --limit=50
```

2. **Test API:**
- Mở browser: `http://localhost:5173`
- Click "AI Giải" trên một post
- Nếu thành công, sẽ không còn lỗi 403

## 🔍 Troubleshooting

### Lỗi vẫn còn sau khi deploy?
1. **Kiểm tra env vars đã được set:**
```powershell
gcloud run services describe duthi-backend --region=us-central1 --format="value(spec.template.spec.containers[0].env)"
```

2. **Kiểm tra logs để xem lỗi cụ thể:**
```powershell
gcloud run services logs read duthi-backend --region=us-central1 --limit=100 | Select-String "API key\|Gemini\|403"
```

3. **Đảm bảo API key mới chưa bị leak:**
- Không commit `env.yaml` vào Git
- Không share API key công khai
- Kiểm tra API key trong Google AI Studio xem có bị report leak không

### Nếu dùng nhiều API keys:
- Format: `"key1,key2,key3"` (có dấu ngoặc kép, comma-separated)
- Backend sẽ tự động thử từng key nếu key trước bị lỗi
- Khuyến nghị: Dùng 2-3 keys để backup

## 📝 Checklist

- [ ] Đã tạo API key mới từ Google AI Studio
- [ ] Đã cập nhật `backend/env.yaml` với API key mới
- [ ] Đã redeploy backend lên Cloud Run
- [ ] Đã kiểm tra logs không còn lỗi 403
- [ ] Đã test "AI Giải" trên frontend thành công

## 🎯 Quick Command

```powershell
# 1. Cập nhật env.yaml với API key mới
# 2. Deploy
cd backend
gcloud run deploy duthi-backend --source . --region us-central1 --env-vars-file env.yaml

# 3. Kiểm tra
gcloud run services logs read duthi-backend --region=us-central1 --limit=20
```

---

**Sau khi cập nhật, frontend sẽ tự động hoạt động bình thường vì đã có error handling tốt!** ✅

