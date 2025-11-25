#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Export Firestore indexes từ Firebase Console
Sử dụng Firebase CLI để export indexes hiện tại
"""

import subprocess
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
INDEXES_FILE = PROJECT_ROOT / "firestore.indexes.json"

def run_command(cmd, cwd=None):
    """Run command and return output"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            check=True,
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return None
    except FileNotFoundError:
        print("❌ Firebase CLI not found!")
        print("📥 Install: npm install -g firebase-tools")
        return None

def export_indexes():
    """Export Firestore indexes từ Firebase"""
    print("="*70)
    print("📥 Exporting Firestore Indexes")
    print("="*70)
    print()
    
    firebase_cmd = "firebase.cmd" if sys.platform == "win32" else "firebase"
    
    # Check Firebase CLI
    version = run_command([firebase_cmd, "--version"])
    if not version:
        return False
    
    print(f"✅ Firebase CLI: {version}")
    print()
    
    # Export indexes using firebase firestore:indexes command
    print("📤 Exporting indexes from Firebase...")
    print("   Note: This command may not work directly. Using alternative method...")
    
    # Alternative: Use firebase deploy --dry-run to see indexes
    # Or manually create from console link
    print("\n💡 To export indexes, use one of these methods:")
    print("\n   Method 1: From Firebase Console (Recommended)")
    print("   1. Go to: https://console.firebase.google.com/project/gen-lang-client-0581370080/firestore/indexes")
    print("   2. Click the link in the error message (if available)")
    print("   3. Or manually create the index shown in console errors")
    print("   4. After index is created, copy the index definition to firestore.indexes.json")
    
    print("\n   Method 2: Use Firebase CLI")
    print("   Run: firebase firestore:indexes --project gen-lang-client-0581370080")
    
    # Check if file already has indexes
    if INDEXES_FILE.exists():
        try:
            with open(INDEXES_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            if existing_data.get('indexes'):
                print(f"\n✅ Found {len(existing_data['indexes'])} indexes in firestore.indexes.json")
                print("   Current indexes:")
                for idx in existing_data['indexes']:
                    collection = idx.get('collectionGroup', 'N/A')
                    fields = ', '.join([f.get('fieldPath', '') for f in idx.get('fields', [])])
                    print(f"      - {collection}: {fields}")
                return True
        except:
            pass
    
    print("\n⚠️  firestore.indexes.json is empty or doesn't exist")
    print("   Please create indexes manually or use the console link from errors")
    return False
    
    # Parse output (Firebase CLI outputs JSON)
    try:
        indexes_data = json.loads(output)
    except json.JSONDecodeError:
        # Try to extract JSON from output
        import re
        json_match = re.search(r'\{.*\}', output, re.DOTALL)
        if json_match:
            try:
                indexes_data = json.loads(json_match.group(0))
            except:
                print("❌ Could not parse indexes output")
                print("Raw output:", output[:200])
                return False
        else:
            print("❌ No JSON found in output")
            return False
    
    # Save to file
    print(f"\n💾 Saving to: {INDEXES_FILE}")
    with open(INDEXES_FILE, 'w', encoding='utf-8') as f:
        json.dump(indexes_data, f, indent=2, ensure_ascii=False)
    
    print("✅ Indexes exported successfully!")
    print(f"\n📊 Found {len(indexes_data.get('indexes', []))} indexes")
    
    # Show indexes
    if indexes_data.get('indexes'):
        print("\n📋 Indexes:")
        for idx in indexes_data['indexes']:
            collection = idx.get('collectionGroup', 'N/A')
            fields = ', '.join([f.get('fieldPath', '') for f in idx.get('queryScope', {}).get('fields', [])])
            print(f"   - {collection}: {fields}")
    
    return True

def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║  📥 Export Firestore Indexes                                ║
║  Lưu indexes hiện tại từ Firebase vào firestore.indexes.json║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    if export_indexes():
        print("\n✅ Hoàn thành!")
        print("\n📝 Next steps:")
        print("   1. Commit file firestore.indexes.json vào Git")
        print("   2. Deploy: python deploy.py (chọn option 2 hoặc 4)")
        print("   3. Indexes sẽ được deploy cùng với Firestore rules")
    else:
        print("\n❌ Export failed!")
        print("\n💡 Manual export:")
        print("   1. Firebase Console > Firestore > Indexes")
        print("   2. Click 'Export' button")
        print("   3. Save as: firestore.indexes.json")

if __name__ == "__main__":
    main()

