# Frontend API Integration Guide

Hướng dẫn tích hợp Backend API mới vào Frontend, thay thế Firebase/Firestore.

## 📦 Cài đặt

### JavaScript/TypeScript

File API service đã được tạo sẵn:
- `api.js` - JavaScript version
- `api.ts` - TypeScript version

### Import vào project

```javascript
// JavaScript
import api from './api.js';
// hoặc
import { postsAPI, examsAPI, documentsAPI } from './api.js';

// TypeScript
import api from './api';
// hoặc
import { postsAPI, examsAPI, documentsAPI, Post, Exam, Document } from './api';
```

## 🔧 Cấu hình

### Environment Variables

Tạo file `.env` trong thư mục frontend:

```env
# React
REACT_APP_API_URL=http://35.223.145.48:8000

# Vite
VITE_API_URL=http://35.223.145.48:8000

# Next.js
NEXT_PUBLIC_API_URL=http://35.223.145.48:8000
```

Nếu không set env variable, mặc định sẽ dùng: `http://35.223.145.48:8000`

## 🔐 Firebase Authentication

API service tự động lấy Firebase ID Token và gửi trong header `Authorization: Bearer <token>`.

**Yêu cầu:**
- User phải đăng nhập bằng Firebase Auth trước
- Token sẽ tự động được lấy từ `firebase.auth().currentUser`

## 📝 Ví dụ sử dụng

### 1. Lấy danh sách Posts

```javascript
import { postsAPI } from './api';

// Lấy tất cả posts
const posts = await postsAPI.getAll();

// Lọc theo subject
const mathPosts = await postsAPI.getAll({ subject: 'toan', limit: 20 });

// Lấy post theo ID
const post = await postsAPI.getById('post-id-123');
```

### 2. Tạo Post mới

```javascript
import { postsAPI } from './api';

// Tạo post (cần đăng nhập)
const newPost = await postsAPI.create({
  content: "Nội dung bài viết",
  subject: "toan",
  post_type: "text",
  // author_id, author_name, author_email sẽ tự động lấy từ Firebase token
});
```

### 3. Like/React Post

```javascript
import { postsAPI } from './api';

// Like post
await postsAPI.like('post-id-123');

// React với emoji khác
await postsAPI.react('post-id-123', 'love');
// Các reaction: 'like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'
```

### 4. Exams API

```javascript
import { examsAPI } from './api';

// Lấy danh sách exams
const exams = await examsAPI.getAll({ subject: 'toan' });

// Tạo exam mới
const newExam = await examsAPI.create({
  title: "Đề thi Toán học kỳ 1",
  subject: "toan",
  duration: 90, // phút
  questions_count: 50,
  difficulty: "medium",
});

// Cập nhật exam
await examsAPI.update('exam-id', { title: "Đề thi mới" });

// Xóa exam
await examsAPI.delete('exam-id');
```

### 5. Documents API

```javascript
import { documentsAPI } from './api';

// Lấy danh sách documents
const docs = await documentsAPI.getAll({ category: 'de-thi' });

// Tạo document mới
const newDoc = await documentsAPI.create({
  title: "Tài liệu Toán",
  category: "de-thi",
  subject: "toan",
  file_type: "pdf",
  file_size: 1024000, // bytes
  author: "Tên tác giả",
});

// Ghi nhận download
await documentsAPI.download('doc-id');

// Xóa document
await documentsAPI.delete('doc-id');
```

## 🔄 Migration từ Firebase

### Trước (Firebase/Firestore):

```javascript
// Cũ
import { collection, getDocs, addDoc } from 'firebase/firestore';
const postsRef = collection(db, 'posts');
const snapshot = await getDocs(postsRef);
const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### Sau (Backend API):

```javascript
// Mới
import { postsAPI } from './api';
const posts = await postsAPI.getAll();
```

## ⚠️ Lưu ý

1. **Authentication**: Tất cả API tạo/sửa/xóa đều yêu cầu Firebase Auth token
2. **Error Handling**: Nên wrap API calls trong try-catch
3. **Loading States**: Hiển thị loading khi gọi API
4. **CORS**: Backend đã cấu hình CORS, nhưng nếu gặp lỗi CORS, kiểm tra `ALLOWED_ORIGINS` trong backend config

## 🐛 Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra user đã đăng nhập Firebase chưa
- Kiểm tra token có được gửi trong header không

### Lỗi CORS
- Kiểm tra origin của frontend có trong `ALLOWED_ORIGINS` của backend không
- Backend mặc định cho phép: `localhost:5173`, `localhost:3000`, và các domain trong config

### Lỗi Connection
- Kiểm tra backend có đang chạy không: `http://35.223.145.48:8000/health`
- Kiểm tra firewall đã mở port 8000 chưa

## 📚 API Documentation

Xem thêm tại: `http://35.223.145.48:8000/docs` (Swagger UI - nếu có)

