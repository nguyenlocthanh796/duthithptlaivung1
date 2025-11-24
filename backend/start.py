#!/usr/bin/env python3
"""Script to start FastAPI backend server.
Optimized for production (e2-micro): 2 workers, no reload."""
import os
import uvicorn

if __name__ == "__main__":
    # Production mode: no reload, 2 workers for e2-micro (1GB RAM)
    is_dev = os.getenv("ENV", "production") == "development"
    
    # Uvicorn doesn't support workers with reload=True
    # Use workers only in production mode
    if is_dev:
        # Development mode: single worker with reload
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
        )
    else:
        # Production mode: 2 workers, no reload (optimized for e2-micro)
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            workers=2,
            log_level="info",
        )

