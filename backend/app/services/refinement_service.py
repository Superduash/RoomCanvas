"""
refinement_service.py — Orchestrates Replicate refinement on an existing image.
"""
import time
import logging
from sqlalchemy.ext.asyncio import async_sessionmaker
from app.database.models import Generation
from app.database.session import engine
from app.ai.providers.provider_registry import get_image_provider
from app.ai.prompt_builder import build_refinement_prompt
from app.repositories.generation_repository import GenerationRepository
from app.services.storage_service import StorageService
from app.utils.exceptions import InferenceServiceError
from app.utils.image_utils import resize_for_upload

logger = logging.getLogger(__name__)

class RefinementService:
    def __init__(self, repository: GenerationRepository):
        self.repository = repository

    async def prepare_refinement(
        self,
        parent_generation_id: int,
        instruction: str | None,
        customization=None,
        user_id: int = None
    ) -> Generation:
        parent_gen = await self.repository.get_by_id(parent_generation_id)
        if not parent_gen:
            raise InferenceServiceError(f"Parent generation id={parent_generation_id} not found", 404)

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
            raise InferenceServiceError(f"Generation id={parent_generation_id} has no images to refine", 500)

        new_gen = await self.repository.create_generation({
            "original_image_path": parent_gen.original_image_path,
            "style": parent_gen.style,
            "redesign_prompt": instruction or parent_gen.redesign_prompt,
            "prompt_version": parent_gen.prompt_version,
            "analysis_json": parent_gen.analysis_json,
            "parent_generation_id": parent_generation_id,
            "provider": "unknown",
            "provider_version": "v1",
            "model_used": "unknown",
            "model_version": "latest",
            "status": "pending",
            "processing_time_sec": 0.0,
            "room_type_detected": parent_gen.room_type_detected,
            "room_confidence": parent_gen.room_confidence,
            "user_id": user_id if user_id is not None else parent_gen.user_id,
        })
        return new_gen

    async def run_refinement_task(self, new_gen_id: int, parent_id: int, instruction: str | None, customization=None):
        """Runs the Replicate task in the background for refinement."""
        t0 = time.perf_counter()
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        
        async with session_factory() as session:
            repo = GenerationRepository(session)
            generation = await session.get(Generation, new_gen_id)
            parent = await session.get(Generation, parent_id)
            
            if not generation or not parent:
                logger.error("Generation or parent not found in refinement background task.")
                return

            try:
                variation = (
                    parent.selected_variation
                    if parent.selected_variation_id
                    else (parent.variations[0] if parent.variations else None)
                )

                image = await StorageService.download_image_as_pil(variation.image_path)
                image_bytes = resize_for_upload(image)

                import json
                analysis_data = {}
                if parent.analysis_json:
                    try:
                        analysis_data = json.loads(parent.analysis_json)
                    except Exception:
                        pass
                final_prompt = build_refinement_prompt(instruction, customization, analysis_data)

                logger.info(f"Background task: calling Replicate for Refinement id={generation.id} (parent={parent_id})…")
                provider = await get_image_provider(session, generation.user_id)
                output_url, seed_used = await provider.refine(
                    image_bytes=image_bytes,
                    mime_type="image/jpeg",
                    instruction=final_prompt,
                )

                generated_filepath = await StorageService.download_and_save(output_url)

                await repo.add_variations(generation.id, [{"image_path": generated_filepath, "seed": seed_used}])

                elapsed = round(time.perf_counter() - t0, 2)
                generation.processing_time_sec = elapsed
                generation.provider = provider.__class__.__name__.replace('Provider', '').lower()
                generation.model_used = getattr(provider, 'model', "unknown")
                generation.status = "completed"
                await session.commit()
                await session.refresh(generation)

                logger.info(f"Background task: Refinement id={generation.id} done ({elapsed}s)")

            except Exception as e:
                logger.error(f"Refinement background task failed: {e}")
                generation.status = "failed"
                generation.error = str(e)
                await session.commit()
