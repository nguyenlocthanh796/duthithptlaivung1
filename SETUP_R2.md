# Hướng Dẫn Setup Cloudflare R2

## Bước 1: Tạo R2 Bucket

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vào **R2** (Object Storage) trong menu bên trái
3. Click **Create bucket**
4. Đặt tên bucket (ví dụ: `duthi-uploads`)
5. Chọn region gần nhất (ví dụ: `apac` - Asia Pacific)
6. Click **Create bucket**

## Bước 2: Lấy API Credentials

1. Vào **Manage R2 API Tokens** (trong R2 menu)
2. Click **Create API Token**
3. Đặt tên token (ví dụ: `duthi-upload-token`)
4. Chọn permissions: **Object Read & Write**
5. Chọn bucket: Chọn bucket vừa tạo
6. Click **Create API Token**
7. **Lưu ngay** các thông tin sau (chỉ hiện 1 lần):
   - **Account ID**
   - **Access Key ID**
   - **Secret Access Key**

## Bước 3: Cấu hình Public Access (Custom Domain)

1. Vào bucket → **Settings** → **Public Access**
2. Click **Connect Domain** hoặc **Create Custom Domain**
3. Chọn domain của bạn (nếu có) hoặc tạo subdomain mới
4. Lưu **Public URL** (ví dụ: `https://pub-xxxxx.r2.dev`)

**Lưu ý:** Nếu không có domain, R2 sẽ cung cấp URL dạng `https://pub-xxxxx.r2.dev`

## Bước 4: Cấu hình CORS

1. Vào bucket → **Settings** → **CORS Policy**
2. Click **Edit CORS Policy**
3. Thêm policy sau:

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

4. Click **Save**

## Bước 5: Cấu hình Environment Variables

### Local Development (`backend/.env`):

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=duthi-uploads
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### Cloud Run (`backend/env.yaml`):

```yaml
R2_ACCOUNT_ID: "your_account_id_here"
R2_ACCESS_KEY_ID: "your_access_key_id_here"
R2_SECRET_ACCESS_KEY: "your_secret_access_key_here"
R2_BUCKET_NAME: "duthi-uploads"
R2_PUBLIC_URL: "https://pub-xxxxx.r2.dev"
```

## Bước 6: Cài đặt Dependencies

```bash
cd backend
pip install boto3==1.35.0
```

Hoặc nếu dùng `requirements.txt`:
```bash
pip install -r requirements.txt
```

## Bước 7: Test Upload

1. Khởi động backend
2. Thử upload file qua frontend
3. Kiểm tra logs để xem upload có thành công không
4. Kiểm tra file trong R2 bucket dashboard

## Lưu Ý

- **R2 sẽ được ưu tiên** nếu đã cấu hình
- **Google Drive sẽ là fallback** nếu R2 không có
- File sẽ được upload lên R2 với public access
- URL sẽ có dạng: `https://pub-xxxxx.r2.dev/uuid-filename.ext`

## Troubleshooting

### Lỗi "R2 not configured"
- Kiểm tra các biến môi trường đã được set đúng chưa
- Kiểm tra `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

### Lỗi CORS
- Kiểm tra CORS policy trong R2 bucket settings
- Đảm bảo domain của bạn đã được thêm vào `AllowedOrigins`

### Lỗi "Access Denied"
- Kiểm tra API token có quyền **Object Read & Write**
- Kiểm tra bucket name đúng chưa

## So Sánh với Google Drive

| Tính năng | Google Drive | Cloudflare R2 |
|-----------|-------------|---------------|
| Miễn phí | 15GB (shared) | 10GB |
| Giá sau | Đắt | Rẻ ($0.015/GB) |
| Egress | Đắt | Miễn phí |
| CDN | Có | Có (tốt hơn) |
| Quota | Có thể bị giới hạn | Không giới hạn |
| Ổn định | Tốt | Rất tốt |

**Kết luận:** R2 tốt hơn cho production, đặc biệt khi có nhiều traffic.

