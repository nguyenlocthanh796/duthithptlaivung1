# 🚀 Features Roadmap - Nâng Cấp Dự Án

**Ngày tạo:** 24/11/2025  
**Mục tiêu:** 4 tính năng nâng cao để tăng engagement và user experience

---

## 📋 Tổng Quan

| # | Tính Năng | Tech Stack | Status | Priority |
|---|-----------|------------|--------|----------|
| 1 | **Đấu Trường Trực Tuyến** (Live Quiz) | Firebase RTDB | 🟡 In Progress | ⭐⭐⭐ |
| 2 | **Chấm điểm & Phân tích ngầm** | Cloud Functions | ⚪ Pending | ⭐⭐⭐ |
| 3 | **Thông báo thông minh** | FCM | ⚪ Pending | ⭐⭐ |
| 4 | **Cấu hình động** | Remote Config | ⚪ Pending | ⭐ |

---

## 1. 🎮 Đấu Trường Trực Tuyến (Live Quiz - Kahoot Style)

### Mô Tả
100 học sinh cùng thi 1 lúc, realtime updates, leaderboard live.

### Tại Sao Dùng RTDB?
- ✅ **Chi phí:** RTDB free tier: 1GB storage, 100 concurrent connections
- ✅ **Tốc độ:** Low latency (< 100ms) cho realtime updates
- ✅ **Realtime:** Sync ngay lập tức cho 100+ users
- ❌ Firestore: Tính tiền theo reads (100 users × 20 câu = 2000 reads/15 phút)

### Kiến Trúc

```
Teacher (Host)
  ↓
  Update: /quiz/{quizId}/status = "question_1"
  ↓
Firebase RTDB
  ↓
  Listen: onValue(/quiz/{quizId}/status)
  ↓
100 Students (Clients)
  ↓
  Screen updates instantly → Show Question 1
```

### Data Structure (RTDB)

```json
{
  "quiz": {
    "{quizId}": {
      "status": "waiting" | "question_1" | "question_2" | "finished",
      "currentQuestion": 1,
      "startTime": 1234567890,
      "questions": {
        "1": {
          "text": "Câu hỏi 1?",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "timeLimit": 30
        }
      },
      "answers": {
        "{userId}": {
          "1": "A",
          "2": "B",
          "timestamp": 1234567890
        }
      },
      "leaderboard": {
        "{userId}": {
          "name": "Nguyễn Văn A",
          "score": 150,
          "correct": 8,
          "total": 10
        }
      }
    }
  }
}
```

### Components Cần Tạo

1. **LiveQuizPage.jsx** - Student view
2. **LiveQuizHostPage.jsx** - Teacher control panel
3. **LiveQuizService.js** - RTDB operations
4. **Leaderboard.jsx** - Realtime leaderboard
5. **QuestionDisplay.jsx** - Question UI với countdown

### Features

- ✅ Realtime question updates
- ✅ Countdown timer
- ✅ Answer submission
- ✅ Live leaderboard
- ✅ Results screen
- ✅ Teacher controls (next question, end quiz)

---

## 2. 🤖 Hệ Thống Chấm Điểm & Phân Tích Ngầm

### Mô Tả
Cloud Functions tự động chấm điểm và phân tích, Frontend chỉ gửi đáp án (chống hack).

### Kiến Trúc

```
Student submits exam
  ↓
  Create: /submissions/{submissionId}
  ↓
Cloud Function Trigger (onCreate)
  ↓
  Get correct answers from /exams/{examId}
  ↓
  Compare & Calculate score
  ↓
  Update: /submissions/{submissionId}/score = 8/10
  ↓
  (Optional) Call Python Backend AI
  ↓
  Analyze weaknesses → Tag: #yeu_hinh_hoc
  ↓
  Update: /users/{userId}/tags = ["yeu_hinh_hoc"]
```

### Cloud Function Code

```javascript
exports.gradeSubmission = functions.firestore
  .document('submissions/{submissionId}')
  .onCreate(async (snap, context) => {
    const submission = snap.data()
    const examId = submission.examId
    
    // Get correct answers
    const examDoc = await admin.firestore().doc(`exams/${examId}`).get()
    const correctAnswers = examDoc.data().answers
    
    // Calculate score
    let score = 0
    submission.answers.forEach((answer, qIndex) => {
      if (answer === correctAnswers[qIndex]) score++
    })
    
    // Update submission
    await snap.ref.update({ score, gradedAt: admin.firestore.FieldValue.serverTimestamp() })
    
    // Analyze weaknesses (optional)
    // Call Python backend for AI analysis
  })
```

### Security Rules

```javascript
// Frontend KHÔNG được gửi score
match /submissions/{submissionId} {
  allow create: if request.resource.data.score == null;
  allow update: if request.resource.data.score == null;
  // Only Cloud Functions can set score
}
```

---

## 3. 📱 Thông Báo Thông Minh (FCM)

### Mô Tả
Push notifications để re-engage users, tăng daily active users.

### Kịch Bản

1. **Đề mới:** Teacher đăng đề → Function gửi notification
2. **Nhắc nhở:** 3 ngày chưa vào app → Scheduled Function
3. **Kết quả:** Bài thi đã chấm xong → Notification
4. **Live Quiz:** Quiz sắp bắt đầu → Notification

### Setup

1. Enable FCM in Firebase Console
2. Request notification permission
3. Get FCM token
4. Save token to Firestore: `/users/{userId}/fcmToken`
5. Cloud Function gửi notification

### Cloud Function

```javascript
exports.sendNotification = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data()
    
    // Get all user FCM tokens
    const usersSnapshot = await admin.firestore().collection('users').get()
    const tokens = usersSnapshot.docs
      .map(doc => doc.data().fcmToken)
      .filter(token => token)
    
    // Send notification
    await admin.messaging().sendMulticast({
      tokens,
      notification: {
        title: 'Đề mới!',
        body: `${post.author} vừa đăng đề ${post.subject}`
      },
      data: {
        type: 'new_post',
        postId: snap.id
      }
    })
  })
```

---

## 4. ⚙️ Cấu Hình Động (Remote Config)

### Mô Tả
Thay đổi tính năng/giao diện không cần update app.

### Use Cases

- Tắt/bật tính năng: `show_ai_tutor = false`
- Thay đổi theme: `theme_color = "#FF0000"` (Tết)
- Feature flags: `enable_live_quiz = true`
- Maintenance mode: `maintenance_mode = false`

### Implementation

```javascript
import { getRemoteConfig, getValue } from 'firebase/remote-config'

const remoteConfig = getRemoteConfig()
remoteConfig.settings.minimumFetchIntervalMillis = 3600000 // 1 hour

// Fetch config
await fetchAndActivate(remoteConfig)

// Get values
const showAITutor = getValue(remoteConfig, 'show_ai_tutor').asBoolean()
const themeColor = getValue(remoteConfig, 'theme_color').asString()
```

### Firebase Console Setup

1. Remote Config → Add parameter
2. Set default value
3. (Optional) Add conditions (A/B testing)

---

## 📊 Implementation Priority

### Phase 1: Live Quiz (Week 1)
- ✅ Setup RTDB
- ✅ Create LiveQuizPage
- ✅ Create Host controls
- ✅ Realtime sync
- ✅ Leaderboard

### Phase 2: Auto Grading (Week 2)
- ✅ Cloud Functions setup
- ✅ Grading function
- ✅ Security rules
- ✅ AI analysis (optional)

### Phase 3: Notifications (Week 3)
- ✅ FCM setup
- ✅ Permission request
- ✅ Token management
- ✅ Notification functions

### Phase 4: Remote Config (Week 4)
- ✅ Remote Config setup
- ✅ Feature flags
- ✅ Theme switching
- ✅ A/B testing

---

## 💰 Cost Analysis

### Firebase RTDB (Live Quiz)
- **Free Tier:** 1GB storage, 100 concurrent connections
- **Cost:** $0/month cho ~100 users/quiz
- **Scaling:** $5/month cho 10GB, 1000 connections

### Cloud Functions (Auto Grading)
- **Free Tier:** 2M invocations/month, 400K GB-seconds
- **Cost:** $0/month cho ~1000 submissions/day
- **Scaling:** $0.40 per 1M invocations

### FCM (Notifications)
- **Free Tier:** Unlimited
- **Cost:** $0/month

### Remote Config
- **Free Tier:** Unlimited
- **Cost:** $0/month

**Total Estimated Cost:** $0-5/month (100% trong free tier cho < 1000 users)

---

## 🎯 Success Metrics

### Live Quiz
- 100+ concurrent users
- < 100ms latency
- 95%+ completion rate

### Auto Grading
- 100% accuracy
- < 5s processing time
- 0 manual grading needed

### Notifications
- 50%+ open rate
- 30%+ re-engagement
- 2x daily active users

### Remote Config
- 0 app updates needed
- Instant feature toggles
- A/B testing capability

---

## 📝 Next Steps

1. ✅ Create this roadmap
2. 🟡 Implement Live Quiz (In Progress)
3. ⚪ Setup Cloud Functions
4. ⚪ Implement FCM
5. ⚪ Setup Remote Config

---

**🚀 Let's build amazing features!**

