import firebase_admin
from firebase_admin import credentials
from app.config import settings
import json

def init_firebase_admin():
    if firebase_admin._apps:
        return  # already initialized

    if not settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        print("Warning: FIREBASE_SERVICE_ACCOUNT_JSON not set. Firebase Admin not initialized.")
        return

    try:
        cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Failed to initialize Firebase Admin: {e}")
