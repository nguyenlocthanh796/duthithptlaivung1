# 🛡️ Hướng dẫn Thêm Role Admin

## 📋 Tổng quan

Có nhiều cách để thêm role admin cho user. Chọn cách phù hợp với tình huống của bạn.

---

## 🚀 Cách 1: Sử dụng Script (Khuyến nghị)

### Bước 1: Chạy script set_admin

```bash
cd backend
python -m app.scripts.set_admin <user_email_or_uid>
```

**Ví dụ:**
```bash
# Theo email
python -m app.scripts.set_admin user@example.com

# Theo UID
python -m app.scripts.set_admin abc123xyz456
```

### Bước 2: Xác nhận

Script sẽ hiển thị:
```
✅ Đã set role admin cho user:
   Email: user@example.com
   UID: abc123xyz456
   Role cũ: student
   Role mới: admin
```

### List tất cả users

Để xem danh sách users:
```bash
python -m app.scripts.list_users
```

---

## 🔧 Cách 2: Qua Database trực tiếp (SQLite)

### Bước 1: Mở database

```bash
cd backend
sqlite3 app/database.db
```

### Bước 2: Xem users

```sql
SELECT id, uid, email, name, role FROM users;
```

### Bước 3: Cập nhật role

```sql
UPDATE users 
SET role = 'admin', updatedAt = datetime('now') 
WHERE email = 'user@example.com';
-- hoặc
UPDATE users 
SET role = 'admin', updatedAt = datetime('now') 
WHERE uid = 'firebase_uid_here';
```

### Bước 4: Xác nhận

```sql
SELECT email, role FROM users WHERE email = 'user@example.com';
```

---

## 🌐 Cách 3: Qua API (Nếu đã có admin khác)

### Bước 1: Đăng nhập với admin account

Lấy Firebase token của admin.

### Bước 2: Gọi API

```bash
curl -X PUT "http://localhost:8000/api/users/{user_id}/role" \
  -H "Authorization: Bearer <admin_firebase_token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

**Ví dụ với user_id:**
```bash
curl -X PUT "http://localhost:8000/api/users/abc123xyz456/role" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

---

## 💻 Cách 4: Qua Python Console

### Bước 1: Mở Python console

```bash
cd backend
python
```

### Bước 2: Chạy code

```python
from app.sql_database import db
from datetime import datetime

# Tìm user
users = db.get_all("users")
user = None
for u in users:
    if u.get("email") == "user@example.com":  # Thay email của bạn
        user = u
        break

if user:
    user_id = user.get("id") or user.get("uid")
    db.update("users", user_id, {
        "role": "admin",
        "updatedAt": datetime.now().isoformat()
    })
    print(f"✅ Đã set admin cho {user.get('email')}")
else:
    print("❌ Không tìm thấy user")
```

---

## 🎯 Cách 5: Qua Admin Panel (Nếu đã có admin)

1. Đăng nhập với admin account hiện có
2. Vào `/admin/users`
3. Tìm user cần set admin
4. Click "Đổi Role"
5. Chọn "Admin"
6. Click "Lưu"

---

## ✅ Kiểm tra Role Admin

### Qua API

```bash
curl -X GET "http://localhost:8000/api/users/me" \
  -H "Authorization: Bearer <firebase_token>"
```

Response sẽ có:
```json
{
  "id": "...",
  "email": "user@example.com",
  "role": "admin",
  ...
}
```

### Qua Frontend

1. Đăng nhập với user đã set admin
2. Kiểm tra RoleSelector hoặc Navbar
3. Nếu có role admin, sẽ thấy menu "Admin" trong Leftbar

---

## 🔍 Tìm User ID/UID

### Qua Script

```bash
python -m app.scripts.list_users
```

### Qua Database

```sql
SELECT uid, email, role FROM users;
```

### Qua API (nếu đã đăng nhập)

```bash
curl -X GET "http://localhost:8000/api/users/me" \
  -H "Authorization: Bearer <firebase_token>"
```

---

## ⚠️ Lưu ý

1. **Backup database** trước khi thay đổi
2. **Chỉ set admin cho user đáng tin cậy**
3. **Kiểm tra lại** sau khi set
4. **Không set admin cho nhiều users** không cần thiết

---

## 🐛 Troubleshooting

### Lỗi: "Không tìm thấy user"

- Kiểm tra email/UID có đúng không
- Chạy `python -m app.scripts.list_users` để xem danh sách

### Lỗi: "Permission denied"

- Kiểm tra quyền truy cập database
- Đảm bảo đang chạy từ đúng directory

### Lỗi: "Database locked"

- Đóng các connection khác đến database
- Restart backend server

---

## 📝 Ví dụ Hoàn chỉnh

### Scenario: Set admin cho user đầu tiên

```bash
# 1. List users
cd backend
python -m app.scripts.list_users

# 2. Set admin (giả sử email là admin@example.com)
python -m app.scripts.set_admin admin@example.com

# 3. Xác nhận
python -m app.scripts.list_users
```

---

**✅ Chọn cách phù hợp và set admin role cho user của bạn!**

