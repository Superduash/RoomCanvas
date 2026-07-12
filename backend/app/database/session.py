"""
session.py — SQLAlchemy engine and session configuration.
Tuned for SQLite with WAL mode and connection pooling.

Two engines are exposed:
- `engine` / `SessionLocal`           — request-scoped (StaticPool for SQLite)
- `bg_engine` / `BackgroundSessionLocal` — background-task-scoped (NullPool)

Background tasks MUST use BackgroundSessionLocal so they open a fresh
connection rather than sharing the StaticPool connection that the active
request session holds, which would otherwise deadlock.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

connect_args = {}
engine_kwargs: dict = {}
bg_engine_kwargs: dict = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # Use StaticPool for SQLite to reuse one connection for request sessions
    from sqlalchemy.pool import StaticPool, NullPool
    engine_kwargs["poolclass"] = StaticPool
    engine_kwargs["connect_args"] = connect_args
    # Background tasks use NullPool — new connection per session, no sharing
    bg_engine_kwargs["poolclass"] = NullPool
    bg_engine_kwargs["connect_args"] = connect_args
else:
    # For production Postgres: pool tuning
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["connect_args"] = connect_args
    bg_engine_kwargs["pool_size"] = 2
    bg_engine_kwargs["max_overflow"] = 5
    bg_engine_kwargs["pool_pre_ping"] = True
    bg_engine_kwargs["connect_args"] = connect_args

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    **engine_kwargs,
)

bg_engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    **bg_engine_kwargs,
)

# ── SQLite performance tuning (apply to both engines) ─────────────────────────
def _apply_sqlite_pragmas(eng):
    @event.listens_for(eng, "connect")
    def _set_pragmas(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-32000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()

if settings.DATABASE_URL.startswith("sqlite"):
    _apply_sqlite_pragmas(engine)
    _apply_sqlite_pragmas(bg_engine)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Session factory for background tasks — NullPool, no connection sharing
BackgroundSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=bg_engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
