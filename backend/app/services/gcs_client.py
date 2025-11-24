"""
Google Cloud Storage Client
S3-compatible API for file storage
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional
from uuid import uuid4

from google.cloud import storage
from google.oauth2 import service_account

from ..config import get_settings

logger = logging.getLogger(__name__)


class GCSClient:
    """Google Cloud Storage Client"""
    
    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        
        # GCS configuration
        self.project_id = settings.gcs_project_id
        self.bucket_name = settings.gcs_bucket_name
        self.credentials_path = getattr(settings, 'gcs_credentials_path', None)
        self.credentials_json = getattr(settings, 'gcs_credentials_json', None)
        
        # Validate configuration
        if not all([self.project_id, self.bucket_name]):
            raise ValueError(
                "GCS configuration incomplete. Please set GCS_PROJECT_ID and GCS_BUCKET_NAME "
                "in environment variables."
            )
        
        # Initialize credentials
        credentials = None
        if self.credentials_json:
            try:
                # Try to parse JSON string
                creds_dict = json.loads(self.credentials_json) if isinstance(self.credentials_json, str) else self.credentials_json
                credentials = service_account.Credentials.from_service_account_info(creds_dict)
                logger.info("GCS credentials loaded from JSON string")
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse GCS credentials JSON: {e}")
        
        if not credentials and self.credentials_path:
            try:
                credentials_path = Path(self.credentials_path)
                if not credentials_path.exists():
                    # Try relative path from backend directory
                    backend_dir = Path(__file__).parent.parent.parent
                    credentials_path = backend_dir / self.credentials_path
                
                if credentials_path.exists():
                    credentials = service_account.Credentials.from_service_account_file(
                        str(credentials_path)
                    )
                    logger.info(f"GCS credentials loaded from file: {credentials_path}")
                else:
                    raise FileNotFoundError(f"GCS credentials file not found: {self.credentials_path}")
            except Exception as e:
                logger.warning(f"Failed to load GCS credentials from file: {e}")
        
        if not credentials:
            # Try to use default credentials (for Cloud Run with Workload Identity)
            try:
                self.storage_client = storage.Client(project=self.project_id)
                logger.info("GCS client initialized with default credentials (Workload Identity)")
            except Exception as e:
                raise ValueError(
                    "GCS credentials not found. Please set GCS_CREDENTIALS_PATH or "
                    f"GCS_CREDENTIALS_JSON. Error: {e}"
                )
        else:
            self.storage_client = storage.Client(
                project=self.project_id,
                credentials=credentials
            )
            logger.info(f"GCS client initialized. Project: {self.project_id}, Bucket: {self.bucket_name}")
    
    def upload_file(self, file_path: Path, object_name: Optional[str] = None) -> str:
        """
        Upload a file to GCS and return the public URL.
        
        Args:
            file_path: Path to the file to upload
            object_name: Optional custom object name (default: uuid-filename)
        
        Returns:
            Public URL to the uploaded file
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Generate object name if not provided
        if not object_name:
            object_name = f"{uuid4()}-{file_path.name}"
        
        try:
            # Get bucket
            bucket = self.storage_client.bucket(self.bucket_name)
            
            # Determine content type
            content_type, _ = self._get_content_type(file_path)
            
            logger.info(f"Uploading file to GCS: {file_path.name} -> {object_name}")
            
            # Upload file
            blob = bucket.blob(object_name)
            blob.upload_from_filename(str(file_path), content_type=content_type)
            
            # Make public (if bucket has uniform access control)
            # Note: If bucket uses fine-grained access, you need to set permissions per object
            try:
                blob.make_public()
            except Exception as e:
                logger.warning(f"Could not make blob public (may already be public or bucket uses fine-grained access): {e}")
            
            logger.info(f"File uploaded successfully to GCS: {object_name}")
            
            # Return public URL
            public_url = blob.public_url
            return public_url
            
        except Exception as e:
            logger.error(f"Error uploading file to GCS: {e}", exc_info=True)
            raise ValueError(f"Failed to upload file to GCS: {str(e)}") from e
    
    def delete_file(self, object_name: str) -> bool:
        """
        Delete a file from GCS.
        
        Args:
            object_name: Name of the object to delete
        
        Returns:
            True if successful
        """
        try:
            bucket = self.storage_client.bucket(self.bucket_name)
            blob = bucket.blob(object_name)
            blob.delete()
            logger.info(f"File deleted from GCS: {object_name}")
            return True
        except Exception as e:
            logger.error(f"Error deleting file from GCS: {e}")
            return False
    
    def _get_content_type(self, file_path: Path) -> tuple[str, Optional[str]]:
        """Get content type for file"""
        import mimetypes
        mime_type, encoding = mimetypes.guess_type(str(file_path))
        
        if not mime_type:
            # Default MIME types
            ext = file_path.suffix.lower()
            mime_map = {
                ".pdf": "application/pdf",
                ".doc": "application/msword",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
                ".gif": "image/gif",
            }
            mime_type = mime_map.get(ext, "application/octet-stream")
        
        return mime_type, encoding


# Singleton instance
_gcs_client: Optional[GCSClient] = None


def get_gcs_client() -> GCSClient:
    """Get or create GCS client instance"""
    global _gcs_client  # noqa: PLW0603
    if _gcs_client is None:
        _gcs_client = GCSClient()
    return _gcs_client

