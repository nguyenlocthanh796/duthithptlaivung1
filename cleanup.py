#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dọn dẹp và tối ưu hóa dự án
"""

import os
import sys
import shutil
from pathlib import Path

# Fix encoding for Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

PROJECT_ROOT = Path(__file__).parent

def safe_print(msg):
    """Safe print with fallback."""
    try:
        print(msg)
    except:
        # Remove emojis
        msg = msg.replace('✅', '[OK]').replace('⚠️', '[WARN]').replace('🧹', '[CLEAN]').replace('📊', '[INFO]')
        print(msg)

def safe_remove(path):
    """Safely remove file or directory."""
    try:
        if path.is_file():
            path.unlink()
            safe_print(f"[OK] Deleted file: {path.name}")
        elif path.is_dir():
            shutil.rmtree(path)
            safe_print(f"[OK] Deleted folder: {path.name}")
    except Exception as e:
        safe_print(f"[WARN] Could not delete {path}: {e}")

def cleanup():
    """Clean up project."""
    safe_print("[CLEAN] Cleaning up project...")
    safe_print("="*60)
    
    # Remove Python cache
    print("\n[1/4] Removing Python __pycache__...")
    for pycache in PROJECT_ROOT.rglob("__pycache__"):
        safe_remove(pycache)
    
    # Remove temporary files
    print("\n[2/4] Removing temporary files...")
    patterns = ["*.pyc", "*.pyo", "*.pyd", "*.log", "*.tmp", "*.bak"]
    for pattern in patterns:
        for file in PROJECT_ROOT.rglob(pattern):
            safe_remove(file)
    
    # Clean tmp_uploads
    print("\n[3/4] Cleaning tmp_uploads...")
    tmp_uploads = PROJECT_ROOT / "backend" / "tmp_uploads"
    if tmp_uploads.exists():
        for file in tmp_uploads.iterdir():
            if file.name != ".gitkeep":
                safe_remove(file)
    
    # Remove archives
    print("\n[4/4] Removing archives...")
    for ext in ["*.tar.gz", "*.zip", "*.rar"]:
        for file in PROJECT_ROOT.glob(ext):
            safe_remove(file)
    
    safe_print("\n" + "="*60)
    safe_print("[OK] Cleanup complete!")
    safe_print("\n[INFO] Project size reduced!")

if __name__ == "__main__":
    cleanup()

