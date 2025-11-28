# Hướng dẫn sửa lỗi đăng nhập trên Chrome

## Nguyên nhân

Chrome có cài đặt bảo mật và popup blocker nghiêm ngặt hơn Firefox, dẫn đến:
1. **Popup bị chặn**: Chrome tự động chặn popup từ localhost
2. **Cookie/Storage restrictions**: Chrome có thể chặn third-party cookies
3. **Extension conflicts**: Các extension như ad blockers có thể chặn popup
4. **Cache issues**: Chrome có thể cache redirect URLs cũ

## Giải pháp

### 1. Cho phép Popup cho localhost (Nếu dùng popup)

1. Click vào icon popup blocker trên address bar (nếu có)
2. Chọn "Always allow popups from this site"
3. Reload trang và thử lại

### 2. Clear Cache và Cookies

1. Mở Chrome DevTools (F12)
2. Right-click vào nút Reload
3. Chọn "Empty Cache and Hard Reload"
4. Hoặc vào Settings → Privacy → Clear browsing data

### 3. Tắt Extensions tạm thời

1. Vào `chrome://extensions/`
2. Tắt tất cả extensions (đặc biệt là ad blockers)
3. Reload trang và thử lại

### 4. Kiểm tra Chrome Settings

1. Vào Settings → Privacy and security → Site settings
2. Đảm bảo "Pop-ups and redirects" không bị chặn
3. Kiểm tra "Cookies and other site data" → "Allow all cookies"

### 5. Sử dụng Incognito Mode

1. Mở Chrome Incognito (Ctrl+Shift+N)
2. Thử đăng nhập lại
3. Nếu hoạt động → có thể do extension hoặc cache

## Code đã được cập nhật

Code đã được cập nhật để:
- ✅ Dùng `signInWithRedirect` thay vì `signInWithPopup` (ổn định hơn)
- ✅ Xử lý redirect result tự động
- ✅ Error handling tốt hơn

## Test

Sau khi áp dụng các giải pháp trên:
1. Reload trang (Ctrl+Shift+R)
2. Click "Đăng nhập với Google"
3. Sẽ redirect sang Google để đăng nhập
4. Sau khi đăng nhập, sẽ tự động redirect về app

## Nếu vẫn không hoạt động

Kiểm tra Console (F12) để xem lỗi cụ thể:
- `auth/unauthorized-domain` → Cần thêm domain vào Firebase Console
- `auth/operation-not-allowed` → Cần enable Google Sign-In trong Firebase
- `auth/popup-blocked` → Popup bị chặn, cần cho phép

