#!/bin/bash
# Script test endpoint POST comments trên server
# Chạy script này trên server để kiểm tra endpoint

API_URL="https://tire-stick-she-boxed.trycloudflare.com"
POST_ID="bff659f5-8dc4-4aa1-8383-84fc236b1b11"

echo "=========================================="
echo "TEST ENDPOINT POST COMMENTS"
echo "=========================================="
echo ""

echo "1. Test POST comments (không có auth)..."
echo "   Mong đợi: Status 401 (Unauthorized)"
echo "   Thực tế:"
response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/posts/${POST_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test comment"}')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "   Status Code: $http_code"
echo "   Response: $body"
echo ""

if [ "$http_code" = "401" ]; then
    echo "   ✅ ĐÚNG! Endpoint trả về 401 (yêu cầu auth)"
    echo "   → Endpoint đã được deploy và hoạt động đúng!"
elif [ "$http_code" = "404" ]; then
    echo "   ❌ SAI! Endpoint trả về 404 (Not Found)"
    echo "   → Endpoint CHƯA được deploy hoặc backend CHƯA được restart!"
    echo ""
    echo "   Giải pháp:"
    echo "   1. Restart backend service:"
    echo "      sudo systemctl restart duthi-backend"
    echo ""
    echo "   2. Hoặc nếu dùng Docker:"
    echo "      docker-compose restart backend"
    echo ""
    echo "   3. Kiểm tra logs:"
    echo "      sudo journalctl -u duthi-backend -f"
else
    echo "   ⚠️  Status code không mong đợi: $http_code"
fi

echo ""
echo "=========================================="
echo "KẾT LUẬN"
echo "=========================================="
if [ "$http_code" = "401" ]; then
    echo "✅ Endpoint POST comments hoạt động đúng!"
    echo "   Frontend có thể gọi API với Firebase token."
elif [ "$http_code" = "404" ]; then
    echo "❌ Endpoint POST comments CHƯA hoạt động!"
    echo "   Cần restart backend để load endpoint mới."
else
    echo "⚠️  Cần kiểm tra thêm. Status code: $http_code"
fi

