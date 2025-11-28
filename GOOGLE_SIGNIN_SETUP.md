# Hướng dẫn cấu hình Google Sign-In

## 1. Enable Google Sign-In trong Firebase Console

1. Mở [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: **gen-lang-client-0581370080**
3. Vào **Authentication** > **Sign-in method**
4. Click vào **Google** trong danh sách providers
5. Bật **Enable** toggle
6. Nhập **Project support email** (email của bạn)
7. Click **Save**

## 2. Cấu hình OAuth consent screen (nếu cần)

Nếu đây là lần đầu enable Google Sign-In, bạn có thể cần cấu hình OAuth consent screen:

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project: **gen-lang-client-0581370080**
3. Vào **APIs & Services** > **OAuth consent screen**
4. Chọn **External** (hoặc **Internal** nếu dùng Google Workspace)
5. Điền thông tin:
   - **App name**: DuThi Pro
   - **User support email**: Email của bạn
   - **Developer contact information**: Email của bạn
6. Click **Save and Continue**
7. Thêm **Scopes** (nếu cần):
   - `email`
   - `profile`
8. Click **Save and Continue**
9. Thêm **Test users** (nếu cần, cho testing)
10. Click **Save and Continue**

## 3. Kiểm tra cấu hình

Sau khi enable Google Sign-In:

1. Quay lại Firebase Console > **Authentication** > **Sign-in method**
2. Đảm bảo **Google** có status **Enabled** (màu xanh)
3. Kiểm tra **Web SDK configuration**:
   - **Web client ID**: Đã được tạo tự động
   - **Web client secret**: Đã được tạo tự động

## 4. Test đăng nhập

1. Chạy ứng dụng: `npm run dev`
2. Mở trình duyệt và vào trang login
3. Click **"Đăng nhập với Google"**
4. Chọn tài khoản Google
5. Cho phép quyền truy cập
6. Kiểm tra xem đã đăng nhập thành công chưa

## 5. Troubleshooting

**Lỗi: "popup_closed_by_user"**
- User đã đóng popup đăng nhập
- Không phải lỗi, chỉ cần thử lại

**Lỗi: "auth/popup-blocked"**
- Popup bị chặn bởi trình duyệt
- Cho phép popup cho domain của bạn

**Lỗi: "auth/unauthorized-domain"**
- Domain chưa được thêm vào authorized domains
- Vào Firebase Console > **Authentication** > **Settings** > **Authorized domains**
- Thêm domain của bạn (ví dụ: `localhost`, `yourdomain.com`)

**Lỗi: "auth/operation-not-allowed"**
- Google Sign-In chưa được enable
- Làm theo bước 1 ở trên

## 6. Authorized Domains

Firebase tự động thêm các domain sau:
- `localhost` (cho development)
- `*.firebaseapp.com` (cho Firebase Hosting)
- `*.web.app` (cho Firebase Hosting)

Nếu bạn deploy lên domain khác, cần thêm vào **Authorized domains**.

## 7. Production Setup

Khi deploy lên production:

1. Thêm domain vào **Authorized domains** trong Firebase Console
2. Đảm bảo domain có HTTPS (Firebase yêu cầu HTTPS cho production)
3. Test đăng nhập trên domain production

