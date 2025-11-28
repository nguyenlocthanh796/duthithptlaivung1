# DuThi Frontend

Frontend application cho nền tảng DuThi Pro - Học tập và thi trắc nghiệm THPT với AI.

## 🚀 Quick Start

### Cài đặt dependencies
```bash
npm install
```

### Chạy development server
```bash
npm run dev
```

Ứng dụng sẽ chạy tại: http://localhost:5173

### Build cho production
```bash
npm run build
```

Output sẽ được tạo trong thư mục `dist/`

## 📁 Cấu trúc dự án

```
src/
├── components/
│   ├── features/      # Các tính năng nhỏ (AI Assistant)
│   ├── layout/        # Layout components (Navbar, Sidebar)
│   └── ui/           # UI components dùng chung
├── pages/            # Các trang chính
├── services/         # API services, Firebase
└── utils/            # Utility functions
```

## ⚙️ Cấu hình

### Firebase Configuration

Tạo file `.env.local` trong thư mục `frontend/`:

```env
VITE_FIREBASE_CONFIG='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
VITE_APP_ID=your-app-id
```

Hoặc inject config từ HTML trong `index.html`:

```html
<script>
  window.__firebase_config = '{"apiKey":"...","authDomain":"..."}';
  window.__app_id = 'your-app-id';
</script>
```

### Gemini API Key

Cập nhật API key trong `src/App.jsx`:

```javascript
const apiKey = "your-gemini-api-key";
```

## 🛠️ Tech Stack

- **React 18** - UI Framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Firebase** - Authentication & Firestore
- **KaTeX** - Math rendering
- **Lucide React** - Icons

## 📝 Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build cho production
- `npm run preview` - Preview production build
- `npm run lint` - Chạy ESLint

## 🔧 Development

### Thêm component mới

1. UI Components: `src/components/ui/`
2. Layout Components: `src/components/layout/`
3. Feature Components: `src/components/features/`
4. Pages: `src/pages/`

### Styling

Dự án sử dụng Tailwind CSS. Xem `tailwind.config.js` để tùy chỉnh theme.

## 🚨 Lưu ý

- Đảm bảo Firebase config được thiết lập đúng trước khi chạy
- Cần Gemini API key để sử dụng tính năng AI
- Kiểm tra Firestore rules và indexes đã được cấu hình

