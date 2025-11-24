# 🚀 START HERE - DuThi THPT Platform

**Chào mừng! Dự án đã sẵn sàng.** 

---

## ⚡ Quick Actions

### 🔧 Development (Localhost)
```bash
python dev.py
```
→ Backend: http://localhost:8000  
→ Frontend: http://localhost:5173

### 🚀 Deploy to Production
```bash
python deploy.py
```
→ Frontend: https://gen-lang-client-0581370080.web.app  
→ Backend: https://duthi-backend-626004693464.us-central1.run.app

### 🧹 Clean Project
```bash
python cleanup.py
```

---

## 📖 Documentation (Đọc theo thứ tự)

1. **README.md** - Overview, setup, features
2. **QUICK_START.md** - Quick reference
3. **PROJECT_FINAL.md** - Complete project info
4. **DEPLOYMENT_COMPLETE.md** - Deployment details

---

## 📁 Project Structure

```
duthithptlaivung1/
│
├── 🚀 3 SCRIPTS CHÍNH
│   ├── dev.py         ← Start localhost
│   ├── deploy.py      ← Deploy to production
│   └── cleanup.py     ← Clean project
│
├── 📱 backend/        ← FastAPI + Gemini AI
├── 🌐 frontend/       ← React + Firebase
│
└── 📖 DOCS (4 files)
    ├── README.md
    ├── QUICK_START.md
    ├── PROJECT_FINAL.md
    └── DEPLOYMENT_COMPLETE.md
```

---

## ✅ Current Status

```
🟢 Production:  DEPLOYED
🟢 Backend:     https://duthi-backend-626004693464.us-central1.run.app
🟢 Frontend:    https://gen-lang-client-0581370080.web.app
🟢 AI Model:    gemini-2.5-flash-lite
🟢 Cost:        $0/month (Free Tier)
```

---

## 🎯 What You Can Do Now

### Option 1: Test Production
```
1. Open: https://gen-lang-client-0581370080.web.app
2. Login with Google
3. Try AI Chat at /chat
```

### Option 2: Develop Locally
```bash
# Start dev servers
python dev.py

# Open http://localhost:5173
# Make changes to code
# See changes instantly
```

### Option 3: Add New Features
```bash
# 1. Develop locally
python dev.py

# 2. Code in:
#    - backend/app/routers/  (API endpoints)
#    - frontend/src/         (React components)

# 3. Deploy when ready
python deploy.py
```

---

## 🆘 Need Help?

### Quick Troubleshooting:
- Port in use? → Kill process or restart computer
- Backend error? → Check `backend/.env` file
- Frontend error? → Check `frontend/.env` file
- Deployment error? → See **DEPLOYMENT_COMPLETE.md**

### Documentation:
- **README.md** - Complete guide
- **FIX_FIREBASE_AUTH.md** - Firebase issues
- **QUICK_START.md** - Quick reference

---

## 💡 Tips

1. **Always run `python cleanup.py` before committing to git**
2. **Test locally (`python dev.py`) before deploying**
3. **Use `test-deployment.ps1` to verify production**
4. **Check logs: `gcloud run services logs read duthi-backend`**

---

## 🎉 You're All Set!

**Everything is working:**
✅ Backend deployed  
✅ Frontend deployed  
✅ AI Chat working  
✅ Database connected  
✅ Authentication enabled  

**Just 3 commands to remember:**
```bash
python dev.py      # Develop
python deploy.py   # Deploy
python cleanup.py  # Clean
```

---

**🚀 Happy Coding!**

Read **README.md** for complete documentation.

