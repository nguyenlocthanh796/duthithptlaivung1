# Hướng dẫn setup Firebase Storage

## 1. Deploy Storage Rules

Để cho phép upload ảnh, bạn cần deploy Storage rules:

```bash
firebase deploy --only storage
```

Hoặc deploy tất cả (Firestore + Storage):

```bash
firebase deploy
```

## 2. Kiểm tra Storage Rules trong Console

1. Mở [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: **gen-lang-client-0581370080**
3. Vào **Storage** > **Rules**
4. Đảm bảo rules cho phép upload:
   ```javascript
   allow write: if isAuthenticated() && isOwner(userId) && isImage() && isUnderMaxSize(10);
   ```

## 3. Kiểm tra Storage đã được enable chưa

1. Vào **Storage** trong Firebase Console
2. Nếu chưa enable, click **Get started**
3. Chọn **Start in test mode** hoặc **Start in production mode**
4. Chọn location (ví dụ: `asia-southeast1`)

## 4. Test upload ảnh

1. Tạo một post mới với ảnh
2. Xem Console logs:
   - `📤 Uploading image: ...` - Đang upload
   - `✅ Image uploaded successfully: [URL]` - Upload thành công
   - `❌ Error uploading image: ...` - Có lỗi

## 5. Troubleshooting

**Lỗi: "permission-denied"**
- Kiểm tra Storage rules đã được deploy chưa
- Kiểm tra user đã đăng nhập chưa
- Kiểm tra path có đúng format: `artifacts/{appId}/public/uploads/{userId}/{filename}`

**Lỗi: "unauthorized"**
- Kiểm tra Firebase Storage đã được enable chưa
- Kiểm tra user có quyền upload không

**Lỗi: "file-too-large"**
- Ảnh quá lớn (>10MB), cần nén trước khi upload
- Code đã tự động nén ảnh, nhưng nếu vẫn lỗi, hãy kiểm tra `compressImage` function

