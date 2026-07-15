import sqlite3
import os

db_path = "storage/interior_ai.db"
if not os.path.exists(db_path):
    print("Database not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("Tables:", cur.fetchall())

try:
    cur.execute("ALTER TABLE user_api_keys RENAME COLUMN preferred_model TO preferred_text_model;")
    print("Renamed preferred_model to preferred_text_model")
except Exception as e:
    print("Rename failed:", e)

try:
    cur.execute("ALTER TABLE user_api_keys ADD COLUMN preferred_image_model VARCHAR;")
    print("Added preferred_image_model")
except Exception as e:
    print("Add column failed:", e)

conn.commit()
conn.close()
