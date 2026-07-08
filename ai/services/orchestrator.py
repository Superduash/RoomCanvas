import logging
from PIL import Image

try:
    from app.config import settings
    from app.database.models import Generation
    from app.repositories.generation_repository import GenerationRepository
    from app.utils.image_utils import load_image
    from app.utils.exceptions import InferenceServiceError
except ImportError:
    from backend.app.config import settings
    from backend.app.database.models import Generation
    from backend.app.repositories.generation_repository import GenerationRepository
    from backend.app.utils.image_utils import load_image
    from backend.app.utils.exceptions import InferenceServiceError

from ai.providers.registry import get_provider
from ai.prompts.builder import build_prompt

logger = logging.getLogger(__name__)

class GenerationOrchestrator:
    """
    Coordinates the full design pipeline using the configured AI provider.
    """
    def __init__(self, repository: GenerationRepository):
        self.repository = repository
        self.provider = get_provider()

    def run(self, image_path: str, style: str, n: int = 3) -> Generation:
        logger.info("Starting pipeline — style=%r  image=%r  n=%d", style, image_path, n)

        try:
            image = load_image(image_path)
        except Exception as exc:
            logger.error("Image load failed: %s", exc)
            raise InferenceServiceError(f"Failed to load uploaded image: {exc}") from exc

        try:
            prompt, negative_prompt = build_prompt("room", style)
        except Exception as exc:
            logger.error("Prompt builder failed: %s", exc)
            raise InferenceServiceError(f"Prompt construction failed: {exc}") from exc

        try:
            variations, generation_time, model_used = self.provider.generate_variations(
                original_image=image,
                prompt=prompt,
                negative_prompt=negative_prompt,
                n=n,
                save_dir=settings.GENERATED_DIR,
            )
            
            from ai.formatter import format_variations
            variations = format_variations(variations)
            
        except Exception as exc:
            logger.error("AI Provider failed: %s", exc)
            raise InferenceServiceError(f"Model inference failed: {exc}") from exc

        try:
            generation_record = self.repository.create_generation({
                "original_image_path": image_path,
                "control_image_path": None,  # Handled internally by the new AI model
                "room_type_detected": "room",  # No longer detecting room type explicitly
                "room_confidence": 1.0,
                "style": style,
                "prompt_used": prompt,
                "model_used": model_used,
                "generation_time_sec": generation_time,
                "selected_variation_id": None,
            })
            self.repository.add_variations(generation_record.id, variations)

            final_record = self.repository.get_by_id(generation_record.id)
            if final_record is None:
                raise ValueError("Persisted generation record could not be retrieved.")

            logger.info("Generation #%d saved to database.", final_record.id)
            return final_record
        except Exception as exc:
            logger.error("Database write failed: %s", exc)
            raise InferenceServiceError(f"Database persistence failed: {exc}") from exc
