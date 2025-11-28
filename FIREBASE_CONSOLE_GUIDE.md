# Hướng dẫn xem dữ liệu trong Firebase Console

## Cấu trúc dữ liệu trong Firestore

Dữ liệu được lưu theo cấu trúc sau:
```
artifacts/
  └── default-app-id/
      └── public/
          └── data/
              └── posts/
                  └── {postId}/
                      └── comments/
                          └── {commentId}
```

## Cách xem dữ liệu trong Firebase Console

### 1. Xem Posts (Bài viết)

1. Mở [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: **gen-lang-client-0581370080**
3. Vào **Firestore Database** > **Data**
4. Navigate theo path:
   - Click vào collection `artifacts`
   - Click vào document `default-app-id`
   - Click vào subcollection `public`
   - Click vào subcollection `data`
   - Click vào subcollection `posts`
   - Bạn sẽ thấy danh sách các bài viết (posts)

### 2. Xem Comments (Bình luận)

1. Từ danh sách posts ở trên
2. Click vào một post (ví dụ: `RsIa517H6NYGpniCvbxI`)
3. Bạn sẽ thấy subcollection `comments`
4. Click vào `comments` để xem danh sách bình luận

### 3. Kiểm tra dữ liệu có được lưu không

**Cách 1: Sử dụng Console Logs**
1. Mở DevTools (F12) > Console
2. Tạo một post mới hoặc comment mới
3. Xem logs:
   - `✅ Post created successfully: [doc-id]` - Post đã được tạo
   - `✅ Comment created successfully: [doc-id]` - Comment đã được tạo
   - `❌ Error posting: ...` - Có lỗi khi tạo post
   - `❌ Lỗi comment: ...` - Có lỗi khi tạo comment

**Cách 2: Sử dụng Firebase Console**
1. Navigate đến path đúng (xem hướng dẫn trên)
2. Refresh trang Firebase Console
3. Kiểm tra xem có documents mới không

### 4. Troubleshooting

**Nếu không thấy dữ liệu:**

1. **Kiểm tra Firestore Rules:**
   - Vào **Firestore Database** > **Rules**
   - Đảm bảo rules cho phép read/write:
     ```javascript
     match /artifacts/{appId}/public/data/posts/{postId} {
       allow read, create: if isAuthenticated();
     }
     ```

2. **Kiểm tra Authentication:**
   - Vào **Authentication** > **Users**
   - Đảm bảo có user đang đăng nhập (có thể là anonymous user)

3. **Kiểm tra Console Logs:**
   - Xem có lỗi `permission-denied` không
   - Xem có lỗi `Firebase not initialized` không

4. **Kiểm tra appId:**
   - Đảm bảo `appId` trong code khớp với path trong Firestore
   - Mặc định là `default-app-id`

### 5. URL trực tiếp để xem dữ liệu

Bạn có thể dùng URL này để mở trực tiếp:
```
https://console.firebase.google.com/project/gen-lang-client-0581370080/firestore/databases/-default-/data/~2Fartifacts~2Fdefault-app-id~2Fpublic~2Fdata~2Fposts
```

**Lưu ý:** URL encoding:
- `/` được encode thành `~2F`
- Path: `artifacts/default-app-id/public/data/posts` → `~2Fartifacts~2Fdefault-app-id~2Fpublic~2Fdata~2Fposts`

