"""
analysis_service.py — Orchestrates Gemini room analysis.
"""
import time
import logging
import json
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

        # 1. Try to get analysis from AI Provider
        async def fetch_analysis():
            provider = await get_text_provider(self.db, user_id)
            res = await provider.analyze_room(image_bytes, mime_type, style_id)
            res["budget_summary"] = compute_budget_summary(res.get("furniture", []))
            res.pop("estimated_budget_range", None)
            # Validate response shape
            _ = AnalyzeResponse(analysis_id=0, **res)
            return res

        try:
            import hashlib
            from app.cache.redis_cache import cached_json_async
            
            h = hashlib.sha256()
            h.update(image_bytes)
            h.update(style_id.encode('utf-8'))
            cache_key = f"analysis:{h.hexdigest()}"
            
            # Cache for 2 hours
            analysis_dict = await cached_json_async(cache_key, 7200, fetch_analysis)
        except Exception as e:
            logger.error(f"Analysis provider failed: {e}. Falling back to default skeleton.")
            error_msg = f"Provider failed: {str(e)}"
            status = "failed_analysis"
            analysis_dict = {
                "room_type": "Unknown",
                "furniture": [
                    {
                        "item": "Main structural elements", 
                        "description": "Unable to map detailed furniture", 
                        "price_min": 0, 
                        "price_max": 0, 
                        "purchase_status": "keep_existing"
                    }
                ],
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
        model_used = "gemini-2.5-flash"
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

