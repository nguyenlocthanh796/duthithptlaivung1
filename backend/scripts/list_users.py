"""
Script để list tất cả users
Usage: python -m app.scripts.list_users
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.sql_database import db


def list_all_users():
    """List tất cả users trong database"""
    try:
        try:
            users = db.get_all("users")
        except:
            # Fallback: query với filters
            users = db.query("users", limit=1000)
        
        if not users:
            print("❌ Không có users nào trong database")
            return
        
        print(f"\n📋 Tổng số users: {len(users)}\n")
        print(f"{'Email':<40} {'UID':<30} {'Role':<10} {'Name':<20}")
        print("-" * 100)
        
        for user in users:
            email = user.get("email", "N/A")
            uid = user.get("uid", "N/A")
            role = user.get("role", "student")
            name = user.get("name", "N/A")
            
            print(f"{email:<40} {uid:<30} {role:<10} {name:<20}")
        
        print("\n")
        
    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")


if __name__ == "__main__":
    list_all_users()

