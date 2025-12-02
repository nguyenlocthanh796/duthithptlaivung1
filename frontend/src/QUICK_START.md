# 🚀 Quick Start - Import và Sử dụng API

## Bước 1: Import API Service

```typescript
// Import vào component của bạn
import { postsAPI, examsAPI, documentsAPI } from '../services/api';

// Hoặc import types nếu cần
import { Post, Exam, Document } from '../services/api';
```

## Bước 2: Sử dụng trong Component

### Ví dụ đơn giản nhất - Lấy danh sách Posts

```typescript
import React, { useEffect, useState } from 'react';
import { postsAPI, Post } from '../services/api';

function MyComponent() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    // Lấy danh sách posts (không cần đăng nhập)
    postsAPI.getAll({ subject: 'toan' })
      .then(data => setPosts(data))
      .catch(error => console.error('Error:', error));
  }, []);

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.content}</div>
      ))}
    </div>
  );
}
```

### Tạo Post mới (cần đăng nhập)

```typescript
import { postsAPI } from '../services/api';

const handleCreate = async () => {
  try {
    // Token tự động được gửi từ Firebase Auth
    const newPost = await postsAPI.create({
      content: "Nội dung bài viết",
      subject: "toan",
    });
    console.log('Created:', newPost);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Bước 3: Xem các ví dụ đầy đủ

- **PostsList.tsx** - Component hiển thị danh sách posts
- **CreatePost.tsx** - Component tạo post mới
- **ExamsList.tsx** - Component quản lý exams
- **usePosts.ts** - Custom hook để quản lý posts

## Bước 4: Đọc hướng dẫn chi tiết

Xem file **INTEGRATION_GUIDE.md** để biết:
- Cách xử lý errors
- Cách dùng với Firebase Auth
- So sánh với Firebase cũ
- Troubleshooting

---

## ⚡ 3 Lệnh Cơ bản Bạn Cần Nhớ

### 1. Lấy danh sách (GET)
```typescript
const posts = await postsAPI.getAll({ subject: 'toan' });
```

### 2. Tạo mới (POST - cần đăng nhập)
```typescript
const newPost = await postsAPI.create({ content: "...", subject: "toan" });
```

### 3. Like/React (POST - cần đăng nhập)
```typescript
await postsAPI.like(postId);
await postsAPI.react(postId, 'love');
```

---

## ✅ Checklist

- [ ] Đã import `postsAPI`, `examsAPI`, `documentsAPI`
- [ ] Đã test lấy danh sách (GET)
- [ ] Đã test tạo mới (POST) - cần đăng nhập trước
- [ ] Đã xử lý loading states
- [ ] Đã xử lý error states

---

**Xem thêm:** `INTEGRATION_GUIDE.md` để biết chi tiết hơn!

