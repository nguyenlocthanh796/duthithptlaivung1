# 🚀 Hướng dẫn Deploy Backend tự động (Nâng cao)

Script Python tự động deploy backend lên Google Cloud VM với các tính năng kiểm tra và giám sát nâng cao.

## 📋 Yêu cầu

- Python 3.6+
- `gcloud` CLI đã cài đặt và authenticated
- `requests` library: `pip install requests`
- Quyền truy cập vào VM

## 🎯 Cách sử dụng

### 1. Deploy cơ bản

```bash
# Deploy một file và restart
python deploy_backend.py -f backend/app/main.py -r

# Deploy tất cả backend
python deploy_backend.py -a -r

# Deploy các file quan trọng (mặc định)
python deploy_backend.py -r
```

### 2. Health Check - Kiểm tra toàn diện

```bash
# Chạy tất cả các kiểm tra
python deploy_backend.py --health
```

Health check bao gồm:
- ✅ Service Status
- ✅ Process & Port
- ✅ Health Endpoint
- ✅ API Endpoints
- ✅ CORS Configuration
- ✅ Database Connection
- ✅ System Resources
- ✅ Error Logs
- ✅ Dependencies

### 3. Kiểm tra từng phần

```bash
# Kiểm tra status service
python deploy_backend.py --status

# Kiểm tra process và port
python deploy_backend.py --check-process

# Test API endpoints
python deploy_backend.py --test-api

# Test CORS
python deploy_backend.py --test-cors

# Kiểm tra database
python deploy_backend.py --check-db

# Kiểm tra tài nguyên hệ thống
python deploy_backend.py --check-resources

# Kiểm tra logs lỗi
python deploy_backend.py --check-logs

# Validate code quality
python deploy_backend.py --validate-code
```

### 4. Deploy với validation

```bash
# Deploy với validation code (mặc định)
python deploy_backend.py -f backend/app/main.py -r

# Deploy không validate (nhanh hơn)
python deploy_backend.py -f backend/app/main.py -r --no-validate

# Deploy không backup
python deploy_backend.py -f backend/app/main.py -r --no-backup
```

### 5. Rollback

```bash
# Rollback file về version trước
python deploy_backend.py --rollback /home/Admin/duthithptlaivung1find/backend/app/main.py

# Rollback và restart
python deploy_backend.py --rollback /home/Admin/duthithptlaivung1find/backend/app/main.py -r
```

### 6. Workflow hoàn chỉnh

```bash
# Deploy, install dependencies, restart và health check
python deploy_backend.py -a -i -r --health

# Nếu muốn đồng bộ code lên GitHub sau khi deploy
python deploy_backend.py -a -r --health --git-push --git-message "deploy: backend & health check"

# Deploy file cụ thể, restart và test API
python deploy_backend.py -f backend/app/main.py -r --test-api
```

## 📝 Tất cả các tùy chọn

### Deploy Options

| Tùy chọn | Mô tả |
|---------|-------|
| `--file, -f <path>` | Deploy một file cụ thể |
| `--all, -a` | Deploy toàn bộ backend directory |
| `--restart, -r` | Restart service sau khi deploy |
| `--install, -i` | Cài đặt dependencies sau khi deploy |
| `--no-backup` | Bỏ qua backup trước khi deploy |
| `--no-validate` | Bỏ qua validation code |

### Health Check Options

| Tùy chọn | Mô tả |
|---------|-------|
| `--health` | Chạy full health check (tất cả kiểm tra) |
| `--status, -s` | Kiểm tra status của service |
| `--check-process` | Kiểm tra process và port |
| `--test-api` | Test các API endpoints |
| `--test-cors` | Test CORS configuration |
| `--check-db` | Kiểm tra database connection |
| `--check-resources` | Kiểm tra tài nguyên hệ thống |
| `--check-logs` | Kiểm tra logs tìm lỗi |
| `--validate-code` | Validate code quality |

### Advanced Options

| Tùy chọn | Mô tả |
|---------|-------|
| `--rollback <path>` | Rollback file về version trước |
| `--git-push` | Sau khi deploy/health-check thì tự git add/commit/push |
| `--git-message` | Custom commit message khi dùng `--git-push` |

## 🔧 Cấu hình

Sửa các biến trong `deploy_backend.py`:

```python
VM_NAME = "instance-20251201-152943"
VM_ZONE = "us-central1-c"
VM_USER = "Admin"
VM_BACKEND_PATH = f"/home/{VM_USER}/duthithptlaivung1find/backend"
SERVICE_NAME = "duthi-backend"
API_PORT = 8000
API_BASE_URL = f"http://35.223.145.48:{API_PORT}"  # External IP
```

## 📦 Ví dụ sử dụng

### Deploy nhanh

```bash
# Deploy và restart
python deploy_backend.py -f backend/app/main.py -r

# Deploy tất cả
python deploy_backend.py -a -r
```

### Deploy với kiểm tra

```bash
# Deploy, restart và health check
python deploy_backend.py -f backend/app/main.py -r --health

# Deploy, restart và test API
python deploy_backend.py -f backend/app/main.py -r --test-api
```

### Chỉ kiểm tra (không deploy)

```bash
# Full health check
python deploy_backend.py --health

# Kiểm tra từng phần
python deploy_backend.py --status --check-process --test-api
```

### Workflow production

```bash
# 1. Deploy với validation
python deploy_backend.py -f backend/app/main.py -r

# 2. Health check
python deploy_backend.py --health

# 3. Nếu có lỗi, rollback
python deploy_backend.py --rollback /home/Admin/duthithptlaivung1find/backend/app/main.py -r
```

## 🎨 Output Colors

Script sử dụng màu sắc để dễ đọc:
- 🟢 **Green**: Success
- 🔴 **Red**: Error
- 🟡 **Yellow**: Warning
- 🔵 **Blue**: Info

## ⚠️ Lưu ý

- Script tự động backup file trước khi deploy (trừ khi dùng `--no-backup`)
- Validation code được bật mặc định (trừ khi dùng `--no-validate`)
- Health check có thể mất vài giây để hoàn thành
- API tests cần VM có external IP và firewall rules đã mở

## 🐛 Troubleshooting

### Lỗi kết nối

```bash
# Kiểm tra gcloud config
gcloud config list

# Test SSH
gcloud compute ssh Admin@instance-20251201-152943 --zone=us-central1-c
```

### Service không start

```bash
# Xem logs chi tiết
python deploy_backend.py --check-logs

# Hoặc trực tiếp
sudo journalctl -u duthi-backend -n 50 --no-pager
```

### API test failed

```bash
# Kiểm tra firewall
gcloud compute firewall-rules list | grep 8000

# Kiểm tra process
python deploy_backend.py --check-process
```

### Rollback không hoạt động

```bash
# Kiểm tra backup directory
gcloud compute ssh Admin@instance-20251201-152943 --zone=us-central1-c \
  --command="ls -la /home/Admin/duthithptlaivung1find/backend/.backups"
```

## 📊 Health Check Details

### Service Status
- Kiểm tra service có đang chạy không
- Hiển thị logs gần đây

### Process & Port
- Kiểm tra uvicorn process
- Kiểm tra port 8000 có đang listen không

### Health Endpoint
- Test `/health` endpoint
- Kiểm tra response status và data

### API Endpoints
- Test các endpoints: `/`, `/health`, `/api/posts`, `/api/exams`, `/api/documents`
- Tính success rate

### CORS
- Test OPTIONS request (preflight)
- Kiểm tra CORS headers

### Database
- Kiểm tra database file tồn tại
- Kiểm tra kích thước file
- Test connection qua API

### System Resources
- CPU usage
- Memory usage
- Disk space
- Service memory

### Error Logs
- Tìm errors, exceptions, tracebacks trong logs
- Hiển thị 10 lỗi gần nhất

### Dependencies
- Kiểm tra virtual environment
- Đếm số packages đã cài

## 🚀 Best Practices

1. **Luôn chạy health check sau deploy**
   ```bash
   python deploy_backend.py -f backend/app/main.py -r --health
   ```

2. **Validate code trước khi deploy**
   ```bash
   python deploy_backend.py -f backend/app/main.py -r
   # (validation mặc định được bật)
   ```

3. **Backup trước khi deploy quan trọng**
   ```bash
   python deploy_backend.py -f backend/app/main.py -r
   # (backup mặc định được bật)
   ```

4. **Test API sau khi deploy**
   ```bash
   python deploy_backend.py -f backend/app/main.py -r --test-api
   ```

5. **Monitor resources định kỳ**
   ```bash
   python deploy_backend.py --check-resources
   ```
