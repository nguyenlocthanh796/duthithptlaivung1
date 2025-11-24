import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import health, lm, files, questions, ai_tutor

# Optimize logging for production (e2-micro)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

settings = get_settings()

# Optimize FastAPI for e2-micro (1GB RAM)
app = FastAPI(
    title="DuThi THPT Platform API",
    version="0.1.0",
    docs_url="/docs" if settings.fastapi_host == "0.0.0.0" else None,  # Disable docs in production
    redoc_url=None
)

# CORS configuration
allowed_origins = settings.get_allowed_origins_list()
# Ensure localhost variants are always included
localhost_origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
# Add Firebase Hosting URL for production
firebase_hosting_origins = ["https://gen-lang-client-0581370080.web.app", "https://gen-lang-client-0581370080.firebaseapp.com"]
all_origins = list(set(allowed_origins + localhost_origins + firebase_hosting_origins))  # Remove duplicates
logger.info(f"CORS allowed origins: {all_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

app.include_router(health.router)
app.include_router(lm.router, prefix="/ai", tags=["lm"])
app.include_router(ai_tutor.router, prefix="/ai", tags=["ai-tutor"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(questions.router, prefix="/questions", tags=["questions"])


@app.get("/", tags=["root"])
async def root():
    return {"message": "API is running"}
