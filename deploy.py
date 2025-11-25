#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 Deploy to Production - Complete Deployment Script
- Backend: Google Cloud Run
- Frontend: Firebase Hosting  
- Code: GitHub (Push & Sync)
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

def run_command(cmd, cwd=None, check=True, shell=None):
    """Run command and return success status"""
    if shell is None:
        shell = True if os.name == "nt" else False
    
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            check=check,
            capture_output=False,
            shell=shell
        )
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_gcloud():
    """Check if gcloud is installed"""
    gcloud_cmd = "gcloud.cmd" if os.name == "nt" else "gcloud"
    try:
        subprocess.run([gcloud_cmd, "version"], check=True, capture_output=True)
        return True
    except:
        print("❌ gcloud CLI not found!")
        print("📥 Install from: https://cloud.google.com/sdk/docs/install")
        print("   Or use: winget install Google.CloudSDK")
        return False

def check_firebase():
    """Check if firebase CLI is installed"""
    firebase_cmd = "firebase.cmd" if os.name == "nt" else "firebase"
    try:
        subprocess.run([firebase_cmd, "--version"], check=True, capture_output=True)
        return True
    except:
        print("❌ Firebase CLI not found!")
        print("📥 Install: npm install -g firebase-tools")
        return False

def find_git():
    """Find git executable on Windows"""
    if os.name == "nt":
        # Common Git installation paths on Windows
        possible_paths = [
            "git",  # In PATH
            "git.exe",  # In PATH
            r"C:\Program Files\Git\bin\git.exe",
            r"C:\Program Files (x86)\Git\bin\git.exe",
            r"C:\Program Files\Git\cmd\git.exe",
            r"C:\Program Files (x86)\Git\cmd\git.exe",
        ]
        
        for git_path in possible_paths:
            try:
                result = subprocess.run(
                    [git_path, "--version"],
                    check=True,
                    capture_output=True,
                    timeout=5
                )
                if result.returncode == 0:
                    return git_path
            except:
                continue
        
        return None
    else:
        # Unix-like systems
        try:
            subprocess.run(["git", "--version"], check=True, capture_output=True)
            return "git"
        except:
            return None

def check_git():
    """Check if git is installed"""
    git_cmd = find_git()
    
    if git_cmd:
        # Store git command for later use
        check_git.git_cmd = git_cmd
        return True
    else:
        print("❌ Git not found!")
        print("📥 Git đã được cài nhưng không có trong PATH")
        print("💡 Giải pháp:")
        print("   1. Restart PowerShell/Terminal (sau khi cài Git)")
        print("   2. Hoặc thêm Git vào PATH:")
        print("      - Tìm: C:\\Program Files\\Git\\bin\\git.exe")
        print("      - Thêm vào System PATH (xem SETUP_GIT_WINDOWS.md)")
        print("   3. Hoặc dùng Git Bash thay vì PowerShell")
        return False

# Initialize git_cmd attribute
check_git.git_cmd = None

def deploy_backend():
    """Deploy backend to Cloud Run"""
    print_header("📦 Deploying Backend to Cloud Run")
    
    if not check_gcloud():
        return False
    
    print("🔨 Building and deploying to Cloud Run...")
    print(f"Project: {PROJECT_ID}")
    print(f"Service: {SERVICE_NAME}")
    print(f"Region: {REGION}\n")
    
    # ⚠️ SECURITY WARNING: Do not use env.yaml file
    print("⚠️  SECURITY: API keys must be configured via Cloud Run Environment Variables")
    print("   NOT via env.yaml file (to prevent key leakage)")
    print()
    
    # Check if user wants to configure keys now
    response = input("Configure API keys on Cloud Run now? [y/N]: ").strip().lower()
    if response in ['y', 'yes']:
        print("\n💡 Use one of these methods:")
        print("   1. Run: python update_cloud_run_keys.py")
        print("   2. Or use Cloud Console: https://console.cloud.google.com/run")
        print("   3. See FIX_API_KEY_LEAK.md for detailed instructions")
        print()
        configure_now = input("Open update script? [y/N]: ").strip().lower()
        if configure_now in ['y', 'yes']:
            update_script = PROJECT_ROOT / "update_cloud_run_keys.py"
            if update_script.exists():
                print(f"\n📝 Running: python {update_script.name}")
                subprocess.run([sys.executable, str(update_script)], cwd=str(PROJECT_ROOT))
            else:
                print("❌ update_cloud_run_keys.py not found!")
                print("   Please configure keys manually on Cloud Console")
        else:
            print("⚠️  Make sure to configure API keys before deploying!")
            confirm = input("Continue with deployment? [y/N]: ").strip().lower()
            if confirm not in ['y', 'yes']:
                print("❌ Deployment cancelled")
                return False
    else:
        print("⚠️  WARNING: Ensure API keys are already configured on Cloud Run!")
        print("   If not, deployment may fail or API calls will fail.")
        confirm = input("Continue? [y/N]: ").strip().lower()
        if confirm not in ['y', 'yes']:
            print("❌ Deployment cancelled")
            return False
    
    # Set project
    gcloud_cmd = "gcloud.cmd" if os.name == "nt" else "gcloud"
    run_command([gcloud_cmd, "config", "set", "project", PROJECT_ID])
    
    # Deploy WITHOUT env-vars-file (keys should be in Cloud Run Environment Variables)
    # .gcloudignore will exclude env.yaml and .env files automatically
    cmd = [
        gcloud_cmd, "run", "deploy", SERVICE_NAME,
        "--source", ".",
        "--region", REGION,
        "--project", PROJECT_ID,
        "--allow-unauthenticated",
        "--max-instances", "1",
        "--memory", "1Gi",
        "--cpu", "1",
        "--timeout", "300",
        # REMOVED: --env-vars-file env.yaml (security risk)
        # Environment variables should be set via Cloud Console or update_cloud_run_keys.py
        "--quiet"
    ]
    
    if run_command(cmd, cwd=str(BACKEND_DIR), shell=False):
        print("\n✅ Backend deployed successfully!")
        print(f"URL: https://{SERVICE_NAME}-626004693464.{REGION}.run.app")
        print("\n📝 IMPORTANT: Verify API keys are configured on Cloud Run:")
        print(f"   https://console.cloud.google.com/run/detail/{REGION}/{SERVICE_NAME}/variables")
        return True
    else:
        print("\n❌ Backend deployment failed!")
        print("\n💡 Troubleshooting:")
        print("   1. Check if API keys are configured on Cloud Run")
        print("   2. Run: python update_cloud_run_keys.py")
        print("   3. See: FIX_API_KEY_LEAK.md")
        return False

def deploy_frontend():
    """Deploy frontend to Firebase Hosting"""
    print_header("🌐 Deploying Frontend to Firebase Hosting")
    
    if not check_firebase():
        return False
    
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    firebase_cmd = "firebase.cmd" if os.name == "nt" else "firebase"
    
    # Build frontend
    print("🔨 Building frontend...")
    if not run_command([npm_cmd, "run", "build"], cwd=str(FRONTEND_DIR), shell=False):
        print("❌ Frontend build failed!")
        return False
    
    # Check if firestore.indexes.json exists and has indexes
    indexes_file = PROJECT_ROOT / "firestore.indexes.json"
    if indexes_file.exists():
        try:
            import json
            with open(indexes_file, 'r', encoding='utf-8') as f:
                indexes_data = json.load(f)
            indexes_count = len(indexes_data.get('indexes', []))
            if indexes_count > 0:
                print(f"📊 Found {indexes_count} Firestore indexes to deploy")
            else:
                print("⚠️  firestore.indexes.json is empty!")
                print("   Run: python export_firestore_indexes.py to export current indexes")
        except Exception as e:
            print(f"⚠️  Could not read firestore.indexes.json: {e}")
    else:
        print("⚠️  firestore.indexes.json not found!")
        print("   Run: python export_firestore_indexes.py to export current indexes")
    
    print("\n📤 Deploying to Firebase (Hosting + Firestore Rules + Indexes)...")
    # Use proper command format for PowerShell
    # Deploy firestore includes: rules, indexes, and fieldOverrides
    if os.name == "nt":
        cmd = f'{firebase_cmd} deploy --only "hosting,firestore:rules,firestore:indexes" --project {PROJECT_ID}'
        success = run_command(cmd, cwd=str(PROJECT_ROOT), shell=True)
    else:
        cmd = [firebase_cmd, "deploy", "--only", "hosting,firestore:rules,firestore:indexes", "--project", PROJECT_ID]
        success = run_command(cmd, cwd=str(PROJECT_ROOT), shell=False)
    
    if success:
        print("\n✅ Frontend deployed successfully!")
        print(f"URL: https://{PROJECT_ID}.web.app")
        return True
    else:
        print("\n❌ Frontend deployment failed!")
        return False

def push_to_github():
    """Push code to GitHub"""
    print_header("📤 Pushing Code to GitHub")
    
    if not check_git():
        return False
    
    # Use the found git command
    git_cmd = check_git.git_cmd or "git"
    
    # Check if git repo is initialized
    git_dir = PROJECT_ROOT / ".git"
    if not git_dir.exists():
        print("⚠️  Git repository not initialized!")
        response = input("Initialize git repository? [y/N]: ").strip().lower()
        if response in ['y', 'yes']:
            print("Initializing git repository...")
            if not run_command([git_cmd, "init"], cwd=str(PROJECT_ROOT), shell=False):
                return False
            if not run_command([git_cmd, "add", "."], cwd=str(PROJECT_ROOT), shell=False):
                return False
            commit_msg = input("Enter commit message [Initial commit]: ").strip() or "Initial commit"
            if not run_command([git_cmd, "commit", "-m", commit_msg], cwd=str(PROJECT_ROOT), shell=False):
                return False
            print("✅ Git repository initialized!")
            print("📝 Next: Add remote and push (see SETUP_GIT_WINDOWS.md)")
            return False
        else:
            return False
    
    # Check for changes
    result = subprocess.run(
        [git_cmd, "status", "--porcelain"],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True
    )
    
    if not result.stdout.strip():
        print("✅ No changes to commit")
    else:
        print("📝 Changes detected:")
        print(result.stdout)
        
        # Ask to commit
        response = input("\nCommit and push changes? [y/N]: ").strip().lower()
        if response not in ['y', 'yes']:
            print("❌ Push cancelled")
            return False
        
        # Add all changes
        print("\n📦 Adding changes...")
        if not run_command([git_cmd, "add", "."], cwd=str(PROJECT_ROOT), shell=False):
            return False
        
        # Commit
        commit_msg = input("Enter commit message: ").strip()
        if not commit_msg:
            commit_msg = f"Update: {subprocess.check_output([git_cmd, 'status', '--short'], cwd=str(PROJECT_ROOT), text=True).strip()[:50]}"
        
        print(f"💾 Committing: {commit_msg}")
        if not run_command([git_cmd, "commit", "-m", commit_msg], cwd=str(PROJECT_ROOT), shell=False):
            return False
    
    # Check remote
    result = subprocess.run(
        [git_cmd, "remote", "-v"],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True
    )
    
    if not result.stdout.strip():
        print("⚠️  No remote repository configured!")
        remote_url = input("Enter GitHub repository URL (or press Enter to skip): ").strip()
        if remote_url:
            print(f"Adding remote: {remote_url}")
            if not run_command([git_cmd, "remote", "add", "origin", remote_url], cwd=str(PROJECT_ROOT), shell=False):
                return False
            # Set main branch
            run_command([git_cmd, "branch", "-M", "main"], cwd=str(PROJECT_ROOT), shell=False)
        else:
            print("❌ Cannot push without remote repository")
            print("📝 See: SETUP_GIT_WINDOWS.md for GitHub setup")
            return False
    
    # Check if we need to pull first
    print("\n🔄 Checking remote changes...")
    result = subprocess.run(
        [git_cmd, "fetch", "origin"],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True
    )
    
    # Check if local branch is behind remote
    branch = "main"
    result = subprocess.run(
        [git_cmd, "branch", "--show-current"],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True
    )
    if result.stdout.strip():
        branch = result.stdout.strip()
    
    # Check if local is behind remote
    result = subprocess.run(
        [git_cmd, "rev-list", "--left-right", f"{branch}...origin/{branch}"],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True
    )
    
    has_remote_changes = False
    if result.returncode == 0 and result.stdout.strip():
        # Check if there are commits in remote that we don't have
        remote_commits = [line for line in result.stdout.strip().split('\n') if line.startswith('>')]
        if remote_commits:
            has_remote_changes = True
    
    if has_remote_changes:
        print("⚠️  Remote repository has changes that you don't have locally!")
        print("   This usually happens when:")
        print("   - Someone else pushed code")
        print("   - You made changes on GitHub (web interface)")
        print("   - README or other files were updated on GitHub")
        print()
        
        response = input("Pull and merge remote changes? [Y/n]: ").strip().lower()
        if response not in ['n', 'no']:
            print("\n📥 Pulling remote changes...")
            
            # Try to pull with merge
            pull_result = subprocess.run(
                [git_cmd, "pull", "origin", branch, "--no-rebase"],
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True
            )
            
            if pull_result.returncode != 0:
                # Check if there are merge conflicts
                if "CONFLICT" in pull_result.stdout or "conflict" in pull_result.stdout.lower():
                    print("\n❌ Merge conflicts detected!")
                    print("   You need to resolve conflicts manually:")
                    print(f"   1. Check conflicts: git status")
                    print(f"   2. Resolve conflicts in the files")
                    print(f"   3. Commit: git commit")
                    print(f"   4. Push: git push")
                    return False
                else:
                    print(f"❌ Pull failed: {pull_result.stderr}")
                    print("\n💡 Try manually:")
                    print(f"   git pull origin {branch}")
                    return False
            else:
                print("✅ Successfully pulled and merged remote changes!")
        else:
            print("❌ Cannot push without pulling. Deployment cancelled.")
            return False
    
    # Push
    print("\n🚀 Pushing to GitHub...")
    if run_command([git_cmd, "push", "-u", "origin", branch], cwd=str(PROJECT_ROOT), shell=False):
        print("\n✅ Code pushed to GitHub successfully!")
        return True
    else:
        print("\n❌ Push to GitHub failed!")
        print("\n💡 Troubleshooting:")
        print("   1. Check your GitHub credentials")
        print("   2. Use Personal Access Token if needed")
        print("   3. Try manually: git push origin " + branch)
        print("   4. If still fails, check: git status")
        return False

def show_menu():
    """Show deployment menu"""
    print_header("🚀 Deployment Menu")
    print("Select deployment option:")
    print()
    print("  1. 📦 Deploy Backend (Google Cloud Run)")
    print("  2. 🌐 Deploy Frontend (Firebase Hosting)")
    print("  3. 📤 Push Code to GitHub")
    print("  4. 🔄 Deploy All (Backend + Frontend + GitHub)")
    print("  5. ❌ Cancel")
    print()
    
    choice = input("Enter your choice [1-5]: ").strip()
    return choice

def main():
    print_header("🚀 Complete Deployment Script")
    
    print("Deployment targets:")
    print(f"  Backend:  Google Cloud Run ({REGION})")
    print(f"  Frontend: Firebase Hosting")
    print(f"  GitHub:   Push & Sync code")
    print(f"  Project:  {PROJECT_ID}\n")
    
    # Show menu
    choice = show_menu()
    
    if choice == "1":
        # Deploy backend only
        deploy_backend()
    elif choice == "2":
        # Deploy frontend only
        deploy_frontend()
    elif choice == "3":
        # Push to GitHub only
        push_to_github()
    elif choice == "4":
        # Deploy all
        print_header("🔄 Deploying All Services")
        
        # Ask for confirmation
        response = input("Deploy Backend, Frontend, and push to GitHub? [y/N]: ").strip().lower()
        if response not in ['y', 'yes']:
            print("❌ Deployment cancelled")
            return
        
        results = {
            "backend": False,
            "frontend": False,
            "github": False
        }
        
        # Deploy backend
        results["backend"] = deploy_backend()
        if not results["backend"]:
            print("\n⚠️  Backend deployment failed!")
            continue_deploy = input("Continue with frontend? [y/N]: ").strip().lower()
            if continue_deploy not in ['y', 'yes']:
                return
        
        # Deploy frontend
        results["frontend"] = deploy_frontend()
        
        # Push to GitHub
        results["github"] = push_to_github()
        
        # Summary
        print_header("📊 Deployment Summary")
        
        print("Results:")
        print(f"  Backend:  {'✅ Success' if results['backend'] else '❌ Failed'}")
        print(f"  Frontend: {'✅ Success' if results['frontend'] else '❌ Failed'}")
        print(f"  GitHub:   {'✅ Success' if results['github'] else '❌ Failed'}")
        print()
        
        if all(results.values()):
            print("🎉 ALL DEPLOYMENTS SUCCESSFUL!\n")
            print(f"Frontend: https://{PROJECT_ID}.web.app")
            print(f"Backend:  https://{SERVICE_NAME}-626004693464.{REGION}.run.app")
            print(f"API Docs: https://{SERVICE_NAME}-626004693464.{REGION}.run.app/docs")
        elif any(results.values()):
            print("⚠️  PARTIAL SUCCESS")
            print("Some deployments succeeded, some failed.")
        else:
            print("❌ ALL DEPLOYMENTS FAILED")
            print("Please check the errors above and try again.")
        
    elif choice == "5":
        print("❌ Deployment cancelled")
        return
    else:
        print("❌ Invalid choice!")
        return
    
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    main()
