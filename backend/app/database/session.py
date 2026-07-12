from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event
from sqlalchemy.engine import Engine
import time
import logging
from app.config import settings

logger = logging.getLogger("app.database")

@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault("query_start_time", []).append(time.time())

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    start_time = conn.info["query_start_time"].pop(-1)
    total_time = (time.time() - start_time) * 1000
    if total_time > 500:
        logger.warning(f"Slow query ({total_time:.2f}ms): {statement}")

class Base(DeclarativeBase):
    pass

def _make_async_url(url: str) -> str:
    """
    Convert sync database URLs to async equivalents.
    For PostgreSQL with asyncpg, strip sslmode from query params 
    (asyncpg uses ssl=require instead, or handles it via connect_args).
    """
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if url.startswith("postgresql://"):
        # Replace driver and strip sslmode query parameter if present
        # asyncpg doesn't support sslmode in the URL
        async_url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if "?sslmode=" in async_url or "&sslmode=" in async_url:
            # Remove sslmode parameter from URL
            import re
            async_url = re.sub(r'[?&]sslmode=[^&]*', '', async_url)
            # Clean up any trailing ? or duplicate &&
            async_url = re.sub(r'\?&', '?', async_url)
            async_url = re.sub(r'\?$', '', async_url)
        return async_url
    return url

# Set up the engine
engine = create_async_engine(
    _make_async_url(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_pre_ping=True,
    # SQLite-specific: no pool size needed for local dev, but asyncpg for prod needs it
    **({} if "sqlite" in settings.DATABASE_URL else {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        # For PostgreSQL with asyncpg, SSL is enabled by default for remote connections
        # No need to explicitly set connect_args for SSL
    }),
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
