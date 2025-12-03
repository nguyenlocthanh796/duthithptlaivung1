# ⚡ Quick Start - Thêm Admin Role

## 🎯 Cách Nhanh Nhất

### Bước 1: Tìm email của bạn

Đăng nhập vào app, xem email trong profile hoặc Firebase Console.

### Bước 2: Chạy script

```bash
cd backend
python -m app.scripts.set_admin your-email@example.com
```

**Ví dụ:**
```bash
python -m app.scripts.set_admin locthanhnguyen796@gmail.com
```

### Bước 3: Xong!

Đăng nhập lại và bạn sẽ thấy menu Admin trong Leftbar.

---

## 🔍 Nếu không biết email

### List tất cả users:

```bash
cd backend
python -m app.scripts.list_users
```

Sau đó copy email hoặc UID và chạy lại script set_admin.

---

## ✅ Kiểm tra

1. Đăng nhập lại
2. Kiểm tra Leftbar có menu "Admin" không
3. Vào `/admin/dashboard` xem có hoạt động không

---

**🚀 Chỉ 3 bước là xong!**

