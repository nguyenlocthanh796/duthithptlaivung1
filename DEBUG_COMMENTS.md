# 🔍 Debug Comments - Kiểm tra tại sao comments không lưu

## ✅ Đã sửa

1. **Thêm logging chi tiết** trong PostItem.jsx
2. **Truyền appId từ FeedPage** vào PostItem
3. **Kiểm tra db initialization** trước khi sử dụng

## 🔍 Cách kiểm tra

### Bước 1: Mở Browser Console

1. Mở DevTools (F12)
2. Vào tab **Console**
3. Thử tạo một comment mới

### Bước 2: Kiểm tra logs

Bạn sẽ thấy các log sau khi tạo comment:

```
Creating comment: {
  path: "artifacts/default-app-id/public/data/posts/xxx/comments",
  appId: "default-app-id",
  postId: "xxx",
  user: "user-uid"
}
```

**Nếu thấy log này:** Code đang chạy đúng, kiểm tra tiếp.

**Nếu không thấy log:** Có lỗi trước khi tạo comment.

### Bước 3: Kiểm tra lỗi

Nếu có lỗi, bạn sẽ thấy:

```
❌ Lỗi comment: FirebaseError: ...
Error details: {
  code: "permission-denied",
  message: "...",
  ...
}
```

## 🐛 Các lỗi thường gặp

### 1. Lỗi: "permission-denied"

**Nguyên nhân:** Firestore rules chưa cho phép

**Giải pháp:**
```bash
# Deploy lại rules
firebase deploy --only firestore:rules
```

### 2. Lỗi: "missing or insufficient permissions"

**Nguyên nhân:** User chưa authenticated hoặc rules chưa đúng

**Kiểm tra:**
```javascript
// Trong console
console.log('User:', user);
console.log('User UID:', user?.uid);
console.log('Auth:', auth?.currentUser);
```

### 3. Lỗi: "document not found"

**Nguyên nhân:** Post.id không tồn tại

**Kiểm tra:**
```javascript
// Trong console
console.log('Post ID:', post.id);
console.log('Post:', post);
```

### 4. Lỗi: "index not found"

**Nguyên nhân:** Thiếu index cho orderBy('createdAt')

**Giải pháp:**
- Firebase sẽ tự động tạo index
- Hoặc tạo thủ công: https://console.firebase.google.com/project/gen-lang-client-0581370080/firestore/indexes

## 📊 Kiểm tra Database

### Cách 1: Firebase Console

1. Mở: https://console.firebase.google.com/project/gen-lang-client-0581370080/firestore/data
2. Điều hướng: `artifacts` > `default-app-id` > `public` > `data` > `posts` > `[post-id]` > `comments`
3. Kiểm tra xem có documents không

### Cách 2: Browser Console

```javascript
// Kiểm tra collection path
import { collection, getDocs } from 'firebase/firestore';
import { db, appId } from './src/services/firebase';

const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts', 'POST_ID_HERE', 'comments');
getDocs(commentsRef).then(snapshot => {
  console.log('Comments:', snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
});
```

## ✅ Checklist

- [ ] User đã authenticated (`user?.uid` có giá trị)
- [ ] Post.id tồn tại (`post.id` có giá trị)
- [ ] appId đúng (`default-app-id` hoặc giá trị từ props)
- [ ] Firestore rules đã deploy
- [ ] Không có lỗi trong console
- [ ] Database có collection `comments` dưới post

## 🔧 Quick Fix

Nếu vẫn không hoạt động, thử:

1. **Hard refresh:** `Ctrl+Shift+R`
2. **Clear cache:** DevTools > Application > Clear storage
3. **Kiểm tra lại rules:** Đảm bảo đã deploy
4. **Kiểm tra user:** Đảm bảo đã sign in

## 📝 Logs để gửi

Nếu vẫn lỗi, copy các logs sau:
- Console logs khi tạo comment
- Error message đầy đủ
- User UID
- Post ID
- appId đang sử dụng

