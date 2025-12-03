# 🔄 Đồng bộ Backend và Frontend - Feed, Users, Posts

## 📋 Tổng quan

Dự án sử dụng:
- **Firebase Auth**: Xác thực người dùng (ID tokens)
- **SQL Database**: Lưu trữ posts, comments, users, và các dữ liệu khác
- **FastAPI Backend**: RESTful API
- **React Frontend**: UI/UX với TypeScript

## 👥 Quản lý Users

### Cách hoạt động

1. **Firebase Auth**:
   - User đăng nhập qua Firebase (Email/Password hoặc Google)
   - Firebase trả về ID Token
   - Frontend gửi token trong header: `Authorization: Bearer <token>`

2. **Backend User Management**:
   - Backend verify token qua `get_current_user()` dependency
   - Tự động tạo user trong database khi lần đầu đăng nhập
   - Lưu thông tin: `uid`, `email`, `name`, `role`, `photo_url`

3. **Users Table Structure**:
```json
{
  "id": "firebase_uid",
  "uid": "firebase_uid",
  "email": "user@example.com",
  "name": "Tên người dùng",
  "role": "student|teacher|admin",
  "photo_url": "https://...",
  "createdAt": "2025-01-01T00:00:00",
  "updatedAt": "2025-01-01T00:00:00"
}
```

### API Endpoints

- `GET /api/users/me` - Lấy thông tin user hiện tại
- `POST /api/users/` - Tạo user mới (tự động)
- `PUT /api/users/me` - Cập nhật thông tin user
- `GET /api/users/{user_id}` - Lấy thông tin user theo ID

## 📝 Quản lý Posts

### Posts Table Structure

```json
{
  "id": "post_id",
  "content": "Nội dung bài viết",
  "author_id": "firebase_uid",
  "author_name": "Tên tác giả",
  "author_email": "email@example.com",
  "author_role": "student",
  "subject": "toan|ly|hoa|van|anh",
  "post_type": "text|image|document",
  "image_url": "https://...",
  "image_urls": ["https://...", "https://..."],
  "attachments": [
    {
      "url": "https://...",
      "file_name": "document.pdf",
      "file_type": "application/pdf",
      "file_size": 1024
    }
  ],
  "likes": 0,
  "comments": 0,
  "shares": 0,
  "hasQuestion": false,
  "status": "pending|approved|rejected",
  "isEducational": true,
  "aiTags": ["tag1", "tag2"],
  "aiComment": "Comment từ AI",
  "reactionCounts": {
    "idea": 5,
    "thinking": 2,
    "resource": 1,
    "motivation": 3
  },
  "userReactions": {
    "user_id": "idea"
  },
  "createdAt": "2025-01-01T00:00:00",
  "updatedAt": "2025-01-01T00:00:00"
}
```

### API Endpoints

#### Posts
- `GET /api/posts` - Lấy danh sách posts (có filter)
- `GET /api/posts/{post_id}` - Lấy post theo ID
- `POST /api/posts` - Tạo post mới (cần auth)
- `PUT /api/posts/{post_id}` - Cập nhật post (chỉ tác giả/admin)
- `DELETE /api/posts/{post_id}` - Xóa post (chỉ tác giả/admin)
- `POST /api/posts/{post_id}/like` - Like post (cần auth)
- `POST /api/posts/{post_id}/reaction` - Reaction với emoji (cần auth)

#### Comments
- `GET /api/posts/{post_id}/comments` - Lấy comments của post
- `POST /api/posts/{post_id}/comments` - Tạo comment (cần auth)
- `PUT /api/posts/{post_id}/comments/{comment_id}` - Sửa comment (chỉ tác giả)
- `DELETE /api/posts/{post_id}/comments/{comment_id}` - Xóa comment (tác giả/admin)

## 🔧 Đã Fix

### 1. Like/Reaction ✅
- ✅ Thêm `useAuth` vào `StudentFeed` để lấy `currentUser`
- ✅ Gửi `userId` khi gọi `postsAPI.react()`
- ✅ Backend tự động lấy `uid` từ token nếu không có trong body

### 2. Delete Post ✅
- ✅ Frontend gọi `postsAPI.delete(postId)`
- ✅ Backend kiểm tra quyền (tác giả hoặc admin/teacher)
- ✅ Xóa thành công và cập nhật UI

### 3. Comments ✅
- ✅ Tạo comment: `commentsAPI.create(postId, { content })`
- ✅ Xóa comment: `commentsAPI.delete(postId, commentId)`
- ✅ Backend tự động cập nhật số lượng comments trên post

### 4. Users Management ✅
- ✅ Tạo `users` router trong backend
- ✅ Tự động tạo user khi lần đầu đăng nhập
- ✅ Lưu thông tin từ Firebase token

## 📱 Frontend Integration

### StudentFeed Component

```typescript
import { useAuth } from '../../contexts/AuthContext';

const StudentFeed = () => {
  const { currentUser } = useAuth();
  
  // Like/Reaction
  await postsAPI.react(post.id, 'idea', currentUser?.uid);
  
  // Delete Post
  await postsAPI.delete(post.id);
  
  // Create Comment
  await commentsAPI.create(postId, { content: text });
  
  // Delete Comment
  await commentsAPI.delete(postId, commentId);
};
```

## 🔐 Authentication Flow

1. User đăng nhập qua Firebase
2. Firebase trả về ID Token
3. Frontend lưu token (tự động bởi Firebase SDK)
4. Mỗi API request gửi token trong header:
   ```
   Authorization: Bearer <firebase_id_token>
   ```
5. Backend verify token và lấy thông tin user:
   ```python
   current_user = Depends(get_current_user)
   uid = current_user.get("uid")
   ```

## 🎯 Best Practices

### Backend
- ✅ Luôn verify token qua `get_current_user`
- ✅ Kiểm tra quyền trước khi cho phép thao tác
- ✅ Tự động tạo user khi lần đầu đăng nhập
- ✅ Cập nhật số lượng comments/likes khi có thay đổi

### Frontend
- ✅ Luôn gửi token trong header (tự động bởi `apiRequest`)
- ✅ Kiểm tra `currentUser` trước khi thực hiện action
- ✅ Hiển thị thông báo lỗi rõ ràng cho user
- ✅ Cập nhật UI sau mỗi thao tác thành công

## 🚀 Testing

### Test Like/Reaction
```bash
curl -X POST http://localhost:8000/api/posts/{post_id}/reaction \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reaction": "idea"}'
```

### Test Delete Post
```bash
curl -X DELETE http://localhost:8000/api/posts/{post_id} \
  -H "Authorization: Bearer <token>"
```

### Test Create Comment
```bash
curl -X POST http://localhost:8000/api/posts/{post_id}/comments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Bình luận test"}'
```

---

**✅ Tất cả chức năng đã được đồng bộ và sẵn sàng sử dụng!**

