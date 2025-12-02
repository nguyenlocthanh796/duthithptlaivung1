# 🚀 Setup EduSystem Enterprise

## 📦 Cài đặt Dependencies

```bash
cd frontend
npm install
```

### Dependencies cần thiết:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "firebase": "^10.0.0",
    "lucide-react": "^0.555.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^4.0.0" // hoặc create-react-app
  }
}
```

## 🔧 Cấu hình

### 1. Firebase Config

Tạo file `frontend/.env`:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=gen-lang-client-0581370080
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

REACT_APP_API_URL=http://35.223.145.48:8000
```

### 2. Tailwind CSS (nếu chưa có)

Code mẫu sử dụng Tailwind CSS. Cài đặt:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Cập nhật `tailwind.config.js`:

```js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Thêm vào `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 🎨 Tính năng đã tích hợp

### ✅ Đã hoàn thành:

1. **Authentication**
   - Login/Register với Firebase Auth
   - Google Sign-in
   - Protected routes

2. **Student Role**
   - **Bảng tin (Feed)**: Hiển thị posts từ API
   - **Thi cử (Exams)**: Danh sách đề thi, làm bài thi
   - **Tài liệu (Library)**: Xem và tải tài liệu

3. **UI/UX**
   - Role selector đẹp
   - Sidebar responsive
   - Toast notifications
   - Loading states

### 🚧 Đang phát triển:

1. **Teacher Role**
   - Sổ điểm (Gradebook)
   - Quản lý học sinh

2. **School Role**
   - Quản lý giáo viên
   - Quản lý lớp học

3. **Ministry Role**
   - Quản lý trường học
   - Báo cáo thống kê

## 🔄 Kết nối với Backend API

### Posts API
- `GET /api/posts` - Lấy danh sách posts (Feed)
- `POST /api/posts` - Tạo post mới
- `POST /api/posts/:id/like` - Like post

### Exams API
- `GET /api/exams` - Lấy danh sách đề thi
- `GET /api/exams/:id` - Chi tiết đề thi
- `POST /api/exams` - Tạo đề thi mới (teacher)

### Documents API
- `GET /api/documents` - Lấy danh sách tài liệu
- `POST /api/documents/:id/download` - Ghi nhận download

## 🧪 Test

1. **Chạy app:**
   ```bash
   npm start
   # hoặc
   npm run dev
   ```

2. **Flow test:**
   - Vào `/login` → Đăng nhập
   - Chọn role "Học Sinh"
   - Xem Bảng tin (Feed)
   - Xem Thi cử (Exams)
   - Xem Tài liệu (Library)

## 📝 Cấu trúc Code

```
frontend/src/
├── App.tsx                 # Main app với EduSystem UI
├── components/
│   ├── Login.tsx          # Trang đăng nhập
│   └── ProtectedRoute.tsx # Route bảo vệ
├── contexts/
│   └── AuthContext.tsx    # Auth state management
├── services/
│   └── api.ts             # API service layer
└── config/
    └── firebase.ts        # Firebase config
```

## 🎯 Phát triển tiếp

### Thêm tính năng mới:

1. **Tạo Post mới** (Student Feed)
   - Thêm component `CreatePost` vào Feed
   - Gọi `postsAPI.create()`

2. **Làm bài thi** (Student Exams)
   - Tạo component `ExamTaking` với timer
   - Gửi kết quả lên backend

3. **Teacher Gradebook**
   - Tích hợp với API để lưu điểm
   - CRUD điểm số

## 🐛 Troubleshooting

### Lỗi "Cannot find module 'lucide-react'"
```bash
npm install lucide-react
```

### Lỗi Tailwind không hoạt động
- Kiểm tra `tailwind.config.js` có đúng content paths
- Kiểm tra `index.css` đã import Tailwind chưa

### Lỗi API connection
- Kiểm tra backend có đang chạy: `http://35.223.145.48:8000/health`
- Kiểm tra CORS config trong backend

### Lỗi Firebase Auth
- Kiểm tra `.env` có đúng config
- Kiểm tra Firebase Console đã bật Authentication methods

## 📚 Tài liệu tham khảo

- [React Router](https://reactrouter.com/)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

