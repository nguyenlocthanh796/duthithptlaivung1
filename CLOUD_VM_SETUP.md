# ☁️ Hướng dẫn Setup trên Cloud VM

## 🎯 Quick Start

### 1. Cài đặt Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Cài Python và pip
sudo apt install python3 python3-pip python3-venv -y

# Cài PostgreSQL (hoặc MySQL)
sudo apt install postgresql postgresql-contrib -y
```

### 2. Setup Database

```bash
# Tạo database
sudo -u postgres psql
CREATE DATABASE duthithpt;
CREATE USER duthi_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE duthithpt TO duthi_user;
\q
```

### 3. Clone và Setup Backend

```bash
# Clone repo
git clone <your-repo> /opt/duthithpt
cd /opt/duthithpt/backend

# Tạo virtual environment
python3 -m venv venv
source venv/bin/activate

# Cài dependencies
pip install -r requirements.txt
pip install psycopg2-binary  # Cho PostgreSQL
```

### 4. Cấu hình Environment

```bash
nano .env
```

```bash
# Database
DATABASE_URL=postgresql://duthi_user:your_password@localhost:5432/duthithpt

# Firebase
FIREBASE_CREDENTIALS_PATH=/opt/duthithpt/backend/firebase-credentials.json
FIREBASE_PROJECT_ID=gen-lang-client-0581370080

# Server
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000
```

### 5. Upload Firebase Credentials

```bash
# Từ local machine
scp firebase-credentials.json user@vm-ip:/opt/duthithpt/backend/

# Set permissions
chmod 600 /opt/duthithpt/backend/firebase-credentials.json
```

### 6. Chạy Backend

```bash
# Development
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Production
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 7. Sync Users từ Firebase (Optional)

```bash
cd /opt/duthithpt/backend
source venv/bin/activate
python -m app.scripts.sync_firebase_users
```

---

## 🔄 Flow Đồng bộ User

### Tự động (Không cần làm gì)

1. User đăng nhập qua Firebase Auth (frontend)
2. Frontend gửi ID token lên backend
3. Backend tự động tạo user trong database nếu chưa có

**Endpoint:** `GET /api/users/me` (tự động gọi khi đăng nhập)

### Thủ công (Sync tất cả users)

```bash
python -m app.scripts.sync_firebase_users
```

---

## ✅ Kiểm tra

```bash
# Test database
python -c "from app.sql_database import db; print('OK' if db.health_check() else 'FAIL')"

# Test Firebase
python -c "from app.auth import _initialize_firebase_app; _initialize_firebase_app(); print('OK')"

# Test API
curl http://localhost:8000/health
```

---

**🚀 Xong! Backend đã sẵn sàng trên Cloud VM!**

