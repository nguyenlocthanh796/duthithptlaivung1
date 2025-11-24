from functools import lru_cache
from typing import List

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    fastapi_host: str = Field("0.0.0.0", alias="FASTAPI_HOST")
    fastapi_port: int = Field(8000, alias="FASTAPI_PORT")
    # Gemini API configuration - support multiple keys for quota optimization
    gemini_api_key: str = Field("", alias="GEMINI_API_KEY")
    gemini_api_keys: str = Field("", alias="GEMINI_API_KEYS")  # Multiple keys separated by comma
    google_drive_api_key: str = Field("", alias="GOOGLE_DRIVE_API_KEY")  # Set in .env file
    google_service_account_file: str = Field("credentials.json", alias="GOOGLE_SERVICE_ACCOUNT_FILE")
    google_drive_folder_id: str = Field("", alias="GOOGLE_DRIVE_FOLDER_ID")
    # Cloudflare R2 configuration (recommended alternative to Google Drive)
    r2_account_id: str = Field("", alias="R2_ACCOUNT_ID")
    r2_access_key_id: str = Field("", alias="R2_ACCESS_KEY_ID")
    r2_secret_access_key: str = Field("", alias="R2_SECRET_ACCESS_KEY")
    r2_bucket_name: str = Field("", alias="R2_BUCKET_NAME")
    r2_public_url: str = Field("", alias="R2_PUBLIC_URL")  # Custom public URL from R2 bucket settings
    # Google Cloud Storage configuration
    gcs_project_id: str = Field("", alias="GCS_PROJECT_ID")
    gcs_bucket_name: str = Field("", alias="GCS_BUCKET_NAME")
    gcs_credentials_path: str = Field("", alias="GCS_CREDENTIALS_PATH")  # Path to service account JSON file
    gcs_credentials_json: str = Field("", alias="GCS_CREDENTIALS_JSON")  # Service account JSON as string (for Cloud Run)
    firebase_project_id: str = Field("gen-lang-client-0581370080", alias="FIREBASE_PROJECT_ID")
    allowed_origins: str = Field("http://localhost:5173", alias="ALLOWED_ORIGINS")

    def get_allowed_origins_list(self) -> List[str]:
        """Parse allowed_origins string to list."""
        if isinstance(self.allowed_origins, str):
            return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]
        if isinstance(self.allowed_origins, list):
            return self.allowed_origins
        return ["http://localhost:5173"]

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # Ignore extra fields in .env (for backward compatibility)
    }


class LMCompletionRequest(BaseModel):
    prompt: str
    temperature: float = 0.7
    max_tokens: int = 512


@lru_cache
def get_settings() -> Settings:
    return Settings()
