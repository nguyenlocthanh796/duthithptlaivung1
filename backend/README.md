# Backend API - DuThi THPT Platform

FastAPI backend với Firestore database connection.

## 🚀 Quick Start

### 1. Setup Virtual Environment
```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Firebase Credentials

**Option 1: Service Account JSON File (Recommended for local dev)**
1. Download service account key từ Firebase Console
2. Đặt file vào `backend/firebase-credentials.json`
3. File này sẽ được gitignored

**Option 2: Environment Variable**
```bash
export FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'
```

**Option 3: Default Credentials (for Cloud Run)**
- Sử dụng service account của Cloud Run tự động

### 4. Create .env File
```bash
cp .env.example .env
# Edit .env với các giá trị của bạn
```

### 5. Run Server
```bash
python start.py
# hoặc
uvicorn app.main:app --reload
```

Server sẽ chạy tại: `http://localhost:8000`

## 📚 API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check với database connection test

### Collection Operations
- `GET /api/collections/{collection_name}` - Get all documents
- `POST /api/collections/{collection_name}` - Create document
- `GET /api/collections/{collection_name}/{doc_id}` - Get document by ID
- `PUT /api/collections/{collection_name}/{doc_id}` - Update document
- `DELETE /api/collections/{collection_name}/{doc_id}` - Delete document
- `POST /api/collections/{collection_name}/query` - Query documents

### API Documentation
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🔧 Configuration

Xem `.env.example` để biết các biến môi trường cần thiết.

## 🐳 Docker

```bash
docker build -t duthi-backend .
docker run -p 8000:8000 duthi-backend
```

## 📝 Notes

- Firestore connection tự động detect credentials từ nhiều nguồn
- Tất cả documents tự động có `createdAt` và `updatedAt` timestamps
- CORS đã được cấu hình cho các origins trong settings

