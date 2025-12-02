# Migration Guide: Firebase → Backend API

Hướng dẫn chi tiết chuyển đổi từ Firebase/Firestore sang Backend API mới.

## 📋 Tổng quan thay đổi

### Trước (Firebase):
- **Database**: Firestore (NoSQL)
- **Authentication**: Firebase Auth (giữ nguyên)
- **Storage**: Firebase Storage
- **API**: Direct Firestore SDK calls

### Sau (Backend mới):
- **Database**: SQLite (có thể nâng cấp PostgreSQL)
- **Authentication**: Firebase Auth (giữ nguyên, chỉ verify token)
- **Storage**: Có thể dùng Google Cloud Storage hoặc local
- **API**: REST API qua HTTP

## 🔄 Migration Steps

### Bước 1: Cài đặt API Service

Copy file `api.js` hoặc `api.ts` vào project frontend của bạn.

```bash
# Nếu dùng JavaScript
cp frontend/api.js src/services/api.js

# Nếu dùng TypeScript
cp frontend/api.ts src/services/api.ts
```

### Bước 2: Cấu hình Environment Variables

Tạo file `.env` trong thư mục frontend:

```env
REACT_APP_API_URL=http://35.223.145.48:8000
# hoặc
VITE_API_URL=http://35.223.145.48:8000
# hoặc
NEXT_PUBLIC_API_URL=http://35.223.145.48:8000
```

### Bước 3: Thay thế Firestore calls

#### Ví dụ 1: Lấy danh sách Posts

**Trước (Firestore):**
```javascript
import { collection, getDocs, query, where } from 'firebase/firestore';

const postsRef = collection(db, 'posts');
const q = query(postsRef, where('subject', '==', 'toan'));
const snapshot = await getDocs(q);
const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Sau (Backend API):**
```javascript
import { postsAPI } from './services/api';

const posts = await postsAPI.getAll({ subject: 'toan' });
```

#### Ví dụ 2: Tạo Post mới

**Trước (Firestore):**
```javascript
import { collection, addDoc } from 'firebase/firestore';

const postsRef = collection(db, 'posts');
const newPost = {
  content: "Nội dung",
  subject: "toan",
  createdAt: new Date().toISOString(),
};
const docRef = await addDoc(postsRef, newPost);
```

**Sau (Backend API):**
```javascript
import { postsAPI } from './services/api';

const newPost = await postsAPI.create({
  content: "Nội dung",
  subject: "toan",
  // createdAt, updatedAt tự động được tạo
});
```

#### Ví dụ 3: Like Post

**Trước (Firestore):**
```javascript
import { doc, updateDoc, increment } from 'firebase/firestore';

const postRef = doc(db, 'posts', postId);
await updateDoc(postRef, {
  likes: increment(1)
});
```

**Sau (Backend API):**
```javascript
import { postsAPI } from './services/api';

await postsAPI.like(postId);
```

### Bước 4: Xử lý Authentication

Firebase Auth vẫn được dùng, nhưng token được gửi lên backend để verify.

**Không cần thay đổi code login:**
```javascript
// Vẫn dùng Firebase Auth như cũ
import { signInWithEmailAndPassword } from 'firebase/auth';
await signInWithEmailAndPassword(auth, email, password);
```

**API service tự động lấy token:**
```javascript
// Token tự động được lấy và gửi trong header
// Không cần code thêm
const posts = await postsAPI.getAll(); // Public, không cần auth
const newPost = await postsAPI.create({ ... }); // Tự động gửi token
```

### Bước 5: Error Handling

**Trước (Firestore):**
```javascript
try {
  const doc = await getDoc(docRef);
  if (!doc.exists()) {
    throw new Error('Document not found');
  }
} catch (error) {
  console.error('Firestore error:', error);
}
```

**Sau (Backend API):**
```javascript
try {
  const post = await postsAPI.getById(postId);
} catch (error) {
  // Error đã được format sẵn
  console.error('API error:', error.message);
  if (error.message.includes('401')) {
    // Unauthorized - cần đăng nhập lại
  }
}
```

## 🔍 Tìm và thay thế trong code

### Tìm các pattern cần thay:

1. **Firestore imports:**
   ```javascript
   // Tìm: import { ... } from 'firebase/firestore'
   // Thay: import { ... } from './services/api'
   ```

2. **Collection references:**
   ```javascript
   // Tìm: collection(db, 'posts')
   // Thay: postsAPI
   ```

3. **getDocs/getDoc:**
   ```javascript
   // Tìm: await getDocs(...)
   // Thay: await postsAPI.getAll(...)
   ```

4. **addDoc:**
   ```javascript
   // Tìm: await addDoc(collection(db, 'posts'), data)
   // Thay: await postsAPI.create(data)
   ```

5. **updateDoc:**
   ```javascript
   // Tìm: await updateDoc(doc(db, 'posts', id), data)
   // Thay: await postsAPI.update(id, data) // nếu có
   ```

6. **deleteDoc:**
   ```javascript
   // Tìm: await deleteDoc(doc(db, 'posts', id))
   // Thay: await postsAPI.delete(id) // nếu có
   ```

## ⚠️ Lưu ý quan trọng

1. **Real-time updates**: Firestore có real-time listeners, Backend API không có. Cần poll hoặc dùng WebSocket nếu cần real-time.

2. **Offline support**: Firestore có offline cache, Backend API không có. Cần implement caching nếu cần.

3. **Pagination**: Backend API có `limit` parameter, nhưng chưa có cursor-based pagination. Có thể cần thêm sau.

4. **Queries phức tạp**: Firestore có nhiều query operators, Backend API hiện tại hỗ trợ cơ bản. Cần mở rộng nếu cần.

## 🧪 Testing

Sau khi migration, test các chức năng:

1. ✅ Đăng nhập/đăng xuất (Firebase Auth)
2. ✅ Lấy danh sách posts/exams/documents
3. ✅ Tạo post/exam/document mới
4. ✅ Like/react post
5. ✅ Xóa post/exam/document
6. ✅ Filter theo subject/category

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
- Backend có đang chạy: `http://35.223.145.48:8000/health`
- Firebase credentials có trên VM
- CORS config có cho phép origin của bạn
- Network tab trong DevTools xem request/response

