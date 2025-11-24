"""
Cloudflare R2 Storage Client
S3-compatible API for file storage
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional
from uuid import uuid4

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from ..config import get_settings

logger = logging.getLogger(__name__)


class R2Client:
    """Cloudflare R2 Storage Client using S3-compatible API"""
    
    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        
        # R2 configuration
        self.account_id = settings.r2_account_id
        self.access_key_id = settings.r2_access_key_id
        self.secret_access_key = settings.r2_secret_access_key
        self.bucket_name = settings.r2_bucket_name
        self.public_url = settings.r2_public_url
        
        # Validate configuration
        if not all([self.account_id, self.access_key_id, self.secret_access_key, self.bucket_name]):
            raise ValueError(
                "R2 configuration incomplete. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, "
                "R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in environment variables."
            )
        
        # R2 endpoint URL format: https://<account_id>.r2.cloudflarestorage.com
        endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
        
        # Create S3 client with R2 endpoint
        self.s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(
                signature_version='s3v4',
                region_name='auto'  # R2 doesn't use regions
            )
        )
        
        logger.info(f"R2 client initialized. Bucket: {self.bucket_name}")
    
    def upload_file(self, file_path: Path, object_name: Optional[str] = None) -> str:
        """
        Upload a file to R2 and return the public URL.
        
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
            # Use UUID to avoid conflicts
            object_name = f"{uuid4()}-{file_path.name}"
        
        try:
            # Determine content type
            content_type, _ = self._get_content_type(file_path)
            
            logger.info(f"Uploading file to R2: {file_path.name} -> {object_name}")
            
            # Upload file
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                object_name,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'public-read'  # Make file publicly accessible
                }
            )
            
            logger.info(f"File uploaded successfully to R2: {object_name}")
            
            # Return public URL
            if self.public_url:
                # Use custom public URL if configured
                public_url = f"{self.public_url.rstrip('/')}/{object_name}"
            else:
                # Fallback to R2 public URL format
                public_url = f"https://{self.bucket_name}.r2.cloudflarestorage.com/{object_name}"
            
            return public_url
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"R2 upload error ({error_code}): {error_msg}")
            raise ValueError(f"Failed to upload file to R2: {error_msg}") from e
        except Exception as e:
            logger.error(f"Unexpected error uploading to R2: {e}", exc_info=True)
            raise ValueError(f"Unexpected error uploading to R2: {str(e)}") from e
    
    def delete_file(self, object_name: str) -> bool:
        """
        Delete a file from R2.
        
        Args:
            object_name: Name of the object to delete
        
        Returns:
            True if successful
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_name
            )
            logger.info(f"File deleted from R2: {object_name}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting file from R2: {e}")
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
_r2_client: Optional[R2Client] = None


def get_r2_client() -> R2Client:
    """Get or create R2 client instance"""
    global _r2_client  # noqa: PLW0603
    if _r2_client is None:
        _r2_client = R2Client()
    return _r2_client

