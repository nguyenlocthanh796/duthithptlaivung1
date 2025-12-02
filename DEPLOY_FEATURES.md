# 🎯 Tính năng nâng cao của Deploy Script

## ✨ Các tính năng mới

### 1. 🔍 Code Validation
- **Tự động kiểm tra syntax Python** trước khi deploy
- Tránh deploy code có lỗi syntax
- Có thể tắt bằng `--no-validate`

```bash
python deploy_backend.py -f backend/app/main.py -r
# Tự động validate trước khi deploy
```

### 2. 💾 Auto Backup
- **Tự động backup file** trước khi deploy
- Lưu trong `.backups/` với timestamp
- Có thể tắt bằng `--no-backup`

```bash
# Backup tự động
python deploy_backend.py -f backend/app/main.py -r

# Không backup
python deploy_backend.py -f backend/app/main.py -r --no-backup
```

### 3. ⏪ Rollback
- **Rollback file về version trước**
- Tự động tìm backup mới nhất

```bash
python deploy_backend.py --rollback /home/Admin/duthithptlaivung1find/backend/app/main.py -r
```

### 4. 🏥 Full Health Check
- **Kiểm tra toàn diện backend** với 9 loại kiểm tra:
  - Service Status
  - Process & Port
  - Health Endpoint
  - API Endpoints
  - CORS Configuration
  - Database Connection
  - System Resources
  - Error Logs
  - Dependencies

```bash
python deploy_backend.py --health
```

### 5. 🧪 API Testing
- **Test các API endpoints** tự động
- Tính success rate
- Test các endpoint: `/`, `/health`, `/api/posts`, `/api/exams`, `/api/documents`

```bash
python deploy_backend.py --test-api
```

### 6. 🌐 CORS Testing
- **Test CORS configuration**
- Kiểm tra preflight requests
- Verify CORS headers

```bash
python deploy_backend.py --test-cors
```

### 7. 💾 Database Check
- **Kiểm tra database connection**
- Kiểm tra file tồn tại
- Kiểm tra kích thước file

```bash
python deploy_backend.py --check-db
```

### 8. 💻 System Resources Monitoring
- **Kiểm tra tài nguyên hệ thống**:
  - CPU usage
  - Memory usage
  - Disk space
  - Service memory

```bash
python deploy_backend.py --check-resources
```

### 9. 📋 Error Log Analysis
- **Tự động tìm lỗi trong logs**
- Hiển thị 10 lỗi gần nhất
- Tìm: errors, exceptions, tracebacks

```bash
python deploy_backend.py --check-logs
```

### 10. 🔍 Process & Port Check
- **Kiểm tra process và port**
- Verify uvicorn process đang chạy
- Verify port 8000 đang listen

```bash
python deploy_backend.py --check-process
```

### 11. 📦 Dependencies Check
- **Kiểm tra dependencies**
- Verify virtual environment
- Đếm số packages đã cài

```bash
python deploy_backend.py --status
# (bao gồm trong --health)
```

### 12. 🎨 Colored Output
- **Output có màu sắc** dễ đọc:
  - 🟢 Green: Success
  - 🔴 Red: Error
  - 🟡 Yellow: Warning
  - 🔵 Blue: Info

### 13. 📊 Health Check Summary
- **Tóm tắt kết quả** tất cả kiểm tra
- Hiển thị pass/fail cho từng check
- Tổng kết cuối cùng

## 🚀 Workflow đề xuất

### Development
```bash
# Deploy và test nhanh
python deploy_backend.py -f backend/app/main.py -r --test-api
```

### Production
```bash
# Deploy với full validation và health check
python deploy_backend.py -f backend/app/main.py -r --health
```

### Monitoring
```bash
# Kiểm tra định kỳ
python deploy_backend.py --health
```

### Troubleshooting
```bash
# Kiểm tra chi tiết từng phần
python deploy_backend.py --check-process --check-logs --test-api
```

## 📈 So sánh với version cũ

| Tính năng | Version cũ | Version mới |
|---------|-----------|------------|
| Deploy file | ✅ | ✅ |
| Restart service | ✅ | ✅ |
| Status check | ✅ | ✅ |
| Code validation | ❌ | ✅ |
| Auto backup | ❌ | ✅ |
| Rollback | ❌ | ✅ |
| Health check | ❌ | ✅ |
| API testing | ❌ | ✅ |
| CORS testing | ❌ | ✅ |
| Database check | ❌ | ✅ |
| Resources monitoring | ❌ | ✅ |
| Error log analysis | ❌ | ✅ |
| Colored output | ❌ | ✅ |

## 🎯 Use Cases

### 1. Deploy nhanh với validation
```bash
python deploy_backend.py -f backend/app/main.py -r
```

### 2. Deploy an toàn với backup
```bash
python deploy_backend.py -f backend/app/main.py -r
# (backup tự động)
```

### 3. Deploy và verify
```bash
python deploy_backend.py -f backend/app/main.py -r --health
```

### 4. Chỉ kiểm tra (không deploy)
```bash
python deploy_backend.py --health
```

### 5. Rollback khi có lỗi
```bash
python deploy_backend.py --rollback /path/to/file -r
```

## 🔧 Cấu hình nâng cao

### Thay đổi API URL
Sửa trong `deploy_backend.py`:
```python
API_BASE_URL = f"http://YOUR_VM_IP:{API_PORT}"
```

### Thay đổi VM settings
```python
VM_NAME = "your-vm-name"
VM_ZONE = "your-zone"
VM_USER = "your-user"
```

## 📝 Notes

- Health check có thể mất vài giây
- API tests cần external IP và firewall rules
- Backup được lưu trong `.backups/` với timestamp
- Validation mặc định được bật
- Backup mặc định được bật

