# Hướng dẫn Import và Sử dụng API Service

## 📦 Cách Import

### Import toàn bộ API

```typescript
import api from '../services/api';

// Sử dụng
const posts = await api.posts.getAll();
const exams = await api.exams.getAll();
```

### Import từng module riêng (khuyến nghị)

```typescript
import { postsAPI, examsAPI, documentsAPI } from '../services/api';

// Sử dụng
const posts = await postsAPI.getAll();
const exams = await examsAPI.getAll();
```

### Import types (TypeScript)

```typescript
import { Post, Exam, Document, PostCreate, ExamCreate } from '../services/api';

// Sử dụng trong component
const [posts, setPosts] = useState<Post[]>([]);
```

---

## 🔥 Ví dụ Sử dụng trong Component

### 1. Hiển thị danh sách Posts

```typescript
import React, { useEffect, useState } from 'react';
import { postsAPI, Post } from '../services/api';

function PostsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await postsAPI.getAll({ subject: 'toan', limit: 20 });
      setPosts(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          <p>{post.content}</p>
          <p>Likes: {post.likes}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. Tạo Post mới (cần đăng nhập)

```typescript
import { postsAPI } from '../services/api';

const handleCreatePost = async () => {
  try {
    const newPost = await postsAPI.create({
      content: "Nội dung bài viết",
      subject: "toan",
      post_type: "text",
    });
    console.log('Post created:', newPost);
    // Reload danh sách hoặc thêm vào state
  } catch (error) {
    console.error('Error:', error);
    // Nếu lỗi 401: user chưa đăng nhập
  }
};
```

### 3. Like/React Post

```typescript
import { postsAPI } from '../services/api';

// Like post
const handleLike = async (postId: string) => {
  try {
    await postsAPI.like(postId);
    // Cập nhật UI
  } catch (error) {
    console.error('Error:', error);
  }
};

// React với emoji
const handleReact = async (postId: string) => {
  try {
    await postsAPI.react(postId, 'love'); // 'like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 4. Sử dụng Custom Hook (khuyến nghị)

```typescript
import { usePosts } from '../hooks/usePosts';

function PostsPage() {
  const { posts, loading, error, createPost, likePost } = usePosts({
    subject: 'toan',
    limit: 20,
  });

  const handleCreate = async () => {
    try {
      await createPost({
        content: "Bài viết mới",
        subject: "toan",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error}</div>;

  return (
    <div>
      <button onClick={handleCreate}>Tạo Post</button>
      {posts.map(post => (
        <div key={post.id}>
          <p>{post.content}</p>
          <button onClick={() => likePost(post.id)}>Like</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔐 Authentication

API service **tự động** lấy Firebase token và gửi trong header. Bạn không cần code thêm.

**Yêu cầu:**
- User phải đăng nhập bằng Firebase Auth trước
- Token sẽ tự động được lấy từ `firebase.auth().currentUser`

**Các API cần authentication:**
- `postsAPI.create()` - Tạo post
- `postsAPI.like()` - Like post
- `postsAPI.react()` - React post
- `examsAPI.create()` - Tạo exam
- `examsAPI.update()` - Cập nhật exam
- `examsAPI.delete()` - Xóa exam
- `documentsAPI.create()` - Tạo document
- `documentsAPI.download()` - Download document
- `documentsAPI.delete()` - Xóa document

**Các API không cần authentication:**
- `postsAPI.getAll()` - Xem danh sách posts
- `postsAPI.getById()` - Xem chi tiết post
- `examsAPI.getAll()` - Xem danh sách exams
- `examsAPI.getById()` - Xem chi tiết exam
- `documentsAPI.getAll()` - Xem danh sách documents
- `documentsAPI.getById()` - Xem chi tiết document

---

## ⚠️ Error Handling

Luôn wrap API calls trong try-catch:

```typescript
try {
  const posts = await postsAPI.getAll();
} catch (error: any) {
  if (error.message.includes('401')) {
    // User chưa đăng nhập
    alert('Vui lòng đăng nhập');
  } else {
    // Lỗi khác
    console.error('Error:', error);
  }
}
```

---

## 🔄 So sánh với Firebase cũ

### Trước (Firebase):

```typescript
import { collection, getDocs, addDoc } from 'firebase/firestore';

// Lấy posts
const postsRef = collection(db, 'posts');
const snapshot = await getDocs(postsRef);
const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// Tạo post
await addDoc(postsRef, { content: "..." });
```

### Sau (Backend API):

```typescript
import { postsAPI } from '../services/api';

// Lấy posts
const posts = await postsAPI.getAll();

// Tạo post
await postsAPI.create({ content: "..." });
```

---

## 📝 Checklist Migration

- [ ] Import API service vào component
- [ ] Thay thế Firestore calls bằng API calls
- [ ] Xử lý loading states
- [ ] Xử lý error states
- [ ] Test các chức năng: create, read, update, delete
- [ ] Test authentication (đăng nhập trước khi tạo/sửa/xóa)
- [ ] Test filters (subject, category, etc.)

---

## 🆘 Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra user đã đăng nhập Firebase chưa
- Kiểm tra token có được gửi trong header không (xem Network tab)

### Lỗi CORS
- Kiểm tra origin của frontend có trong `ALLOWED_ORIGINS` của backend
- Backend mặc định cho phép: `localhost:5173`, `localhost:3000`

### Lỗi Connection
- Kiểm tra backend có đang chạy: `http://35.223.145.48:8000/health`
- Kiểm tra firewall đã mở port 8000 chưa

