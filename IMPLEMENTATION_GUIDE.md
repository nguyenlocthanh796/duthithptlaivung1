# 🚀 Implementation Guide - Tính Năng Nâng Cao

**Ngày tạo:** 24/11/2025  
**Mục tiêu:** Implement 4 tính năng nâng cao cho 100 users

---

## ✅ Đã Hoàn Thành

### 1. ✅ Cloud Functions Setup
- ✅ `functions/index.js` - 4 functions chính
- ✅ `functions/package.json` - Dependencies
- ✅ User Onboarding (Auth Trigger)
- ✅ Auto Grading (Firestore Trigger)
- ✅ Weekly Leaderboard (Cron Job)
- ✅ AI Explanation (HTTPS Callable)

### 2. ✅ Backend AI Tutor
- ✅ `backend/app/routers/ai_tutor.py` - AI explanation endpoint
- ✅ Integrated với Gemini API
- ✅ Giọng văn hài hước, động viên

### 3. ✅ Frontend Services
- ✅ `frontend/src/services/aiTutorService.js` - AI Tutor service
- ✅ `frontend/src/services/liveQuizService.js` - Live Quiz service
- ✅ `frontend/src/components/AITutorExplanation.jsx` - UI component

### 4. ✅ Firebase Config
- ✅ RTDB initialized
- ✅ Functions initialized
- ✅ Remote Config initialized
- ✅ FCM ready (messaging)

---

## 📋 Cần Hoàn Thành

### Phase 1: Deploy Cloud Functions (Ưu tiên)

```bash
# 1. Install dependencies
cd functions
npm install

# 2. Deploy functions
firebase deploy --only functions

# 3. Verify
firebase functions:list
```

**Functions sẽ deploy:**
- `createUserProfile` - Auto create profile
- `gradeSubmission` - Auto grading
- `weeklyLeaderboardReset` - Weekly cron
- `getAIExplanation` - AI tutor helper

### Phase 2: Test AI Tutor

1. **Backend:**
```bash
cd backend
python start.py
# Test: POST /ai/explain-wrong-answer
```

2. **Frontend:**
```bash
cd frontend
npm run dev
# Test: Use AITutorExplanation component
```

### Phase 3: Integrate vào Exam Room

Cần update `ExamRoomPage.jsx` để:
- Hiển thị nút "Tại sao tôi sai?" sau khi nộp bài
- Gọi AI Tutor service
- Hiển thị explanation

### Phase 4: Setup RTDB Rules

Tạo `database.rules.json`:
```json
{
  "rules": {
    "quiz": {
      "$quizId": {
        ".read": true,
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 🔧 Setup Instructions

### 1. Enable Firebase Services

```bash
# Enable Realtime Database
firebase projects:list
# Go to Firebase Console > Realtime Database > Create Database

# Enable Cloud Functions
gcloud services enable cloudfunctions.googleapis.com --project=gen-lang-client-0581370080

# Enable Cloud Scheduler (for cron)
gcloud services enable cloudscheduler.googleapis.com --project=gen-lang-client-0581370080
```

### 2. Deploy Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### 3. Update Firestore Rules

Thêm vào `firestore.rules`:
```javascript
match /submissions/{submissionId} {
  // Frontend KHÔNG được gửi score
  allow create: if request.resource.data.score == null;
  allow update: if request.resource.data.score == null;
  allow read: if request.auth != null;
}
```

### 4. Setup RTDB

1. Firebase Console > Realtime Database > Create Database
2. Choose location: `asia-southeast1` (Singapore)
3. Start in test mode (sẽ update rules sau)

---

## 🧪 Testing

### Test 1: User Onboarding
```
1. New user signs in with Google
2. Check Firestore: /users/{userId}
3. Should have: points: 0, role: "student", etc.
```

### Test 2: Auto Grading
```
1. Student submits exam (only answers, no score)
2. Check Cloud Functions logs
3. Check submission: Should have score, correct, total
4. Check user: weaknesses, strengths updated
```

### Test 3: AI Tutor
```
1. Call: POST /ai/explain-wrong-answer
2. Body: { question, studentAnswer, correctAnswer }
3. Should return: explanation, hints
```

### Test 4: Weekly Leaderboard
```
1. Wait for Monday 00:00 (or trigger manually)
2. Check top 10 users: Should have points added
3. Check all users: weeklyScore reset to 0
```

---

## 📊 Data Flow

### User Onboarding
```
Google Sign In
  ↓
Auth Trigger
  ↓
createUserProfile()
  ↓
Firestore: /users/{uid}
  ↓
Default values: points: 0, role: "student"
```

### Auto Grading
```
Student submits exam
  ↓
Firestore: /submissions/{id} (answers only)
  ↓
gradeSubmission() Trigger
  ↓
Get correct answers from /exams/{id}
  ↓
Calculate score
  ↓
Update submission: score, correct, total
  ↓
Update user: weaknesses, strengths, analytics
```

### AI Tutor
```
Student clicks "Tại sao tôi sai?"
  ↓
Frontend: getAIExplanation()
  ↓
Cloud Function OR Direct API
  ↓
Python Backend: /ai/explain-wrong-answer
  ↓
Gemini API: Generate explanation
  ↓
Return: explanation, hints
  ↓
Display in UI
```

---

## 🎯 Next Steps

1. ✅ **Deploy Functions** - `firebase deploy --only functions`
2. ⚪ **Test User Onboarding** - Sign in new user
3. ⚪ **Test Auto Grading** - Submit exam
4. ⚪ **Integrate AI Tutor** - Add to ExamRoomPage
5. ⚪ **Setup RTDB** - Create database, set rules
6. ⚪ **Test Live Quiz** - Create quiz session

---

## 💡 Tips

### Performance
- Functions có cold start ~2-5s
- Warm functions: < 1s
- Use connection pooling for RTDB

### Security
- Never trust frontend for scoring
- Always validate in Functions
- Use Firestore rules strictly

### Cost Optimization
- RTDB: Free for < 100 concurrent
- Functions: Free for < 2M invocations/month
- FCM: Unlimited free

---

**🚀 Ready to deploy and test!**

