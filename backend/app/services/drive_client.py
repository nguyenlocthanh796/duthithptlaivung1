from __future__ import annotations

import logging
import mimetypes
from pathlib import Path
from typing import Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from ..config import get_settings

logger = logging.getLogger(__name__)


class GoogleDriveClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        credentials_path = Path(settings.google_service_account_file)
        
        # Check if credentials file exists
        if not credentials_path.exists():
            # Try relative path from backend directory
            backend_dir = Path(__file__).parent.parent.parent
            credentials_path = backend_dir / settings.google_service_account_file
            if not credentials_path.exists():
                raise FileNotFoundError(
                    f"Google service account credentials not found at: {settings.google_service_account_file}. "
                    "Please ensure credentials.json is in the backend directory."
                )

        try:
            # Use broader scope to access shared folders
            scopes = [
                "https://www.googleapis.com/auth/drive.file",
                "https://www.googleapis.com/auth/drive"
            ]
            creds = service_account.Credentials.from_service_account_file(
                str(credentials_path), scopes=scopes
            )
            self.drive_service = build("drive", "v3", credentials=creds)
            service_account_email = creds.service_account_email
            logger.info(f"Google Drive client initialized successfully. Service Account: {service_account_email}")
        except Exception as e:
            logger.error(f"Failed to initialize Google Drive client: {e}")
            raise

    def upload_file(self, file_path: Path, parent_folder_id: Optional[str] = None) -> str:
        """
        Upload a file to Google Drive and return the shareable web view link.
        
        IMPORTANT: The folder must be shared with the Service Account email with "Editor" permission.
        Service Accounts don't have their own storage quota - they must upload to user-owned folders.
        
        Args:
            file_path: Path to the file to upload
            parent_folder_id: Optional folder ID to upload to (must be a folder owned by a real user, shared with Service Account)
            
        Returns:
            Web view link to the uploaded file
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        try:
            # Determine MIME type
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not mime_type:
                # Default MIME types for common extensions
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
            
            logger.info(f"Uploading file: {file_path.name} (MIME: {mime_type})")
            
            # Prepare file metadata
            body = {"name": file_path.name}
            
            # Use folder ID from config if available, otherwise use provided parent_folder_id
            folder_id = parent_folder_id or (self.settings.google_drive_folder_id if self.settings.google_drive_folder_id else None)
            
            # Create media upload object
            media = MediaFileUpload(str(file_path), mimetype=mime_type, resumable=True)
            
            if folder_id:
                # Try uploading directly to folder first
                body["parents"] = [folder_id]
                logger.info(f"Uploading to folder ID: {folder_id}")
                
                try:
                    # Upload file with supportsAllDrives to handle shared folders
                    uploaded = (
                        self.drive_service.files()
                        .create(
                            body=body, 
                            media_body=media, 
                            fields="id, webViewLink, name, parents",
                            supportsAllDrives=True,
                            enforceSingleParent=False
                        )
                        .execute()
                    )
                    file_id = uploaded["id"]
                    logger.info(f"File uploaded successfully. File ID: {file_id}")
                except Exception as direct_upload_error:
                    error_msg = str(direct_upload_error)
                    # Get service account email for error message
                    service_account_email = None
                    try:
                        service_account_email = self.drive_service._http.credentials.service_account_email
                    except:
                        pass
                    
                    # If direct upload fails with quota error, raise with helpful message
                    if "storageQuotaExceeded" in error_msg or "storage quota" in error_msg.lower():
                        logger.warning("Direct upload to folder failed with quota error")
                        logger.warning("This usually means Google hasn't synced permissions yet")
                        logger.warning("Please wait 10-15 minutes after sharing the folder and try again")
                        # Re-raise with user-friendly message
                        raise ValueError(
                            "Service Account không có storage quota riêng. "
                            "Vui lòng upload vào folder của user thật (không phải Service Account).\n"
                            "Cách sửa:\n"
                            "1. Tạo folder trong Google Drive của bạn (user thật)\n"
                            "2. Chia sẻ folder với Service Account email với quyền 'Editor'\n"
                            "3. Lấy Folder ID từ URL và cấu hình GOOGLE_DRIVE_FOLDER_ID trong .env\n"
                            "4. Đợi 10-15 phút để Google sync permissions\n"
                            f"Service Account email: {service_account_email or 'Check logs'}\n"
                            f"Folder ID: {folder_id}"
                        ) from direct_upload_error
                    else:
                        raise  # Re-raise if it's not a quota error
            else:
                logger.warning("No folder ID specified. File will be uploaded to Service Account's root (may fail due to quota)")
                uploaded = (
                    self.drive_service.files()
                    .create(
                        body=body, 
                        media_body=media, 
                        fields="id, webViewLink, name",
                        supportsAllDrives=True
                    )
                    .execute()
                )
                file_id = uploaded["id"]
                logger.info(f"File uploaded successfully. File ID: {file_id}")
            
            # Make file publicly readable
            try:
                self.drive_service.permissions().create(
                    fileId=file_id,
                    body={"role": "reader", "type": "anyone"},
                    supportsAllDrives=True
                ).execute()
                logger.info(f"File permissions set to public read")
            except Exception as perm_error:
                logger.warning(f"Failed to set public permissions: {perm_error}")
                # Continue even if permission setting fails
            
            web_view_link = uploaded.get("webViewLink")
            if not web_view_link:
                # Fallback: construct link from file ID
                web_view_link = f"https://drive.google.com/file/d/{file_id}/view"
            
            return web_view_link
            
        except Exception as e:
            error_msg = str(e)
            service_account_email = None
            try:
                service_account_email = self.drive_service._http.credentials.service_account_email
            except:
                pass
            
            if "storageQuotaExceeded" in error_msg or "storage quota" in error_msg.lower():
                raise ValueError(
                    "Service Account không có storage quota riêng. "
                    "Vui lòng upload vào folder của user thật (không phải Service Account).\n"
                    "Cách sửa:\n"
                    "1. Tạo folder trong Google Drive của bạn (user thật)\n"
                    "2. Chia sẻ folder với Service Account email với quyền 'Editor'\n"
                    "3. Lấy Folder ID từ URL và cấu hình GOOGLE_DRIVE_FOLDER_ID trong .env\n"
                    f"Service Account email: {service_account_email or 'Check logs'}"
                ) from e
            elif "404" in error_msg or "not found" in error_msg.lower():
                raise ValueError(
                    f"Không thể upload vào folder {folder_id}. "
                    "Có thể folder không tồn tại hoặc Service Account chưa có quyền.\n"
                    "Cách sửa:\n"
                    f"1. Kiểm tra Folder ID có đúng không: {folder_id}\n"
                    f"2. Chia sẻ folder với Service Account: {service_account_email or 'Check logs'}\n"
                    "3. Cấp quyền 'Người chỉnh sửa' (Editor)\n"
                    "4. Đợi 2-3 phút để Google sync permissions\n"
                    "5. Kiểm tra folder phải là của user thật, không phải Service Account"
                ) from e
            elif "permission" in error_msg.lower() or "forbidden" in error_msg.lower():
                raise ValueError(
                    f"Service Account không có quyền upload vào folder {folder_id}.\n"
                    "Cách sửa:\n"
                    f"1. Chia sẻ folder với: {service_account_email or 'Check logs'}\n"
                    "2. Cấp quyền 'Người chỉnh sửa' (Editor), không phải 'Người xem'\n"
                    "3. Đợi 2-3 phút để Google sync"
                ) from e
            else:
                logger.error(f"Error uploading file to Google Drive: {e}", exc_info=True)
                raise ValueError(
                    f"Lỗi khi upload file: {str(e)[:200]}\n"
                    f"Service Account: {service_account_email or 'Check logs'}\n"
                    f"Folder ID: {folder_id or 'Not specified'}"
                ) from e


_drive_client: Optional[GoogleDriveClient] = None


def get_drive_client() -> GoogleDriveClient:
    global _drive_client  # noqa: PLW0603
    if _drive_client is None:
        _drive_client = GoogleDriveClient()
    return _drive_client
