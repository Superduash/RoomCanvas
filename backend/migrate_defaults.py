import sqlite3
import os

db_path = 'storage/interior_ai.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET active_text_provider = 'gemini' WHERE active_text_provider IS NULL")
    cursor.execute("UPDATE users SET active_image_provider = 'replicate' WHERE active_image_provider IS NULL")
    conn.commit()
    conn.close()
    print("Database updated successfully.")
else:
    print("Database file not found.")
