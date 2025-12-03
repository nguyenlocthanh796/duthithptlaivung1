"""
Script để sync tất cả users từ Firebase Auth sang database
Usage: python -m app.scripts.sync_firebase_users
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.sql_database import db
from app.auth import _initialize_firebase_app
from firebase_admin import auth
from datetime import datetime


def sync_all_firebase_users():
    """Sync tất cả users từ Firebase Auth sang database"""
    try:
        _initialize_firebase_app()
        print("✅ Firebase initialized\n")
    except Exception as e:
        print(f"❌ Lỗi khởi tạo Firebase: {str(e)}")
        return False
    
    try:
        # Lấy tất cả users từ Firebase
        print("📥 Đang lấy danh sách users từ Firebase Auth...\n")
        page = auth.list_users()
        synced = 0
        skipped = 0
        errors = 0
        
        while page:
            for user in page.users:
                try:
                    uid = user.uid
                    email = user.email or ""
                    name = user.display_name or email
                    photo_url = user.photo_url
                    
                    # Kiểm tra user đã tồn tại chưa
                    try:
                        existing = db.read("users", uid)
                    except:
                        # Fallback: query
                        users_list = db.query("users", filters=[("uid", "==", uid)], limit=1)
                        existing = users_list[0] if users_list else None
                    
                    if existing:
                        print(f"⏭️  Skip: {email} (đã tồn tại)")
                        skipped += 1
                        continue
                    
                    # Tạo user mới
                    now_iso = datetime.now().isoformat()
                    user_data = {
                        "uid": uid,
                        "email": email,
                        "name": name,
                        "role": "student",
                        "photo_url": photo_url,
                        "createdAt": now_iso,
                        "updatedAt": now_iso,
                    }
                    db.create("users", user_data, doc_id=uid)
                    print(f"✅ Synced: {email} ({name})")
                    synced += 1
                except Exception as e:
                    print(f"❌ Lỗi sync user {user.uid}: {str(e)}")
                    errors += 1
            
            # Lấy trang tiếp theo
            try:
                page = page.get_next_page()
            except:
                page = None
        
        print(f"\n📊 Tổng kết:")
        print(f"   ✅ Synced: {synced} users")
        print(f"   ⏭️  Skipped: {skipped} users")
        if errors > 0:
            print(f"   ❌ Errors: {errors} users")
        
        return True
        
    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = sync_all_firebase_users()
    sys.exit(0 if success else 1)

