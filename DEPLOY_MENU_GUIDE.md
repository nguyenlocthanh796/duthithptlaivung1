# 🎮 Hướng dẫn sử dụng Interactive Menu

## 🚀 Khởi động Menu

```bash
# Chạy script không có arguments để mở menu
python deploy_backend.py

# Hoặc dùng flag
python deploy_backend.py --interactive
```

## 📋 Menu Options

### 📦 DEPLOY OPTIONS

#### 1. Deploy single file (main.py)
- Deploy file `backend/app/main.py`
- Tự động validate và backup

#### 2. Deploy all backend files
- Deploy toàn bộ backend directory
- Bao gồm tất cả files và folders

#### 3. Deploy custom file
- Nhập đường dẫn file muốn deploy
- Ví dụ: `backend/app/config.py`

#### 4. Install dependencies
- Cài đặt packages từ `requirements.txt`
- Sử dụng virtual environment

#### 5. Restart service
- Restart backend service
- Tự động kiểm tra health sau khi restart

### 🔍 CHECK OPTIONS

#### 6. Service status
- Kiểm tra service có đang chạy không
- Hiển thị logs gần đây

#### 7. Process & port check
- Kiểm tra uvicorn process
- Kiểm tra port 8000 có đang listen

#### 8. Test API endpoints
- Test các endpoints:
  - `/`
  - `/health`
  - `/api/posts`
  - `/api/exams`
  - `/api/documents`
- Hiển thị success rate

#### 9. Test CORS
- Test CORS configuration
- Kiểm tra preflight requests
- Verify CORS headers

#### 10. Check database
- Kiểm tra database file tồn tại
- Kiểm tra kích thước
- Test connection qua API

#### 11. System resources
- CPU usage
- Memory usage
- Disk space

#### 12. Check error logs
- Tìm errors, exceptions, tracebacks
- Hiển thị 10 lỗi gần nhất

#### 13. Full health check
- Chạy tất cả các kiểm tra
- Hiển thị summary

### 🔧 ADVANCED OPTIONS

#### 14. Rollback file
- Rollback file về version trước
- Tự động tìm backup mới nhất

#### 15. View recent logs
- Xem 30 dòng logs gần nhất
- Real-time logs

#### 16. Test backend connection
- Test kết nối với backend API
- Health check

### ⚙️ SETTINGS

#### 17. Change VM settings
- Xem cấu hình hiện tại
- Hướng dẫn thay đổi

#### 18. Test VM connection
- Test SSH connection
- Verify có thể kết nối VM

## 🎯 Workflow đề xuất

### Deploy nhanh
1. Chọn option `1` (Deploy main.py)
2. Chọn option `5` (Restart service)
3. Chọn option `8` (Test API)

### Deploy an toàn
1. Chọn option `13` (Full health check) - Kiểm tra trước
2. Chọn option `1` (Deploy main.py)
3. Chọn option `5` (Restart service)
4. Chọn option `13` (Full health check) - Kiểm tra sau

### Troubleshooting
1. Chọn option `6` (Service status)
2. Chọn option `7` (Process & port)
3. Chọn option `12` (Error logs)
4. Chọn option `16` (Test connection)

## 🔄 Giao tiếp Backend nâng cao

### BackendClient Features

1. **Retry Logic**
   - Tự động retry khi request fail
   - Backoff strategy
   - Retry cho status codes: 429, 500, 502, 503, 504

2. **Timeout Handling**
   - Timeout mặc định: 10 giây
   - Có thể cấu hình

3. **Connection Pooling**
   - Sử dụng Session để tái sử dụng connection
   - Tăng hiệu suất

4. **Error Handling**
   - Xử lý timeout
   - Xử lý connection error
   - Hiển thị error message rõ ràng

### Cải thiện so với version cũ

| Tính năng | Cũ | Mới |
|---------|----|----|
| Retry logic | ❌ | ✅ |
| Connection pooling | ❌ | ✅ |
| Timeout handling | ❌ | ✅ |
| Better error messages | ❌ | ✅ |
| Progress indicators | ❌ | ✅ |
| Interactive menu | ❌ | ✅ |

## 💡 Tips

1. **Luôn kiểm tra health trước deploy**
   - Option `13` → Option `1` → Option `5` → Option `13`

2. **Sử dụng rollback khi có lỗi**
   - Option `14` → Nhập file path → Option `5`

3. **Monitor resources định kỳ**
   - Option `11` để kiểm tra tài nguyên

4. **Xem logs khi có vấn đề**
   - Option `12` để tìm errors
   - Option `15` để xem full logs

## 🎨 UI Features

- **Colored output**: Dễ đọc với màu sắc
- **Progress indicators**: Hiển thị tiến trình
- **Clear screen**: Menu sạch sẽ
- **Status display**: Hiển thị service status ngay trên menu

## ⚠️ Lưu ý

- Menu tự động clear screen mỗi lần refresh
- Service status được hiển thị ở đầu menu
- Tất cả options có thể kết hợp với command line arguments
- Press Enter để tiếp tục sau mỗi operation

