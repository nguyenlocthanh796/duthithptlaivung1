"""
Test script to verify local Firestore connection
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import db
from app.config import settings

def test_local_firestore():
    """Test local Firestore connection"""
    print("=" * 60)
    print("🔍 Testing Local Firestore Connection")
    print("=" * 60)
    
    print(f"\n📋 Configuration:")
    print(f"  - Project ID: {settings.FIREBASE_PROJECT_ID}")
    print(f"  - Credentials Path: {settings.FIREBASE_CREDENTIALS_PATH}")
    
    # Check if credentials file exists
    credentials_path = settings.FIREBASE_CREDENTIALS_PATH
    if not os.path.isabs(credentials_path):
        if not os.path.exists(credentials_path):
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            credentials_path = os.path.join(backend_dir, credentials_path)
    
    if os.path.exists(credentials_path):
        print(f"  ✅ Credentials file found: {credentials_path}")
    else:
        print(f"  ❌ Credentials file NOT found: {credentials_path}")
        return False
    
    print(f"\n🔌 Testing Database Connection...")
    try:
        # Test connection by getting a collection
        test_collection = db.get_collection("_test")
        print("  ✅ Firestore connection successful!")
        
        # Try to read a test document
        print(f"\n📊 Testing CRUD operations...")
        
        # Test create
        test_data = {
            "test": True,
            "timestamp": "2025-01-27T00:00:00",
            "source": "local_test"
        }
        doc_id = db.create("_test", test_data)
        print(f"  ✅ Create: Document created with ID: {doc_id}")
        
        # Test read
        doc = db.read("_test", doc_id)
        if doc:
            print(f"  ✅ Read: Document retrieved successfully")
            print(f"      Data: {doc}")
        else:
            print(f"  ❌ Read: Failed to retrieve document")
        
        # Test update
        update_data = {"test": False, "updated": True}
        if db.update("_test", doc_id, update_data):
            print(f"  ✅ Update: Document updated successfully")
        else:
            print(f"  ❌ Update: Failed to update document")
        
        # Test delete
        if db.delete("_test", doc_id):
            print(f"  ✅ Delete: Document deleted successfully")
        else:
            print(f"  ❌ Delete: Failed to delete document")
        
        print(f"\n✅ All tests passed! Local Firestore is working correctly.")
        return True
        
    except Exception as e:
        print(f"  ❌ Connection failed: {str(e)}")
        print(f"\n💡 Troubleshooting:")
        print(f"  1. Check if firebase-credentials.json is in the correct location")
        print(f"  2. Verify the service account has Firestore permissions")
        print(f"  3. Check if project_id matches: {settings.FIREBASE_PROJECT_ID}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_local_firestore()
    sys.exit(0 if success else 1)

