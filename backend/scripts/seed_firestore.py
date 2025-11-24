"""Utility script to seed Firestore with demo data."""
from __future__ import annotations

import random
from datetime import datetime, timedelta

import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT_FILE = "credentials.json"


def seed_users(db):
  sample_names = [
      ("nghia", "nghia.student@example.com"),
      ("anh", "anh.student@example.com"),
      ("binh", "binh.student@example.com"),
      ("chi", "chi.student@example.com"),
      ("dao", "dao.student@example.com"),
      ("em", "em.student@example.com"),
      ("giang", "giang.student@example.com"),
      ("hai", "hai.student@example.com"),
      ("khanh", "khanh.student@example.com"),
      ("linh", "linh.student@example.com"),
  ]
  batch = db.batch()
  for idx, (name, email) in enumerate(sample_names, start=1):
    doc_ref = db.collection("users").document(f"demo-student-{idx}")
    batch.set(
        doc_ref,
        {
            "displayName": name.title(),
            "email": email,
            "photoURL": f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
            "roles": ["student"],
            "lastLogin": firestore.SERVER_TIMESTAMP,
        },
    )
  batch.commit()


def seed_posts(db):
  posts = [
      "Kinh nghiệm ôn khối A: mỗi ngày 3 đề Toán, 2 đề Lý, 1 đề Hoá",
      "Chia sẻ tài liệu luyện nghe tiếng Anh cực chất",
      "Câu hỏi hoá hữu cơ khó, mọi người giúp với",
      "Mẹo nhớ công thức lượng giác nhanh",
      "Review đề thi thử trường chuyên Lê Hồng Phong",
  ]
  for idx, text in enumerate(posts):
    db.collection("posts").add(
        {
            "text": text,
            "author": {
                "uid": f"demo-student-{idx+1}",
                "name": text.split()[0].title(),
                "photoURL": f"https://api.dicebear.com/7.x/initials/svg?seed=post{idx}",
            },
            "likes": [],
            "comments": [],
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
    )


def seed_exam(db):
  exam_ref = db.collection('exams').document('Demo-Toan')
  exam_ref.set(
      {
          "title": "Đề Toán Demo",
          "correct_answer": "2",
          "distractors": ["1", "0", "-1"],
          "variants": [
              "Tính nhanh 1 + 1",
              "Giải bài toán: kết quả của 1 cộng 1",
              "Tổng của hai số 1 bằng bao nhiêu",
              "Kết quả phép cộng 1 và 1",
              "Giá trị biểu thức 1+1",
              "Một cộng một cho ra số nào",
              "Tổng hai đơn vị",
              "Kết quả bài toán: thêm 1 vào 1",
              "Tính tổng 1 và 1",
              "Phép cộng đơn giản: 1 với 1",
          ],
          "updatedAt": firestore.SERVER_TIMESTAMP,
      }
  )
  room_ref = db.collection('examRooms').add(
      {
          "examId": "Demo-Toan",
          "password": "demo123",
          "startTime": datetime.utcnow().isoformat(),
          "endTime": (datetime.utcnow() + timedelta(hours=2)).isoformat(),
          "createdAt": firestore.SERVER_TIMESTAMP,
      }
  )
  return room_ref


def seed_submissions(db):
  submissions = db.collection('submissions')
  for idx in range(5):
    submissions.add(
        {
            "examRoomId": "demo-room",
            "userId": f"demo-student-{idx+1}",
            "score": random.randint(5, 10),
            "answers": [random.choice(['A', 'B', 'C', 'D']) for _ in range(5)],
            "submittedAt": firestore.SERVER_TIMESTAMP,
        }
    )


def main():
  cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
  firebase_admin.initialize_app(cred)
  db = firestore.client()
  seed_users(db)
  seed_posts(db)
  seed_exam(db)
  seed_submissions(db)
  print("Seeded Firestore with demo data.")


if __name__ == '__main__':
  main()
