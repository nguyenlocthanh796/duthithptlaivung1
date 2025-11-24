# Giải Pháp Lưu Trữ File Thay Thế Google Drive

## Vấn Đề Hiện Tại
- Google Drive upload có thể thất bại do quota/permissions
- Firebase Storage 10GB miễn phí sẽ nhanh chóng đầy
- Cần giải pháp ổn định, giá rẻ, hiển thị tốt

## Các Lựa Chọn Tốt Nhất

### 1. **Cloudflare R2** ⭐ (Khuyến nghị)

**Ưu điểm:**
- ✅ **Miễn phí 10GB** storage
- ✅ **Không có egress fees** (khác với AWS S3)
- ✅ **CDN tích hợp** - hiển thị nhanh toàn cầu
- ✅ **S3-compatible API** - dễ tích hợp
- ✅ **Giá rẻ**: $0.015/GB/tháng sau 10GB
- ✅ **Không giới hạn requests**
- ✅ **Dễ cấu hình**, có dashboard

**Nhược điểm:**
- Cần tạo tài khoản Cloudflare
- Cần cấu hình CORS

**Giá:**
- 0-10GB: **Miễn phí**
- Sau 10GB: $0.015/GB/tháng
- Egress: **Miễn phí** (khác với S3)

**Setup:**
1. Tạo tài khoản Cloudflare
2. Tạo R2 bucket
3. Lấy Access Key ID và Secret Access Key
4. Cấu hình CORS cho domain của bạn

---

### 2. **Supabase Storage**

**Ưu điểm:**
- ✅ **Miễn phí 1GB** storage
- ✅ **Giá rẻ**: $0.021/GB/tháng sau 1GB
- ✅ **CDN tích hợp**
- ✅ **REST API đơn giản**
- ✅ **Tích hợp tốt với Firebase**

**Nhược điểm:**
- Chỉ 1GB miễn phí (ít hơn R2)
- Cần tạo tài khoản Supabase

**Giá:**
- 0-1GB: **Miễn phí**
- Sau 1GB: $0.021/GB/tháng
- Bandwidth: 50GB/tháng miễn phí

---

### 3. **Backblaze B2**

**Ưu điểm:**
- ✅ **Miễn phí 10GB** storage
- ✅ **Giá rất rẻ**: $0.005/GB/tháng (rẻ nhất)
- ✅ **S3-compatible API**
- ✅ **Không giới hạn egress** (miễn phí)

**Nhược điểm:**
- CDN không tích hợp (cần Cloudflare CDN riêng)
- Interface đơn giản hơn

**Giá:**
- 0-10GB: **Miễn phí**
- Sau 10GB: $0.005/GB/tháng
- Egress: **Miễn phí** (không giới hạn)

---

### 4. **Google Cloud Storage (GCS)** ⭐

**Ưu điểm:**
- ✅ **5GB storage miễn phí** (Always Free)
- ✅ **1GB egress/tháng miễn phí** (Always Free)
- ✅ **CDN tích hợp** (Cloud CDN)
- ✅ **S3-compatible API** (dễ tích hợp)
- ✅ **Ổn định cao** - Google infrastructure
- ✅ **Giá hợp lý** sau free tier
- ✅ **Tích hợp tốt** với Google Cloud services

**Nhược điểm:**
- Chỉ 5GB miễn phí (ít hơn R2)
- Egress miễn phí chỉ 1GB/tháng (ít hơn R2)
- Cần tạo Google Cloud project

**Giá:**
- **Storage:**
  - 0-5GB: **Miễn phí** (Always Free)
  - Sau 5GB: $0.020/GB/tháng (Standard)
- **Egress (Download):**
  - 0-1GB/tháng: **Miễn phí** (Always Free)
  - Sau 1GB: $0.12/GB (đắt hơn R2)
- **Operations:** Miễn phí 5,000 Class A operations/tháng

**Setup:**
1. Tạo Google Cloud project
2. Enable Cloud Storage API
3. Tạo bucket
4. Lấy Service Account credentials
5. Cấu hình CORS

---

### 5. **Firebase Storage** (Hiện tại)

**Ưu điểm:**
- ✅ Đã tích hợp sẵn
- ✅ CDN tích hợp
- ✅ Dễ sử dụng

**Nhược điểm:**
- ❌ Chỉ **10GB miễn phí** (sẽ nhanh đầy)
- ❌ Giá đắt: $0.026/GB/tháng sau 10GB
- ❌ Egress: $0.12/GB (đắt)

**Giá:**
- 0-10GB: **Miễn phí**
- Sau 10GB: $0.026/GB/tháng
- Egress: $0.12/GB

---

## So Sánh Nhanh

| Giải pháp | Storage Free | Egress Free | Giá Storage | Giá Egress | CDN | Khuyến nghị |
|-----------|--------------|-------------|-------------|------------|-----|-------------|
| **Cloudflare R2** | 10GB | Không giới hạn | $0.015/GB | Miễn phí | ✅ | ⭐⭐⭐⭐⭐ |
| **Google Cloud Storage** | 5GB | 1GB/tháng | $0.020/GB | $0.12/GB | ✅ | ⭐⭐⭐⭐ |
| **Backblaze B2** | 10GB | Không giới hạn | $0.005/GB | Miễn phí | ❌ | ⭐⭐⭐⭐ |
| **Supabase** | 1GB | 50GB/tháng | $0.021/GB | Sau 50GB | ✅ | ⭐⭐⭐ |
| **Firebase** | 10GB | Không | $0.026/GB | $0.12/GB | ✅ | ⭐⭐ |

---

## Khuyến Nghị

### **Cloudflare R2** ⭐⭐⭐⭐⭐ (Tốt nhất cho production)

**Lý do:**
1. **10GB miễn phí** - nhiều nhất
2. **Egress miễn phí không giới hạn** - tiết kiệm nhất khi có nhiều traffic
3. **CDN tích hợp** - hiển thị nhanh toàn cầu
4. **S3-compatible** - dễ tích hợp
5. **Giá rẻ** sau 10GB
6. **Ổn định** - Cloudflare là CDN lớn nhất thế giới

### **Google Cloud Storage** ⭐⭐⭐⭐ (Tốt nếu đã dùng Google Cloud)

**Lý do:**
1. **5GB miễn phí** - đủ cho nhiều file
2. **1GB egress/tháng miễn phí** - tốt cho traffic thấp
3. **CDN tích hợp** (Cloud CDN)
4. **S3-compatible** - dễ tích hợp
5. **Ổn định cao** - Google infrastructure
6. **Tích hợp tốt** với các Google Cloud services khác

**Phù hợp khi:**
- Đã có Google Cloud project
- Traffic không quá cao (< 1GB egress/tháng)
- Cần tích hợp với các Google services khác

---

## Cách Tích Hợp Cloudflare R2

### Bước 1: Tạo R2 Bucket
1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vào **R2** → **Create bucket**
3. Đặt tên bucket (ví dụ: `duthi-uploads`)
4. Chọn region gần nhất (ví dụ: `apac`)

### Bước 2: Lấy Credentials
1. Vào **Manage R2 API Tokens**
2. **Create API Token**
3. Lưu:
   - **Account ID**
   - **Access Key ID**
   - **Secret Access Key**

### Bước 3: Cấu hình CORS
1. Vào bucket → **Settings** → **CORS Policy**
2. Thêm policy:
```json
[
  {
    "AllowedOrigins": [
      "https://gen-lang-client-0581370080.web.app",
      "https://gen-lang-client-0581370080.firebaseapp.com",
      "https://duthi-frontend.pages.dev",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Bước 4: Cài đặt Dependencies
```bash
cd backend
pip install boto3
```

### Bước 5: Cấu hình Environment Variables
Thêm vào `backend/.env`:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=duthi-uploads
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # Từ R2 bucket settings
```

Thêm vào `backend/env.yaml` (cho Cloud Run):
```yaml
R2_ACCOUNT_ID: "your_account_id"
R2_ACCESS_KEY_ID: "your_access_key_id"
R2_SECRET_ACCESS_KEY: "your_secret_access_key"
R2_BUCKET_NAME: "duthi-uploads"
R2_PUBLIC_URL: "https://pub-xxxxx.r2.dev"
```

---

## Code Tích Hợp

Tôi sẽ tạo service mới `r2_client.py` để thay thế `drive_client.py`.

**Ưu điểm của R2:**
- Upload nhanh hơn Google Drive
- CDN tự động - hiển thị nhanh toàn cầu
- Không lo quota như Google Drive
- Giá rẻ hơn nhiều so với Firebase Storage

---

## Lựa Chọn Thay Thế: ImgBB (Chỉ cho Ảnh)

Nếu chỉ cần upload ảnh, có thể dùng **ImgBB API**:
- ✅ **Miễn phí hoàn toàn**
- ✅ **Không giới hạn**
- ✅ **CDN tích hợp**
- ❌ Chỉ hỗ trợ ảnh (PNG, JPG, WEBP, GIF)
- ❌ Không hỗ trợ PDF/DOC

**API Key:** Lấy từ [imgbb.com](https://api.imgbb.com/)

---

## Kết Luận

**Khuyến nghị: Cloudflare R2**
- 10GB miễn phí
- Egress miễn phí
- CDN tích hợp
- Giá rẻ
- Ổn định

Bạn muốn tôi tích hợp Cloudflare R2 vào dự án không?

