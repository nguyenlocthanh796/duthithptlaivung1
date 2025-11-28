# 📚 Hướng dẫn Setup Exam System

## 🎯 Tổng quan

ExamSystemPage đã được tích hợp vào dự án với đầy đủ tính năng:
- ✅ Quản lý lớp học (Classes)
- ✅ Tạo đề thi thủ công hoặc AI
- ✅ Lưu trữ vào Firestore
- ✅ Phân quyền giáo viên/học sinh
- ✅ Real-time updates với Firestore

---

## 📦 Bước 1: Cấu trúc Firestore Collections

### 1. Collection `classes` (Lớp học)

**Cấu trúc Document:**
```javascript
{
  name: "Toán Cao Cấp - K15",
  teacherId: "uid_cua_giao_vien",
  teacherName: "Nguyễn Văn A",
  studentIds: ["uid_hoc_sinh_1", "uid_hoc_sinh_2", ...],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Firestore Rules:**
```javascript
match /classes/{classId} {
  allow read: if request.auth != null && 
    (resource.data.teacherId == request.auth.uid || 
     request.auth.uid in resource.data.studentIds);
  allow create: if request.auth != null && 
    request.resource.data.teacherId == request.auth.uid;
  allow update, delete: if request.auth != null && 
    resource.data.teacherId == request.auth.uid;
}
```

### 2. Collection `exams` (Đề thi)

**Cấu trúc Document:**
```javascript
{
  classId: "class_id",
  title: "Kiểm tra giữa kỳ - Chương 1",
  description: "Mô tả đề thi (tùy chọn)",
  questions: [
    {
      id: 1234567890,
      text: "Câu hỏi số 1?",
      options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      correct: 0, // Index của đáp án đúng (0=A, 1=B, 2=C, 3=D)
      type: "ai" // hoặc "manual"
    }
  ],
  createdBy: "uid_giao_vien",
  createdAt: Timestamp,
  status: "draft", // "draft" | "published" | "closed"
  type: "AI Generated" // hoặc "Manual"
}
```

**Firestore Rules:**
```javascript
match /exams/{examId} {
  allow read: if request.auth != null && (
    // Giáo viên tạo đề có thể đọc
    resource.data.createdBy == request.auth.uid ||
    // Học sinh trong lớp có thể đọc nếu đề đã published
    (exists(/databases/$(database)/documents/classes/$(resource.data.classId)) &&
     get(/databases/$(database)/documents/classes/$(resource.data.classId)).data.studentIds.hasAny([request.auth.uid]) &&
     resource.data.status == "published")
  );
  allow create: if request.auth != null && 
    request.resource.data.createdBy == request.auth.uid;
  allow update, delete: if request.auth != null && 
    resource.data.createdBy == request.auth.uid;
}
```

### 3. Collection `users` (Người dùng - Đã có sẵn)

**Cần thêm trường `roles`:**
```javascript
{
  uid: "user_uid",
  displayName: "Tên người dùng",
  email: "email@example.com",
  photoURL: "https://...",
  roles: ["teacher"], // hoặc ["student"] hoặc ["teacher", "admin"]
  // ... các trường khác
}
```

**Cách thêm role:**
- Vào Firebase Console > Firestore > Collection `users`
- Chọn document của user
- Thêm field `roles` với type `array`
- Thêm giá trị `"teacher"` hoặc `"student"`

---

## 🔧 Bước 2: Cấu hình Backend API

### File: `backend/server.js`

Đã được cập nhật với endpoint `/api/generate-exam`:

```javascript
POST http://localhost:8080/api/generate-exam
Content-Type: application/json

{
  "topic": "Lịch sử Việt Nam",
  "difficulty": "TB",
  "count": 10
}
```

**Response:**
```json
{
  "questions": [
    {
      "id": 1234567890,
      "text": "Câu hỏi...",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "type": "ai"
    }
  ]
}
```

### Environment Variables

Đảm bảo file `backend/.env` có:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8080
```

**Lấy Gemini API Key:**
1. Truy cập: https://aistudio.google.com/apikey
2. Tạo API key mới
3. Copy vào file `.env`

---

## 🚀 Bước 3: Sử dụng trong Frontend

### Route đã được thêm vào `App.jsx`:
```jsx
<Route 
  path="/exam-system" 
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <ExamSystemPage />
    </Suspense>
  } 
/>
```

### Truy cập:
- URL: `http://localhost:5173/exam-system`
- Hoặc thêm link vào Navbar/Menu

---

## 📝 Bước 4: Firestore Security Rules

Cập nhật Firestore Rules trong Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function: Check if user is teacher
    function isTeacher() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['teacher', 'admin']);
    }
    
    // Helper function: Check if user is student
    function isStudent() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['student']);
    }
    
    // Classes collection
    match /classes/{classId} {
      allow read: if request.auth != null && (
        resource.data.teacherId == request.auth.uid ||
        request.auth.uid in resource.data.studentIds
      );
      allow create: if isTeacher() && 
        request.resource.data.teacherId == request.auth.uid;
      allow update, delete: if isTeacher() && 
        resource.data.teacherId == request.auth.uid;
    }
    
    // Exams collection
    match /exams/{examId} {
      allow read: if request.auth != null && (
        resource.data.createdBy == request.auth.uid ||
        (exists(/databases/$(database)/documents/classes/$(resource.data.classId)) &&
         get(/databases/$(database)/documents/classes/$(resource.data.classId)).data.studentIds.hasAny([request.auth.uid]) &&
         resource.data.status == "published")
      );
      allow create: if isTeacher() && 
        request.resource.data.createdBy == request.auth.uid;
      allow update, delete: if isTeacher() && 
        resource.data.createdBy == request.auth.uid;
    }
    
    // Users collection (existing rules)
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## ✅ Checklist Setup

- [ ] Tạo collection `classes` trong Firestore
- [ ] Tạo collection `exams` trong Firestore
- [ ] Thêm field `roles` vào collection `users`
- [ ] Cập nhật Firestore Security Rules
- [ ] Cấu hình `GEMINI_API_KEY` trong `backend/.env`
- [ ] Khởi động backend server: `node backend/server.js`
- [ ] Kiểm tra route `/exam-system` hoạt động
- [ ] Test tạo lớp học (với user có role `teacher`)
- [ ] Test tạo đề thi (thủ công và AI)

---

## 🐛 Troubleshooting

### Lỗi: "Permission denied" khi tạo lớp học
- Kiểm tra user có role `teacher` trong Firestore
- Kiểm tra Firestore Rules đã được publish

### Lỗi: "Failed to generate exam"
- Kiểm tra `GEMINI_API_KEY` trong `.env`
- Kiểm tra backend server đang chạy tại port 8080
- Kiểm tra network connection

### Lỗi: "No classes found"
- Đảm bảo user đã được thêm vào `studentIds` của lớp (nếu là học sinh)
- Hoặc user là `teacherId` của lớp (nếu là giáo viên)

---

## 📚 Tài liệu tham khảo

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [React Query Documentation](https://tanstack.com/query/latest)

---

**Chúc bạn setup thành công! 🎉**

