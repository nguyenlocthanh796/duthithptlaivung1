#!/usr/bin/env python3
"""
Script để cập nhật API keys trên Google Cloud Run
Sử dụng Environment Variables thay vì hardcode trong code
"""
import subprocess
import sys
import os

def run_command(cmd, description):
    """Chạy command và hiển thị kết quả"""
    print(f"\n{'='*60}")
    print(f"📋 {description}")
    print(f"{'='*60}")
    print(f"Command: {' '.join(cmd)}")
    print()
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("Warnings:", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False
    except FileNotFoundError:
        print("❌ Error: gcloud CLI not found!")
        print("Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install")
        return False

def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║  🔒 Cập nhật API Keys trên Google Cloud Run                 ║
║  Sử dụng Environment Variables thay vì hardcode            ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Kiểm tra gcloud CLI
    try:
        subprocess.run(["gcloud", "--version"], check=True, capture_output=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("❌ gcloud CLI not found!")
        print("\n📖 Hướng dẫn cài đặt:")
        print("1. Download: https://cloud.google.com/sdk/docs/install")
        print("2. Hoặc dùng Google Cloud Console: https://console.cloud.google.com/run")
        print("\n💡 Khuyến nghị: Dùng Google Cloud Console để cấu hình keys (an toàn hơn)")
        return
    
    # Nhập thông tin
    print("\n📝 Nhập thông tin API Keys:")
    print("(Nhấn Enter để bỏ qua nếu muốn dùng Cloud Console)")
    print()
    
    gemini_key = input("GEMINI_API_KEY (key đầu tiên): ").strip()
    if not gemini_key:
        print("\n⚠️  Bỏ qua. Vui lòng cấu hình trên Cloud Console:")
        print("   https://console.cloud.google.com/run")
        print("\n📖 Xem hướng dẫn chi tiết trong: FIX_API_KEY_LEAK.md")
        return
    
    gemini_keys = input("GEMINI_API_KEYS (3 keys, comma-separated): ").strip()
    if not gemini_keys:
        gemini_keys = gemini_key  # Fallback to single key
    
    # Xác nhận
    print("\n⚠️  XÁC NHẬN:")
    print(f"   Service: duthi-backend")
    print(f"   Region: us-central1")
    print(f"   Project: gen-lang-client-0581370080")
    print(f"\n   GEMINI_API_KEY: {gemini_key[:20]}...")
    print(f"   GEMINI_API_KEYS: {gemini_keys[:50]}...")
    
    confirm = input("\n❓ Tiếp tục? (yes/no): ").strip().lower()
    if confirm not in ['yes', 'y']:
        print("❌ Đã hủy.")
        return
    
    # Cấu hình environment variables
    env_vars = {
        "GEMINI_API_KEY": gemini_key,
        "GEMINI_API_KEYS": gemini_keys,
        "GOOGLE_DRIVE_FOLDER_ID": "1GgsmXUHK3kXHAPVTFk0DKss_DsxZDkNZ",
        "FIREBASE_PROJECT_ID": "gen-lang-client-0581370080",
        "FASTAPI_HOST": "0.0.0.0",
        "FASTAPI_PORT": "8000",
        "ALLOWED_ORIGINS": "https://gen-lang-client-0581370080.web.app,https://gen-lang-client-0581370080.firebaseapp.com,https://duthi-frontend.pages.dev"
    }
    
    # Build update command
    update_vars = []
    for key, value in env_vars.items():
        update_vars.append(f"{key}={value}")
    
    cmd = [
        "gcloud", "run", "services", "update", "duthi-backend",
        "--region", "us-central1",
        "--project", "gen-lang-client-0581370080",
        "--update-env-vars", ",".join(update_vars)
    ]
    
    success = run_command(cmd, "Cập nhật Environment Variables trên Cloud Run")
    
    if success:
        print("\n✅ Hoàn thành!")
        print("\n📋 Tiếp theo:")
        print("1. Kiểm tra logs: gcloud run services logs read duthi-backend --region=us-central1 --limit=50")
        print("2. Test API: Mở http://localhost:5173 và thử 'AI Giải'")
        print("3. Nếu vẫn lỗi, xem FIX_API_KEY_LEAK.md để troubleshoot")
    else:
        print("\n❌ Có lỗi xảy ra!")
        print("\n💡 Khuyến nghị: Dùng Google Cloud Console để cấu hình:")
        print("   https://console.cloud.google.com/run")
        print("   1. Chọn service: duthi-backend")
        print("   2. Edit & Deploy New Revision")
        print("   3. Variables & Secrets -> Add Variable")
        print("   4. Thêm từng biến như trong FIX_API_KEY_LEAK.md")

if __name__ == "__main__":
    main()

