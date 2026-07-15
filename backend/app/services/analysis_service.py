"""
analysis_service.py — Orchestrates Gemini room analysis.
"""
import time
import logging
import json
import hashlib
from fastapi.concurrency import run_in_threadpool
from app.ai.providers.provider_registry import get_text_provider
from app.schemas.generation import AnalyzeResponse
from app.repositories.generation_repository import GenerationRepository

logger = logging.getLogger(__name__)

def compute_budget_summary(furniture: list[dict]) -> dict:
    new_items = [f for f in furniture if f.get("purchase_status") == "new_purchase"]
    optional_items = [f for f in furniture if f.get("purchase_status") == "optional_upgrade"]
    required_min = sum(f.get("price_min", 0) for f in new_items)
    required_max = sum(f.get("price_max", 0) for f in new_items)
    optional_min = sum(f.get("price_min", 0) for f in optional_items)
    optional_max = sum(f.get("price_max", 0) for f in optional_items)
    return {
        "required_purchase_total": {"min": required_min, "max": required_max},
        "optional_upgrade_total": {"min": optional_min, "max": optional_max},
        "grand_total": {"min": required_min + optional_min, "max": required_max + optional_max},
        "items_to_buy_count": len(new_items),
        "items_kept_count": len([f for f in furniture if f.get("purchase_status") == "keep_existing"]),
    }

class AnalysisService:
    def __init__(self, repository: GenerationRepository):
        self.repository = repository
        self.db = repository.db

    async def create_analysis(
        self,
        image_bytes: bytes,
        mime_type: str,
        style_id: str,
        original_image_path: str,
        user_id: int | None = None
    ) -> AnalyzeResponse:
        t0 = time.perf_counter()
        analysis_dict = None
        error_msg = None
        status = "analyzed"
        h = hashlib.sha256()
        h.update(image_bytes)
        image_hash = h.hexdigest()

        # 0. Check DB Cache First
        cached_gen = await self.repository.get_cached_analysis_by_hash(image_hash, style_id)
        if cached_gen and cached_gen.analysis_json:
            try:
                analysis_dict = json.loads(cached_gen.analysis_json)
                logger.info(f"DB cache hit for analysis (hash={image_hash[:8]}...)")
            except Exception:
                pass

        # 1. Try to get analysis from AI Provider if not in DB cache
        if not analysis_dict:
            async def fetch_analysis():
                provider = await get_text_provider(self.db, user_id)
                current_prov = getattr(provider, '__class__', type(provider)).__name__.replace('Provider', '').lower()
                
                try:
                    res = await provider.analyze_room(image_bytes, mime_type, style_id)
                except Exception as e:
                    status_code = getattr(e, 'status_code', 500)
                    if status_code == 429:
                        from app.ai.providers.provider_registry import get_fallback_text_provider
                        logger.warning(f"Text provider {current_prov} hit rate limit (429). Attempting fallback...")
                        fallback_provider, fallback_name = await get_fallback_text_provider(self.db, user_id, current_prov)
                        if fallback_provider:
                            logger.info(f"Fallback to {fallback_name} text provider successful.")
                            res = await fallback_provider.analyze_room(image_bytes, mime_type, style_id)
                        else:
                            raise e
                    else:
                        raise e
                
                all_objects = res.get("movable_objects", []) + res.get("built_in_objects", [])
                res["budget_summary"] = compute_budget_summary(all_objects)
                res.pop("estimated_budget_range", None)
                # Validate response shape
                _ = AnalyzeResponse(analysis_id=0, **res)
                return res

            try:
                from app.cache.redis_cache import cached_json_async
                
                # We can reuse the same hash for Redis
                cache_key = f"analysis:{image_hash}:{style_id}"
                
                # Cache for 2 hours
                analysis_dict = await cached_json_async(cache_key, 7200, fetch_analysis)
            except Exception as e:
                logger.error(f"Analysis provider failed: {e}. Falling back to default skeleton.")
                error_msg = f"Provider failed: {str(e)}"
                status = "failed_analysis"
                analysis_dict = {
                    "analysis_confidence": 0.0,
                    "room_type": "Unknown",
                    "movable_objects": [],
                    "built_in_objects": [],
                    "estimated_dimensions": {"width_ft": 0.0, "length_ft": 0.0, "confidence": "low"},
                    "layout_notes": "Unable to analyze room layout dynamically. You can still generate a design manually by specifying options.",
                    "color_palette": [
                        {"name": "Neutral Tone", "hex": "#808080"}
                    ],
                    "lighting_suggestions": "Unable to analyze lighting context.",
                    "budget_summary": {
                        "required_purchase_total": {"min": 0, "max": 0},
                        "optional_upgrade_total": {"min": 0, "max": 0},
                        "grand_total": {"min": 0, "max": 0},
                        "items_to_buy_count": 0,
                        "items_kept_count": 1,
                    },
                    "space_occupancy": "mostly_empty",
                    "open_floor_area_pct": 100,
                    "architecture": {
                        "walls": "keep as is",
                        "windows": "keep as is",
                        "doors": "keep as is",
                        "ceiling_height": "keep as is",
                        "lighting_direction": "keep original"
                    },
                    "style_explanation": "Unable to analyze style dynamically.",
                    "redesign_prompt": (
                        f"Fully redesign this room in {style_id.replace('_', ' ')} style. "
                        f"Add appropriate furniture, decor, and lighting fixtures for a {style_id.replace('_', ' ')} "
                        f"living space — this room should look furnished and complete, not empty."
                    )
                }


        # Capture provider info from the cached analysis result
        provider_name = "gemini"
        model_used = settings.GEMINI_TEXT_MODEL_DEFAULT
        model_version = "latest"
        try:
            provider = await get_text_provider(self.db, user_id)
            provider_name = provider.__class__.__name__.replace('Provider', '').lower()
            model_used = getattr(provider, 'model_name', getattr(provider, 'model', "unknown"))
            model_version = getattr(provider, 'model_version', "latest")
        except Exception:
            pass

        generation_data = {
            "original_image_path": original_image_path,
            "style": style_id,
            "redesign_prompt": analysis_dict.get("redesign_prompt", ""),
            "prompt_version": "v1",
            "analysis_json": json.dumps(analysis_dict),
            "provider": provider_name,
            "provider_version": "v1",
            "model_used": model_used,
            "model_version": model_version,
            "status": status,
            "processing_time_sec": round(time.perf_counter() - t0, 2),
            "user_id": user_id,
            "image_hash": image_hash,
        }
        if error_msg:
            generation_data["error"] = error_msg

        analysis_id = 0
        try:
            generation = await self.repository.create_generation(generation_data)
            analysis_id = generation.id
            elapsed = round(time.perf_counter() - t0, 2)
            logger.info(f"Analysis complete — id={analysis_id} style={style_id} ({elapsed}s) status={status}")
        except Exception as db_err:
            logger.error(f"Database save failed: {db_err}")
            # Do NOT crash. Return the analysis anyway, so the user can see it.
            # But the user won't be able to generate from it. Still better than 500.
        
        return AnalyzeResponse(analysis_id=analysis_id, **analysis_dict)

