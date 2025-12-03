"""
Script kiểm tra tất cả endpoints trong posts router
Chạy script này để xem tất cả routes có được đăng ký đúng không
"""
import sys
import os

# Thêm đường dẫn backend vào sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from app.routers import posts

app = FastAPI()
app.include_router(posts.router)

print("="*60)
print("KIỂM TRA TẤT CẢ ENDPOINTS TRONG POSTS ROUTER")
print("="*60)
print(f"\nRouter prefix: {posts.router.prefix}")
print(f"Router tags: {posts.router.tags}")
print(f"\nTổng số routes: {len(posts.router.routes)}")
print("\nDanh sách routes:")
print("-"*60)

for route in posts.router.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        methods = ', '.join(route.methods)
        path = route.path
        full_path = f"{posts.router.prefix}{path}"
        print(f"{methods:15} {full_path}")
        
        # Kiểm tra endpoint POST comments
        if 'POST' in methods and '/comments' in path:
            print(f"  ✅ Tìm thấy POST comments endpoint!")
            if hasattr(route, 'dependencies'):
                print(f"  Dependencies: {route.dependencies}")

print("\n" + "="*60)
print("KIỂM TRA ENDPOINT POST COMMENTS")
print("="*60)

# Tìm endpoint POST comments cụ thể
found = False
for route in posts.router.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        if 'POST' in route.methods and route.path == '/{post_id}/comments':
            found = True
            print(f"✅ Endpoint POST /{{post_id}}/comments được tìm thấy!")
            print(f"   Full path: {posts.router.prefix}{route.path}")
            print(f"   Methods: {route.methods}")
            if hasattr(route, 'endpoint'):
                print(f"   Endpoint function: {route.endpoint.__name__}")
            break

if not found:
    print("❌ KHÔNG tìm thấy endpoint POST /{post_id}/comments!")
    print("   Có thể endpoint chưa được định nghĩa hoặc có vấn đề với routing.")

print("\n" + "="*60)
print("KẾT LUẬN")
print("="*60)
if found:
    print("✅ Endpoint POST comments đã được định nghĩa đúng trong code.")
    print("⚠️  Nếu vẫn gặp lỗi 404, có thể:")
    print("   1. Backend chưa được restart sau khi deploy")
    print("   2. Có vấn đề với deployment")
    print("   3. Cần kiểm tra logs backend để xem chi tiết")
else:
    print("❌ Endpoint POST comments KHÔNG được tìm thấy!")
    print("   Cần kiểm tra lại code backend.")

