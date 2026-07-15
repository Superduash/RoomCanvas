"""
generation_service.py — Orchestrates Replicate generation from an analysis.
"""
import time
import json
import logging
from sqlalchemy.ext.asyncio import async_sessionmaker
from app.database.models import Generation
from app.database.session import engine
from app.ai.providers.provider_registry import get_image_provider
from app.ai.prompt_builder import build_generation_prompt
from app.repositories.generation_repository import GenerationRepository
from app.services.storage_service import StorageService
from app.utils.exceptions import InferenceServiceError
from app.utils.image_utils import resize_for_upload

logger = logging.getLogger(__name__)

class GenerationService:
    def __init__(self, repository: GenerationRepository):
        self.repository = repository

    async def prepare_generation(
        self,
        analysis_id: int,
        force_new: bool = False,
        customization=None,
        user_id: int = None,
        instruction: str = None
    ) -> Generation:
        generation = await self.repository.get_by_id(analysis_id)
        if not generation:
            raise InferenceServiceError(f"Analysis id={analysis_id} not found", 404)

        if generation.status == "completed" and generation.variations and not force_new:
            logger.info(f"Generation id={analysis_id} already completed — returning cached result")
            return generation

        effective_style = generation.style
        if customization and getattr(customization, 'style_override', None):
            effective_style = customization.style_override

        if generation.status == "completed" and force_new:
            # Prevent duplicate requests: check if a pending child already exists
            children = await self.repository.get_children(generation.id)
            pending_child = next((c for c in children if c.status in ("pending", "analyzed")), None)
            if pending_child:
                logger.info(f"Generation id={analysis_id} already has a pending child ({pending_child.id}) — returning it to prevent duplicates")
                return pending_child

            new_generation = await self.repository.create_generation({
                "original_image_path": generation.original_image_path,
                "style": effective_style,
                "redesign_prompt": generation.redesign_prompt,
                "prompt_version": generation.prompt_version,
                "analysis_json": generation.analysis_json,
                "provider": generation.provider,
                "provider_version": generation.provider_version,
                "model_used": generation.model_used,
                "model_version": generation.model_version,
                "status": "pending",
                "processing_time_sec": 0.0,
                "user_id": user_id if user_id is not None else generation.user_id,
                "parent_generation_id": generation.id if generation.parent_generation_id is None else generation.parent_generation_id,
            })
            return new_generation

        if effective_style != generation.style:
            generation.style = effective_style
            await self.repository.db.commit()
            
        updated_gen = await self.repository.update_status(generation.id, "pending")
        return updated_gen

    async def run_generation_task(self, generation_id: int, customization=None, is_regenerate=False, instruction=None):
        """Runs the Replicate task in the background and updates the DB."""
        t0 = time.perf_counter()
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            repo = GenerationRepository(session)
            generation = await session.get(Generation, generation_id)
            if not generation:
                logger.error(f"Generation {generation_id} not found in background task.")
                return

            try:
                # 1. Prepare image
                image = await StorageService.download_image_as_pil(generation.original_image_path)
                image_bytes = resize_for_upload(image)
                t1 = time.perf_counter()
                logger.info(f"Generation id={generation.id}: image prep took {t1-t0:.1f}s")

                # 2. Build prompt
                analysis_data = {}
                if generation.analysis_json:
                    try:
                        analysis_data = json.loads(generation.analysis_json)
                    except Exception:
                        pass
                
                effective_style = customization.style_override if (customization and getattr(customization, 'style_override', None)) else generation.style
                final_prompt = build_generation_prompt(
                    generation.redesign_prompt, 
                    analysis_data, 
                    customization, 
                    is_regenerate, 
                    effective_style,
                    instruction
                )

                # 3. Call Replicate
                logger.info(
                    f"Generation id={generation.id} starting. "
                    f"Image: '{generation.original_image_path}' ({len(image_bytes)} bytes). "
                    f"Prompt: '{final_prompt}'"
                )
                logger.info(f"Background task: calling Replicate for Generation id={generation.id}…")
                
                provider = await get_image_provider(session, generation.user_id)
                current_prov = getattr(provider, '__class__', type(provider)).__name__.replace('Provider', '').lower()
                
                try:
                    output_url, seed_used = await provider.generate(
                        image_bytes=image_bytes,
                        mime_type="image/jpeg",
                        prompt=final_prompt,
                    )
                except Exception as e:
                    status_code = getattr(e, 'status_code', getattr(e, 'status', 500))
                    if status_code == 429:
                        from app.ai.providers.provider_registry import get_fallback_image_provider
                        logger.warning(f"Image provider {current_prov} hit rate limit (429). Attempting fallback...")
                        fallback_provider, fallback_name = await get_fallback_image_provider(session, generation.user_id, current_prov)
                        if fallback_provider:
                            logger.info(f"Fallback to {fallback_name} image provider successful.")
                            provider = fallback_provider
                            output_url, seed_used = await provider.generate(
                                image_bytes=image_bytes,
                                mime_type="image/jpeg",
                                prompt=final_prompt,
                            )
                        else:
                            raise e
                    else:
                        raise e
                t2 = time.perf_counter()
                logger.info(f"Generation id={generation.id}: replicate call took {t2-t1:.1f}s")

                # 4. Download result
                generated_filepath = await StorageService.download_and_save(output_url)
                t3 = time.perf_counter()
                logger.info(f"Generation id={generation.id}: result download took {t3-t2:.1f}s")

                # 5. Persist variation
                await repo.add_variations(generation.id, [{"image_path": generated_filepath, "seed": seed_used}])

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
                generation.provider = provider.__class__.__name__.replace('Provider', '').lower()
                generation.provider_version = getattr(provider, 'provider_version', "v1")
                generation.model_used = getattr(provider, 'model', "unknown")
                generation.model_version = "latest"
                
                # Critical: commit the Variation row first
                await session.commit()
                await session.refresh(generation)
                
                # Then update status to completed and commit again
                await repo.update_status(generation.id, "completed")
                
                # Only after both commits are done, log completion (SSE polls will see the completed status)
                logger.info(f"Background task: Generation id={generation.id} done ({elapsed}s)")

            except Exception as e:
                logger.error(f"Background task: Generation id={generation.id} failed: {e}", exc_info=True)
                await repo.set_error(generation.id, str(e))
