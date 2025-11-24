#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 Khởi động Development Server (Localhost)
Backend: http://localhost:8000
Frontend: http://localhost:5173
"""

import os
import sys
import time
import subprocess
from pathlib import Path

# Fix encoding for Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

PROJECT_ROOT = Path(__file__).parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

def print_header(msg):
    print("\n" + "="*60)
    print(f"  {msg}")
    print("="*60 + "\n")

def check_ports():
    """Check if ports are available"""
    import socket
    ports = [8000, 5173]
    for port in ports:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) == 0:
                print(f"⚠️  Port {port} đang được sử dụng!")
                return False
    return True

def start_backend():
    """Start FastAPI backend"""
    print("[1/2] Starting Backend...")
    
    # Check venv
    venv_python = BACKEND_DIR / ".venv" / "Scripts" / "python.exe" if os.name == "nt" else BACKEND_DIR / ".venv" / "bin" / "python"
    
    if not venv_python.exists():
        print("❌ Virtual environment not found!")
        print("Run: cd backend && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements.txt")
        return None
    
    # Start backend
    backend_process = subprocess.Popen(
        [str(venv_python), "start.py"],
        cwd=str(BACKEND_DIR),
        creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
    )
    
    print("✅ Backend starting at http://localhost:8000")
    return backend_process

def start_frontend():
    """Start Vite frontend"""
    print("\n[2/2] Starting Frontend...")
    
    # Check npm
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    
    try:
        subprocess.run([npm_cmd, "--version"], check=True, capture_output=True)
    except:
        print("❌ npm not found! Install Node.js first.")
        return None
    
    # Check node_modules
    if not (FRONTEND_DIR / "node_modules").exists():
        print("📦 Installing dependencies...")
        subprocess.run([npm_cmd, "install"], cwd=str(FRONTEND_DIR), check=True)
    
    # Start frontend
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(FRONTEND_DIR),
        creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
    )
    
    print("✅ Frontend starting at http://localhost:5173")
    return frontend_process

def main():
    print_header("🚀 Starting Development Servers")
    
    # Check .env files
    backend_env = BACKEND_DIR / ".env"
    frontend_env = FRONTEND_DIR / ".env"
    
    if not backend_env.exists():
        print("⚠️  backend/.env not found!")
        print("Copy from backend/.env.example and fill in your API keys")
        return
    
    if not frontend_env.exists():
        print("⚠️  frontend/.env not found!")
        print("Create it with: VITE_API_BASE_URL=http://localhost:8000")
    
    # Start services
    backend_proc = start_backend()
    if not backend_proc:
        return
    
    time.sleep(3)  # Wait for backend to start
    
    frontend_proc = start_frontend()
    if not frontend_proc:
        backend_proc.terminate()
        return
    
    print_header("✅ Development Servers Running")
    print("Backend:  http://localhost:8000")
    print("Frontend: http://localhost:5173")
    print("API Docs: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop all servers")
    print("="*60)
    
    try:
        # Keep script running
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("✅ Servers stopped")

if __name__ == "__main__":
    main()

