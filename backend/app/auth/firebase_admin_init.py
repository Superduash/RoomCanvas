import firebase_admin
from firebase_admin import credentials
from app.config import settings
import json
import os
from app.logging_config import logger

def init_firebase_admin():
    if firebase_admin._apps:
        return  # already initialized

    # 1. Try env variable first (for Render/production)
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        try:
            cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin successfully initialized from FIREBASE_SERVICE_ACCOUNT_JSON env variable.")
            return
        except Exception:
            logger.warning("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON or initialize Firebase.")
            return

    # 2. Try local file as fallback (for local development)
    local_cert_path = settings.FIREBASE_CREDENTIALS_PATH or os.path.join(os.path.dirname(__file__), "..", "..", "credentials", "firebase-admin.json")
    if os.path.exists(local_cert_path):
        try:
            cred = credentials.Certificate(local_cert_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin successfully initialized from local file: {local_cert_path}")
            return
        except Exception:
            logger.warning(f"Failed to initialize Firebase from local file ({local_cert_path}).")
            return
        
    logger.warning("FIREBASE_SERVICE_ACCOUNT_JSON not set and local cert not found. Firebase Admin is not initialized. Authentication will be unavailable.")

def is_firebase_available() -> bool:
    return len(firebase_admin._apps) > 0

