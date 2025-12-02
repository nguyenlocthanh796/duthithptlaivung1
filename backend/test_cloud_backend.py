"""
Test script to verify connection to Cloud Backend (Cloud Run)
"""
import requests
import json
from datetime import datetime

# Backend URLs
BACKEND_URL = "https://duthi-backend-626004693464.us-central1.run.app"
LOCAL_URL = "http://localhost:8000"

def test_endpoint(url, endpoint, method="GET", data=None):
    """Test an API endpoint"""
    full_url = f"{url}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(full_url, timeout=10)
        elif method == "POST":
            response = requests.post(full_url, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(full_url, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(full_url, timeout=10)
        
        return {
            "success": response.status_code < 400,
            "status_code": response.status_code,
            "data": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text,
            "url": full_url
        }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Request timeout",
            "url": full_url
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "Connection error - Server may be down or unreachable",
            "url": full_url
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "url": full_url,
            "status_code": getattr(e.response, 'status_code', None) if hasattr(e, 'response') else None
        }

def test_backend(url, name):
    """Test all endpoints of a backend"""
    print(f"\n{'='*60}")
    print(f"🧪 Testing {name}")
    print(f"📍 URL: {url}")
    print(f"{'='*60}\n")
    
    results = []
    
    # Test 1: Root endpoint
    print("1️⃣  Testing Root Endpoint (/)...")
    result = test_endpoint(url, "/")
    results.append(("Root", result))
    if result.get("success"):
        print(f"   ✅ Status: {result['status_code']}")
        print(f"   📄 Response: {json.dumps(result.get('data', {}), indent=2)}")
    else:
        print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
    
    # Test 2: Health check
    print("\n2️⃣  Testing Health Check (/health)...")
    result = test_endpoint(url, "/health")
    results.append(("Health", result))
    if result.get("success"):
        print(f"   ✅ Status: {result['status_code']}")
        print(f"   📄 Response: {json.dumps(result.get('data', {}), indent=2)}")
    else:
        print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
    
    # Test 3: API Docs
    print("\n3️⃣  Testing API Documentation (/docs)...")
    result = test_endpoint(url, "/docs")
    results.append(("Docs", result))
    if result.get("success"):
        print(f"   ✅ Status: {result['status_code']} (Swagger UI available)")
    else:
        print(f"   ⚠️  Status: {result.get('status_code', 'N/A')} (May not be accessible via script)")
    
    # Test 4: Test collection operations (if health check passed)
    health_result = next((r for name, r in results if name == "Health"), None)
    if health_result and health_result.get("success"):
        print("\n4️⃣  Testing Collection Operations...")
        
        # Test GET collection
        test_collection = "_test_connection"
        print(f"   📂 Testing GET /api/collections/{test_collection}...")
        result = test_endpoint(url, f"/api/collections/{test_collection}")
        results.append(("Get Collection", result))
        if result.get("success"):
            print(f"      ✅ Status: {result['status_code']}")
            if result.get('data'):
                print(f"      📄 Response: {json.dumps(result.get('data', {}), indent=6)}")
        else:
            error_msg = result.get('error', 'Unknown error')
            status_code = result.get('status_code', 'N/A')
            print(f"      ❌ Failed: {error_msg}")
            if status_code:
                print(f"      📊 Status Code: {status_code}")
            if result.get('data'):
                print(f"      📄 Response: {result.get('data')}")
        
        # Test CREATE document
        print(f"   📝 Testing POST /api/collections/{test_collection}...")
        test_data = {
            "data": {
                "test": True,
                "timestamp": datetime.now().isoformat(),
                "source": "connection_test"
            }
        }
        result = test_endpoint(url, f"/api/collections/{test_collection}", method="POST", data=test_data)
        results.append(("Create Document", result))
        if result.get("success"):
            print(f"      ✅ Status: {result['status_code']}")
            doc_id = result.get('data', {}).get('id', 'N/A')
            print(f"      📄 Document ID: {doc_id}")
            
            # Test READ document
            if doc_id and doc_id != 'N/A':
                print(f"   📖 Testing GET /api/collections/{test_collection}/{doc_id}...")
                result = test_endpoint(url, f"/api/collections/{test_collection}/{doc_id}")
                results.append(("Read Document", result))
                if result.get("success"):
                    print(f"      ✅ Status: {result['status_code']}")
                else:
                    print(f"      ❌ Failed: {result.get('error', 'Unknown error')}")
                
                # Test DELETE document
                print(f"   🗑️  Testing DELETE /api/collections/{test_collection}/{doc_id}...")
                result = test_endpoint(url, f"/api/collections/{test_collection}/{doc_id}", method="DELETE")
                results.append(("Delete Document", result))
                if result.get("success"):
                    print(f"      ✅ Status: {result['status_code']}")
                else:
                    print(f"      ❌ Failed: {result.get('error', 'Unknown error')}")
        else:
            error_msg = result.get('error', 'Unknown error')
            status_code = result.get('status_code', 'N/A')
            print(f"      ❌ Failed: {error_msg}")
            if status_code:
                print(f"      📊 Status Code: {status_code}")
            if result.get('data'):
                print(f"      📄 Response: {result.get('data')}")
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 Test Summary")
    print(f"{'='*60}")
    
    passed = sum(1 for _, r in results if r.get("success"))
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result.get("success") else "❌ FAIL"
        error = f" - {result.get('error')}" if not result.get("success") and result.get("error") else ""
        print(f"  {status} {name}{error}")
    
    print(f"\n📈 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print(f"\n🎉 All tests passed! {name} is working correctly.")
        return True
    else:
        print(f"\n⚠️  Some tests failed. Check the errors above.")
        return False

def main():
    """Main test function"""
    print("="*60)
    print("🚀 Backend Connection Test")
    print("="*60)
    print(f"⏰ Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Test Cloud Backend
    cloud_success = test_backend(BACKEND_URL, "Cloud Backend (Production)")
    
    # Test Local Backend (optional)
    print("\n" + "="*60)
    print("💡 Tip: To test local backend, run:")
    print("   python start.py")
    print("   Then run this script again to test localhost:8000")
    print("="*60)
    
    return cloud_success

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)

