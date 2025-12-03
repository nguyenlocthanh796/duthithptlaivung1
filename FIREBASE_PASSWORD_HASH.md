# 🔐 Firebase Password Hash Parameters

## 📋 Tổng quan

Firebase Authentication sử dụng **SCRYPT** algorithm để hash passwords. Đây là cấu hình hash parameters của bạn:

```javascript
hash_config {
  algorithm: SCRYPT,
  base64_signer_key: 67S6M/ni3hlR4/Oj0oS0wgo+TTbxGn81xGbjNp6+k6haaqrNcfffbJqQHSxCI9FY+PIdOWEb4Trsh9eHNKRdDA==,
  base64_salt_separator: Bw==,
  rounds: 8,
  mem_cost: 14,
}
```

---

## 🔍 Giải thích Parameters

### 1. **algorithm: SCRYPT**
- **SCRYPT** là một key derivation function (KDF) được thiết kế để chống lại brute-force attacks
- An toàn hơn bcrypt và PBKDF2
- Sử dụng memory-hard function, khó parallelize

### 2. **base64_signer_key**
- Key dùng để sign và verify password hashes
- **QUAN TRỌNG**: Giữ bí mật, không chia sẻ
- Dùng để import users với password đã hash

### 3. **base64_salt_separator**
- Salt separator để tăng tính bảo mật
- Mỗi password có salt riêng

### 4. **rounds: 8**
- Số vòng lặp hash (2^8 = 256 rounds)
- Càng cao càng an toàn nhưng chậm hơn

### 5. **mem_cost: 14**
- Memory cost (2^14 = 16,384 bytes)
- Lượng memory cần thiết để hash

---

## 🚀 Sử dụng để Import Users

### Cách 1: Import Users với Password Hash (Firebase Admin SDK)

Nếu bạn muốn import users từ hệ thống khác sang Firebase với password đã hash:

```python
# backend/scripts/import_users_firebase.py
import sys
import os
import base64
import hashlib
from firebase_admin import auth

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.auth import _initialize_firebase_app

# Firebase hash config
HASH_CONFIG = {
    "algorithm": "SCRYPT",
    "base64_signer_key": "67S6M/ni3hlR4/Oj0oS0wgo+TTbxGn81xGbjNp6+k6haaqrNcfffbJqQHSxCI9FY+PIdOWEb4Trsh9eHNKRdDA==",
    "base64_salt_separator": "Bw==",
    "rounds": 8,
    "mem_cost": 14,
}

def import_user_with_password_hash(email: str, password_hash: str, display_name: str = None):
    """Import user với password đã hash"""
    _initialize_firebase_app()
    
    try:
        # Tạo user trong Firebase
        user_record = auth.create_user(
            email=email,
            display_name=display_name,
            password_hash=password_hash.encode('utf-8'),
            password_hash_config=HASH_CONFIG
        )
        
        print(f"✅ Imported user: {email} (UID: {user_record.uid})")
        return user_record.uid
    except Exception as e:
        print(f"❌ Error importing {email}: {str(e)}")
        return None

# Ví dụ sử dụng
if __name__ == "__main__":
    # Import user với password hash
    import_user_with_password_hash(
        email="user@example.com",
        password_hash="<base64_encoded_hash>",
        display_name="User Name"
    )
```

### Cách 2: Hash Password mới với SCRYPT

Nếu bạn muốn hash password mới với cùng config:

```python
# backend/scripts/hash_password_scrypt.py
import base64
import hashlib
import scrypt

def hash_password_scrypt(password: str, salt: bytes = None):
    """Hash password với SCRYPT algorithm (Firebase config)"""
    
    # Firebase hash config
    signer_key = base64.b64decode("67S6M/ni3hlR4/Oj0oS0wgo+TTbxGn81xGbjNp6+k6haaqrNcfffbJqQHSxCI9FY+PIdOWEb4Trsh9eHNKRdDA==")
    salt_separator = base64.b64decode("Bw==")
    rounds = 8  # 2^8 = 256
    mem_cost = 14  # 2^14 = 16384 bytes
    
    # Generate salt nếu chưa có
    if salt is None:
        salt = os.urandom(16)
    
    # Combine salt với salt_separator
    combined_salt = salt + salt_separator
    
    # Hash với SCRYPT
    hash_bytes = scrypt.hash(
        password.encode('utf-8'),
        combined_salt,
        N=2**mem_cost,  # CPU/memory cost
        r=8,  # Block size
        p=rounds  # Parallelization
    )
    
    # Encode to base64
    hash_b64 = base64.b64encode(hash_bytes).decode('utf-8')
    salt_b64 = base64.b64encode(salt).decode('utf-8')
    
    return {
        "hash": hash_b64,
        "salt": salt_b64,
        "full_hash": f"{salt_b64}${hash_b64}"  # Format: salt$hash
    }

# Ví dụ
if __name__ == "__main__":
    password = "my_secure_password"
    result = hash_password_scrypt(password)
    print(f"Hash: {result['hash']}")
    print(f"Salt: {result['salt']}")
    print(f"Full: {result['full_hash']}")
```

**Lưu ý**: Firebase sử dụng format riêng, nên tốt nhất là dùng Firebase Admin SDK.

---

## 🔄 Migrate Users từ Database sang Firebase

### Script hoàn chỉnh

```python
# backend/scripts/migrate_users_to_firebase.py
import sys
import os
import base64
from firebase_admin import auth

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.sql_database import db
from app.auth import _initialize_firebase_app

HASH_CONFIG = {
    "algorithm": "SCRYPT",
    "base64_signer_key": "67S6M/ni3hlR4/Oj0oS0wgo+TTbxGn81xGbjNp6+k6haaqrNcfffbJqQHSxCI9FY+PIdOWEb4Trsh9eHNKRdDA==",
    "base64_salt_separator": "Bw==",
    "rounds": 8,
    "mem_cost": 14,
}

def migrate_users_to_firebase():
    """Migrate users từ database sang Firebase Auth"""
    _initialize_firebase_app()
    
    try:
        # Lấy tất cả users từ database
        users = db.get_all("users")
        
        migrated = 0
        skipped = 0
        errors = 0
        
        for user in users:
            try:
                uid = user.get("uid")
                email = user.get("email")
                
                if not email:
                    print(f"⏭️  Skip: No email for UID {uid}")
                    skipped += 1
                    continue
                
                # Kiểm tra user đã tồn tại trong Firebase chưa
                try:
                    existing = auth.get_user_by_email(email)
                    print(f"⏭️  Skip: {email} (đã tồn tại trong Firebase)")
                    skipped += 1
                    continue
                except:
                    pass  # User chưa tồn tại, tiếp tục
                
                # Tạo user trong Firebase
                # LƯU Ý: Nếu user có password trong database, bạn cần hash nó trước
                # Ở đây giả sử user sẽ reset password sau
                user_record = auth.create_user(
                    email=email,
                    display_name=user.get("name"),
                    photo_url=user.get("photo_url"),
                    uid=uid,  # Giữ nguyên UID
                    email_verified=False,
                )
                
                print(f"✅ Migrated: {email} (UID: {uid})")
                migrated += 1
                
            except Exception as e:
                print(f"❌ Error migrating {user.get('email', 'unknown')}: {str(e)}")
                errors += 1
        
        print(f"\n📊 Tổng kết:")
        print(f"   ✅ Migrated: {migrated} users")
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
    migrate_users_to_firebase()
```

---

## ⚠️ Lưu ý Quan trọng

### 1. **Bảo mật Hash Config**

- **KHÔNG** commit hash config vào Git
- **KHÔNG** chia sẻ `base64_signer_key` công khai
- Lưu trong environment variables hoặc secret manager

### 2. **Import Users với Password**

- Firebase chỉ cho phép import password hash nếu bạn có:
  - Password hash đã được hash với **chính xác** cùng config
  - Hoặc password hash từ Firebase export

- Nếu không có password hash, user sẽ cần reset password

### 3. **Format Password Hash**

Firebase sử dụng format đặc biệt:
```
<base64_salt>$<base64_hash>
```

Với:
- Salt: 16 bytes random
- Hash: SCRYPT output
- Separator: `$`

---

## 🔐 Best Practices

### 1. Lưu Hash Config an toàn

```python
# backend/app/config.py
import os

FIREBASE_HASH_CONFIG = {
    "algorithm": "SCRYPT",
    "base64_signer_key": os.getenv("FIREBASE_SIGNER_KEY"),
    "base64_salt_separator": os.getenv("FIREBASE_SALT_SEPARATOR", "Bw=="),
    "rounds": int(os.getenv("FIREBASE_ROUNDS", "8")),
    "mem_cost": int(os.getenv("FIREBASE_MEM_COST", "14")),
}
```

### 2. Environment Variables

```bash
# .env
FIREBASE_SIGNER_KEY=67S6M/ni3hlR4/Oj0oS0wgo+TTbxGn81xGbjNp6+k6haaqrNcfffbJqQHSxCI9FY+PIdOWEb4Trsh9eHNKRdDA==
FIREBASE_SALT_SEPARATOR=Bw==
FIREBASE_ROUNDS=8
FIREBASE_MEM_COST=14
```

### 3. Không lưu trong code

```python
# ❌ KHÔNG làm thế này
HASH_CONFIG = {
    "base64_signer_key": "67S6M/...",  # Hardcoded
}

# ✅ Làm thế này
HASH_CONFIG = {
    "base64_signer_key": os.getenv("FIREBASE_SIGNER_KEY"),
}
```

---

## 📚 Tài liệu tham khảo

- [Firebase Admin SDK - Import Users](https://firebase.google.com/docs/auth/admin/import-users)
- [SCRYPT Algorithm](https://en.wikipedia.org/wiki/Scrypt)
- [Firebase Password Hash Parameters](https://firebase.google.com/docs/auth/admin/import-users#password_hash)

---

## ✅ Tóm tắt

1. **Hash Config** là cấu hình để hash passwords trong Firebase
2. **SCRYPT** là algorithm được sử dụng
3. **Signer Key** phải được bảo mật
4. **Import Users** cần hash config chính xác
5. **Lưu config** trong environment variables, không hardcode

---

**🔐 Giữ hash config bí mật và sử dụng đúng cách!**

