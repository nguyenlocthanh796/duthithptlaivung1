# Fix lỗi 404 cho /api/users/me

## Vấn đề
Frontend gọi `GET /api/users/me` nhưng nhận 404 (Not Found) thay vì 401 (Unauthorized) hoặc 200 (OK).

## Nguyên nhân có thể

1. **Backend chưa restart** sau khi thêm router
2. **Routing conflict** - có endpoint khác match trước
3. **Token không được gửi** hoặc không hợp lệ
4. **Backend server chưa khởi động** hoặc không accessible

## Giải pháp

### 1. Kiểm tra Backend đã khởi động chưa

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Kiểm tra endpoint có tồn tại không

```bash
curl -X GET https://tire-stick-she-boxed.trycloudflare.com/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Kiểm tra router đã được include chưa

Trong `backend/app/main.py`:
```python
app.include_router(users.router)  # Phải có dòng này
```

### 4. Kiểm tra prefix của router

Trong `backend/app/routers/users.py`:
```python
router = APIRouter(prefix="/api/users", tags=["users"])
```

Endpoint `/me` sẽ thành `/api/users/me`.

### 5. Kiểm tra token được gửi đúng cách

Frontend phải gửi:
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

### 6. Error handling trong Frontend

Frontend đã được cập nhật để:
- Không log error nếu 401 hoặc 404 (có thể user chưa đăng nhập hoặc endpoint chưa sẵn sàng)
- Set default role là 'student' nếu không load được
- Tiếp tục hoạt động ngay cả khi không load được role

## Test

1. **Test endpoint trực tiếp:**
```bash
# Với token hợp lệ
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

2. **Test từ frontend:**
- Mở browser console
- Kiểm tra network tab
- Xem request có gửi token không
- Xem response status code

## Kết quả mong đợi

- **200 OK**: User info được trả về
- **401 Unauthorized**: Token không hợp lệ hoặc thiếu
- **404 Not Found**: Endpoint không tồn tại (cần kiểm tra backend)

## Notes

- Nếu backend trả về 404, có thể do:
  - Router chưa được include
  - Backend chưa restart
  - URL không đúng
  - Có middleware chặn request

