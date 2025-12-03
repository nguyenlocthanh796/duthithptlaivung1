# Debug Guide: /api/users/me 404 Error

## Vấn đề
Frontend gọi `GET /api/users/me` nhưng nhận 404 (Not Found).

## Đã sửa

### Frontend
1. ✅ Cải thiện error handling trong `App.tsx`:
   - Không log error nếu 401 hoặc 404
   - Set default role là 'student' nếu không load được
   - Tiếp tục hoạt động ngay cả khi không load được role

2. ✅ Cải thiện error message trong `users-api.ts`:
   - Thêm message rõ ràng hơn khi 404

### Backend
1. ✅ Endpoint `/api/users/me` đã được định nghĩa đúng
2. ✅ Router đã được include trong `main.py`
3. ✅ Thêm logging để debug

## Cách kiểm tra

### 1. Kiểm tra Backend đã khởi động chưa

```bash
# Kiểm tra health endpoint
curl https://tire-stick-she-boxed.trycloudflare.com/health

# Kiểm tra users endpoint
curl https://tire-stick-she-boxed.trycloudflare.com/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Kiểm tra Router đã được include chưa

Trong `backend/app/main.py`, phải có:
```python
app.include_router(users.router)
```

### 3. Kiểm tra Token được gửi đúng cách

Trong browser console, kiểm tra:
- Network tab → Xem request có header `Authorization: Bearer ...` không
- Console → Xem có error gì không

### 4. Test trực tiếp từ Backend

```bash
# Với token hợp lệ
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

## Nguyên nhân có thể

1. **Backend chưa restart** sau khi thêm router
   - **Giải pháp**: Restart backend server

2. **Token không được gửi** hoặc không hợp lệ
   - **Giải pháp**: Kiểm tra `getAuthToken()` trong frontend

3. **Backend server không accessible**
   - **Giải pháp**: Kiểm tra URL trong `.env` hoặc `VITE_API_URL`

4. **Routing conflict** - có endpoint khác match trước
   - **Giải pháp**: Kiểm tra thứ tự include router trong `main.py`

## Kết quả mong đợi

- **200 OK**: User info được trả về
- **401 Unauthorized**: Token không hợp lệ hoặc thiếu
- **404 Not Found**: Endpoint không tồn tại (cần kiểm tra backend)

## Next Steps

1. Restart backend server
2. Kiểm tra backend logs
3. Test endpoint trực tiếp với curl
4. Kiểm tra network tab trong browser

