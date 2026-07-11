import sqlite3
import os

db_path = os.path.join("storage", "interior_ai.db")
script_path = os.path.join("scripts", "migrate_add_users.sql")

with open(script_path, "r") as f:
    sql = f.read()

conn = sqlite3.connect(db_path)
try:
    conn.executescript(sql)
    print("Migration successful")
except Exception as e:
    print("Migration failed:", e)
finally:
    conn.close()
