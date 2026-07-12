"""
refinement_service.py — Orchestrates Replicate refinement on an existing image.
"""
import time
import logging
from app.ai.providers.provider_registry import get_generation_provider
from app.ai.prompt_builder import build_refinement_prompt
from app.repositories.generation_repository import GenerationRepository
from app.services.storage_service import StorageService
from app.utils.exceptions import InferenceServiceError
from app.utils.image_utils import load_image, resize_for_upload

logger = logging.getLogger(__name__)

class RefinementService:
    def __init__(self, repository: GenerationRepository):
        self.repository = repository
        self.provider = get_generation_provider()

    async def prepare_refinement(self, parent_id: int, instruction: str, user_id: int | None = None):
        parent_gen = await self.repository.get_by_id(parent_id)
        if not parent_gen:
            raise InferenceServiceError(f"Parent generation id={parent_id} not found", 404)

        if parent_gen.status != "completed":
            raise InferenceServiceError(
                f"Cannot refine generation in '{parent_gen.status}' state — must be 'completed'", 400
            )

        variation = (
            parent_gen.selected_variation
            if parent_gen.selected_variation_id
            else (parent_gen.variations[0] if parent_gen.variations else None)
        )
        if not variation:
            raise InferenceServiceError(f"Generation id={parent_id} has no images to refine", 500)

        new_gen = await self.repository.create_generation({
            "original_image_path": parent_gen.original_image_path,
            "style": parent_gen.style,
            "redesign_prompt": instruction,
            "prompt_version": parent_gen.prompt_version,
            "analysis_json": parent_gen.analysis_json,
            "parent_generation_id": parent_id,
            "provider": "replicate",
            "provider_version": "replicate-python 1.0.0",
            "model_used": "black-forest-labs/flux-kontext-pro",
            "model_version": getattr(self.provider, 'model_version', "latest"),
            "status": "pending",
            "processing_time_sec": 0.0,
            "room_type_detected": parent_gen.room_type_detected,
            "room_confidence": parent_gen.room_confidence,
            "user_id": user_id if user_id is not None else parent_gen.user_id,
        })
        return new_gen

    async def run_refinement_task(self, new_gen_id: int, parent_id: int, instruction: str):
        t0 = time.perf_counter()
        from app.database.session import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            repo = GenerationRepository(db)
            new_gen = await repo.get_by_id(new_gen_id)
            parent_gen = await repo.get_by_id(parent_id)

            if not new_gen or not parent_gen:
                return

            variation = (
                parent_gen.selected_variation
                if parent_gen.selected_variation_id
                else (parent_gen.variations[0] if parent_gen.variations else None)
            )

            try:
                image = load_image(variation.image_path)
                image_bytes = resize_for_upload(image)

                final_prompt = build_refinement_prompt(instruction)

                logger.info(f"Background task: calling Replicate for Refinement id={new_gen.id} (parent={parent_id})…")
                output_url, seed_used = await self.provider.refine(
                    image_bytes=image_bytes,
                    mime_type="image/jpeg",
                    instruction=final_prompt,
                )

                generated_filepath = await StorageService.download_and_save(output_url)

                await repo.add_variations(new_gen.id, [{"image_path": generated_filepath, "seed": seed_used}])

                elapsed = round(time.perf_counter() - t0, 2)
                new_gen.processing_time_sec = elapsed
                new_gen.provider = "replicate"
                new_gen.provider_version = "replicate-python 1.0.0"
                new_gen.model_used = "black-forest-labs/flux-kontext-pro"
                new_gen.model_version = "latest"
                await db.commit()
                await db.refresh(new_gen)
                await repo.update_status(new_gen.id, "completed")

                logger.info(f"Background task: Refinement id={new_gen.id} done ({elapsed}s)")

            except Exception as e:
                logger.error(f"Background task: Refinement id={new_gen.id} failed: {e}", exc_info=True)
                await repo.set_error(new_gen.id, str(e))
