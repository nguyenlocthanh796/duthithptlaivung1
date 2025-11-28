# 🔗 Kết nối Frontend với Backend

## ✅ Đã thiết lập

### 1. API Service (`src/services/api.js`)
- ✅ Tự động detect development/production URL
- ✅ Hỗ trợ tất cả endpoints từ backend:
  - `/api/generate-exam` - Tạo đề thi
  - `/ai/complete` - AI completion
  - `/ai/tutor` - AI Tutor chat
  - `/questions` - Quản lý câu hỏi
  - `/files` - Upload/download files
  - `/teacher/documents` - Tài liệu giáo viên

### 2. Gemini Service (`src/services/geminiService.js`)
- ✅ Ưu tiên sử dụng backend API
- ✅ Fallback về direct Gemini API nếu backend không khả dụng

### 3. Environment Variables
- ✅ Hỗ trợ `.env.local` cho cấu hình local
- ✅ Tự động detect production/development

## ⚙️ Cấu hình

### Bước 1: Tạo file `.env.local`

Tạo file `frontend/.env.local`:

```env
# Backend API URL (development)
VITE_API_BASE_URL=http://localhost:8000

# Firebase Configuration
VITE_FIREBASE_CONFIG={"apiKey":"your-api-key","authDomain":"gen-lang-client-0581370080.firebaseapp.com","projectId":"gen-lang-client-0581370080","storageBucket":"gen-lang-client-0581370080.appspot.com","messagingSenderId":"your-sender-id","appId":"your-app-id"}

# App ID
VITE_APP_ID=default-app-id

# Gemini API Key (optional - backend sẽ dùng key riêng)
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### Bước 2: Lấy Firebase Config

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: `gen-lang-client-0581370080`
3. Vào Project Settings > General
4. Copy Firebase config và paste vào `VITE_FIREBASE_CONFIG`

Hoặc inject từ HTML trong `index.html`:

```html
<script>
  window.__firebase_config = {
    apiKey: "your-api-key",
    authDomain: "gen-lang-client-0581370080.firebaseapp.com",
    projectId: "gen-lang-client-0581370080",
    storageBucket: "gen-lang-client-0581370080.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
  };
  window.__app_id = "default-app-id";
</script>
```

### Bước 3: Khởi động Backend

```bash
# Từ thư mục gốc
python dev.py
```

Backend sẽ chạy tại: http://localhost:8000

### Bước 4: Khởi động Frontend

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại: http://localhost:5173

## 🔍 Kiểm tra kết nối

### 1. Kiểm tra Backend Health

Mở browser console và chạy:

```javascript
import { checkHealth } from './src/services/api';
checkHealth().then(console.log);
```

### 2. Kiểm tra API Endpoints

Backend có các endpoints:
- Health: http://localhost:8000/health
- API Docs: http://localhost:8000/docs
- Generate Exam: POST http://localhost:8000/api/generate-exam

### 3. Kiểm tra CORS

Backend đã cấu hình CORS cho:
- ✅ http://localhost:5173 (development)
- ✅ https://gen-lang-client-0581370080.web.app (production)
- ✅ https://gen-lang-client-0581370080.firebaseapp.com (production)

## 🚀 Production

Trong production, frontend tự động sử dụng:
- Backend URL: `https://duthi-backend-626004693464.us-central1.run.app`
- Firebase Hosting: `https://gen-lang-client-0581370080.web.app`

Không cần cấu hình thêm, chỉ cần build và deploy:

```bash
npm run build
firebase deploy
```

## 🐛 Troubleshooting

### Lỗi CORS
- Kiểm tra backend đang chạy tại http://localhost:8000
- Kiểm tra `ALLOWED_ORIGINS` trong backend config

### Lỗi Firebase
- Kiểm tra Firebase config trong `.env.local`
- Kiểm tra Firebase project ID: `gen-lang-client-0581370080`

### Lỗi API Connection
- Kiểm tra backend đang chạy: `curl http://localhost:8000/health`
- Kiểm tra network tab trong browser DevTools
- Xem console logs để debug

### Lỗi Gemini API
- Backend sẽ tự động xử lý Gemini API
- Nếu cần, có thể set `VITE_GEMINI_API_KEY` để fallback

## 📝 Sử dụng API trong Components

```javascript
import { aiService, questionsService } from '../services/api';

// Generate exam
const exam = await aiService.generateExam('Toán 12', 5, 'TB');

// AI completion
const response = await aiService.complete('Giải bài toán...');

// Get questions
const questions = await questionsService.getQuestions({ subject: 'Toán' });
```

