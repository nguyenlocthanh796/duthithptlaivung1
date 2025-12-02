# DuThi THPT Platform

Nền tảng quản lý kỳ thi/ học liệu THPT với backend FastAPI + frontend Vite React. Backend thay thế hoàn toàn Firestore (ngoại trừ đăng nhập Firebase Auth) bằng SQLite/SQLAlchemy và cung cấp API chuẩn cho frontend mới.

## Kiến trúc
- **Backend**: FastAPI, SQLite (SQLAlchemy), Firebase Auth, chạy trên GCE VM (systemd service `duthi-backend`) hoặc Docker container (`docker-compose.yml`).
- **Frontend**: Vite + React + Tailwind, dùng Firebase Auth cho đăng nhập, gọi API qua `import.meta.env.VITE_API_URL`.
- **Triển khai/giám sát**: Script `deploy_backend.py` (menu tương tác + health check), tài liệu deploy/monitoring trong `docs/`.

```
root
├── backend/                 # FastAPI app (sql_database, routers, auth)
├── frontend/                # Vite React app (AuthContext, UI roles, API service)
├── docs/
│   ├── FRONTEND_ENV.md      # Cấu hình .env frontend
│   ├── FRONTEND_DEPLOY_CHECKLIST.md
│   ├── MONITORING_PLAN.md
│   └── ... hướng dẫn khác
├── deploy_backend.py        # Script deploy/health menu (tiếng Việt)
└── DEPLOY_README.md         # Hướng dẫn sử dụng script
```

## Backend
> Chi tiết: `backend/README.md`

1. **Chuẩn bị**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # hoặc venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   ```
2. **Chạy cục bộ**
   ```bash
   python start.py
   # hoặc
   uvicorn app.main:app --reload
   ```
3. **Chạy bằng Docker (ưu tiên backup/scale)**
   ```bash
   cp backend/env.example backend/.env        # cập nhật FIREBASE/GEMINI key thủ công
   docker compose up -d                       # build & chạy backend (port 8000)
   ```
   - Volume `backend/data` chứa SQLite để dễ backup/di chuyển VPS.
   - Có thể override `DATABASE_URL` (Postgres/MySQL) trong `backend/.env`.

4. **Triển khai trên VM**
   - SSH vào VM: `gcloud compute ssh Admin@instance-20251201-152943 --zone us-central1-c`
   - Thư mục dự án: `/home/Admin/duthithptlaivung1find`
   - Service systemd: `duthi-backend` (file `backend/duthi-backend.service`)
   - Script deploy: `python deploy_backend.py` (menu/CLI)

### Script `deploy_backend.py`
- Menu tương tác 18 tuỳ chọn (triển khai file, health check, rollback, ...).
- Tự động backup trước khi deploy, validate cú pháp, kiểm tra service/port/CORS/health/API.
- Có thể dùng CLI:
  ```bash
  python deploy_backend.py -f backend/app/main.py -r --health
  python deploy_backend.py --health
  python deploy_backend.py --rollback /home/Admin/.../app/main.py -r
  ```
- Xem `DEPLOY_README.md`, `DEPLOY_FEATURES.md`, `DEPLOY_IMPROVEMENTS.md` để biết thêm.

## Frontend
> Chi tiết: `frontend/README.md` + `docs/FRONTEND_ENV.md`

1. **Cấu hình `.env` (Vite)**
   ```bash
   cd frontend
   cp env.example .env
   # cập nhật VITE_API_URL=https://api.duthithptlaivung1.com (qua Cloudflare Tunnel)
   ```
2. **Chạy cục bộ**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. **Build/preview**
   ```bash
   npm run build
   npm run preview
   ```
4. **API service**: `src/services/api.ts` tự đọc token Firebase và gửi `Authorization: Bearer`.
5. **Auth/UI**: `src/contexts/AuthContext.tsx`, `src/App.tsx` chứa logic role (Bộ/Sở/Thầy/Cô/Học sinh).

## Triển khai Frontend (Cloudflare Pages + Tunnel)
1. GitHub → Cloudflare Pages (đã cấu hình `cd frontend && npm install && npm run build`, output `frontend/dist`).
2. Thêm biến môi trường Vite (`VITE_*`) trong tab *Variables and Secrets*.
3. Backend HTTPS:
   - Cài `cloudflared` trên VM, tạo tunnel `duthi-backend`, ánh xạ `api.<domain>` → `http://localhost:8000`.
   - File mẫu `infra/cloudflare/config.example.yml`.
   - Start service: `sudo systemctl enable --now cloudflared`.
4. Cập nhật backend:
   - Thêm `https://duthithptlaivung1.pages.dev` và `https://api.<domain>` vào `ALLOWED_ORIGINS` (hoặc `.env`).
   - Deploy lại: `python deploy_backend.py -f backend/app/config.py -r --health`.
5. Hoàn tất checklist `docs/FRONTEND_DEPLOY_CHECKLIST.md` (test role + auth + API calls).

## CI/CD
- `.github/workflows/frontend-ci.yml`: build Vite để đảm bảo Pages không lỗi.
- `.github/workflows/backend-ci.yml`: chạy `deploy_backend.py --health` (dry-run) + pytest placeholder. Yêu cầu secrets (SSH/key, API URL) khi muốn auto deploy VM.

## Giám sát & Logging
- `docs/MONITORING_PLAN.md` + scripts trong `infra/monitoring/`:
  - `logrotate.conf` → copy vào `/etc/logrotate.d/duthi-backend`.
  - `healthcheck-cron.sh` → chạy `*/15 * * * *` để gọi `python deploy_backend.py --health`.
  - Log kết quả vào `/var/log/duthi-health.log`.
- Kiểm tra thủ công:
  ```bash
  python deploy_backend.py --check-resources
  python deploy_backend.py --check-process
  python deploy_backend.py --check-logs
  ```

## Tài liệu & Checklist
- `DEPLOY_README.md`: Hướng dẫn chi tiết script deploy_backend.py.
- `DEPLOY_FEATURES.md` / `DEPLOY_IMPROVEMENTS.md`: liệt kê tính năng mới.
- `docs/FRONTEND_ENV.md`: Biến môi trường frontend.
- `docs/FRONTEND_DEPLOY_CHECKLIST.md`: Checklist deploy frontend.
- `docs/MONITORING_PLAN.md`: Kế hoạch giám sát.

## Công việc tiếp theo (gợi ý)
1. Hoàn tất Cloudflare Tunnel và cập nhật DNS `api.<domain>`.
2. Thêm secret thật (Gemini/GDrive) vào `backend/.env` trên VM thay vì commit file khóa.
3. Mở rộng database sang Postgres nếu lưu lượng tăng (sửa `DATABASE_URL` + compose service).
4. Theo dõi health log và alert (Stackdriver/Cloud Monitoring).

---
Nếu cần hỗ trợ cụ thể (chỉnh CORS, viết workflow, cấu hình hosting), mở issue hoặc ping team dev. Happy shipping! 🚀

