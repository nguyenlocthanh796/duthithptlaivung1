# 📋 Quản lý User và Nội dung - Hướng dẫn

## 🎯 Tổng quan

Dự án có hệ thống quản lý User và Nội dung (Posts) được phân chia giữa **Backend API** và **Frontend Interface**.

---

## 👥 QUẢN LÝ USER

### Backend API (`backend/app/routers/users.py`)

#### 1. **Lấy thông tin user hiện tại**
```http
GET /api/users/me
Authorization: Bearer <firebase_token>
```

**Response:**
```json
{
  "id": "user_id",
  "uid": "firebase_uid",
  "email": "user@example.com",
  "name": "Tên người dùng",
  "role": "student",
  "photo_url": "https://...",
  "created_at": "2025-01-01T00:00:00",
  "updated_at": "2025-01-01T00:00:00"
}
```

#### 2. **Tạo user mới**
```http
POST /api/users/
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "uid": "firebase_uid",
  "email": "user@example.com",
  "name": "Tên người dùng",
  "role": "student",
  "photo_url": "https://..."
}
```

#### 3. **Cập nhật user hiện tại**
```http
PUT /api/users/me
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "name": "Tên mới",
  "role": "teacher",
  "photo_url": "https://..."
}
```

#### 4. **Lấy thông tin user theo ID**
```http
GET /api/users/{user_id}
```

**Lưu ý:** User được tự động tạo khi đăng nhập lần đầu từ Firebase Auth.

### Frontend

Hiện tại chưa có **Admin Panel** để quản lý user. Có thể tạo tại:
- `frontend/src/components/admin/UserManagement.tsx`
- Route: `/admin/users`

---

## 📝 QUẢN LÝ NỘI DUNG (POSTS)

### Backend API (`backend/app/routers/posts.py`)

#### 1. **Lấy danh sách posts**
```http
GET /api/posts?subject=toan&limit=20&offset=0&search=keyword
```

**Enhanced API (v2.0.0):**
```http
GET /api/posts?subject=toan&limit=20&offset=0&search=keyword
```

**Response (Enhanced):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true,
    "total_pages": 8,
    "current_page": 1
  }
}
```

#### 2. **Lấy post theo ID**
```http
GET /api/posts/{post_id}
```

#### 3. **Tạo post mới**
```http
POST /api/posts
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "content": "Nội dung bài viết",
  "subject": "toan",
  "post_type": "text",
  "image_url": "data:image/...",
  "grade": 12
}
```

#### 4. **Cập nhật post**
```http
PUT /api/posts/{post_id}
Authorization: Bearer <firebase_token>
Content-Type: application/json

{
  "content": "Nội dung mới",
  "subject": "ly"
}
```

#### 5. **Xóa post**
```http
DELETE /api/posts/{post_id}
Authorization: Bearer <firebase_token>
```

**Lưu ý:** Chỉ tác giả hoặc admin/teacher mới có quyền xóa.

#### 6. **Thống kê posts**
```http
GET /api/posts/stats
```

**Response:**
```json
{
  "collection": "posts",
  "total_documents": 1500,
  "oldest_document": "2024-01-01T00:00:00",
  "newest_document": "2025-01-01T00:00:00"
}
```

### Frontend

#### **Student Feed** (`frontend/src/components/feed/StudentFeed.tsx`)
- Hiển thị danh sách posts
- Tạo post mới
- Sửa/xóa post của mình
- Like/reaction
- Bình luận

**Route:** `/student/feed`

#### **Chưa có Admin Panel**
Có thể tạo tại:
- `frontend/src/components/admin/PostManagement.tsx`
- Route: `/admin/posts`

---

## 🔐 PHÂN QUYỀN

### Roles
- **student**: Chỉ quản lý posts của mình
- **teacher**: Có thể xóa posts của học sinh
- **admin**: Toàn quyền

### Kiểm tra quyền trong Backend
```python
# posts.py
if post.get("author_id") != uid and role not in ("teacher", "admin"):
    raise HTTPException(status_code=403, detail="Not allowed")
```

---

## 📊 DATABASE

### Collections
- **users**: Lưu thông tin user
- **posts**: Lưu bài viết
- **comments**: Lưu bình luận

### Database Location
- **SQLite**: `backend/app/database.db` (mặc định)
- **Enhanced**: `backend/app/sql_database_enhanced.py`

---

## 🚀 TẠO ADMIN PANEL (Gợi ý)

### 1. **User Management Panel**

Tạo file: `frontend/src/components/admin/UserManagement.tsx`

**Tính năng:**
- Danh sách tất cả users
- Tìm kiếm user
- Cập nhật role (student/teacher/admin)
- Xem thống kê user

**API cần thêm:**
```python
# backend/app/routers/users.py
@router.get("/", response_model=List[UserResponse])
async def list_users(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lấy danh sách users (chỉ admin)"""
    role = current_user.get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    # ... logic
```

### 2. **Post Management Panel**

Tạo file: `frontend/src/components/admin/PostManagement.tsx`

**Tính năng:**
- Danh sách tất cả posts
- Tìm kiếm posts
- Xóa posts (admin/teacher)
- Duyệt posts (nếu có status pending)
- Thống kê posts

**API đã có:**
- `GET /api/posts/stats` - Thống kê
- `GET /api/posts` - Danh sách với search
- `DELETE /api/posts/{post_id}` - Xóa

### 3. **Dashboard Admin**

Tạo file: `frontend/src/components/admin/AdminDashboard.tsx`

**Tính năng:**
- Tổng số users
- Tổng số posts
- Thống kê theo thời gian
- Top users
- Top posts

---

## 📝 VÍ DỤ SỬ DỤNG API

### Frontend: Lấy danh sách users (cần thêm endpoint)

```typescript
// frontend/src/services/api.ts
export const usersAPI = {
  async getAll(filters?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    if (filters?.search) params.append('search', filters.search);
    
    return apiRequest<PaginatedResponse<User>>(
      `/api/users?${params.toString()}`,
      { requireAuth: true }
    );
  },
  
  async updateRole(userId: string, role: string): Promise<User> {
    return apiRequest<User>(`/api/users/${userId}/role`, {
      method: 'PUT',
      body: { role },
      requireAuth: true,
    });
  },
};
```

### Frontend: Quản lý posts

```typescript
// Đã có trong frontend/src/services/api.ts
import { postsAPI, postsAPIEnhanced } from './services/api';

// Lấy danh sách posts với pagination
const response = await postsAPIEnhanced.getAll({
  limit: 20,
  offset: 0,
  search: 'hàm số',
});

// Xóa post
await postsAPI.delete(postId);

// Thống kê
const stats = await postsAPIEnhanced.getStats();
```

---

## ✅ TÓM TẮT

### Quản lý User
- **Backend**: `backend/app/routers/users.py`
- **Frontend**: Chưa có admin panel (cần tạo)
- **API**: `/api/users/*`

### Quản lý Nội dung
- **Backend**: `backend/app/routers/posts.py`
- **Frontend**: `frontend/src/components/feed/StudentFeed.tsx`
- **API**: `/api/posts/*`

### Cần bổ sung
1. ✅ Admin Panel cho User Management
2. ✅ Admin Panel cho Post Management
3. ✅ Dashboard Admin với thống kê
4. ✅ API endpoint để list users (admin only)

---

**💡 Gợi ý:** Tạo admin panel tại `frontend/src/components/admin/` với routing `/admin/*`

