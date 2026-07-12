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
        except json.JSONDecodeError as e:
            logger.error(f"FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: {e}. Firebase Admin NOT initialized.")
            return
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin from FIREBASE_SERVICE_ACCOUNT_JSON: {e}. Firebase Admin NOT initialized.")
            return

    # 2. Try local file as fallback (for local development)
    local_cert_path = settings.FIREBASE_CREDENTIALS_PATH or os.path.join(
        os.path.dirname(__file__), "..", "..", "credentials", "firebase-admin.json"
    )
    if os.path.exists(local_cert_path):
        try:
            cred = credentials.Certificate(local_cert_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin successfully initialized from local file: {local_cert_path}")
            return
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin from local file ({local_cert_path}): {e}. Firebase Admin NOT initialized.")
            return

    logger.error(
        "Firebase Admin NOT initialized: FIREBASE_SERVICE_ACCOUNT_JSON env var is not set and no local "
        "credentials file was found. All authenticated API requests will return 503. "
        "Set FIREBASE_SERVICE_ACCOUNT_JSON in your Render environment variables to fix this."
    )


def is_firebase_available() -> bool:
    return len(firebase_admin._apps) > 0
