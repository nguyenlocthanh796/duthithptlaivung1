"""
Script kiểm tra endpoint comments trên backend
Chạy script này để kiểm tra xem endpoint có hoạt động đúng không
"""
import requests
import json
import sys
import os

# Thêm đường dẫn backend vào sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Cấu hình
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
POST_ID = "bff659f5-8dc4-4aa1-8383-84fc236b1b11"  # Post ID từ lỗi

def test_get_post():
    """Kiểm tra xem post có tồn tại không"""
    print(f"\n{'='*60}")
    print("1. KIỂM TRA POST CÓ TỒN TẠI KHÔNG")
    print(f"{'='*60}")
    
    url = f"{API_BASE_URL}/api/posts/{POST_ID}"
    print(f"GET {url}")
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            post = response.json()
            print(f"✅ Post tồn tại!")
            print(f"   - ID: {post.get('id', 'N/A')}")
            print(f"   - Content: {post.get('content', 'N/A')[:50]}...")
            print(f"   - Author: {post.get('author_name', 'N/A')}")
            return True
        elif response.status_code == 404:
            print(f"❌ Post KHÔNG tồn tại (404)")
            print(f"   Response: {response.text}")
            return False
        else:
            print(f"⚠️  Lỗi không mong đợi: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Lỗi khi gọi API: {e}")
        return False

def test_get_comments():
    """Kiểm tra endpoint GET comments"""
    print(f"\n{'='*60}")
    print("2. KIỂM TRA ENDPOINT GET COMMENTS")
    print(f"{'='*60}")
    
    url = f"{API_BASE_URL}/api/posts/{POST_ID}/comments?limit=50"
    print(f"GET {url}")
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            comments = response.json()
            print(f"✅ Endpoint GET comments hoạt động!")
            print(f"   - Số lượng comments: {len(comments)}")
            return True
        elif response.status_code == 404:
            print(f"❌ Endpoint trả về 404")
            print(f"   Response: {response.text}")
            return False
        else:
            print(f"⚠️  Lỗi không mong đợi: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Lỗi khi gọi API: {e}")
        return False

def test_post_comments_without_auth():
    """Kiểm tra endpoint POST comments không có auth"""
    print(f"\n{'='*60}")
    print("3. KIỂM TRA ENDPOINT POST COMMENTS (KHÔNG CÓ AUTH)")
    print(f"{'='*60}")
    
    url = f"{API_BASE_URL}/api/posts/{POST_ID}/comments"
    print(f"POST {url}")
    
    data = {
        "content": "Test comment từ script"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print(f"✅ Endpoint yêu cầu authentication (đúng như mong đợi)")
            print(f"   Response: {response.text}")
            return True
        elif response.status_code == 404:
            print(f"❌ Endpoint trả về 404 (có thể post không tồn tại)")
            print(f"   Response: {response.text}")
            return False
        else:
            print(f"⚠️  Status code không mong đợi: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Lỗi khi gọi API: {e}")
        return False

def test_post_comments_with_auth(token):
    """Kiểm tra endpoint POST comments có auth"""
    print(f"\n{'='*60}")
    print("4. KIỂM TRA ENDPOINT POST COMMENTS (CÓ AUTH)")
    print(f"{'='*60}")
    
    url = f"{API_BASE_URL}/api/posts/{POST_ID}/comments"
    print(f"POST {url}")
    
    data = {
        "content": "Test comment từ script với auth"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            comment = response.json()
            print(f"✅ Tạo comment thành công!")
            print(f"   - Comment ID: {comment.get('id', 'N/A')}")
            print(f"   - Content: {comment.get('content', 'N/A')}")
            return True
        elif response.status_code == 404:
            print(f"❌ Endpoint trả về 404")
            print(f"   Response: {response.text}")
            return False
        elif response.status_code == 401:
            print(f"❌ Token không hợp lệ hoặc hết hạn")
            print(f"   Response: {response.text}")
            return False
        else:
            print(f"⚠️  Lỗi không mong đợi: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Lỗi khi gọi API: {e}")
        return False

def check_backend_health():
    """Kiểm tra backend có đang chạy không"""
    print(f"\n{'='*60}")
    print("0. KIỂM TRA BACKEND CÓ ĐANG CHẠY KHÔNG")
    print(f"{'='*60}")
    
    url = f"{API_BASE_URL}/health"
    print(f"GET {url}")
    
    try:
        response = requests.get(url, timeout=5)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Backend đang chạy!")
            print(f"   - Status: {health.get('status', 'N/A')}")
            print(f"   - Database: {health.get('database', 'N/A')}")
            return True
        else:
            print(f"⚠️  Backend trả về status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Không thể kết nối đến backend tại {API_BASE_URL}")
        print(f"   Hãy kiểm tra:")
        print(f"   1. Backend có đang chạy không?")
        print(f"   2. URL có đúng không?")
        return False
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("KIỂM TRA ENDPOINT COMMENTS TRÊN BACKEND")
    print("="*60)
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Post ID: {POST_ID}")
    
    # Kiểm tra backend có chạy không
    if not check_backend_health():
        print("\n❌ Backend không chạy hoặc không thể kết nối!")
        print("   Vui lòng kiểm tra backend trước khi tiếp tục.")
        return
    
    # Kiểm tra post có tồn tại không
    post_exists = test_get_post()
    
    # Kiểm tra endpoint GET comments
    test_get_comments()
    
    # Kiểm tra endpoint POST comments không có auth
    test_post_comments_without_auth()
    
    # Kiểm tra endpoint POST comments có auth (nếu có token)
    token = os.getenv("FIREBASE_TOKEN")
    if token:
        test_post_comments_with_auth(token)
    else:
        print(f"\n{'='*60}")
        print("5. BỎ QUA KIỂM TRA VỚI AUTH (KHÔNG CÓ TOKEN)")
        print(f"{'='*60}")
        print("   Để test với auth, set biến môi trường FIREBASE_TOKEN")
        print("   Ví dụ: export FIREBASE_TOKEN='your-token-here'")
    
    print(f"\n{'='*60}")
    print("KẾT QUẢ TỔNG KẾT")
    print(f"{'='*60}")
    if post_exists:
        print("✅ Post tồn tại trên backend")
        print("⚠️  Nếu vẫn gặp lỗi 404 khi tạo comment:")
        print("   1. Kiểm tra Firebase token có hợp lệ không")
        print("   2. Kiểm tra backend logs để xem chi tiết lỗi")
        print("   3. Kiểm tra database connection")
    else:
        print("❌ Post KHÔNG tồn tại trên backend")
        print("   Đây là nguyên nhân gây lỗi 404!")
        print("   Giải pháp:")
        print("   1. Kiểm tra post có được tạo trong database không")
        print("   2. Kiểm tra post ID có đúng không")
        print("   3. Refresh trang để load lại danh sách posts")

if __name__ == "__main__":
    main()

