# Hướng dẫn kiểm tra Endpoint Comments

## 🔍 Tổng quan

Tài liệu này hướng dẫn cách kiểm tra và debug lỗi 404 khi gọi API comments.

## 📋 Các bước kiểm tra

### 1. Kiểm tra Backend có đang chạy không

```bash
# Kiểm tra health endpoint
curl https://tire-stick-she-boxed.trycloudflare.com/health

# Hoặc mở trình duyệt
https://tire-stick-she-boxed.trycloudflare.com/health
```

**Kết quả mong đợi:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-..."
}
```

### 2. Kiểm tra Post có tồn tại không

```bash
# Thay POST_ID bằng ID thực tế
curl https://tire-stick-she-boxed.trycloudflare.com/api/posts/bff659f5-8dc4-4aa1-8383-84fc236b1b11
```

**Kết quả mong đợi:**
- ✅ Status 200: Post tồn tại
- ❌ Status 404: Post KHÔNG tồn tại → Đây là nguyên nhân!

### 3. Kiểm tra Endpoint GET Comments

```bash
curl https://tire-stick-she-boxed.trycloudflare.com/api/posts/bff659f5-8dc4-4aa1-8383-84fc236b1b11/comments?limit=50
```

**Kết quả mong đợi:**
- ✅ Status 200: Endpoint hoạt động, trả về danh sách comments (có thể rỗng)
- ❌ Status 404: Post không tồn tại hoặc endpoint chưa được deploy

### 4. Kiểm tra Endpoint POST Comments (không có auth)

```bash
curl -X POST https://tire-stick-she-boxed.trycloudflare.com/api/posts/bff659f5-8dc4-4aa1-8383-84fc236b1b11/comments \
  -H "Content-Type: application/json" \
  -d '{"content": "Test comment"}'
```

**Kết quả mong đợi:**
- ✅ Status 401: Endpoint yêu cầu authentication (đúng!)
- ❌ Status 404: Post không tồn tại hoặc endpoint chưa được deploy

### 5. Kiểm tra Endpoint POST Comments (có auth)

```bash
# Lấy Firebase token từ browser console:
# firebase.auth().currentUser.getIdToken().then(token => console.log(token))

curl -X POST https://tire-stick-she-boxed.trycloudflare.com/api/posts/bff659f5-8dc4-4aa1-8383-84fc236b1b11/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"content": "Test comment với auth"}'
```

**Kết quả mong đợi:**
- ✅ Status 200: Tạo comment thành công!
- ❌ Status 404: Post không tồn tại
- ❌ Status 401: Token không hợp lệ hoặc hết hạn

## 🛠️ Sử dụng Script Python

### Cài đặt dependencies

```bash
cd backend
pip install requests
```

### Chạy script kiểm tra

```bash
# Chạy với URL mặc định (localhost:8000)
python test_comments_endpoint.py

# Hoặc với URL custom
API_BASE_URL=https://tire-stick-she-boxed.trycloudflare.com python test_comments_endpoint.py

# Với Firebase token (để test với auth)
FIREBASE_TOKEN=your-token-here API_BASE_URL=https://tire-stick-she-boxed.trycloudflare.com python test_comments_endpoint.py
```

## 🌐 Sử dụng Tool Web

1. Mở file `frontend/test_comments_api.html` trong trình duyệt
2. Nhập API URL và Post ID
3. (Tùy chọn) Nhập Firebase token để test với auth
4. Click các nút để chạy từng test
5. Xem kết quả chi tiết

## 🔧 Kiểm tra Backend Logs

### Nếu backend chạy local:

```bash
# Xem logs trong terminal nơi chạy backend
# Hoặc kiểm tra file logs nếu có
```

### Nếu backend chạy trên server:

```bash
# SSH vào server và xem logs
ssh user@server
tail -f /var/log/backend/app.log

# Hoặc nếu dùng systemd
journalctl -u duthi-backend -f
```

## 🐛 Các nguyên nhân phổ biến

### 1. Post không tồn tại trong database
**Triệu chứng:** Status 404 khi gọi GET `/api/posts/{post_id}`

**Giải pháp:**
- Kiểm tra post có được tạo trong database không
- Kiểm tra post ID có đúng không
- Refresh trang để load lại danh sách posts

### 2. Backend chưa được restart sau khi deploy
**Triệu chứng:** Endpoint trả về 404 mặc dù code đã có

**Giải pháp:**
```bash
# Restart backend service
sudo systemctl restart duthi-backend

# Hoặc nếu chạy bằng Docker
docker-compose restart backend

# Hoặc nếu chạy trực tiếp
# Dừng process và chạy lại
```

### 3. Database connection issue
**Triệu chứng:** Health check fail hoặc lỗi 500

**Giải pháp:**
- Kiểm tra database credentials trong config
- Kiểm tra database có đang chạy không
- Kiểm tra network connection

### 4. Firebase token không hợp lệ
**Triệu chứng:** Status 401 khi gọi POST comments

**Giải pháp:**
- Kiểm tra token có hết hạn không
- Lấy token mới từ Firebase
- Kiểm tra Firebase credentials trong backend

### 5. CORS issue
**Triệu chứng:** Lỗi CORS trong browser console

**Giải pháp:**
- Kiểm tra CORS settings trong `backend/app/main.py`
- Đảm bảo frontend URL được thêm vào ALLOWED_ORIGINS

## 📝 Checklist Debug

- [ ] Backend đang chạy và health check OK
- [ ] Post tồn tại trong database (GET `/api/posts/{id}` trả về 200)
- [ ] Endpoint GET comments hoạt động (GET `/api/posts/{id}/comments` trả về 200)
- [ ] Endpoint POST comments yêu cầu auth (POST không có token trả về 401)
- [ ] Firebase token hợp lệ và chưa hết hạn
- [ ] Backend đã được restart sau khi deploy code mới
- [ ] Database connection OK
- [ ] CORS settings đúng

## 🎯 Kết luận

Sau khi chạy các test trên, bạn sẽ biết được:
1. ✅ Backend có đang chạy không
2. ✅ Post có tồn tại không
3. ✅ Endpoint có hoạt động đúng không
4. ✅ Authentication có hoạt động không

Dựa vào kết quả, bạn có thể xác định nguyên nhân và fix lỗi.

