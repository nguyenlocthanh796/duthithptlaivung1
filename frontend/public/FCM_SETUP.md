# Firebase Cloud Messaging (FCM) Setup

## Service Worker Configuration

File `firebase-messaging-sw.js` cần được cập nhật với Firebase config của bạn.

### Cách cập nhật:

1. Mở `frontend/public/firebase-messaging-sw.js`
2. Cập nhật các giá trị sau từ Firebase Console:

```javascript
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY', // Từ .env: VITE_FIREBASE_API_KEY
  projectId: 'gen-lang-client-0581370080',
  messagingSenderId: 'YOUR_SENDER_ID', // Từ .env: VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: 'YOUR_APP_ID', // Từ .env: VITE_FIREBASE_APP_ID
})
```

### Lấy giá trị từ Firebase Console:

1. Vào Firebase Console: https://console.firebase.google.com/
2. Chọn project: `gen-lang-client-0581370080`
3. Vào **Project Settings** > **General** > **Your apps**
4. Copy các giá trị:
   - **apiKey**: Từ "Web API Key"
   - **messagingSenderId**: Từ "Sender ID"
   - **appId**: Từ "App ID"

### Hoặc từ .env file:

Nếu bạn có file `frontend/.env`, copy các giá trị:
- `VITE_FIREBASE_API_KEY` → `apiKey`
- `VITE_FIREBASE_MESSAGING_SENDER_ID` → `messagingSenderId`
- `VITE_FIREBASE_APP_ID` → `appId`

### VAPID Key (Optional):

Để gửi push notifications, bạn cũng cần:
1. Vào Firebase Console > **Project Settings** > **Cloud Messaging**
2. Tạo hoặc copy **Web Push certificates** (VAPID key)
3. Thêm vào `frontend/.env`:
   ```
   VITE_FCM_VAPID_KEY=your_vapid_key_here
   ```

### Sau khi cập nhật:

1. Restart dev server: `npm run dev`
2. Hard refresh browser: `Ctrl+Shift+R` (Windows) hoặc `Cmd+Shift+R` (Mac)
3. Kiểm tra console để xem FCM đã hoạt động chưa

### Troubleshooting:

- **"Service Worker registration failed"**: Kiểm tra xem file `firebase-messaging-sw.js` có tồn tại trong `public/` không
- **"MIME type error"**: Đảm bảo Vite serve file với đúng MIME type (tự động)
- **"FCM token error"**: Kiểm tra VAPID key trong `.env` và service worker config

