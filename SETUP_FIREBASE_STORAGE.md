# Hướng Dẫn Setup Firebase Storage

## 📋 Tổng Quan

Firebase Storage là giải pháp **tốt nhất cho dự án nhỏ** vì:
- ✅ **10GB storage miễn phí** (đủ cho nhiều file)
- ✅ **1GB download/ngày miễn phí** (đủ cho traffic thấp)
- ✅ **CDN tích hợp** - hiển thị nhanh
- ✅ **Không cần thêm thẻ** - dùng ngay
- ✅ **Đã tích hợp sẵn** với Firebase project của bạn
- ✅ **Upload trực tiếp từ frontend** - không cần backend

**Giá sau free tier:**
- Storage: $0.026/GB/tháng
- Download: $0.12/GB

---

## 🚀 Bước 1: Enable Firebase Storage

1. Truy cập: https://console.firebase.google.com/project/gen-lang-client-0581370080/storage
2. Click **Get started** (nếu lần đầu)
3. Chọn **Start in test mode** (sẽ cấu hình rules sau)
4. Chọn **location**: `asia-southeast1` (Singapore) - gần Việt Nam nhất
5. Click **Done**

✅ **Lưu ý:** Storage bucket sẽ có tên: `gen-lang-client-0581370080.firebasestorage.app`

---

## 🔒 Bước 2: Cấu hình Storage Security Rules

1. Vào **Storage** → **Rules** tab
2. Thay thế rules mặc định bằng:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload files
    match /{allPaths=**} {
      allow read: if true; // Public read access
      allow write: if request.auth != null; // Only authenticated users can upload
    }
    
    // Specific rules for uploads folder
    match /uploads/{fileName} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.resource.size < 50 * 1024 * 1024; // Max 50MB
    }
    
    // Images folder
    match /images/{fileName} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.resource.size < 10 * 1024 * 1024 // Max 10MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Documents folder
    match /documents/{fileName} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.resource.size < 50 * 1024 * 1024 // Max 50MB
                   && request.resource.contentType.matches('(application/pdf|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document)');
    }
  }
}
```

3. Click **Publish**

✅ **Giải thích:**
- `allow read: if true` - Mọi người có thể xem file (public)
- `allow write: if request.auth != null` - Chỉ user đã đăng nhập mới upload được
- `request.resource.size < 50MB` - Giới hạn kích thước file
- `contentType.matches(...)` - Chỉ cho phép các loại file cụ thể

---

## ⚙️ Bước 3: Cấu hình Environment Variables

### 3.1. Lấy Storage Bucket URL

Storage bucket của bạn: `gen-lang-client-0581370080.firebasestorage.app`

### 3.2. Cấu hình Frontend (Nếu chưa có)

Mở `frontend/.env` và thêm (nếu chưa có):

```env
VITE_FIREBASE_STORAGE_BUCKET=gen-lang-client-0581370080.firebasestorage.app
```

**Lưu ý:** Code đã có default value, nên không bắt buộc phải thêm vào `.env`.

---

## ✅ Bước 4: Test Upload

### 4.1. Khởi động Frontend

```bash
cd frontend
npm run dev
```

### 4.2. Test Upload

1. Mở: `http://localhost:5173`
2. Đăng nhập (nếu chưa)
3. Tạo bài viết mới
4. Upload ảnh hoặc tài liệu
5. Kiểm tra console logs

### 4.3. Kiểm tra trong Firebase Console

1. Vào: https://console.firebase.google.com/project/gen-lang-client-0581370080/storage/gen-lang-client-0581370080.firebasestorage.app/files
2. Bạn sẽ thấy:
   - Folder `images/` - chứa ảnh
   - Folder `documents/` - chứa tài liệu
3. Click vào file để xem URL và thông tin

---

## 📊 So Sánh với Các Giải Pháp Khác

| Tính năng | Firebase Storage | Cloudflare R2 | Google Drive |
|-----------|------------------|---------------|--------------|
| **Storage Free** | 10GB | 10GB | 15GB (shared) |
| **Download Free** | 1GB/ngày | Không giới hạn | Không |
| **Cần thẻ** | ❌ Không | ✅ Có | ❌ Không |
| **CDN** | ✅ Có | ✅ Có | ✅ Có |
| **Giá Storage** | $0.026/GB | $0.015/GB | Đắt |
| **Giá Download** | $0.12/GB | Miễn phí | Đắt |
| **Setup** | ✅ Dễ | Phức tạp | Phức tạp |
| **Tích hợp** | ✅ Sẵn có | Cần setup | Cần setup |

**Kết luận cho dự án nhỏ:**
- ✅ **Firebase Storage là tốt nhất** - không cần thẻ, đã tích hợp sẵn
- ✅ **Đủ dùng** cho dự án nhỏ với 10GB storage
- ✅ **1GB download/ngày** đủ cho traffic thấp-trung bình

---

## 🎯 Kết Quả

Sau khi setup:
- ✅ Upload file sẽ tự động dùng Firebase Storage
- ✅ File sẽ có URL dạng: `https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0581370080.firebasestorage.app/o/images%2F...`
- ✅ File hiển thị nhanh nhờ CDN tích hợp
- ✅ Không cần backend để upload
- ✅ Không cần thêm thẻ

---

## 🔧 Troubleshooting

### Lỗi: "Firebase Storage: User does not have permission"

**Nguyên nhân:** Storage rules chưa cho phép

**Giải pháp:**
1. Kiểm tra user đã đăng nhập chưa
2. Kiểm tra Storage Rules đã publish chưa
3. Kiểm tra rules có `allow write: if request.auth != null` không

---

### Lỗi: "File size exceeds maximum"

**Nguyên nhân:** File quá lớn

**Giải pháp:**
1. Kiểm tra file size < 50MB (documents) hoặc < 10MB (images)
2. Hoặc tăng limit trong Storage Rules

---

### Lỗi: "Storage bucket not found"

**Nguyên nhân:** Storage bucket chưa được enable

**Giải pháp:**
1. Vào Firebase Console → Storage
2. Click **Get started** để enable Storage
3. Chọn location và tạo bucket

---

## 📝 Lưu Ý

1. **Storage Rules:** Đảm bảo rules đã được publish
2. **Authentication:** User phải đăng nhập mới upload được
3. **File Size:** Giới hạn 50MB cho documents, 10MB cho images
4. **Monitoring:** Theo dõi usage trong Firebase Console → Usage

---

## 🎉 Hoàn Thành!

Firebase Storage đã được tích hợp và sẵn sàng sử dụng. Upload file sẽ tự động dùng Firebase Storage thay vì backend API.

**Ưu điểm:**
- ✅ Không cần backend
- ✅ Upload nhanh hơn
- ✅ Tiết kiệm bandwidth backend
- ✅ CDN tích hợp
- ✅ Không cần thêm thẻ

