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
    
    # Firebase Password Hash Config (for user import)
    # Lưu ý: Không hardcode, dùng environment variables
    FIREBASE_SIGNER_KEY: str = os.getenv("FIREBASE_SIGNER_KEY", "")
    FIREBASE_SALT_SEPARATOR: str = os.getenv("FIREBASE_SALT_SEPARATOR", "Bw==")
    FIREBASE_ROUNDS: int = int(os.getenv("FIREBASE_ROUNDS", "8"))
    FIREBASE_MEM_COST: int = int(os.getenv("FIREBASE_MEM_COST", "14"))
    
    @property
    def firebase_hash_config(self) -> dict:
        """Get Firebase password hash config"""
        if not self.FIREBASE_SIGNER_KEY:
            return {}
        return {
            "algorithm": "SCRYPT",
            "base64_signer_key": self.FIREBASE_SIGNER_KEY,
            "base64_salt_separator": self.FIREBASE_SALT_SEPARATOR,
            "rounds": self.FIREBASE_ROUNDS,
            "mem_cost": self.FIREBASE_MEM_COST,
        }
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

