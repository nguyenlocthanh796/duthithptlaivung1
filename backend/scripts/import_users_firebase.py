"""
Script để import users vào Firebase Auth với password hash
Usage: python -m app.scripts.import_users_firebase
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_admin import auth
from app.auth import _initialize_firebase_app
from app.config import settings


def import_user_with_hash(email: str, password_hash: str, display_name: str = None, uid: str = None):
    """
    Import user vào Firebase Auth với password đã hash
    
    Args:
        email: Email của user
        password_hash: Password hash (base64 encoded)
        display_name: Tên hiển thị
        uid: UID tùy chỉnh (optional)
    """
    _initialize_firebase_app()
    
    hash_config = settings.firebase_hash_config
    if not hash_config:
        print("❌ Firebase hash config chưa được cấu hình!")
        print("   Thêm FIREBASE_SIGNER_KEY vào .env")
        return None
    
    try:
        user_record = auth.create_user(
            email=email,
            display_name=display_name,
            password_hash=password_hash.encode('utf-8') if isinstance(password_hash, str) else password_hash,
            password_hash_config=hash_config,
            uid=uid,
        )
        
        print(f"✅ Imported user: {email} (UID: {user_record.uid})")
        return user_record.uid
    except Exception as e:
        print(f"❌ Error importing {email}: {str(e)}")
        return None


def batch_import_users(users_data: list):
    """
    Import nhiều users cùng lúc
    
    users_data format:
    [
        {
            "email": "user@example.com",
            "password_hash": "base64_hash_here",
            "display_name": "User Name",
            "uid": "optional_uid"
        },
        ...
    ]
    """
    _initialize_firebase_app()
    
    hash_config = settings.firebase_hash_config
    if not hash_config:
        print("❌ Firebase hash config chưa được cấu hình!")
        return
    
    imported = 0
    errors = 0
    
    for user_data in users_data:
        try:
            uid = import_user_with_hash(
                email=user_data["email"],
                password_hash=user_data["password_hash"],
                display_name=user_data.get("display_name"),
                uid=user_data.get("uid"),
            )
            if uid:
                imported += 1
            else:
                errors += 1
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            errors += 1
    
    print(f"\n📊 Tổng kết:")
    print(f"   ✅ Imported: {imported} users")
    print(f"   ❌ Errors: {errors} users")


if __name__ == "__main__":
    # Ví dụ sử dụng
    print("📝 Firebase User Import Script")
    print("=" * 50)
    print("\nCấu hình trong .env:")
    print("  FIREBASE_SIGNER_KEY=your_signer_key")
    print("  FIREBASE_SALT_SEPARATOR=Bw==")
    print("  FIREBASE_ROUNDS=8")
    print("  FIREBASE_MEM_COST=14")
    print("\nVí dụ import user:")
    print("  python -c \"from app.scripts.import_users_firebase import import_user_with_hash; import_user_with_hash('user@example.com', 'hash_here')\"")
    print()

