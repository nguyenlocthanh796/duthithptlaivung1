# 🔧 Fix CORS Error cho Cloudflare Pages

## ❌ **Lỗi CORS khi deploy lên Cloudflare Pages**

Khi deploy frontend lên Cloudflare Pages, bạn sẽ gặp lỗi CORS vì backend chưa cho phép domain Cloudflare Pages truy cập.

**Lỗi thường gặp:**
```
Access to XMLHttpRequest at 'https://duthi-backend-xxx.run.app/ai/chat' 
from origin 'https://duthi-frontend.pages.dev' has been blocked by CORS policy
```

---

## ✅ **Giải Pháp: Cập Nhật CORS Trong Backend**

### **Bước 1: Cập Nhật Backend Code**

Backend đã được cập nhật tự động trong `backend/app/main.py`:

```python
# Cloudflare Pages URLs đã được thêm vào CORS
cloudflare_pages_origins = [
    "https://*.pages.dev",  # Wildcard cho tất cả preview deployments
    "https://duthi-frontend.pages.dev",  # Production URL (cập nhật với URL thực tế của bạn)
]
```

### **Bước 2: Cập Nhật URL Cloudflare Pages (Quan Trọng!)**

Sau khi deploy lên Cloudflare Pages, bạn sẽ nhận được URL. Cập nhật URL này trong `backend/app/main.py`:

1. Mở `backend/app/main.py`
2. Tìm dòng:
   ```python
   "https://duthi-frontend.pages.dev",  # Production Cloudflare Pages URL
   ```
3. Thay bằng URL thực tế của bạn:
   ```python
   "https://YOUR-PROJECT-NAME.pages.dev",  # Ví dụ: https://duthi-frontend.pages.dev
   ```

**Hoặc** thêm vào `ALLOWED_ORIGINS` trong `.env` hoặc `env.yaml`:

```yaml
ALLOWED_ORIGINS: "http://localhost:5173,https://gen-lang-client-0581370080.web.app,https://YOUR-PROJECT-NAME.pages.dev"
```

---

## 🚀 **Bước 3: Deploy Lại Backend**

### **Option A: Deploy lên Cloud Run (Khuyến nghị)**

```bash
cd backend

# Cập nhật env.yaml với Cloudflare Pages URL (nếu dùng)
# Hoặc chỉ cần deploy lại, code đã được cập nhật

# Deploy
gcloud run deploy duthi-backend \
  --source . \
  --region us-central1 \
  --project gen-lang-client-0581370080 \
  --allow-unauthenticated \
  --max-instances 1 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --env-vars-file env.yaml
```

### **Option B: Dùng deploy.py script**

```bash
cd D:\duthithptlaivung1
python deploy.py
```

Script sẽ tự động deploy backend với CORS đã được cập nhật.

---

## 🔍 **Bước 4: Kiểm Tra CORS**

### **Test CORS từ Browser Console:**

```javascript
// Test CORS từ Cloudflare Pages domain
fetch('https://duthi-backend-626004693464.us-central1.run.app/', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})
.then(response => response.json())
.then(data => console.log('CORS OK:', data))
.catch(error => console.error('CORS Error:', error));
```

### **Test bằng curl:**

```bash
curl -H "Origin: https://duthi-frontend.pages.dev" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://duthi-backend-626004693464.us-central1.run.app/ai/chat \
     -v
```

Kiểm tra response headers có:
- `Access-Control-Allow-Origin: https://duthi-frontend.pages.dev`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`

---

## 📋 **Checklist**

- [ ] ✅ Backend code đã được cập nhật (đã tự động)
- [ ] ✅ Cập nhật Cloudflare Pages URL trong `main.py` hoặc `env.yaml`
- [ ] ✅ Deploy lại backend lên Cloud Run
- [ ] ✅ Test CORS từ Cloudflare Pages
- [ ] ✅ Kiểm tra frontend hoạt động bình thường

---

## 🎯 **Cấu Hình Chi Tiết**

### **CORS Origins Hiện Tại:**

Backend đã cho phép các origins sau:

1. **Localhost (Development):**
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
   - `http://localhost:3000`

2. **Firebase Hosting:**
   - `https://gen-lang-client-0581370080.web.app`
   - `https://gen-lang-client-0581370080.firebaseapp.com`

3. **Cloudflare Pages:**
   - `https://*.pages.dev` (Wildcard - cho tất cả preview deployments)
   - `https://duthi-frontend.pages.dev` (Production - cần cập nhật với URL thực tế)

4. **Custom Origins:**
   - Từ `ALLOWED_ORIGINS` environment variable

---

## 🔧 **Troubleshooting**

### **Lỗi: CORS vẫn không hoạt động sau khi deploy**

**Nguyên nhân:**
- URL Cloudflare Pages chưa được thêm đúng
- Backend chưa được deploy lại
- Browser cache

**Giải pháp:**
1. Kiểm tra URL trong `main.py` đúng chưa
2. Đảm bảo đã deploy lại backend
3. Hard refresh browser: `Ctrl+Shift+R`
4. Clear browser cache

---

### **Lỗi: Preview deployments không hoạt động**

**Nguyên nhân:**
- Wildcard `https://*.pages.dev` có thể không hoạt động với FastAPI CORS

**Giải pháp:**
Thêm từng preview URL cụ thể, hoặc dùng function để check:

```python
# Trong main.py, thay vì hardcode origins:
def is_allowed_origin(origin: str) -> bool:
    """Check if origin is allowed (supports wildcards)."""
    if not origin:
        return False
    
    allowed_patterns = [
        "http://localhost:*",
        "https://*.pages.dev",
        "https://gen-lang-client-0581370080.*",
    ]
    
    for pattern in allowed_patterns:
        if pattern.endswith('*'):
            prefix = pattern[:-1]
            if origin.startswith(prefix):
                return True
        elif origin == pattern:
            return True
    
    return False

# Sử dụng trong CORS middleware:
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.pages\.dev",  # Regex cho Cloudflare Pages
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ✅ **Sau Khi Fix**

Sau khi hoàn thành các bước trên:

1. ✅ Backend đã cho phép Cloudflare Pages truy cập
2. ✅ Frontend trên Cloudflare Pages có thể gọi API
3. ✅ Preview deployments cũng hoạt động
4. ✅ Không còn lỗi CORS

---

## 🚀 **Quick Fix (Nếu Cần Nhanh)**

Nếu bạn cần fix ngay, có thể thêm tạm thời vào `env.yaml`:

```yaml
ALLOWED_ORIGINS: "http://localhost:5173,https://gen-lang-client-0581370080.web.app,https://duthi-frontend.pages.dev,https://*.pages.dev"
```

Sau đó deploy lại:
```bash
cd backend
gcloud run deploy duthi-backend --source . --region us-central1 --env-vars-file env.yaml
```

---

## 📝 **Lưu Ý**

1. **Wildcard Support:**
   - FastAPI CORS middleware không hỗ trợ wildcard trực tiếp
   - Cần dùng `allow_origin_regex` hoặc thêm từng URL cụ thể

2. **Preview Deployments:**
   - Mỗi PR trên Cloudflare Pages có URL riêng
   - Có thể cần thêm từng URL hoặc dùng regex

3. **Security:**
   - Chỉ cho phép các origins cần thiết
   - Không dùng `allow_origins=["*"]` trong production

---

## ✅ **Kết Quả**

Sau khi fix:
- ✅ CORS error đã được giải quyết
- ✅ Frontend trên Cloudflare Pages hoạt động bình thường
- ✅ API calls thành công
- ✅ Preview deployments cũng hoạt động

**Chúc bạn fix thành công!** 🎉

