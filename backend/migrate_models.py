import asyncio
import logging
from sqlalchemy import text
from app.database.session import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate():
    async with engine.begin() as conn:
        try:
            logger.info("Attempting to rename preferred_model to preferred_text_model...")
            await conn.execute(text("ALTER TABLE user_api_keys RENAME COLUMN preferred_model TO preferred_text_model;"))
        except Exception as e:
            logger.info(f"Could not rename (maybe already renamed or column missing): {e}")

        try:
            logger.info("Attempting to add preferred_image_model...")
            await conn.execute(text("ALTER TABLE user_api_keys ADD COLUMN preferred_image_model VARCHAR;"))
        except Exception as e:
            logger.info(f"Could not add column (maybe already exists): {e}")
            
    logger.info("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
