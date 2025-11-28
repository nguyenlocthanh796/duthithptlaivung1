# ✅ Kết nối Frontend với Backend - Hoàn tất

## 🎯 Đã thiết lập

### 1. API Service (`src/services/api.js`)
✅ Tự động detect development/production URL
✅ Hỗ trợ tất cả endpoints:
- `/api/generate-exam` - Tạo đề thi với AI
- `/ai/chat` - Chat với AI (completion)
- `/ai/explain-wrong-answer` - Giải thích đáp án sai
- `/questions` - Quản lý câu hỏi
- `/files/upload` - Upload files
- `/teacher/documents` - Tài liệu giáo viên
- `/health` - Health check

### 2. Gemini Service (`src/services/geminiService.js`)
✅ Ưu tiên sử dụng backend API (`/ai/chat`)
✅ Fallback về direct Gemini API nếu backend không khả dụng
✅ Tự động xử lý response format

### 3. Environment Variables
✅ Hỗ trợ `.env.local` cho cấu hình
✅ Tự động detect production/development mode

## 📋 Cấu hình nhanh

### Bước 1: Tạo `.env.local`

```bash
cd frontend
```

Tạo file `.env.local`:

```env
# Backend API (development)
VITE_API_BASE_URL=http://localhost:8000

# Firebase Config (JSON string)
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"gen-lang-client-0581370080.firebaseapp.com","projectId":"gen-lang-client-0581370080","storageBucket":"gen-lang-client-0581370080.appspot.com","messagingSenderId":"...","appId":"..."}

# App ID
VITE_APP_ID=default-app-id
```

### Bước 2: Lấy Firebase Config

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Project: `gen-lang-client-0581370080`
3. Settings > General > Your apps
4. Copy config và paste vào `VITE_FIREBASE_CONFIG`

### Bước 3: Chạy Backend

```bash
# Từ thư mục gốc
python dev.py
```

Backend: http://localhost:8000

### Bước 4: Chạy Frontend

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:5173

## 🔍 Kiểm tra kết nối

### Test trong Browser Console

```javascript
// Import API service
import { checkHealth, aiService } from './src/services/api';

// Test health
checkHealth().then(console.log);

// Test AI
aiService.complete('Xin chào').then(console.log);
```

### Test Endpoints

- Health: http://localhost:8000/health
- API Docs: http://localhost:8000/docs
- Generate Exam: POST http://localhost:8000/api/generate-exam

## 📝 Sử dụng trong Code

### Generate Exam

```javascript
import { aiService } from '../services/api';

const exam = await aiService.generateExam('Toán 12', 5, 'TB');
// { questions: [...], topic: 'Toán 12', count: 5 }
```

### AI Chat

```javascript
import { aiService } from '../services/api';

const response = await aiService.complete('Giải bài toán x^2 + 5x + 6 = 0');
// { text: "...", response: "..." }
```

### Explain Wrong Answer

```javascript
import { aiService } from '../services/api';

const explanation = await aiService.explainWrongAnswer(
  'Tính đạo hàm của x^2',
  '2x + 1',  // Student answer
  '2x',      // Correct answer
  'Toán'
);
```

## 🚀 Production

Trong production, tự động sử dụng:
- Backend: `https://duthi-backend-626004693464.us-central1.run.app`
- Frontend: `https://gen-lang-client-0581370080.web.app`

Không cần cấu hình thêm!

## 🐛 Troubleshooting

### Lỗi: "API key not valid"
- ✅ Đã fix: Frontend không cần API key, backend sẽ xử lý
- Kiểm tra backend đang chạy: `curl http://localhost:8000/health`

### Lỗi: CORS
- Backend đã config CORS cho localhost:5173
- Kiểm tra `ALLOWED_ORIGINS` trong backend

### Lỗi: Firebase
- Kiểm tra Firebase config trong `.env.local`
- Project ID phải là: `gen-lang-client-0581370080`

### Lỗi: Connection refused
- Đảm bảo backend đang chạy: `python dev.py`
- Kiểm tra port 8000 không bị block

## ✅ Checklist

- [x] API service đã tạo
- [x] Gemini service đã cập nhật
- [x] Environment variables hỗ trợ
- [x] Auto-detect dev/prod
- [x] Error handling
- [x] Documentation

## 🎉 Kết quả

Frontend đã sẵn sàng kết nối với backend! Chỉ cần:
1. Tạo `.env.local` với Firebase config
2. Chạy backend: `python dev.py`
3. Chạy frontend: `npm run dev`

