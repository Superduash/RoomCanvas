from abc import ABC, abstractmethod
from PIL import Image, ImageFilter
from pathlib import Path
import uuid
import logging

logger = logging.getLogger(__name__)

class MlsdService(ABC):
    @abstractmethod
    def extract_structure(self, image: Image.Image, save_dir: str) -> str:
        """Extract structural line map from a room image. Returns the saved file path."""
        pass

class MockMlsdService(MlsdService):
    """
    Mock implementation: applies a real, simple edge-detection filter
    (PIL's ImageFilter.FIND_EDGES) to the input image and saves it.
    This is NOT the real MLSD model, but it produces a genuinely
    structure-derived image today, not a fake placeholder.
    """
    def extract_structure(self, image: Image.Image, save_dir: str) -> str:
        logger.info("Mocking MLSD structure extraction using PIL FIND_EDGES filter.")
        
        # Ensure target directory exists
        dest_dir = Path(save_dir)
        dest_dir.mkdir(parents=True, exist_ok=True)
        
        # Process image: grayscale -> edge detection
        gray_image = image.convert("L")
        edge_image = gray_image.filter(ImageFilter.FIND_EDGES)
        
        # Save structural image
        filename = f"mlsd_{uuid.uuid4()}.png"
        dest_path = dest_dir / filename
        edge_image.save(dest_path)
        
        logger.info(f"Saved structural edge map to: {dest_path}")
        return dest_path.as_posix()
