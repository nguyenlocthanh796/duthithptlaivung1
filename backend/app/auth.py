"""
Firebase Auth integration for FastAPI.

We keep Firebase only for authentication (ID tokens), not for Firestore.
"""
import json
import os
from typing import Optional, Dict, Any

from fastapi import HTTPException, Header, status

import firebase_admin
from firebase_admin import credentials, auth

from app.config import settings


def _initialize_firebase_app() -> None:
    """Initialize firebase_admin App if not already initialized."""
    if firebase_admin._apps:
        return

    cred_obj = None

    credentials_path = settings.FIREBASE_CREDENTIALS_PATH
    if not os.path.isabs(credentials_path):
        if not os.path.exists(credentials_path):
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            candidate = os.path.join(backend_dir, credentials_path)
            if os.path.exists(candidate):
                credentials_path = candidate

    if os.path.exists(credentials_path):
        cred_obj = credentials.Certificate(credentials_path)
    elif os.getenv("FIREBASE_CREDENTIALS_JSON"):
        cred_obj = credentials.Certificate(
            json.loads(os.getenv("FIREBASE_CREDENTIALS_JSON"))
        )
    else:
        cred_obj = credentials.ApplicationDefault()

    firebase_admin.initialize_app(cred_obj)


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    FastAPI dependency: verify Firebase ID token from Authorization header.

    Frontend must send:
        Authorization: Bearer <ID_TOKEN>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = authorization.split(" ", 1)[1].strip()

    try:
        _initialize_firebase_app()
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )


