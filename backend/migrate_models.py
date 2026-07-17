import sqlite3
from app.config import settings
import os

def run():
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE user_api_keys SET preferred_image_model = 'gemini-3.1-flash-image'
        WHERE provider = 'gemini' AND preferred_image_model = 'nano-banana-2';
    """)
    cursor.execute("""
        UPDATE user_api_keys SET preferred_image_model = 'gemini-2.5-flash-image'
        WHERE provider = 'gemini' AND preferred_image_model = 'nano-banana';
    """)
    cursor.execute("""
        UPDATE user_api_keys SET preferred_image_model = 'gemini-3-pro-image-preview'
        WHERE provider = 'gemini' AND (preferred_image_model = 'nano-banana-pro' OR preferred_image_model = 'nano-banana-2-lite');
    """)
    
    conn.commit()
    conn.close()
    print('DB Migration Complete')

run()
