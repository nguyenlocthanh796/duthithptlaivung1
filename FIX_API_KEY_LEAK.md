# 🔒 Khắc phục API Key bị rò rỉ - Hướng dẫn chi tiết

## ⚠️ Vấn đề hiện tại

API keys của bạn đã bị Google phát hiện rò rỉ và tự động khóa. Nguyên nhân chính:

1. **File `backend/env.yaml` đang chứa API keys thật và có thể đã bị commit lên Git**
2. **Google/GitHub Secret Scanning phát hiện keys trong repository công khai**
3. **Keys bị vô hiệu hóa tự động để bảo vệ tài khoản**

## ✅ Giải pháp triệt để

### Bước 1: Xóa Keys cũ và tạo Keys mới

**Keys cũ đã bị khóa, không thể cứu được!**

1. Truy cập: https://aistudio.google.com/apikey
2. Xóa tất cả keys cũ (nếu còn)
3. Tạo **3 keys mới** (để rotation):
   - Click "Create API Key" → Chọn project `gen-lang-client-0581370080`
   - Lặp lại 3 lần để có 3 keys
   - **LƯU Ý:** Copy và lưu keys vào nơi an toàn (không paste vào code!)

### Bước 2: Cấu hình trên Google Cloud Run (QUAN TRỌNG NHẤT)

**KHÔNG BAO GIỜ paste keys vào code hoặc file env.yaml trong Git!**

#### Cách 1: Dùng Google Cloud Console (Khuyến nghị)

1. Truy cập: https://console.cloud.google.com/run
2. Chọn project: `gen-lang-client-0581370080`
3. Click vào service: `duthi-backend`
4. Click **"EDIT & DEPLOY NEW REVISION"**
5. Scroll xuống phần **"Variables & Secrets"**
6. Click **"ADD VARIABLE"** và thêm từng biến sau:

   ```
   Name: GEMINI_API_KEY
   Value: AIzaSy... (key đầu tiên)
   ```

   ```
   Name: GEMINI_API_KEYS
   Value: AIzaSy...,AIzaSy...,AIzaSy... (3 keys, comma-separated, KHÔNG có dấu ngoặc kép)
   ```

   ```
   Name: GOOGLE_DRIVE_FOLDER_ID
   Value: 1GgsmXUHK3kXHAPVTFk0DKss_DsxZDkNZ
   ```

   ```
   Name: FIREBASE_PROJECT_ID
   Value: gen-lang-client-0581370080
   ```

   ```
   Name: FASTAPI_HOST
   Value: 0.0.0.0
   ```

   ```
   Name: FASTAPI_PORT
   Value: 8000
   ```

   ```
   Name: ALLOWED_ORIGINS
   Value: https://gen-lang-client-0581370080.web.app,https://gen-lang-client-0581370080.firebaseapp.com,https://duthi-frontend.pages.dev
   ```

7. Click **"DEPLOY"** ở cuối trang

#### Cách 2: Dùng gcloud CLI

```powershell
# Set environment variables
gcloud run services update duthi-backend `
  --region us-central1 `
  --project gen-lang-client-0581370080 `
  --update-env-vars GEMINI_API_KEY="AIzaSy...",GEMINI_API_KEYS="key1,key2,key3",GOOGLE_DRIVE_FOLDER_ID="1GgsmXUHK3kXHAPVTFk0DKss_DsxZDkNZ",FIREBASE_PROJECT_ID="gen-lang-client-0581370080",FASTAPI_HOST="0.0.0.0",FASTAPI_PORT="8000",ALLOWED_ORIGINS="https://gen-lang-client-0581370080.web.app,https://gen-lang-client-0581370080.firebaseapp.com,https://duthi-frontend.pages.dev"
```

### Bước 3: Xóa Keys khỏi Git Repository

**QUAN TRỌNG:** Nếu bạn đã commit `backend/env.yaml` lên Git, keys đã bị lộ!

1. **Xóa file khỏi Git history (nếu đã commit):**
   ```powershell
   git rm --cached backend/env.yaml
   git commit -m "Remove API keys from repository"
   git push
   ```

2. **Tạo file mẫu:**
   - File `backend/env.yaml.example` đã được tạo (chứa placeholder)
   - File `backend/env.yaml` đã được thêm vào `.gitignore`

3. **Xóa keys khỏi file local:**
   - Mở `backend/env.yaml`
   - Thay thế tất cả keys thật bằng placeholder: `"YOUR_API_KEY_HERE"`

### Bước 4: Cấu hình Local Development

**Chỉ dùng cho máy tính cá nhân, KHÔNG commit lên Git!**

1. Tạo file `backend/.env` (đã có trong `.gitignore`):
   ```env
   GEMINI_API_KEY=AIzaSy... (key của bạn)
   GEMINI_API_KEYS=key1,key2,key3
   GOOGLE_DRIVE_FOLDER_ID=1GgsmXUHK3kXHAPVTFk0DKss_DsxZDkNZ
   FIREBASE_PROJECT_ID=gen-lang-client-0581370080
   FASTAPI_HOST=0.0.0.0
   FASTAPI_PORT=8000
   ALLOWED_ORIGINS=http://localhost:5173
   ```

2. **Đảm bảo `.env` đã có trong `.gitignore`** (đã có sẵn)

### Bước 5: Kiểm tra lại

1. **Kiểm tra Git không track keys:**
   ```powershell
   git status
   # Không nên thấy backend/env.yaml hoặc backend/.env
   ```

2. **Test API sau khi deploy:**
   - Mở browser: `http://localhost:5173`
   - Click "AI Giải" trên một post
   - Nếu thành công, không còn lỗi 403

3. **Kiểm tra logs Cloud Run:**
   ```powershell
   gcloud run services logs read duthi-backend --region=us-central1 --limit=50
   ```

## 🔍 Kiểm tra các nơi khác có thể chứa Keys

### 1. Frontend Code
- ✅ Đã kiểm tra: `frontend/public/firebase-messaging-sw.js` có một key (cần cập nhật)
- **Giải pháp:** Key này là Firebase API key (khác với Gemini), nhưng cũng nên kiểm tra

### 2. Documentation Files
- ✅ Các file `.md` chỉ chứa ví dụ, không phải keys thật
- **An toàn:** Không cần thay đổi

### 3. Docker Images
- ✅ Backend deploy qua Cloud Run, không dùng Docker Hub công khai
- **An toàn:** Không cần lo lắng

## 🛡️ Best Practices để tránh rò rỉ Keys trong tương lai

1. **✅ LUÔN dùng Environment Variables trên Cloud Run**
   - Không hardcode keys trong code
   - Không commit `env.yaml` hoặc `.env` lên Git

2. **✅ Dùng `.gitignore` đúng cách**
   - Đã thêm `backend/env.yaml` vào `.gitignore`
   - Đã có `backend/.env` trong `.gitignore`

3. **✅ Dùng Secret Manager (Nâng cao)**
   - Google Cloud Secret Manager để lưu keys an toàn hơn
   - Có thể tích hợp sau nếu cần

4. **✅ Rotate Keys định kỳ**
   - Tạo keys mới mỗi 3-6 tháng
   - Xóa keys cũ không dùng

5. **✅ Monitor API Usage**
   - Kiểm tra Google Cloud Console thường xuyên
   - Phát hiện sớm nếu có lạm dụng

## 📝 Checklist sau khi hoàn thành

- [ ] Đã tạo 3 API keys mới
- [ ] Đã cấu hình keys trên Cloud Run (Environment Variables)
- [ ] Đã xóa keys khỏi `backend/env.yaml` (thay bằng placeholder)
- [ ] Đã commit `.gitignore` với `backend/env.yaml`
- [ ] Đã deploy lại backend
- [ ] Đã test API và không còn lỗi 403
- [ ] Đã kiểm tra Git không track keys

## 🆘 Nếu vẫn gặp lỗi

1. **Kiểm tra keys có đúng format không:**
   - Keys phải bắt đầu bằng `AIzaSy`
   - Không có khoảng trắng thừa
   - Comma-separated cho `GEMINI_API_KEYS` (không có dấu ngoặc kép)

2. **Kiểm tra Cloud Run logs:**
   ```powershell
   gcloud run services logs read duthi-backend --region=us-central1 --limit=100 --format="table(timestamp,textPayload)"
   ```

3. **Kiểm tra API key có bị khóa không:**
   - Truy cập: https://aistudio.google.com/apikey
   - Xem status của keys

4. **Test API key trực tiếp:**
   ```powershell
   curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=YOUR_KEY" -H "Content-Type: application/json" -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
   ```

## 📚 Tài liệu tham khảo

- [Google AI Studio API Keys](https://aistudio.google.com/apikey)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

