"""
Script để set role admin cho user
Usage: python -m app.scripts.set_admin <user_email_or_uid>
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.sql_database import db


def set_admin_role(user_identifier: str):
    """Set role admin cho user theo email hoặc UID"""
    try:
        # Tìm user trong database
        try:
            users = db.get_all("users")
        except:
            # Fallback: query với filters
            users = db.query("users", limit=1000)
        
        user = None
        for u in users:
            uid = u.get("uid") or u.get("id")
            email = u.get("email", "")
            if uid == user_identifier or email == user_identifier:
                user = u
                break
        
        if not user:
            print(f"❌ Không tìm thấy user với identifier: {user_identifier}")
            print("\nDanh sách users hiện có:")
            for u in users:
                print(f"  - UID: {u.get('uid')}, Email: {u.get('email')}, Role: {u.get('role', 'student')}")
            return False
        
        user_id = user.get("id") or user.get("uid")
        current_role = user.get("role", "student")
        
        if current_role == "admin":
            print(f"✅ User {user.get('email')} đã có role admin rồi!")
            return True
        
        # Cập nhật role
        from datetime import datetime
        db.update("users", user_id, {
            "role": "admin",
            "updatedAt": datetime.now().isoformat()
        })
        
        print(f"✅ Đã set role admin cho user:")
        print(f"   Email: {user.get('email')}")
        print(f"   UID: {user.get('uid')}")
        print(f"   Role cũ: {current_role}")
        print(f"   Role mới: admin")
        
        return True
        
    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.scripts.set_admin <user_email_or_uid>")
        print("\nVí dụ:")
        print("  python -m app.scripts.set_admin user@example.com")
        print("  python -m app.scripts.set_admin firebase_uid_here")
        sys.exit(1)
    
    user_identifier = sys.argv[1]
    success = set_admin_role(user_identifier)
    sys.exit(0 if success else 1)

