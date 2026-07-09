import sqlite3
conn = sqlite3.connect('storage/interior_ai.db')
print(conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='generations'").fetchone()[0])
