# 🚀 Quick Fix - Firebase Config

## ⚡ Cách nhanh nhất (2 phút)

### Bước 1: Lấy Firebase Config

1. Mở: https://console.firebase.google.com/project/gen-lang-client-0581370080/settings/general
2. Scroll xuống phần **Your apps**
3. Nếu chưa có Web app, click **Add app** > chọn **Web** (</>)
4. Copy config object, ví dụ:
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

### Bước 2: Tạo file `.env.local`

Tạo file `frontend/.env.local` (copy từ `.env.local.example`):

```env
VITE_FIREBASE_CONFIG={"apiKey":"AIzaSyC...","authDomain":"gen-lang-client-0581370080.firebaseapp.com","projectId":"gen-lang-client-0581370080","storageBucket":"gen-lang-client-0581370080.appspot.com","messagingSenderId":"123456789","appId":"1:123456789:web:abc123"}
VITE_APP_ID=default-app-id
VITE_API_BASE_URL=http://localhost:8000
```

**⚠️ Lưu ý:**
- JSON string phải trên 1 dòng
- Không có dấu ngoặc kép bên ngoài
- Escape dấu ngoặc kép bên trong bằng `\"`

### Bước 3: Restart Dev Server

```bash
# Dừng server (Ctrl+C)
# Khởi động lại
npm run dev
```

## ✅ Kiểm tra

Mở browser console, bạn sẽ thấy:
- ✅ "Firebase initialized successfully"
- ✅ Không còn lỗi "API key not valid"
- ✅ App hoạt động bình thường

## 🔄 Nếu vẫn lỗi

1. **Kiểm tra file `.env.local` có đúng format không:**
   ```bash
   cat frontend/.env.local
   ```

2. **Xóa cache và restart:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Hard refresh browser:** `Ctrl+Shift+R`

## 📝 Alternative: Inject từ HTML

Nếu không muốn dùng `.env.local`, sửa `frontend/index.html`:

```html
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
```

