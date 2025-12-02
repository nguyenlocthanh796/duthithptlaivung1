# Cấu hình môi trường Frontend (Vite)

1. Sao chép file mẫu:
   ```bash
   cd frontend
   cp env.example .env
   ```
2. Cập nhật các biến sau:

```
VITE_API_URL=https://api.duthithptlaivung1.com   # Domain backend (qua Cloudflare Tunnel)

# Firebase Auth (chỉ đăng nhập)
VITE_FIREBASE_API_KEY=<Firebase API key>
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0581370080
VITE_FIREBASE_STORAGE_BUCKET=<project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<numeric-id>
VITE_FIREBASE_APP_ID=1:<numeric-id>:web:<hash>
```

## Notes
- Vite yêu cầu các biến môi trường bắt đầu bằng `VITE_`.
- Sau khi thay đổi `.env`, cần khởi động lại `npm run dev`.
- `VITE_API_URL` trỏ tới backend HTTPS (Cloudflare Pages/Tunnel). Ở môi trường dev có thể đổi về `http://localhost:8000`.

