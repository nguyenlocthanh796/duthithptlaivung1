# 🔐 Hướng dẫn Setup Login

## 📦 Cài đặt Dependencies

```bash
npm install firebase react-router-dom
# hoặc
yarn add firebase react-router-dom
```

## 🔧 Cấu hình Firebase

### 1. Tạo file `.env` trong thư mục `frontend/`

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=gen-lang-client-0581370080
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

# Backend API URL
REACT_APP_API_URL=http://35.223.145.48:8000
```

**Lấy Firebase config:**
1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào Project Settings (⚙️)
4. Scroll xuống phần "Your apps"
5. Copy config từ "SDK setup and configuration"

### 2. Cập nhật `firebase.ts`

Mở `frontend/src/config/firebase.ts` và thay thế `firebaseConfig` bằng config của bạn.

## 🚀 Sử dụng

### 1. Wrap App với AuthProvider

```tsx
// App.tsx hoặc main.tsx
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### 2. Setup Routing

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './components/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### 3. Sử dụng Auth trong Component

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    return <div>Chưa đăng nhập</div>;
  }

  return (
    <div>
      <p>Xin chào, {currentUser.email}!</p>
      <button onClick={logout}>Đăng xuất</button>
    </div>
  );
}
```

## 📝 Các Component Đã Tạo

### 1. **Login.tsx**
- Form đăng nhập/đăng ký
- Google Sign-in
- Error handling
- Loading states

### 2. **AuthContext.tsx**
- Quản lý auth state toàn app
- Functions: login, register, logout, loginWithGoogle
- Auto sync với Firebase Auth

### 3. **ProtectedRoute.tsx**
- Bảo vệ routes yêu cầu đăng nhập
- Tự động redirect về `/login` nếu chưa đăng nhập

### 4. **UserProfile.tsx**
- Hiển thị thông tin user
- Nút đăng xuất

## 🔄 Flow Đăng nhập

1. User vào `/login`
2. Nhập email/password hoặc click "Đăng nhập với Google"
3. Firebase Auth xác thực
4. Token được lưu tự động
5. Redirect về `/` (home)
6. API calls tự động gửi token trong header

## ⚠️ Lưu ý

1. **Firebase Console Setup:**
   - Bật Authentication → Sign-in method
   - Bật Email/Password
   - Bật Google (nếu dùng Google Sign-in)
   - Thêm authorized domains nếu deploy

2. **CORS:**
   - Backend đã cấu hình CORS
   - Nếu gặp lỗi, kiểm tra `ALLOWED_ORIGINS` trong backend config

3. **Token tự động:**
   - API service tự động lấy token từ `currentUser`
   - Không cần code thêm

## 🧪 Test

1. Chạy app: `npm start`
2. Vào `/login`
3. Đăng ký tài khoản mới hoặc đăng nhập
4. Kiểm tra redirect về home
5. Test tạo post (cần đăng nhập)

## 🐛 Troubleshooting

### Lỗi "Firebase not initialized"
- Kiểm tra `.env` có đúng config không
- Kiểm tra `firebase.ts` đã import đúng chưa

### Lỗi "auth/popup-blocked"
- Cho phép popup trong browser
- Hoặc dùng `signInWithRedirect` thay vì `signInWithPopup`

### Lỗi CORS
- Kiểm tra origin của frontend có trong `ALLOWED_ORIGINS` của backend
- Backend mặc định cho phép: `localhost:5173`, `localhost:3000`

