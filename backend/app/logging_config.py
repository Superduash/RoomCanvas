import logging
import sys
from app.config import settings

def setup_logging():
    # Clear any existing handlers
    logging.root.handlers = []
    
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Setup root logger formatting
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Optional: silence noisy third-party loggers
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

# Setup logging immediately on import
setup_logging()
logger = logging.getLogger("app")
logger.info("Logging configured successfully.")
