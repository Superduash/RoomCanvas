"""
session.py — SQLAlchemy engine and session configuration.
Tuned for SQLite with WAL mode and connection pooling.
"""
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

connect_args = {}
engine_kwargs: dict = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # Use StaticPool for SQLite to reuse one connection (avoids WAL file lock issues)
    # and dramatically speeds up repeated reads in a single-user demo context.
    from sqlalchemy.pool import StaticPool
    engine_kwargs["poolclass"] = StaticPool
    engine_kwargs["connect_args"] = connect_args
else:
    # For production Postgres: pool tuning
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["connect_args"] = connect_args

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    **engine_kwargs,
)

# ── SQLite performance tuning ──────────────────────────────────────────────────
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        # WAL mode allows concurrent reads while a write is in progress.
        cursor.execute("PRAGMA journal_mode=WAL")
        # Relaxed durability — acceptable for a demo; removes fsync calls.
        cursor.execute("PRAGMA synchronous=NORMAL")
        # 32MB page cache in memory for fast repeated reads.
        cursor.execute("PRAGMA cache_size=-32000")
        # Keep temporary tables in memory.
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
