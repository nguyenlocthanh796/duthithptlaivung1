# 🔧 Sửa Lỗi Firebase Authentication API

## ❌ Lỗi Hiện Tại:

```
Identity Toolkit API has not been used in project 856849303406 before or it is disabled.
```

## ✅ Giải Pháp (2 Phút):

### Bước 1: Enable Identity Toolkit API

Tôi đã mở link tự động, hoặc bạn có thể:

1. Truy cập: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=gen-lang-client-0581370080

2. Click nút **"ENABLE"** (Bật)

3. Đợi 1-2 phút để API active

### Bước 2: Enable Authentication trong Firebase Console

1. Mở: https://console.firebase.google.com/project/gen-lang-client-0581370080/authentication

2. Click tab **"Sign-in method"**

3. Enable **Google** sign-in provider:
   - Click "Google"
   - Toggle "Enable"
   - Nhập Project support email
   - Save

### Bước 3: Verify

Sau 2-3 phút, refresh trang web:
https://gen-lang-client-0581370080.web.app

Login với Google sẽ hoạt động! ✅

---

## 🔍 Nguyên Nhân:

Firebase Authentication cần **Identity Toolkit API** để hoạt động. API này phải được enable thủ công lần đầu.

---

## ⚡ Quick Fix Command:

```powershell
# Enable API qua gcloud (nếu đã cài)
gcloud services enable identitytoolkit.googleapis.com --project=gen-lang-client-0581370080
```

Hoặc dùng web console (khuyên dùng).

