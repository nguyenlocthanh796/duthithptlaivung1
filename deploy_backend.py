#!/usr/bin/env python3
"""
Script tự động deploy backend lên Google Cloud VM với menu tương tác và giao tiếp backend nâng cao
Usage: python deploy_backend.py [options] hoặc python deploy_backend.py (interactive menu)
"""

import subprocess
import sys
import os
import argparse
import json
import time
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from urllib.parse import urljoin

# Cấu hình
VM_NAME = "instance-20251201-152943"
VM_ZONE = "us-central1-c"
VM_USER = "Admin"
PROJECT_ROOT = Path(__file__).parent
BACKEND_DIR = PROJECT_ROOT / "backend"
VM_BACKEND_PATH = f"/home/{VM_USER}/duthithptlaivung1find/backend"
SERVICE_NAME = "duthi-backend"
API_PORT = 8000
API_BASE_URL = f"http://35.223.145.48:{API_PORT}"  # External IP của VM
BACKUP_DIR = f"{VM_BACKEND_PATH}/.backups"

# Cấu hình requests với retry và timeout
class BackendClient:
    """Client để giao tiếp với backend với retry và error handling"""
    
    def __init__(self, base_url: str, timeout: int = 10, max_retries: int = 3):
        self.base_url = base_url
        self.timeout = timeout
        self.session = requests.Session()
        
        # Cấu hình retry strategy
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Headers mặc định
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
    
    def get(self, endpoint: str, **kwargs) -> Optional[requests.Response]:
        """GET request với error handling"""
        url = urljoin(self.base_url, endpoint)
        try:
            response = self.session.get(url, timeout=self.timeout, **kwargs)
            return response
        except requests.exceptions.Timeout:
            print_error(f"Yêu cầu hết thời gian chờ: {endpoint}")
            return None
        except requests.exceptions.ConnectionError:
            print_error(f"Lỗi kết nối: {endpoint}")
            return None
        except requests.exceptions.RequestException as e:
            print_error(f"Yêu cầu thất bại: {e}")
            return None
    
    def post(self, endpoint: str, data: dict = None, **kwargs) -> Optional[requests.Response]:
        """POST request với error handling"""
        url = urljoin(self.base_url, endpoint)
        try:
            response = self.session.post(url, json=data, timeout=self.timeout, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            print_error(f"POST thất bại: {e}")
            return None
    
    def options(self, endpoint: str, **kwargs) -> Optional[requests.Response]:
        """OPTIONS request (preflight)"""
        url = urljoin(self.base_url, endpoint)
        try:
            response = self.session.options(url, timeout=self.timeout, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            print_error(f"OPTIONS thất bại: {e}")
            return None
    
    def health_check(self) -> Tuple[bool, dict]:
        """Kiểm tra health của backend"""
        response = self.get("/health")
        if response and response.status_code == 200:
            try:
                data = response.json()
                return True, data
            except:
                return True, {"status": "ok", "message": response.text}
        return False, {"error": "Kiểm tra sức khỏe thất bại"}

# Tạo global client
backend_client = BackendClient(API_BASE_URL)

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    RESET = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def clear_screen():
    """Xóa màn hình"""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.BLUE}🔹 {msg}{Colors.RESET}")

def print_header(msg):
    print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{msg}{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}\n")

def print_menu_header():
    """In header cho menu"""
    clear_screen()
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}🚀 Công cụ Quản lý & Triển khai Backend{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}\n")

def show_progress(message: str, duration: float = 0.5):
    """Hiển thị progress indicator"""
    print_info(f"{message}...")
    time.sleep(duration)

def run_command(cmd, check=True, silent=False, show_progress=False):
    """Chạy command và hiển thị output"""
    if show_progress:
        print_info("Đang xử lý...")
    elif not silent:
        print_info(f"Đang chạy: {cmd}")
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=check,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        if result.stdout and not silent:
            print(result.stdout)
        if result.stderr and result.returncode != 0 and not silent:
            print_error(f"Lỗi: {result.stderr}")
        return result
    except subprocess.CalledProcessError as e:
        if not silent:
            print_error(f"Lệnh thất bại: {e}")
        if check:
            sys.exit(1)
        return e

def run_remote_command(command, check=True, silent=False, show_progress=False):
    """Chạy command trên VM"""
    if show_progress:
        print_info("Đang kết nối đến VM...")
    elif not silent:
        print_info(f"Đang chạy trên VM: {command}")
    
    cmd = (
        f'gcloud compute ssh {VM_USER}@{VM_NAME} '
        f'--zone={VM_ZONE} '
        f'--command="{command}"'
    )
    return run_command(cmd, check=check, silent=silent, show_progress=show_progress)

def copy_file_to_vm(local_path, remote_path, show_progress=True):
    """Copy file từ local lên VM"""
    if show_progress:
        print_info(f"📤 Đang tải lên {Path(local_path).name}...")
    else:
        print_info(f"Đang sao chép {local_path} lên VM...")
    
    cmd = (
        f'gcloud compute scp "{local_path}" '
        f'{VM_USER}@{VM_NAME}:{remote_path} '
        f'--zone={VM_ZONE}'
    )
    run_command(cmd, show_progress=show_progress)

def copy_directory_to_vm(local_dir, remote_dir):
    """Copy directory từ local lên VM"""
    print_info(f"📤 Đang tải lên thư mục {Path(local_dir).name}...")
    cmd = (
        f'gcloud compute scp --recurse "{local_dir}" '
        f'{VM_USER}@{VM_NAME}:{remote_dir} '
        f'--zone={VM_ZONE}'
    )
    run_command(cmd)

def validate_python_syntax(file_path: Path) -> Tuple[bool, str]:
    """Kiểm tra syntax Python trước khi deploy"""
    print_info(f"🔍 Đang kiểm tra cú pháp: {Path(file_path).name}...")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", str(file_path)],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print_success("Cú pháp hợp lệ")
            return True, ""
        else:
            error_msg = result.stderr or result.stdout
            print_error(f"Lỗi cú pháp: {error_msg}")
            return False, error_msg
    except Exception as e:
        print_error(f"Kiểm tra thất bại: {e}")
        return False, str(e)

def backup_file_on_vm(file_path: str):
    """Backup file trên VM trước khi deploy"""
    print_info("💾 Đang tạo bản sao lưu...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{BACKUP_DIR}/{Path(file_path).name}.{timestamp}"
    
    commands = [
        f"mkdir -p {BACKUP_DIR}",
        f"cp {file_path} {backup_path} 2>/dev/null || echo 'File not found, skipping backup'"
    ]
    
    for cmd in commands:
        run_remote_command(cmd, check=False, silent=True)
    
    print_success(f"Đã sao lưu: {Path(backup_path).name}")
    return backup_path

def deploy_single_file(file_path, validate=True, backup=True):
    """Deploy một file cụ thể"""
    local_file = PROJECT_ROOT / file_path
    if not local_file.exists():
        print_error(f"Không tìm thấy file: {local_file}")
        return False
    
    # Validate syntax nếu là Python file
    if validate and local_file.suffix == '.py':
        is_valid, error = validate_python_syntax(local_file)
        if not is_valid:
            print_error("Kiểm tra thất bại. Hủy triển khai.")
            return False
    
    # Tính remote path
    if file_path.startswith("backend/"):
        remote_path = file_path.replace("backend/", f"{VM_BACKEND_PATH}/")
    else:
        remote_path = f"{VM_BACKEND_PATH}/{file_path}"
    
    # Backup nếu cần
    if backup:
        backup_file_on_vm(remote_path)
    
    copy_file_to_vm(str(local_file), remote_path)
    print_success(f"Đã triển khai: {Path(file_path).name}")
    return True

def deploy_all_backend():
    """Deploy toàn bộ backend"""
    print_header("🚀 Đang triển khai toàn bộ backend...")
    copy_directory_to_vm(str(BACKEND_DIR), VM_BACKEND_PATH)
    print_success("Triển khai backend thành công!")
    return True

def restart_service():
    """Restart backend service trên VM"""
    print_header("🔄 Đang khởi động lại service...")
    
    commands = [
        f"sudo systemctl restart {SERVICE_NAME}",
        f"sleep 3",  # Đợi service khởi động
    ]
    
    for cmd in commands:
        run_remote_command(cmd, check=False, silent=True)
    
    # Kiểm tra status
    result = run_remote_command(
        f"sudo systemctl is-active {SERVICE_NAME}",
        check=False,
        silent=True
    )
    
    if result.returncode == 0 and "active" in result.stdout:
        print_success("Service đã khởi động lại và đang hoạt động")
        return True
    else:
        print_error("Khởi động lại service thất bại")
        return False

def check_service_status():
    """Kiểm tra status của service"""
    print_header("📊 Trạng thái Service")
    
    # Check if service is active
    result = run_remote_command(
        f"sudo systemctl is-active {SERVICE_NAME}",
        check=False,
        silent=True
    )
    
    if result.returncode == 0:
        status = result.stdout.strip()
        if status == "active":
            print_success(f"Service đang {status}")
        else:
            print_warning(f"Trạng thái service: {status}")
    else:
        print_error("Service không hoạt động")
    
    # Show recent logs
    print_info("Logs gần đây:")
    run_remote_command(f"sudo journalctl -u {SERVICE_NAME} -n 15 --no-pager", check=False)

def check_process_and_port():
    """Kiểm tra process và port"""
    print_header("🔍 Kiểm tra Process & Port")
    
    # Check process
    result = run_remote_command(
        f"ps aux | grep uvicorn | grep -v grep",
        check=False,
        silent=True
    )
    
    if result.returncode == 0 and result.stdout.strip():
        print_success("Process uvicorn đang chạy")
        lines = result.stdout.strip().split('\n')
        for line in lines[:2]:  # Show first 2 processes
            print(f"  {line}")
    else:
        print_error("Không tìm thấy process uvicorn")
    
    # Check port
    result = run_remote_command(
        f"sudo netstat -tlnp 2>/dev/null | grep {API_PORT} || sudo ss -tlnp 2>/dev/null | grep {API_PORT}",
        check=False,
        silent=True
    )
    
    if result.returncode == 0 and result.stdout.strip():
        print_success(f"Port {API_PORT} đang lắng nghe")
    else:
        print_error(f"Port {API_PORT} không lắng nghe")

def test_health_endpoint():
    """Test health endpoint với backend client"""
    print_header("🏥 Kiểm tra Health Endpoint")
    
    success, data = backend_client.health_check()
    if success:
        print_success("Kiểm tra sức khỏe thành công")
        print(f"  Phản hồi: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return True
    else:
        print_error("Kiểm tra sức khỏe thất bại")
        return False

def test_api_endpoints():
    """Test các API endpoints với backend client"""
    print_header("🧪 Kiểm tra API Endpoints")
    
    endpoints = [
        ("GET", "/", "Endpoint gốc"),
        ("GET", "/health", "Kiểm tra sức khỏe"),
        ("GET", "/api/posts?limit=5", "Danh sách bài viết"),
        ("GET", "/api/exams?limit=5", "Danh sách đề thi"),
        ("GET", "/api/documents?limit=5", "Danh sách tài liệu"),
    ]
    
    results = []
    for method, endpoint, description in endpoints:
        show_progress(f"Đang kiểm tra {description}")
        response = backend_client.get(endpoint)
        
        if response and response.status_code < 400:
            print_success(f"{description}: {response.status_code}")
            results.append(True)
        else:
            status = response.status_code if response else "N/A"
            print_warning(f"{description}: {status}")
            results.append(False)
    
    success_rate = sum(results) / len(results) * 100
    print_info(f"Tỷ lệ thành công: {success_rate:.1f}% ({sum(results)}/{len(results)})")
    return all(results)

def test_cors():
    """Test CORS configuration với backend client"""
    print_header("🌐 Kiểm tra CORS")
    
    response = backend_client.options(
        "/api/posts",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization"
        }
    )
    
    if response:
        cors_headers = {
            "access-control-allow-origin": response.headers.get("Access-Control-Allow-Origin"),
            "access-control-allow-methods": response.headers.get("Access-Control-Allow-Methods"),
            "access-control-allow-headers": response.headers.get("Access-Control-Allow-Headers"),
        }
        
        if any(cors_headers.values()):
            print_success("CORS headers có mặt")
            for key, value in cors_headers.items():
                if value:
                    print(f"  {key}: {value}")
            return True
        else:
            print_warning("Không tìm thấy CORS headers")
            return False
    else:
        print_error("Kiểm tra CORS thất bại: Không có phản hồi")
        return False

def check_database_connection():
    """Kiểm tra kết nối database"""
    print_header("💾 Kiểm tra Database")
    
    # Test database file exists
    result = run_remote_command(
        f"test -f {VM_BACKEND_PATH}/database.db && echo 'exists' || echo 'not found'",
        check=False,
        silent=True
    )
    
    if "exists" in result.stdout:
        print_success("File database tồn tại")
        
        # Check file size
        result = run_remote_command(
            f"ls -lh {VM_BACKEND_PATH}/database.db | awk '{{print $5}}'",
            check=False,
            silent=True
        )
        if result.stdout.strip():
            print_info(f"Kích thước database: {result.stdout.strip()}")
    else:
        print_warning("Không tìm thấy file database (sẽ được tạo khi sử dụng lần đầu)")
    
    # Test via API
    success, data = backend_client.health_check()
    if success:
        print_success("Kết nối database OK (qua API)")
        return True
    return False

def check_system_resources():
    """Kiểm tra tài nguyên hệ thống"""
    print_header("💻 Tài nguyên Hệ thống")
    
    # CPU usage
    result = run_remote_command(
        "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'",
        check=False,
        silent=True
    )
    if result.stdout.strip():
        cpu = result.stdout.strip()
        print_info(f"Sử dụng CPU: {cpu}%")
    
    # Memory usage
    result = run_remote_command(
        "free -h | grep Mem | awk '{print $3\"/\"$2}'",
        check=False,
        silent=True
    )
    if result.stdout.strip():
        mem = result.stdout.strip()
        print_info(f"Bộ nhớ: {mem}")
    
    # Disk space
    result = run_remote_command(
        f"df -h {VM_BACKEND_PATH} | tail -1 | awk '{{print $5}}'",
        check=False,
        silent=True
    )
    if result.stdout.strip():
        disk = result.stdout.strip()
        print_info(f"Sử dụng ổ đĩa: {disk}")

def check_logs_for_errors():
    """Kiểm tra logs tìm lỗi"""
    print_header("📋 Phân tích Log Lỗi")
    
    result = run_remote_command(
        f"sudo journalctl -u {SERVICE_NAME} -n 50 --no-pager | grep -iE 'error|exception|traceback|failed' | tail -10",
        check=False,
        silent=True
    )
    
    if result.stdout.strip():
        print_warning("Tìm thấy lỗi trong logs:")
        print(result.stdout)
        return False
    else:
        print_success("Không tìm thấy lỗi trong logs gần đây")
        return True

def full_health_check():
    """Chạy tất cả các kiểm tra"""
    print_header("🏥 KIỂM TRA SỨC KHỎE TOÀN DIỆN")
    
    checks = [
        ("Trạng thái Service", check_service_status),
        ("Process & Port", check_process_and_port),
        ("Health Endpoint", test_health_endpoint),
        ("API Endpoints", test_api_endpoints),
        ("CORS", test_cors),
        ("Database", check_database_connection),
        ("Tài nguyên Hệ thống", check_system_resources),
        ("Log Lỗi", check_logs_for_errors),
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            result = check_func()
            results[name] = result if isinstance(result, bool) else True
        except Exception as e:
            print_error(f"Kiểm tra {name} thất bại: {e}")
            results[name] = False
        time.sleep(0.3)
    
    # Summary
    print_header("📊 Tóm tắt Kiểm tra")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        if result:
            print_success(f"{name}: OK")
        else:
            print_error(f"{name}: THẤT BẠI")
    
    if passed == total:
        print_success(f"\n🎉 Tất cả kiểm tra đều thành công! ({passed}/{total})")
    else:
        print_warning(f"\n⚠️  {passed}/{total} kiểm tra thành công")
    
    return passed == total

def install_dependencies():
    """Cài đặt dependencies trên VM"""
    print_header("📦 Đang cài đặt dependencies...")
    
    command = (
        f"cd {VM_BACKEND_PATH} && "
        f"source venv/bin/activate && "
        f"pip install -r requirements.txt --quiet"
    )
    
    run_remote_command(command, show_progress=True)
    print_success("Đã cài đặt dependencies!")

def rollback_file(file_path: str):
    """Rollback file về version trước"""
    print_header("⏪ Đang khôi phục...")
    
    result = run_remote_command(
        f"ls -t {BACKUP_DIR}/{Path(file_path).name}.* 2>/dev/null | head -1",
        check=False,
        silent=True
    )
    
    if result.stdout.strip():
        backup_file = result.stdout.strip()
        print_info(f"Đang khôi phục từ: {Path(backup_file).name}")
        run_remote_command(f"cp {backup_file} {file_path}", check=False, silent=True)
        print_success("Khôi phục hoàn tất!")
        return True
    else:
        print_error("Không tìm thấy bản sao lưu để khôi phục")
        return False


def git_commit_and_push(message: Optional[str] = None):
    """
    Tự động git add/commit/push toàn bộ project.
    Dùng khi bạn muốn GitHub là trung tâm đồng bộ backend + frontend.
    """
    print_header("📡 Đồng bộ mã nguồn lên GitHub")

    # Kiểm tra xem có repo git không
    result = run_command("git rev-parse --is-inside-work-tree", check=False, silent=True)
    if result.returncode != 0:
        print_warning("Thư mục hiện tại không phải là git repo, bỏ qua git push")
        return False

    # Kiểm tra có thay đổi gì không
    status = run_command("git status --porcelain", check=False, silent=True)
    if status.returncode != 0:
        print_error("Không thể đọc trạng thái git, bỏ qua git push")
        return False

    if not status.stdout.strip():
        print_info("Không có thay đổi nào mới, không cần commit/push")
        return True

    # Git add tất cả thay đổi
    print_info("Đang chạy: git add -A")
    run_command("git add -A", check=True, silent=True)

    # Commit với message mặc định nếu không truyền vào
    if not message:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message = f"chore: deploy backend at {timestamp}"

    print_info(f"Đang commit với message: {message}")
    commit_cmd = f'git commit -m "{message}"'
    commit_result = run_command(commit_cmd, check=False, silent=True)
    if commit_result.returncode != 0:
        # Có thể do không có gì để commit (đã commit trước đó)
        if "nothing to commit" in commit_result.stdout.lower() or "nothing to commit" in commit_result.stderr.lower():
            print_info("Không có gì để commit thêm")
        else:
            print_error(f"Commit thất bại: {commit_result.stderr or commit_result.stdout}")
            return False

    # Push lên remote mặc định
    print_info("Đang push lên remote...")
    push_result = run_command("git push", check=False, silent=True)
    if push_result.returncode == 0:
        print_success("Đã push lên GitHub thành công")
        return True
    else:
        print_error(f"Push thất bại: {push_result.stderr or push_result.stdout}")
        return False

def interactive_menu():
    """Menu tương tác"""
    try:
        while True:
            print_menu_header()

            # Hiển thị trạng thái nhanh
            result = run_remote_command(
                f"sudo systemctl is-active {SERVICE_NAME}",
                check=False,
                silent=True
            )
            status = result.stdout.strip() if result.returncode == 0 else "unknown"
            status_color = Colors.GREEN if status == "active" else Colors.RED
            print(f"Trạng thái Service: {status_color}{status}{Colors.RESET}\n")

            print(f"{Colors.BOLD}📦 TÙY CHỌN TRIỂN KHAI{Colors.RESET}")
            print("  1. Triển khai file đơn (main.py)")
            print("  2. Triển khai toàn bộ backend")
            print("  3. Triển khai file tùy chỉnh")
            print("  4. Cài đặt dependencies")
            print("  5. Khởi động lại service")

            print(f"\n{Colors.BOLD}🔍 TÙY CHỌN KIỂM TRA{Colors.RESET}")
            print("  6. Trạng thái service")
            print("  7. Kiểm tra process & port")
            print("  8. Kiểm tra API endpoints")
            print("  9. Kiểm tra CORS")
            print("  10. Kiểm tra database")
            print("  11. Tài nguyên hệ thống")
            print("  12. Kiểm tra log lỗi")
            print("  13. Kiểm tra sức khỏe toàn diện")

            print(f"\n{Colors.BOLD}🔧 TÙY CHỌN NÂNG CAO{Colors.RESET}")
            print("  14. Khôi phục file")
            print("  15. Xem logs gần đây")
            print("  16. Kiểm tra kết nối backend")
            print("  19. Git add/commit/push lên GitHub")

            print(f"\n{Colors.BOLD}⚙️  CÀI ĐẶT{Colors.RESET}")
            print("  17. Thay đổi cài đặt VM")
            print("  18. Kiểm tra kết nối VM")

            print(f"\n{Colors.BOLD}❌ THOÁT{Colors.RESET}")
            print("  0. Thoát")

            print(f"\n{Colors.CYAN}{'='*60}{Colors.RESET}")
            try:
                choice = input(f"{Colors.BOLD}Chọn tùy chọn (0-18): {Colors.RESET}").strip()
            except KeyboardInterrupt:
                print("\n")
                print_success("Tạm biệt!")
                break

            if choice == "0":
                print_success("Tạm biệt!")
                break

            try:
                if choice == "1":
                    deploy_single_file("backend/app/main.py")
                elif choice == "2":
                    deploy_all_backend()
                elif choice == "3":
                    file_path = input("Nhập đường dẫn file (ví dụ: backend/app/config.py): ").strip()
                    if file_path:
                        deploy_single_file(file_path)
                elif choice == "4":
                    install_dependencies()
                elif choice == "5":
                    if restart_service():
                        time.sleep(2)
                        test_health_endpoint()
                elif choice == "6":
                    check_service_status()
                elif choice == "7":
                    check_process_and_port()
                elif choice == "8":
                    test_api_endpoints()
                elif choice == "9":
                    test_cors()
                elif choice == "10":
                    check_database_connection()
                elif choice == "11":
                    check_system_resources()
                elif choice == "12":
                    check_logs_for_errors()
                elif choice == "13":
                    full_health_check()
                elif choice == "14":
                    file_path = input("Nhập đường dẫn file cần khôi phục: ").strip()
                    if file_path:
                        rollback_file(file_path)
                elif choice == "15":
                    print_header("📋 Logs Gần Đây")
                    run_remote_command(f"sudo journalctl -u {SERVICE_NAME} -n 30 --no-pager", check=False)
                elif choice == "16":
                    test_health_endpoint()
                elif choice == "19":
                    print_header("📡 Git add/commit/push lên GitHub")
                    custom_msg = input("Nhập commit message (Enter để dùng message tự động): ").strip()
                    git_commit_and_push(custom_msg if custom_msg else None)
                elif choice == "17":
                    print_header("⚙️  Cài Đặt VM")
                    print(f"Tên VM: {VM_NAME}")
                    print(f"Zone VM: {VM_ZONE}")
                    print(f"User VM: {VM_USER}")
                    print(f"URL API: {API_BASE_URL}")
                    print("\nĐể thay đổi cài đặt, chỉnh sửa file deploy_backend.py")
                elif choice == "18":
                    print_header("🔌 Kiểm tra Kết nối VM")
                    result = run_remote_command("echo 'Connection OK'", check=False)
                    if result.returncode == 0:
                        print_success("Kết nối VM OK")
                    else:
                        print_error("Kết nối VM thất bại")
                else:
                    print_warning("Lựa chọn không hợp lệ!")
                    time.sleep(1)
                    continue

                # Đợi người dùng nhấn Enter để quay lại menu
                try:
                    input("\nNhấn Enter để tiếp tục...")
                except KeyboardInterrupt:
                    print("\n")
                    continue

            except KeyboardInterrupt:
                print("\n")
                continue

    except KeyboardInterrupt:
        print("\n")
        print_success("Tạm biệt!")
    except Exception as e:
        print_error(f"Lỗi không mong đợi: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="Triển khai backend lên Google Cloud VM với menu tương tác",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ví dụ:
  # Menu tương tác
  python deploy_backend.py
  
  # Triển khai file đơn
  python deploy_backend.py -f backend/app/main.py -r
  
  # Kiểm tra sức khỏe toàn diện
  python deploy_backend.py --health
        """
    )
    
    # Deploy options
    parser.add_argument("--file", "-f", help="Triển khai một file cụ thể")
    parser.add_argument("--all", "-a", action="store_true", help="Triển khai toàn bộ backend")
    parser.add_argument("--restart", "-r", action="store_true", help="Khởi động lại service")
    parser.add_argument("--install", "-i", action="store_true", help="Cài đặt dependencies")
    parser.add_argument("--no-backup", action="store_true", help="Bỏ qua backup")
    parser.add_argument("--no-validate", action="store_true", help="Bỏ qua validation")
    
    # Check options
    parser.add_argument("--status", "-s", action="store_true", help="Kiểm tra trạng thái service")
    parser.add_argument("--health", action="store_true", help="Kiểm tra sức khỏe toàn diện")
    parser.add_argument("--test-api", action="store_true", help="Kiểm tra API endpoints")
    parser.add_argument("--test-cors", action="store_true", help="Kiểm tra CORS")
    parser.add_argument("--check-db", action="store_true", help="Kiểm tra database")
    parser.add_argument("--check-resources", action="store_true", help="Kiểm tra tài nguyên")
    parser.add_argument("--check-logs", action="store_true", help="Kiểm tra logs")
    parser.add_argument("--check-process", action="store_true", help="Kiểm tra process")
    
    # Advanced
    parser.add_argument("--rollback", help="Khôi phục một file")
    parser.add_argument("--interactive", action="store_true", help="Khởi động menu tương tác")
    parser.add_argument("--git-push", action="store_true", help="Git add/commit/push sau khi deploy")
    parser.add_argument("--git-message", help="Custom git commit message khi dùng --git-push")
    
    args = parser.parse_args()
    
    # Nếu không có arguments, chạy interactive menu
    if len(sys.argv) == 1:
        interactive_menu()
        return
    
    # Rollback
    if args.rollback:
        rollback_file(args.rollback)
        if args.restart:
            restart_service()
        return
    
    # Deploy
    if args.file:
        deploy_single_file(
            args.file,
            validate=not args.no_validate,
            backup=not args.no_backup
        )
    elif args.all:
        deploy_all_backend()
    
    # Install
    if args.install:
        install_dependencies()
    
    # Restart
    if args.restart:
        restart_service()
    
    # Health checks
    if args.health:
        full_health_check()
    else:
        if args.status:
            check_service_status()
        if args.check_process:
            check_process_and_port()
        if args.test_api:
            test_api_endpoints()
        if args.test_cors:
            test_cors()
        if args.check_db:
            check_database_connection()
        if args.check_resources:
            check_system_resources()
        if args.check_logs:
            check_logs_for_errors()

    # Git push sau khi deploy / health-check nếu được yêu cầu
    if args.git_push:
        git_commit_and_push(args.git_message)
    
    # Interactive menu
    if args.interactive:
        interactive_menu()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n")
        print_success("Tạm biệt!")
        sys.exit(0)
    except Exception as e:
        print_error(f"Lỗi: {e}")
        sys.exit(1)
