from abc import ABC, abstractmethod
from PIL import Image
import hashlib
import logging

logger = logging.getLogger(__name__)

class ClipService(ABC):
    @abstractmethod
    def classify_room(self, image: Image.Image) -> tuple[str, float]:
        """Returns (room_type, confidence) where room_type is one of the 5 known labels."""
        pass

class MockClipService(ClipService):
    """
    Mock implementation: deterministically derives a room_type and confidence
    from a hash of the image bytes, so the SAME image always returns the SAME
    classification during testing (never pure random.random()). Confidence is
    generated in a realistic 0.55–0.97 range, not always exactly 1.0.
    """
    ROOM_LABELS = ["bedroom", "living_room", "kitchen", "office", "dining_room"]

    def classify_room(self, image: Image.Image) -> tuple[str, float]:
        logger.info("Mocking room classification using image byte hashing.")
        
        try:
            # Resize image to a tiny representation to speed up hashing and normalize slight variations
            resized_img = image.resize((32, 32))
            img_bytes = resized_img.tobytes()
            
            # Generate deterministic hash
            hasher = hashlib.md5(img_bytes)
            hash_val = int(hasher.hexdigest(), 16)
            
            # Map hash to index
            label_index = hash_val % len(self.ROOM_LABELS)
            room_type = self.ROOM_LABELS[label_index]
            
            # Map hash to confidence in 0.55 - 0.97 range
            # Hash modulo 100 gives 0 to 99
            scaled = (hash_val % 100) / 100.0
            confidence = 0.55 + (scaled * 0.42)
            
            logger.info(f"Classified room as '{room_type}' with {confidence * 100:.1f}% confidence.")
            return room_type, confidence
        except Exception as e:
            logger.error(f"Error during mock room classification: {e}")
            # Safe fallback
            return "living_room", 0.75
