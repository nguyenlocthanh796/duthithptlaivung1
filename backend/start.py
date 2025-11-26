#!/usr/bin/env python3
"""Script to start FastAPI backend server.
Optimized for production (e2-micro): 2 workers, no reload."""
import os
import uvicorn

if __name__ == "__main__":
    # On Windows, multiprocessing workers can cause issues, default to development mode
    # On Linux/Cloud Run, use production mode with workers
    import platform
    is_windows = platform.system() == "Windows"
    
    # Production mode: no reload, 2 workers for e2-micro (1GB RAM)
    # But on Windows, default to development mode (workers don't work well)
    env_mode = os.getenv("ENV", "development" if is_windows else "production")
    is_dev = env_mode == "development"
    
    # Uvicorn doesn't support workers with reload=True
    # Use workers only in production mode and on non-Windows systems
    if is_dev or is_windows:
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

