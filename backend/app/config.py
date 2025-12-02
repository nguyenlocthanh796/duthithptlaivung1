"""
Configuration settings for the backend application
"""
import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Firebase Configuration
    FIREBASE_PROJECT_ID: str = "gen-lang-client-0581370080"
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
    
    # API Configuration
    FASTAPI_HOST: str = "0.0.0.0"
    FASTAPI_PORT: int = 8000
    
    # CORS Configuration - can be string (comma-separated) or list
    # Default as string, will be parsed to list by validator
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:3000,https://gen-lang-client-0581370080.web.app,https://duthithptlaivung1.pages.dev"
    
    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from string (comma-separated) or list"""
        if isinstance(v, str):
            # Split by comma and strip whitespace
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
    # Gemini API (optional, for AI features)
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEYS: str = ""  # Comma-separated keys for rotation
    # Model mặc định cho các tác vụ text (chat Anh Thơ, phân tích bài đăng)
    # Có thể override bằng biến môi trường GEMINI_MODEL trên VM.
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    
    # Google Drive (optional)
    GOOGLE_DRIVE_FOLDER_ID: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

