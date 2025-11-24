# 🎓 DuThi THPT Platform

**Nền tảng học tập và thi trắc nghiệm THPT với AI**

---

## 🌐 Production URLs

✅ **Frontend**: https://gen-lang-client-0581370080.web.app  
✅ **Backend**: https://duthi-backend-626004693464.us-central1.run.app  
✅ **API Docs**: https://duthi-backend-626004693464.us-central1.run.app/docs

**Status:** 🟢 Online & Operational

---

## ⚡ Quick Start

### 🔧 Development (Localhost)
```bash
python dev.py
```
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

### 🚀 Deploy to Production
```bash
python deploy.py
```
Deploys to:
- Backend → Google Cloud Run
- Frontend → Firebase Hosting

### 🧹 Clean Project
```bash
python cleanup.py
```

---

## 📦 Setup

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
# Copy from backend/.env.example
```

**backend/.env:**
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEYS=key1,key2,key3
GOOGLE_DRIVE_FOLDER_ID=your_folder_id
FIREBASE_PROJECT_ID=gen-lang-client-0581370080
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
```

**frontend/.env:**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0581370080
VITE_FIREBASE_STORAGE_BUCKET=gen-lang-client-0581370080.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=626004693464
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Firebase Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Init project
firebase init
```

### 4. Google Cloud Setup
```bash
# Install gcloud CLI
# Download from: https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Set project
gcloud config set project gen-lang-client-0581370080
```

---

## ✨ Features

### 🤖 AI-Powered (Gemini 2.5 Flash Lite)
- Chat với AI để học tập
- Tạo câu hỏi và đáp án nhiễu
- Trích xuất câu hỏi từ PDF/DOC
- Multi-API key rotation (tối ưu quota)

### 📝 Quản Lý Đề Thi
- Tạo đề thi trắc nghiệm tự động
- Clone và tạo variants câu hỏi
- Upload file lên Google Drive
- Tạo đề thi ngẫu nhiên

### 👥 Cộng Đồng
- Chia sẻ bài viết, tài liệu
- Thảo luận học tập
- System roles (Admin, Teacher, Student)
- Comments & reactions

### 🎥 Proctoring (Giám sát thi)
- Face detection (face-api.js)
- Cảnh báo vi phạm
- Lưu lịch sử thi

### 📊 Dashboard & Analytics
- Thống kê kết quả
- Lịch sử làm bài
- Charts và visualization

---

## 🏗️ Tech Stack

**Backend:**
- Python 3.11 + FastAPI
- Google Gemini API (gemini-2.5-flash-lite)
- Google Drive API
- Deployed on Cloud Run

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- Firebase (Auth, Firestore)
- PWA Support
- Deployed on Firebase Hosting

**Database:**
- Firestore (NoSQL)

**AI:**
- Google Gemini 2.5 Flash Lite
- Multi-key rotation

---

## 📁 Project Structure

```
duthithptlaivung1/
├── 📱 backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # Entry point
│   │   ├── config.py          # Settings
│   │   ├── routers/           # API endpoints
│   │   └── services/          # Gemini, Drive clients
│   ├── Dockerfile             # Cloud Run
│   ├── env.yaml               # Production env vars
│   └── requirements.txt       # Python deps
│
├── 🌐 frontend/               # React Frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API, Firestore
│   │   └── firebase.js        # Firebase config
│   ├── vite.config.js         # Vite + PWA config
│   └── package.json           # Node deps
│
├── 🚀 SCRIPTS
│   ├── dev.py                 # Start localhost
│   ├── deploy.py              # Deploy production
│   └── cleanup.py             # Clean project
│
├── 📖 DOCS
│   ├── README.md              # This file
│   ├── QUICK_START.md         # Quick reference
│   ├── DEPLOYMENT_COMPLETE.md # Deployment guide
│   └── FIX_FIREBASE_AUTH.md   # Troubleshooting
│
└── ⚙️ CONFIG
    ├── firebase.json          # Firebase config
    ├── firestore.rules        # Security rules
    └── .gitignore             # Git ignore
```

---

## 🔧 Configuration Files

### Backend Production (env.yaml)
```yaml
GEMINI_API_KEY: "your_key"
GEMINI_API_KEYS: "key1,key2,key3"
GOOGLE_DRIVE_FOLDER_ID: "folder_id"
FIREBASE_PROJECT_ID: "gen-lang-client-0581370080"
FASTAPI_HOST: "0.0.0.0"
FASTAPI_PORT: "8000"
ALLOWED_ORIGINS: "https://gen-lang-client-0581370080.web.app,..."
```

### Frontend Production (.env)
```env
VITE_API_BASE_URL=https://duthi-backend-626004693464.us-central1.run.app
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0581370080
```

---

## 🛠️ Common Commands

### Development
```bash
# Start dev servers
python dev.py

# Backend only
cd backend
python start.py

# Frontend only
cd frontend
npm run dev
```

### Deployment
```bash
# Deploy all
python deploy.py

# Backend only
cd backend
gcloud run deploy duthi-backend --source . --region us-central1 --env-vars-file=env.yaml

# Frontend only
cd frontend
npm run build
firebase deploy --only hosting
```

### Maintenance
```bash
# Clean project
python cleanup.py

# Test deployment
.\test-deployment.ps1

# View logs
gcloud run services logs read duthi-backend --region=us-central1
```

---

## 💰 Cost

**$0/month** (100% Free Tier):
- Cloud Run: 2M requests/month
- Firebase Hosting: 10GB storage
- Firestore: 50K reads, 20K writes/day
- Firebase Auth: Unlimited
- Gemini API: Free quota

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Backend Cold Start | 5-10s |
| Backend Warm | 1-3s |
| Frontend Load | ~2s |
| AI Response | 3-5s |

---

## 🆘 Troubleshooting

### Backend Error 500?
```bash
# Check logs
gcloud run services logs read duthi-backend --region=us-central1 --limit=50

# Verify env vars
gcloud run services describe duthi-backend --region=us-central1
```

### Frontend Not Connecting?
1. Check `frontend/.env` has correct `VITE_API_BASE_URL`
2. Verify CORS in backend logs
3. Check browser console for errors

### Firebase Auth Error?
```bash
# Enable Identity Toolkit API
gcloud services enable identitytoolkit.googleapis.com --project=gen-lang-client-0581370080

# Wait 2-3 minutes, then refresh
```

### Port Already in Use?
```bash
# Windows: Find process using port
netstat -ano | findstr :8000
taskkill /PID <pid> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

---

## 📖 Documentation

- **QUICK_START.md** - Quick reference guide
- **DEPLOYMENT_COMPLETE.md** - Full deployment info
- **FIX_FIREBASE_AUTH.md** - Firebase troubleshooting
- **test-deployment.ps1** - Test script

---

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

MIT License

---

## 👥 Support

- **Issues**: Open a GitHub issue
- **Docs**: See markdown files in project root
- **Production**: https://gen-lang-client-0581370080.web.app

---

## 🎯 Project Status

```
✅ Backend:  Online (Cloud Run)
✅ Frontend: Online (Firebase Hosting)
✅ Database: Connected (Firestore)
✅ AI:       Working (gemini-2.5-flash-lite)
✅ Auth:     Enabled (Google OAuth)
✅ HTTPS:    Secure (end-to-end)
```

**Version:** 1.0.0  
**Last Updated:** 24/11/2025  
**Status:** 🟢 Production Ready

---

**🚀 3 Commands để làm việc:**

```bash
python dev.py      # Develop
python deploy.py   # Deploy
python cleanup.py  # Clean
```

**Happy Coding! 🎉**
