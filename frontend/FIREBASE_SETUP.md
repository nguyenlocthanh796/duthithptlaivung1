# 🔥 Firebase Setup Guide

## ❌ Lỗi hiện tại

Bạn đang gặp lỗi:
```
Firebase config not found. Using fallback. Please configure Firebase.
Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)
```

## ✅ Giải pháp

### Cách 1: Sử dụng Environment Variables (Khuyến nghị cho Development)

#### Bước 1: Lấy Firebase Config

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: **gen-lang-client-0581370080**
3. Click vào biểu tượng ⚙️ (Settings) > **Project settings**
4. Scroll xuống phần **Your apps**
5. Nếu chưa có app, click **Add app** > **Web** (</>)
6. Copy config object, ví dụ:
```javascript
{
  apiKey: "AIzaSyC...",
  authDomain: "gen-lang-client-0581370080.firebaseapp.com",
  projectId: "gen-lang-client-0581370080",
  storageBucket: "gen-lang-client-0581370080.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

#### Bước 2: Tạo file `.env.local`

Tạo file `frontend/.env.local` (không commit file này):

```env
# Firebase Configuration (JSON string - không có dấu ngoặc kép bên ngoài)
VITE_FIREBASE_CONFIG={"apiKey":"AIzaSyC...","authDomain":"gen-lang-client-0581370080.firebaseapp.com","projectId":"gen-lang-client-0581370080","storageBucket":"gen-lang-client-0581370080.appspot.com","messagingSenderId":"123456789","appId":"1:123456789:web:abc123"}

# App ID
VITE_APP_ID=default-app-id

# Backend API URL
VITE_API_BASE_URL=http://localhost:8000
```

**Lưu ý quan trọng:**
- `VITE_FIREBASE_CONFIG` phải là JSON string hợp lệ
- Không có dấu ngoặc kép bên ngoài
- Escape các dấu ngoặc kép bên trong bằng `\"`

#### Bước 3: Restart Dev Server

```bash
# Dừng server hiện tại (Ctrl+C)
# Khởi động lại
npm run dev
```

### Cách 2: Inject từ HTML (Khuyến nghị cho Production)

#### Cập nhật `frontend/index.html`:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DuThi Pro - Nền tảng học tập và thi trắc nghiệm THPT</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    
    <!-- Firebase Config -->
    <script>
      window.__firebase_config = {
        apiKey: "AIzaSyC...",
        authDomain: "gen-lang-client-0581370080.firebaseapp.com",
        projectId: "gen-lang-client-0581370080",
        storageBucket: "gen-lang-client-0581370080.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abc123"
      };
      window.__app_id = "default-app-id";
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  </body>
</html>
```

## 🔍 Kiểm tra

Sau khi cấu hình, mở browser console và kiểm tra:

1. ✅ Không còn warning "Firebase config not found"
2. ✅ Thấy message "✅ Firebase initialized successfully"
3. ✅ Không còn lỗi "API key not valid"
4. ✅ User được đăng nhập ẩn danh thành công

## 🚨 Troubleshooting

### Lỗi: "Failed to parse VITE_FIREBASE_CONFIG"
- Kiểm tra JSON string có hợp lệ không
- Đảm bảo escape các dấu ngoặc kép: `\"`
- Không có dấu ngoặc kép bên ngoài

### Lỗi: "Firebase initialization failed"
- Kiểm tra tất cả các field trong config đều có giá trị
- Đảm bảo projectId đúng: `gen-lang-client-0581370080`
- Kiểm tra API key có quyền truy cập Firebase Authentication

### Lỗi: "auth/api-key-not-valid"
- API key không đúng hoặc đã bị vô hiệu hóa
- Lấy lại API key từ Firebase Console
- Kiểm tra API key restrictions trong Google Cloud Console

### App vẫn không hoạt động
1. Xóa cache: `Ctrl+Shift+R` (hard refresh)
2. Xóa `node_modules` và reinstall: 
   ```bash
   rm -rf node_modules
   npm install
   ```
3. Restart dev server

## 📝 Quick Reference

**Project ID:** `gen-lang-client-0581370080`

**Firebase Console:** https://console.firebase.google.com/project/gen-lang-client-0581370080

**Các service cần enable:**
- ✅ Authentication (Anonymous)
- ✅ Firestore Database
- ✅ Storage (nếu cần upload files)

## ✅ Sau khi setup xong

App sẽ tự động:
- ✅ Kết nối Firebase
- ✅ Đăng nhập ẩn danh
- ✅ Kết nối Firestore
- ✅ Sẵn sàng sử dụng!

