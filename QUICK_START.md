# ⚡ Quick Start - Khởi Động Nhanh

## 🌐 Production URLs (Đã Deploy)

✅ **Frontend:** https://gen-lang-client-0581370080.web.app  
✅ **Backend:** https://duthi-backend-626004693464.us-central1.run.app  
✅ **API Docs:** https://duthi-backend-626004693464.us-central1.run.app/docs

**Status:** 🟢 All systems operational

---

## 🎯 Test Ngay

### 1. Mở Website
```
https://gen-lang-client-0581370080.web.app
```

### 2. Login với Google
Click "Đăng nhập với Google"

### 3. Test AI Chat
```
https://gen-lang-client-0581370080.web.app/chat
```
Gửi tin nhắn: "Giải thích định lý Pythagoras"

---

## 💻 Local Development

### Khởi Động Tự Động (Khuyên Dùng)
```powershell
python start-dev.py
```
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

### Khởi Động Thủ Công

**Backend:**
```powershell
cd backend
.venv\Scripts\activate
python start.py
```

**Frontend:**
```powershell
cd frontend
npm run dev
```

---

## 🚀 Deployment

### Deploy Cả 2 (Backend + Frontend)
```powershell
python deploy_all.py
```

### Deploy Backend Only
```powershell
cd backend
gcloud run deploy duthi-backend --source . --region us-central1 --env-vars-file=env.yaml
```

### Deploy Frontend Only
```powershell
cd frontend
npm run build
firebase deploy --only hosting
```

---

## 🔧 Maintenance

### Dọn Dẹp Project
```powershell
python cleanup.py
```

### Test Deployment
```powershell
.\test-deployment.ps1
```

### Xem Backend Logs
```powershell
gcloud run services logs read duthi-backend --region=us-central1 --limit=50
```

---

## 📖 Documentation

1. **README.md** - Overview & Features
2. **DEPLOYMENT_COMPLETE.md** - Latest deployment info
3. **FINAL_DEPLOYMENT_SUMMARY.md** - Complete guide
4. **PROJECT_STRUCTURE.md** - Project structure
5. **FIX_FIREBASE_AUTH.md** - Auth troubleshooting

---

## ⚙️ Configuration

### Backend `.env` (local)
```env
GEMINI_API_KEY=your_key
GEMINI_API_KEYS=key1,key2,key3
GOOGLE_DRIVE_FOLDER_ID=your_folder_id
FIREBASE_PROJECT_ID=gen-lang-client-0581370080
```

### Backend `env.yaml` (Cloud Run)
```yaml
GEMINI_API_KEY: "your_key"
GEMINI_API_KEYS: "key1,key2,key3"
GOOGLE_DRIVE_FOLDER_ID: "your_folder_id"
FIREBASE_PROJECT_ID: "gen-lang-client-0581370080"
```

### Frontend `.env`
```env
VITE_API_BASE_URL=https://duthi-backend-626004693464.us-central1.run.app
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0581370080
```

---

## 🆘 Common Issues

### 🔴 Backend 500 Error?
```powershell
# Check if env variables are set
gcloud run services describe duthi-backend --region=us-central1 --format="value(spec.template.spec.containers[0].env)"

# Redeploy with env vars
cd backend
gcloud run deploy duthi-backend --source . --region us-central1 --env-vars-file=env.yaml
```

### 🔴 Frontend Not Connecting?
```powershell
# Check .env file
cd frontend
cat .env

# Should have: VITE_API_BASE_URL=https://duthi-backend-xxx.run.app
```

### 🔴 Firebase Auth Error?
```powershell
# Enable Identity Toolkit API
gcloud services enable identitytoolkit.googleapis.com --project=gen-lang-client-0581370080

# Wait 2-3 minutes, then refresh website
```

### 🔴 CORS Error?
Check backend logs:
```powershell
gcloud run services logs read duthi-backend --region=us-central1 | Select-String "CORS"
```

---

## 🎯 3 Commands Quan Trọng

```powershell
# 1. Local Development
python start-dev.py

# 2. Clean Project
python cleanup.py

# 3. Deploy Production
python deploy_all.py
```

---

## ✅ Quick Checklist

### Deployment:
- [x] Backend deployed to Cloud Run
- [x] Frontend deployed to Firebase Hosting
- [x] Environment variables configured
- [x] CORS enabled
- [x] HTTPS working
- [x] AI Chat working (gemini-2.5-flash-lite)

### Features:
- [x] Google Authentication
- [x] AI Chat
- [x] Question Generation
- [x] File Upload
- [x] Community Posts
- [x] Exam Room
- [x] Proctoring

---

## 📊 Status

```
🟢 Backend:  Online
🟢 Frontend: Online
🟢 Database: Connected
🟢 AI:       Working (gemini-2.5-flash-lite)
🟢 Auth:     Enabled
```

**Last Check:** 24/11/2025  
**Status:** ✅ Production Ready

---

**Xong! Chỉ cần 3 commands để làm việc!** 🚀
