# Frontend Deploy Checklist

## 1. Chuẩn bị
- [ ] Cập nhật `frontend/.env` theo `docs/FRONTEND_ENV.md`
- [ ] `cd frontend && npm install`
- [ ] `npm run lint` (nếu có)
- [ ] `npm run test` (tuỳ chọn)

## 2. Kiểm tra cục bộ
- [ ] `npm run dev`
- [ ] Đăng nhập Firebase (email/password hoặc Google)
- [ ] Xem được posts/exams/documents
- [ ] Tạo post mới → thấy trên UI + backend
- [ ] Logout hoạt động

## 3. Build & preview
- [ ] `npm run build`
- [ ] `npm run preview` (đảm bảo bundle chạy ổn)

## 4. Deploy
- [ ] Push code lên repo
- [ ] Hosting đã cấu hình (Vercel/Netlify/Pages.dev)
- [ ] Set biến môi trường trên hosting (`VITE_*`)
- [ ] Trỏ domain (nếu có)

## 5. Sau deploy
- [ ] Cập nhật `ALLOWED_ORIGINS` trên backend với domain mới
- [ ] Chạy `python deploy_backend.py -r --health`
- [ ] Kiểm tra UI thật sự gọi API domain mới
- [ ] Ghi log deploy (ngày giờ, version)

