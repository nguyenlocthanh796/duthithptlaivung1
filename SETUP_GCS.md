# Hướng Dẫn Setup Google Cloud Storage (GCS)

## Tổng Quan

Google Cloud Storage cung cấp:
- ✅ **5GB storage miễn phí** (Always Free)
- ✅ **1GB egress/tháng miễn phí** (Always Free)
- ✅ **CDN tích hợp** (Cloud CDN)
- ✅ **S3-compatible API** (dễ tích hợp)
- ✅ **Giá hợp lý**: $0.020/GB storage, $0.12/GB egress

---

## Bước 1: Tạo Google Cloud Project

1. Đăng nhập [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Đặt tên project (ví dụ: `duthi-storage`)
4. Click **Create**
5. Chọn project vừa tạo

---

## Bước 2: Enable Cloud Storage API

1. Vào **APIs & Services** → **Library**
2. Tìm "Cloud Storage API"
3. Click **Enable**

---

## Bước 3: Tạo Storage Bucket

1. Vào **Cloud Storage** → **Buckets**
2. Click **Create Bucket**
3. Đặt tên bucket (ví dụ: `duthi-uploads`)
4. Chọn **Location type**: `Region`
5. Chọn **Region**: `asia-southeast1` (Singapore) hoặc gần nhất
6. Chọn **Storage class**: `Standard`
7. Chọn **Access control**: `Uniform`
8. Click **Create**

---

## Bước 4: Cấu hình Public Access

1. Vào bucket vừa tạo
2. Vào tab **Permissions**
3. Click **Grant Access**
4. Thêm:
   - **Principal**: `allUsers`
   - **Role**: `Storage Object Viewer`
5. Click **Save**

**Lưu ý:** Điều này cho phép public read access. File sẽ có thể truy cập qua URL công khai.

---

## Bước 5: Cấu hình CORS

1. Vào bucket → **Configuration** tab
2. Scroll xuống **CORS configuration**
3. Click **Edit CORS configuration**
4. Thêm policy:

```json
[
  {
    "origin": [
      "https://gen-lang-client-0581370080.web.app",
      "https://gen-lang-client-0581370080.firebaseapp.com",
      "https://duthi-frontend.pages.dev",
      "http://localhost:5173"
    ],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "ETag"],
    "maxAgeSeconds": 3600
  }
]
```

5. Click **Save**

---

## Bước 6: Tạo Service Account

1. Vào **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Đặt tên (ví dụ: `duthi-storage-uploader`)
4. Click **Create and Continue**
5. Chọn role: **Storage Object Admin** (hoặc **Storage Object Creator**)
6. Click **Continue** → **Done**

---

## Bước 7: Tạo Service Account Key

1. Click vào service account vừa tạo
2. Vào tab **Keys**
3. Click **Add Key** → **Create new key**
4. Chọn **JSON**
5. Click **Create**
6. File JSON sẽ được download - **Lưu file này an toàn**

---

## Bước 8: Cấu hình Environment Variables

### Local Development (`backend/.env`):

```env
# Google Cloud Storage Configuration
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=duthi-uploads
GCS_CREDENTIALS_PATH=path/to/service-account-key.json
# Hoặc dùng JSON string trực tiếp:
# GCS_CREDENTIALS_JSON={"type":"service_account",...}
```

### Cloud Run (`backend/env.yaml`):

```yaml
GCS_PROJECT_ID: "your-project-id"
GCS_BUCKET_NAME: "duthi-uploads"
GCS_CREDENTIALS_JSON: "{\"type\":\"service_account\",...}"  # JSON string
```

**Lưu ý:** Trên Cloud Run, nên dùng **Workload Identity** thay vì service account key để bảo mật hơn.

---

## Bước 9: Cài đặt Dependencies

```bash
cd backend
pip install google-cloud-storage
```

Hoặc thêm vào `requirements.txt`:
```
google-cloud-storage==2.14.0
```

---

## Bước 10: Tạo GCS Client Service

Tôi sẽ tạo file `backend/app/services/gcs_client.py` tương tự như `r2_client.py`.

---

## URL Format

Sau khi upload, file sẽ có URL dạng:
```
https://storage.googleapis.com/duthi-uploads/uuid-filename.ext
```

Hoặc nếu dùng custom domain:
```
https://cdn.yourdomain.com/uuid-filename.ext
```

---

## So Sánh với R2

| Tính năng | Cloudflare R2 | Google Cloud Storage |
|-----------|---------------|---------------------|
| Storage Free | 10GB | 5GB |
| Egress Free | Không giới hạn | 1GB/tháng |
| Giá Storage | $0.015/GB | $0.020/GB |
| Giá Egress | Miễn phí | $0.12/GB |
| CDN | Tích hợp | Cloud CDN (tốt) |
| Setup | Đơn giản | Phức tạp hơn |

**Kết luận:**
- **R2 tốt hơn** nếu có nhiều traffic (egress miễn phí)
- **GCS tốt hơn** nếu đã dùng Google Cloud và traffic thấp

---

## Lưu Ý

1. **Egress 1GB/tháng miễn phí** - nếu vượt sẽ tốn $0.12/GB (đắt)
2. **Storage 5GB miễn phí** - sau đó $0.020/GB/tháng
3. **Nên dùng Workload Identity** trên Cloud Run thay vì service account key
4. **Có thể dùng Cloud CDN** để cache và giảm egress costs

---

## Troubleshooting

### Lỗi "Permission denied"
- Kiểm tra service account có role **Storage Object Admin** hoặc **Storage Object Creator**
- Kiểm tra bucket permissions đã cho phép service account chưa

### Lỗi CORS
- Kiểm tra CORS configuration trong bucket settings
- Đảm bảo origin domain đã được thêm vào CORS policy

### Lỗi "Bucket not found"
- Kiểm tra bucket name đúng chưa
- Kiểm tra project ID đúng chưa
- Kiểm tra service account có quyền truy cập bucket

