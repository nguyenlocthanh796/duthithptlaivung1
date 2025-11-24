#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 Deploy to Production
Backend: Google Cloud Run
Frontend: Firebase Hosting
"""

import os
import sys
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

# Configuration
PROJECT_ID = "gen-lang-client-0581370080"
REGION = "us-central1"
SERVICE_NAME = "duthi-backend"

def print_header(msg):
    print("\n" + "="*70)
    print(f"  {msg}")
    print("="*70 + "\n")

def run_command(cmd, cwd=None, check=True):
    """Run command and return success status"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            check=check,
            capture_output=False,
            shell=True if os.name == "nt" else False
        )
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {e}")
        return False

def check_gcloud():
    """Check if gcloud is installed"""
    cmd = "gcloud version"
    try:
        subprocess.run(cmd.split(), check=True, capture_output=True)
        return True
    except:
        print("❌ gcloud CLI not found!")
        print("Install from: https://cloud.google.com/sdk/docs/install")
        return False

def check_firebase():
    """Check if firebase CLI is installed"""
    firebase_cmd = "firebase.cmd" if os.name == "nt" else "firebase"
    try:
        subprocess.run([firebase_cmd, "--version"], check=True, capture_output=True)
        return True
    except:
        print("❌ Firebase CLI not found!")
        print("Install: npm install -g firebase-tools")
        return False

def deploy_backend():
    """Deploy backend to Cloud Run"""
    print_header("📦 [1/2] Deploying Backend to Cloud Run")
    
    if not check_gcloud():
        return False
    
    # Check env.yaml
    env_file = BACKEND_DIR / "env.yaml"
    if not env_file.exists():
        print("❌ backend/env.yaml not found!")
        print("Create it with your environment variables")
        return False
    
    print("🔨 Building and deploying to Cloud Run...")
    print(f"Project: {PROJECT_ID}")
    print(f"Service: {SERVICE_NAME}")
    print(f"Region: {REGION}\n")
    
    # Set project
    run_command(f"gcloud config set project {PROJECT_ID}")
    
    # Deploy
    cmd = f"""gcloud run deploy {SERVICE_NAME} \
        --source . \
        --region {REGION} \
        --project {PROJECT_ID} \
        --allow-unauthenticated \
        --max-instances 1 \
        --memory 1Gi \
        --cpu 1 \
        --timeout 300 \
        --env-vars-file=env.yaml \
        --quiet"""
    
    if run_command(cmd, cwd=str(BACKEND_DIR)):
        print("\n✅ Backend deployed successfully!")
        print(f"URL: https://{SERVICE_NAME}-626004693464.{REGION}.run.app")
        return True
    else:
        print("\n❌ Backend deployment failed!")
        return False

def deploy_frontend():
    """Deploy frontend to Firebase Hosting"""
    print_header("🌐 [2/2] Deploying Frontend to Firebase Hosting")
    
    if not check_firebase():
        return False
    
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    firebase_cmd = "firebase.cmd" if os.name == "nt" else "firebase"
    
    # Build frontend
    print("🔨 Building frontend...")
    if not run_command([npm_cmd, "run", "build"], cwd=str(FRONTEND_DIR)):
        print("❌ Frontend build failed!")
        return False
    
    print("\n📤 Deploying to Firebase (Hosting + Firestore)...")
    # Use quotes for comma-separated list in PowerShell
    if os.name == "nt":
        cmd = [firebase_cmd, "deploy", "--only", '"hosting,firestore"', "--project", PROJECT_ID]
    else:
        cmd = [firebase_cmd, "deploy", "--only", "hosting,firestore", "--project", PROJECT_ID]
    
    if run_command(cmd, cwd=str(PROJECT_ROOT)):
        print("\n✅ Frontend deployed successfully!")
        print(f"URL: https://{PROJECT_ID}.web.app")
        return True
    else:
        print("\n❌ Frontend deployment failed!")
        return False

def main():
    print_header("🚀 Deploying to Production")
    
    print("Deployment targets:")
    print(f"  Backend:  Google Cloud Run ({REGION})")
    print(f"  Frontend: Firebase Hosting")
    print(f"  Project:  {PROJECT_ID}\n")
    
    # Ask for confirmation
    response = input("Continue with deployment? [y/N]: ").strip().lower()
    if response not in ['y', 'yes']:
        print("❌ Deployment cancelled")
        return
    
    # Deploy backend
    backend_ok = deploy_backend()
    if not backend_ok:
        print("\n⚠️  Backend deployment failed. Stop deployment.")
        return
    
    # Deploy frontend
    frontend_ok = deploy_frontend()
    
    # Summary
    print_header("📊 Deployment Summary")
    
    if backend_ok and frontend_ok:
        print("✅ DEPLOYMENT SUCCESSFUL!\n")
        print(f"Frontend: https://{PROJECT_ID}.web.app")
        print(f"Backend:  https://{SERVICE_NAME}-626004693464.{REGION}.run.app")
        print(f"API Docs: https://{SERVICE_NAME}-626004693464.{REGION}.run.app/docs")
        print("\n🎉 All services are online!")
    else:
        print("❌ DEPLOYMENT FAILED")
        print(f"Backend: {'✅' if backend_ok else '❌'}")
        print(f"Frontend: {'✅' if frontend_ok else '❌'}")
    
    print("="*70 + "\n")

if __name__ == "__main__":
    main()

