"""
generation_service.py — Orchestrates Replicate generation from an analysis.
"""
import time
import logging
from app.ai.providers.provider_registry import get_generation_provider
from app.ai.prompt_builder import build_generation_prompt
from app.repositories.generation_repository import GenerationRepository
from app.services.storage_service import StorageService
from app.utils.exceptions import InferenceServiceError, InteriorAIError
from app.utils.image_utils import load_image, resize_for_upload

logger = logging.getLogger(__name__)


class GenerationService:
    def __init__(self, repository: GenerationRepository):
        self.repository = repository
        self.provider = get_generation_provider()  # singleton

    def prepare_generation(self, analysis_id: int):
        generation = self.repository.get_by_id(analysis_id)
        if not generation:
            raise InferenceServiceError(f"Analysis id={analysis_id} not found", 404)

        if generation.status == "completed" and generation.variations:
            logger.info(f"Generation id={analysis_id} already completed — returning cached result")
            return generation

        self.repository.update_status(generation.id, "pending")
        return generation

    async def run_generation_task(self, analysis_id: int):
        t0 = time.perf_counter()
        from app.database.session import SessionLocal
        
        # Open a new session specifically for the background thread to avoid session closed errors
        db = SessionLocal()
        repo = GenerationRepository(db)
        generation = repo.get_by_id(analysis_id)
        if not generation:
            db.close()
            return

        try:
            # 1. Prepare image
            image = load_image(generation.original_image_path)
            image_bytes = resize_for_upload(image)

            # 2. Build prompt
            final_prompt = build_generation_prompt(generation.redesign_prompt)

            # 3. Call Replicate
            logger.info(f"Background task: calling Replicate for Generation id={generation.id}…")
            output_url = await self.provider.generate(
                image_bytes=image_bytes,
                mime_type="image/jpeg",
                prompt=final_prompt,
            )

            # 4. Download result
            generated_filepath = StorageService.download_and_save(output_url)

            # 5. Persist variation
            repo.add_variations(generation.id, [{"image_path": generated_filepath, "seed": 0}])

            # 6. Commit processing time + mark complete
            elapsed = round(time.perf_counter() - t0, 2)
            generation.processing_time_sec = elapsed
            generation.provider = "replicate"
            generation.provider_version = "replicate-python 1.0.0"
            generation.model_used = "black-forest-labs/flux-kontext-pro"
            generation.model_version = "latest"
            db.commit()
            db.refresh(generation)
            repo.update_status(generation.id, "completed")

            logger.info(f"Background task: Generation id={generation.id} done ({elapsed}s)")

        except Exception as e:
            logger.error(f"Background task: Generation id={generation.id} failed: {e}")
            repo.set_error(generation.id, str(e))
        finally:
            db.close()
