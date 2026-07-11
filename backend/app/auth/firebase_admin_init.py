import firebase_admin
from firebase_admin import credentials
from app.config import settings
import json

import os

def init_firebase_admin():
    if firebase_admin._apps:
        return  # already initialized

    try:
        # 1. Try env variable first (for Render/production)
        if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            return

        # 2. Try local file as fallback (for local development)
        local_cert_path = settings.FIREBASE_CREDENTIALS_PATH or os.path.join(os.path.dirname(__file__), "..", "..", "credentials", "firebase-admin.json")
        if os.path.exists(local_cert_path):
            cred = credentials.Certificate(local_cert_path)
            firebase_admin.initialize_app(cred)
            return
            
        import logging
        logging.getLogger("app").critical("FIREBASE_SERVICE_ACCOUNT_JSON not set and local cert not found. Firebase Admin not initialized. Authentication will fail.")
    except Exception as e:
        import logging
        logging.getLogger("app").critical(f"Failed to initialize Firebase Admin: {e}")
