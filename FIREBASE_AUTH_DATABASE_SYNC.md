# 🔗 Kết nối Firebase Authentication với Database trên Cloud VM

## 📋 Tổng quan

Dự án của bạn đã có cơ chế tự động đồng bộ Firebase Auth với database. Đây là cách hoạt động và cách cấu hình cho Cloud VM.

---

## 🔄 Flow hiện tại

### 1. **User đăng nhập qua Firebase Auth** (Frontend)
```
User → Firebase Auth → Nhận ID Token
```

### 2. **Frontend gửi ID Token lên Backend**
```
Frontend → Backend API (với Authorization: Bearer <token>)
```

### 3. **Backend verify token và tự động tạo user** (Tự động)
```
Backend → Verify Firebase Token → Tạo user trong database nếu chưa có
```

**Code hiện tại** (`backend/app/routers/users.py`):
```python
@router.get("/me")
async def get_current_user_info(current_user: Dict = Depends(get_current_user)):
    # Tìm user trong database
    users = db.query("users", filters=[("uid", "==", uid)], limit=1)
    
    if users:
        # User đã tồn tại, trả về
        return user_data
    else:
        # Tự động tạo user mới từ Firebase token
        user_data = {
            "uid": uid,
            "email": current_user.get("email", ""),
            "name": current_user.get("name") or current_user.get("email", ""),
            "role": "student",
            "photo_url": current_user.get("picture"),
        }
        db.create("users", user_data, doc_id=uid)
```

---

## ☁️ Cấu hình Database trên Cloud VM

### Option 1: PostgreSQL (Khuyến nghị cho Production)

#### Bước 1: Cài đặt PostgreSQL trên VM

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Khởi động service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Bước 2: Tạo database và user

```bash
sudo -u postgres psql

# Trong PostgreSQL console
CREATE DATABASE duthithpt;
CREATE USER duthi_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE duthithpt TO duthi_user;
\q
```

#### Bước 3: Cấu hình Backend

Tạo file `.env` trong `backend/`:
```bash
# Database
DATABASE_URL=postgresql://duthi_user:your_secure_password@localhost:5432/duthithpt

# Firebase
FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json
FIREBASE_PROJECT_ID=gen-lang-client-0581370080
```

#### Bước 4: Cài đặt PostgreSQL driver

```bash
cd backend
pip install psycopg2-binary
```

### Option 2: MySQL

#### Bước 1: Cài đặt MySQL

```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

#### Bước 2: Tạo database

```bash
sudo mysql -u root -p

CREATE DATABASE duthithpt;
CREATE USER 'duthi_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON duthithpt.* TO 'duthi_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Bước 3: Cấu hình Backend

```bash
# .env
DATABASE_URL=mysql+pymysql://duthi_user:your_secure_password@localhost:3306/duthithpt
```

#### Bước 4: Cài đặt driver

```bash
pip install pymysql
```

### Option 3: SQLite (Development/Testing)

SQLite đã được cấu hình sẵn, không cần setup thêm. Chỉ cần đảm bảo file `app.db` có quyền ghi.

---

## 🔄 Đồng bộ Users từ Firebase Auth

### Cách 1: Tự động (Đã có sẵn)

**Không cần làm gì!** Khi user đăng nhập lần đầu:
1. Frontend gọi `/api/users/me` với Firebase token
2. Backend tự động tạo user trong database

### Cách 2: Sync tất cả users từ Firebase (Script)

Tạo script để sync tất cả users từ Firebase Auth:

```python
# backend/scripts/sync_firebase_users.py
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.sql_database import db
from app.auth import _initialize_firebase_app
from firebase_admin import auth
from datetime import datetime

def sync_all_firebase_users():
    """Sync tất cả users từ Firebase Auth sang database"""
    _initialize_firebase_app()
    
    try:
        # Lấy tất cả users từ Firebase
        page = auth.list_users()
        synced = 0
        skipped = 0
        
        while page:
            for user in page.users:
                uid = user.uid
                email = user.email or ""
                name = user.display_name or email
                photo_url = user.photo_url
                
                # Kiểm tra user đã tồn tại chưa
                existing = db.read("users", uid)
                if existing:
                    print(f"⏭️  Skip: {email} (đã tồn tại)")
                    skipped += 1
                    continue
                
                # Tạo user mới
                now_iso = datetime.now().isoformat()
                user_data = {
                    "uid": uid,
                    "email": email,
                    "name": name,
                    "role": "student",
                    "photo_url": photo_url,
                    "createdAt": now_iso,
                    "updatedAt": now_iso,
                }
                db.create("users", user_data, doc_id=uid)
                print(f"✅ Synced: {email}")
                synced += 1
            
            # Lấy trang tiếp theo
            page = page.get_next_page()
        
        print(f"\n📊 Tổng kết:")
        print(f"   ✅ Synced: {synced} users")
        print(f"   ⏭️  Skipped: {skipped} users")
        
    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")

if __name__ == "__main__":
    sync_all_firebase_users()
```

Chạy script:
```bash
cd backend
python -m app.scripts.sync_firebase_users
```

---

## 🔐 Cấu hình Firebase trên Cloud VM

### Bước 1: Tải Firebase Credentials

1. Vào Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Tải file JSON

### Bước 2: Upload lên VM

```bash
# SCP từ local lên VM
scp firebase-credentials.json user@your-vm-ip:/path/to/backend/

# Hoặc tạo trực tiếp trên VM
nano /path/to/backend/firebase-credentials.json
# Paste nội dung JSON
```

### Bước 3: Set permissions

```bash
chmod 600 /path/to/backend/firebase-credentials.json
```

### Bước 4: Cấu hình trong `.env`

```bash
FIREBASE_CREDENTIALS_PATH=/path/to/backend/firebase-credentials.json
FIREBASE_PROJECT_ID=gen-lang-client-0581370080
```

---

## 🚀 Deploy trên Cloud VM

### 1. Clone code lên VM

```bash
git clone <your-repo> /opt/duthithpt
cd /opt/duthithpt/backend
```

### 2. Cài đặt dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Cấu hình `.env`

```bash
nano .env
```

```bash
# Database
DATABASE_URL=postgresql://duthi_user:password@localhost:5432/duthithpt

# Firebase
FIREBASE_CREDENTIALS_PATH=/opt/duthithpt/backend/firebase-credentials.json
FIREBASE_PROJECT_ID=gen-lang-client-0581370080

# Server
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000

# CORS
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### 4. Chạy migrations (nếu cần)

Database sẽ tự động tạo tables khi chạy lần đầu.

### 5. Chạy backend

```bash
# Development
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Production (với gunicorn)
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 6. Setup systemd service (Optional)

```bash
sudo nano /etc/systemd/system/duthithpt-backend.service
```

```ini
[Unit]
Description=DuThi THPT Backend API
After=network.target postgresql.service

[Service]
User=your-user
WorkingDirectory=/opt/duthithpt/backend
Environment="PATH=/opt/duthithpt/backend/venv/bin"
ExecStart=/opt/duthithpt/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable duthithpt-backend
sudo systemctl start duthithpt-backend
```

---

## ✅ Kiểm tra kết nối

### 1. Test Database

```bash
cd backend
python -c "from app.sql_database import db; print('✅ Database connected' if db.health_check() else '❌ Database error')"
```

### 2. Test Firebase Auth

```bash
python -c "from app.auth import _initialize_firebase_app; _initialize_firebase_app(); print('✅ Firebase initialized')"
```

### 3. Test API

```bash
curl http://localhost:8000/health
```

### 4. Test User Sync

1. Đăng nhập qua frontend
2. Gọi API: `GET /api/users/me` với Firebase token
3. Kiểm tra user đã được tạo trong database

---

## 🔍 Troubleshooting

### Lỗi: "Database connection failed"

- Kiểm tra `DATABASE_URL` trong `.env`
- Kiểm tra database service đang chạy: `sudo systemctl status postgresql`
- Kiểm tra firewall: `sudo ufw allow 5432`

### Lỗi: "Firebase credentials not found"

- Kiểm tra đường dẫn `FIREBASE_CREDENTIALS_PATH`
- Kiểm tra file có quyền đọc: `ls -l firebase-credentials.json`
- Kiểm tra nội dung JSON hợp lệ

### Lỗi: "User not syncing"

- Kiểm tra backend logs
- Đảm bảo `/api/users/me` được gọi sau khi đăng nhập
- Kiểm tra database có quyền ghi

---

## 📊 Monitoring

### Xem users trong database

```bash
cd backend
python -m app.scripts.list_users
```

### Xem logs

```bash
# Systemd service
sudo journalctl -u duthithpt-backend -f

# Manual run
tail -f /path/to/logs/app.log
```

---

## 🎯 Tóm tắt

1. **Firebase Auth** → User đăng nhập, nhận ID token
2. **Frontend** → Gửi token lên backend
3. **Backend** → Verify token, tự động tạo user trong database
4. **Database** → Lưu thông tin user (uid, email, name, role)

**Không cần sync thủ công!** Hệ thống tự động đồng bộ khi user đăng nhập.

---

**✅ Hệ thống đã sẵn sàng kết nối Firebase Auth với database trên Cloud VM!**

