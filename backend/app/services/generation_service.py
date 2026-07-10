"""
generation_service.py — Orchestrates Replicate generation from an analysis.

Key design decisions:
- `prepare_generation()` — synchronous; called from the FastAPI request handler.
  Creates the DB row in 'pending' state and returns immediately.
- `run_generation_task()` — async def; FastAPI BackgroundTasks runs it on the
  main event loop. DB calls are still made using BackgroundSessionLocal so we 
  don't share the request's connection.
"""
import time
import json
import logging
from app.ai.providers.provider_registry import get_generation_provider
from app.ai.prompt_builder import build_generation_prompt
from app.repositories.generation_repository import GenerationRepository
from app.services.storage_service import StorageService
from app.utils.exceptions import InferenceServiceError
from app.utils.image_utils import load_image, resize_for_upload

logger = logging.getLogger(__name__)


class GenerationService:
    def __init__(self, repository: GenerationRepository):
        self.repository = repository
        self.provider = get_generation_provider()  # singleton

    def prepare_generation(self, analysis_id: int, force_new: bool = False):
        generation = self.repository.get_by_id(analysis_id)
        if not generation:
            raise InferenceServiceError(f"Analysis id={analysis_id} not found", 404)

        if generation.status == "completed" and generation.variations and not force_new:
            logger.info(f"Generation id={analysis_id} already completed — returning cached result")
            return generation

        if generation.status == "completed" and force_new:
            new_generation = self.repository.create_generation({
                "original_image_path": generation.original_image_path,
                "style": generation.style,
                "redesign_prompt": generation.redesign_prompt,
                "prompt_version": generation.prompt_version,
                "analysis_json": generation.analysis_json,
                "provider": generation.provider,
                "provider_version": generation.provider_version,
                "model_used": generation.model_used,
                "model_version": generation.model_version,
                "status": "pending",
                "processing_time_sec": 0.0,
            })
            return new_generation

        updated_gen = self.repository.update_status(generation.id, "pending")
        return updated_gen

    # ── ASYNC background task — called by FastAPI BackgroundTasks ──
    async def run_generation_task(self, analysis_id: int, customization=None, is_regenerate=False):
        """
        Runs on the main event loop. Uses BackgroundSessionLocal to avoid
        sharing the HTTP request's DB session.
        """
        t0 = time.perf_counter()
        from app.database.session import BackgroundSessionLocal


        db = BackgroundSessionLocal()
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
            analysis_data = {}
            if generation.analysis_json:
                try:
                    analysis_data = json.loads(generation.analysis_json)
                except Exception:
                    pass
            final_prompt = build_generation_prompt(generation.redesign_prompt, analysis_data, customization, is_regenerate, generation.style)

            # 3. Call Replicate
            logger.info(
                f"Generation id={generation.id} starting. "
                f"Image: '{generation.original_image_path}' ({len(image_bytes)} bytes). "
                f"Prompt: '{final_prompt}'"
            )
            logger.info(f"Background task: calling Replicate for Generation id={generation.id}…")
            output_url, seed_used = await self.provider.generate(
                image_bytes=image_bytes,
                mime_type="image/jpeg",
                prompt=final_prompt,
            )

            # 4. Download result
            generated_filepath = await StorageService.download_and_save(output_url)

            # 5. Persist variation
            repo.add_variations(generation.id, [{"image_path": generated_filepath, "seed": seed_used}])

            # 6. Back-fill room_type_detected from analysis_json if not already set
            if not generation.room_type_detected and generation.analysis_json:
                try:
                    analysis_data = json.loads(generation.analysis_json)
                    generation.room_type_detected = analysis_data.get("room_type") or "Room"
                except Exception:
                    generation.room_type_detected = "Room"

            # 7. Commit processing time + mark complete
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
            logger.error(f"Background task: Generation id={generation.id} failed: {e}", exc_info=True)
            repo.set_error(generation.id, str(e))
        finally:
            db.close()


