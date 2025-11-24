# Hướng Dẫn Chi Tiết Setup Cloudflare R2

## 📋 Tổng Quan

Cloudflare R2 cung cấp:
- ✅ **10GB storage miễn phí** (nhiều nhất trong các giải pháp)
- ✅ **Egress miễn phí không giới hạn** (tiết kiệm nhất)
- ✅ **CDN tích hợp** - hiển thị nhanh toàn cầu
- ✅ **Giá rẻ**: $0.015/GB/tháng sau 10GB

---

## 🚀 Bước 1: Tạo Tài Khoản Cloudflare (Nếu chưa có)

1. Truy cập: https://dash.cloudflare.com/sign-up
2. Đăng ký bằng email hoặc Google account
3. Xác thực email (nếu cần)

---

## 📦 Bước 2: Tạo R2 Bucket

### 2.1. Vào R2 Dashboard

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Trong menu bên trái, tìm và click **R2** (Object Storage)
3. Nếu lần đầu, bạn sẽ thấy màn hình giới thiệu → Click **Get started**

### 2.2. Tạo Bucket

1. Click nút **Create bucket** (màu xanh)
2. Điền thông tin:
   - **Bucket name**: `duthi-uploads` (hoặc tên bạn muốn)
   - **Location**: Chọn `apac` (Asia Pacific) - gần Việt Nam nhất
3. Click **Create bucket**

✅ **Lưu ý:** Tên bucket phải:
- Chỉ chứa chữ thường, số, và dấu gạch ngang (-)
- Dài từ 3-63 ký tự
- Phải là unique trong Cloudflare

---

## 🔑 Bước 3: Lấy API Credentials

### 3.1. Tạo API Token

1. Trong R2 menu, click **Manage R2 API Tokens**
2. Click **Create API Token** (màu xanh)
3. Điền thông tin:
   - **Token name**: `duthi-upload-token` (hoặc tên bạn muốn)
   - **Permissions**: Chọn **Object Read & Write**
   - **TTL**: Để mặc định (không hết hạn) hoặc set thời gian
   - **Bucket access**: Chọn bucket vừa tạo (`duthi-uploads`)
4. Click **Create API Token**

### 3.2. Lưu Thông Tin (QUAN TRỌNG!)

Sau khi tạo token, Cloudflare sẽ hiển thị **1 LẦN DUY NHẤT**:
- **Access Key ID**: (dạng: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- **Secret Access Key**: (dạng: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

⚠️ **LƯU Ý QUAN TRỌNG:**
- **Copy và lưu ngay** 2 thông tin này vào file an toàn
- **Secret Access Key chỉ hiện 1 lần**, nếu mất phải tạo token mới
- Không chia sẻ thông tin này với ai

### 3.3. Lấy Account ID

1. Vào **R2** → **Overview**
2. Tìm **Account ID** ở góc trên bên phải (dạng: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
3. Copy và lưu Account ID

---

## 🌐 Bước 4: Cấu hình Public Access

### 4.1. Tạo Custom Domain (Tùy chọn - Nếu có domain)

Nếu bạn có domain riêng:
1. Vào bucket → **Settings** → **Public Access**
2. Click **Connect Domain**
3. Chọn domain của bạn
4. Tạo subdomain (ví dụ: `cdn.yourdomain.com`)
5. Lưu **Public URL** (ví dụ: `https://cdn.yourdomain.com`)

### 4.2. Sử dụng R2 Public URL (Không cần domain)

Nếu không có domain:
1. Vào bucket → **Settings** → **Public Access**
2. Click **Allow Access** hoặc **Enable Public Access**
3. R2 sẽ tự động tạo URL dạng: `https://pub-xxxxx.r2.dev`
4. **Lưu URL này** - đây là `R2_PUBLIC_URL`

**Ví dụ URL:** `https://pub-1234567890abcdef.r2.dev`

---

## 🔒 Bước 5: Cấu hình CORS

1. Vào bucket → **Settings** → **CORS Policy**
2. Click **Edit CORS Policy**
3. Xóa policy mặc định (nếu có)
4. Copy và paste policy sau:

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

5. Click **Save**

✅ **Giải thích:**
- `AllowedOrigins`: Các domain được phép truy cập file
- `AllowedMethods`: Các phương thức HTTP được phép
- `AllowedHeaders`: Headers được phép
- `MaxAgeSeconds`: Thời gian cache CORS (3600 = 1 giờ)

---

## ⚙️ Bước 6: Cấu hình Environment Variables

### 6.1. Local Development (`backend/.env`)

Tạo hoặc mở file `backend/.env` và thêm:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=duthi-uploads
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Ví dụ thực tế:**
```env
R2_ACCOUNT_ID=1234567890abcdef1234567890abcdef
R2_ACCESS_KEY_ID=abcd1234efgh5678ijkl9012mnop3456
R2_SECRET_ACCESS_KEY=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
R2_BUCKET_NAME=duthi-uploads
R2_PUBLIC_URL=https://pub-1234567890abcdef.r2.dev
```

### 6.2. Cloud Run (`backend/env.yaml`)

Mở file `backend/env.yaml` và thêm:

```yaml
# Cloudflare R2 Configuration
R2_ACCOUNT_ID: "your_account_id_here"
R2_ACCESS_KEY_ID: "your_access_key_id_here"
R2_SECRET_ACCESS_KEY: "your_secret_access_key_here"
R2_BUCKET_NAME: "duthi-uploads"
R2_PUBLIC_URL: "https://pub-xxxxx.r2.dev"
```

**Ví dụ thực tế:**
```yaml
R2_ACCOUNT_ID: "1234567890abcdef1234567890abcdef"
R2_ACCESS_KEY_ID: "abcd1234efgh5678ijkl9012mnop3456"
R2_SECRET_ACCESS_KEY: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
R2_BUCKET_NAME: "duthi-uploads"
R2_PUBLIC_URL: "https://pub-1234567890abcdef.r2.dev"
```

⚠️ **Lưu ý:**
- Thay thế tất cả `your_xxx_here` bằng giá trị thực tế
- Giữ nguyên dấu ngoặc kép trong YAML
- Không có khoảng trắng thừa

---

## 📦 Bước 7: Cài đặt Dependencies

### 7.1. Cài đặt boto3

Mở terminal và chạy:

```bash
cd backend
pip install boto3==1.35.0
```

Hoặc nếu dùng `requirements.txt`:

```bash
pip install -r requirements.txt
```

✅ **Kiểm tra:** `boto3` đã có trong `requirements.txt` rồi, chỉ cần chạy `pip install -r requirements.txt`

---

## 🧪 Bước 8: Test Upload

### 8.1. Khởi động Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 8.2. Test qua Frontend

1. Mở frontend: `http://localhost:5173`
2. Tạo bài viết mới
3. Upload ảnh hoặc tài liệu
4. Kiểm tra console/logs

### 8.3. Kiểm tra Logs

Trong terminal backend, bạn sẽ thấy:
```
INFO: Uploading file to R2: example.jpg
INFO: File uploaded successfully to R2. Link: https://pub-xxxxx.r2.dev/uuid-example.jpg
```

### 8.4. Kiểm tra trong R2 Dashboard

1. Vào Cloudflare Dashboard → R2 → Bucket `duthi-uploads`
2. Bạn sẽ thấy file vừa upload
3. Click vào file để xem URL và thông tin

---

## ✅ Checklist Hoàn Thành

- [ ] Đã tạo R2 bucket
- [ ] Đã lấy Account ID
- [ ] Đã tạo API Token và lưu Access Key ID + Secret Access Key
- [ ] Đã cấu hình Public Access và lưu Public URL
- [ ] Đã cấu hình CORS
- [ ] Đã thêm environment variables vào `backend/.env`
- [ ] Đã thêm environment variables vào `backend/env.yaml` (cho Cloud Run)
- [ ] Đã cài đặt `boto3`
- [ ] Đã test upload thành công

---

## 🔧 Troubleshooting

### Lỗi: "R2 configuration incomplete"

**Nguyên nhân:** Thiếu environment variables

**Giải pháp:**
1. Kiểm tra `backend/.env` có đủ 5 biến:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`
2. Kiểm tra không có khoảng trắng thừa
3. Restart backend sau khi thêm biến môi trường

---

### Lỗi: "Access Denied" hoặc "403 Forbidden"

**Nguyên nhân:** API Token không có quyền hoặc bucket name sai

**Giải pháp:**
1. Kiểm tra API Token có permission **Object Read & Write**
2. Kiểm tra API Token có được gán cho bucket đúng không
3. Kiểm tra `R2_BUCKET_NAME` đúng với tên bucket trong Cloudflare
4. Tạo API Token mới nếu cần

---

### Lỗi: CORS khi upload từ frontend

**Nguyên nhân:** CORS policy chưa đúng

**Giải pháp:**
1. Kiểm tra CORS policy trong bucket settings
2. Đảm bảo domain frontend đã được thêm vào `AllowedOrigins`
3. Kiểm tra `AllowedMethods` có `PUT` và `POST`
4. Click **Save** sau khi sửa CORS

---

### Lỗi: "Bucket not found"

**Nguyên nhân:** Bucket name sai hoặc Account ID sai

**Giải pháp:**
1. Kiểm tra `R2_BUCKET_NAME` đúng với tên bucket
2. Kiểm tra `R2_ACCOUNT_ID` đúng với Account ID
3. Kiểm tra bucket có tồn tại trong R2 dashboard không

---

### File upload thành công nhưng không truy cập được

**Nguyên nhân:** Public access chưa được bật hoặc URL sai

**Giải pháp:**
1. Kiểm tra bucket → Settings → Public Access đã bật chưa
2. Kiểm tra `R2_PUBLIC_URL` đúng chưa
3. Thử truy cập URL trực tiếp trong browser

---

## 📊 So Sánh với Google Drive

| Tính năng | Google Drive | Cloudflare R2 |
|-----------|-------------|---------------|
| **Storage Free** | 15GB (shared) | **10GB** |
| **Egress Free** | Không | **Không giới hạn** ⭐ |
| **Giá Storage** | Đắt | **$0.015/GB** (rẻ) |
| **Giá Egress** | Đắt | **Miễn phí** ⭐ |
| **CDN** | Có | **Có (tốt hơn)** ⭐ |
| **Quota** | Có thể bị giới hạn | **Không giới hạn** ⭐ |
| **Ổn định** | Tốt | **Rất tốt** ⭐ |

**Kết luận:** R2 tốt hơn cho production, đặc biệt khi có nhiều traffic.

---

## 🎯 Kết Quả Mong Đợi

Sau khi setup xong:
- ✅ Upload file sẽ tự động dùng R2 (thay vì Google Drive)
- ✅ File sẽ có URL dạng: `https://pub-xxxxx.r2.dev/uuid-filename.ext`
- ✅ File hiển thị nhanh nhờ CDN tích hợp
- ✅ Không lo quota như Google Drive
- ✅ Tiết kiệm chi phí (egress miễn phí)

---

## 📝 Lưu Ý Quan Trọng

1. **Bảo mật:** Không commit `backend/.env` hoặc `backend/env.yaml` lên GitHub
2. **Backup:** Lưu API credentials ở nơi an toàn
3. **Monitoring:** Theo dõi usage trong Cloudflare Dashboard
4. **Cost:** Sau 10GB sẽ tốn $0.015/GB/tháng (rất rẻ)

---

## 🆘 Cần Giúp Đỡ?

Nếu gặp vấn đề:
1. Kiểm tra logs trong backend terminal
2. Kiểm tra Cloudflare R2 Dashboard → Logs
3. Xem lại từng bước trong checklist
4. Kiểm tra environment variables đã đúng chưa

**Chúc bạn setup thành công! 🎉**

