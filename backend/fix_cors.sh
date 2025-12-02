#!/bin/bash
# Script để fix CORS trên VM
# Chạy script này trên VM

cat > /tmp/main_cors_fix.py << 'EOF'
# CORS Middleware - Cho phép tất cả origins trong development
import os
is_dev = os.getenv("ENV", "development") == "development"

# Nếu dev mode, cho phép tất cả origins (không dùng credentials)
# Nếu production, dùng ALLOWED_ORIGINS từ config
if is_dev:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Cho phép tất cả trong dev
        allow_credentials=False,  # Phải False khi dùng ["*"]
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
EOF

echo "Script đã tạo. Bạn cần sửa file main.py trên VM thủ công."

