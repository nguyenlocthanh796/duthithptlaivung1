# 🛡️ Admin Panel - Hướng dẫn Sử dụng

## 📋 Tổng quan

Admin Panel là trang quản lý toàn bộ hệ thống, chỉ dành cho user có role **admin**.

## 🚀 Truy cập

**URL:** `/admin/dashboard` hoặc `/admin/users` hoặc `/admin/posts`

**Yêu cầu:**
- User phải đăng nhập
- User phải có role = `admin`

## 📊 Tính năng

### 1. **Dashboard** (`/admin/dashboard`)

Thống kê tổng quan hệ thống:
- Tổng số users
- Users theo role (student, teacher, admin)
- Tổng số posts
- Posts theo môn học
- Posts theo status (pending, approved, rejected)
- Tổng số comments

### 2. **Quản lý Users** (`/admin/users`)

**Tính năng:**
- Xem danh sách tất cả users
- Tìm kiếm user (theo tên, email)
- Lọc theo role
- Cập nhật role của user
- Xóa user

**API Endpoints:**
- `GET /api/users/` - Lấy danh sách users (admin only)
- `PUT /api/users/{user_id}/role` - Cập nhật role
- `DELETE /api/users/{user_id}` - Xóa user

### 3. **Quản lý Posts** (`/admin/posts`)

**Tính năng:**
- Xem danh sách tất cả posts
- Tìm kiếm posts
- Lọc theo môn học
- Lọc theo status
- Duyệt/từ chối posts (pending → approved/rejected)
- Xóa posts

**API Endpoints:**
- `GET /api/admin/posts/all` - Lấy tất cả posts (admin only)
- `PUT /api/admin/posts/{post_id}/status` - Cập nhật status
- `DELETE /api/admin/posts/{post_id}` - Xóa post

## 🔐 Phân quyền

### Admin Only Endpoints

Tất cả endpoints trong `/api/admin/*` và một số endpoints trong `/api/users/*` yêu cầu:
- User đã đăng nhập
- User có role = `admin`

**Backend Check:**
```python
def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)):
    role = current_user.get("role") or "student"
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

## 📁 Files

### Backend
- `backend/app/routers/admin.py` - Admin API endpoints
- `backend/app/routers/users.py` - User management endpoints (có admin endpoints)

### Frontend
- `frontend/src/components/admin/AdminPanel.tsx` - Main admin panel
- `frontend/src/components/admin/AdminDashboard.tsx` - Dashboard
- `frontend/src/components/admin/UserManagement.tsx` - User management
- `frontend/src/components/admin/PostManagement.tsx` - Post management
- `frontend/src/services/admin-api.ts` - Admin API client

## 🎯 Sử dụng

### 1. Đăng nhập với role admin

User cần có role = `admin` trong database. Có thể cập nhật qua:
- Admin panel khác (nếu có)
- Database trực tiếp
- API: `PUT /api/users/{user_id}/role` với body `{"role": "admin"}`

### 2. Truy cập Admin Panel

Sau khi đăng nhập với role admin:
1. Chọn role "admin" trong RoleSelector (nếu có)
2. Hoặc truy cập trực tiếp `/admin/dashboard`

### 3. Quản lý Users

1. Vào tab "Quản lý Users"
2. Tìm kiếm hoặc lọc users
3. Click "Đổi Role" để thay đổi role
4. Click "Xóa" để xóa user (cẩn thận!)

### 4. Quản lý Posts

1. Vào tab "Quản lý Posts"
2. Tìm kiếm hoặc lọc posts
3. Duyệt posts pending: Click "Duyệt" hoặc "Từ chối"
4. Xóa posts: Click "Xóa"

## ⚠️ Lưu ý

1. **Không thể xóa chính mình**: Admin không thể xóa chính mình
2. **Xóa user**: Sẽ xóa user khỏi database, nhưng không xóa posts/comments của user đó
3. **Xóa post**: Sẽ xóa post và tất cả comments liên quan
4. **Status posts**: 
   - `pending`: Đang chờ duyệt
   - `approved`: Đã duyệt
   - `rejected`: Đã từ chối

## 🔧 API Examples

### Lấy thống kê
```bash
curl -X GET "http://localhost:8000/api/admin/stats" \
  -H "Authorization: Bearer <admin_token>"
```

### Lấy danh sách users
```bash
curl -X GET "http://localhost:8000/api/users/?limit=50&search=john" \
  -H "Authorization: Bearer <admin_token>"
```

### Cập nhật role
```bash
curl -X PUT "http://localhost:8000/api/users/{user_id}/role" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "teacher"}'
```

### Xóa user
```bash
curl -X DELETE "http://localhost:8000/api/users/{user_id}" \
  -H "Authorization: Bearer <admin_token>"
```

### Lấy tất cả posts
```bash
curl -X GET "http://localhost:8000/api/admin/posts/all?status=pending&limit=50" \
  -H "Authorization: Bearer <admin_token>"
```

### Cập nhật status post
```bash
curl -X PUT "http://localhost:8000/api/admin/posts/{post_id}/status" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

---

**✅ Admin Panel đã sẵn sàng sử dụng!**

