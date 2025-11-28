# 🔥 Deploy Firestore Rules

## ✅ Đã cập nhật

Đã thêm Firestore rules cho `artifacts/{appId}/public/data/posts` trong file `firestore.rules`.

## 🚀 Deploy Rules

### Cách 1: Sử dụng Firebase CLI

```bash
# Từ thư mục gốc dự án
firebase deploy --only firestore:rules
```

### Cách 2: Deploy từ Firebase Console

1. Mở: https://console.firebase.google.com/project/gen-lang-client-0581370080/firestore/rules
2. Copy nội dung từ file `firestore.rules`
3. Paste vào editor
4. Click **Publish**

## ✅ Rules đã thêm

```javascript
// Posts collection (Feed)
match /artifacts/{appId}/public/data/posts/{postId} {
  // Read: authenticated users can read posts
  allow read: if isAuthenticated();
  
  // Create: authenticated users can create posts
  allow create: if isAuthenticated() &&
    isAuthor(request.resource.data.author, request.resource.data.authorId) &&
    request.resource.data.text is string &&
    request.resource.data.createdAt is timestamp;
  
  // Update: author or moderator
  allow update: if isAuthenticated() && (
    isAuthor(resource.data.author, resource.data.authorId) ||
    isModerator()
  );
  
  // Delete: author or moderator
  allow delete: if isAuthenticated() && (
    isAuthor(resource.data.author, resource.data.authorId) ||
    isModerator()
  );
}
```

## 🔍 Kiểm tra

Sau khi deploy, refresh browser và kiểm tra console:
- ✅ Không còn lỗi "permission-denied"
- ✅ Posts hiển thị trong FeedPage
- ✅ Có thể tạo post mới

## 📝 Lưu ý

- Rules chỉ cho phép authenticated users (đã đăng nhập)
- Anonymous users cũng được coi là authenticated sau khi `signInAnonymously()`
- Nếu vẫn lỗi, kiểm tra user đã được authenticate chưa

