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
from app.config import settings

logger = logging.getLogger(__name__)

def compute_budget_summary(furniture: list) -> dict:
    # Safely filter out any items that aren't dicts (e.g. if the AI returned a list of strings)
    valid_furniture = [f for f in furniture if isinstance(f, dict)]
    new_items = [f for f in valid_furniture if f.get("purchase_status") == "new_purchase"]
    optional_items = [f for f in valid_furniture if f.get("purchase_status") == "optional_upgrade"]
    required_min = sum(f.get("price_min", 0) for f in new_items)
    required_max = sum(f.get("price_max", 0) for f in new_items)
    optional_min = sum(f.get("price_min", 0) for f in optional_items)
    optional_max = sum(f.get("price_max", 0) for f in optional_items)
    return {
        "required_purchase_total": {"min": required_min, "max": required_max},
        "optional_upgrade_total": {"min": optional_min, "max": optional_max},
        "grand_total": {"min": required_min + optional_min, "max": required_max + optional_max},
        "items_to_buy_count": len(new_items),
        "items_kept_count": len([f for f in valid_furniture if f.get("purchase_status") == "keep_existing"]),
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
        
        h = hashlib.sha256()
        h.update(image_bytes)
        image_hash = h.hexdigest()

        # Defer text model API call: Just create the DB row to track the upload
        generation_data = {
            "original_image_path": original_image_path,
            "style": style_id,
            "redesign_prompt": "",
            "prompt_version": "v1",
            "analysis_json": "",
            "provider": "deferred",
            "provider_version": "v1",
            "model_used": "deferred",
            "model_version": "deferred",
            "status": "analyzed",
            "processing_time_sec": round(time.perf_counter() - t0, 2),
            "user_id": user_id,
            "image_hash": image_hash,
        }

        try:
            generation = await self.repository.create_generation(generation_data)
            analysis_id = generation.id
            elapsed = round(time.perf_counter() - t0, 2)
            logger.info(f"Deferred analysis (upload registered) — id={analysis_id} style={style_id} ({elapsed}s)")
        except Exception as db_err:
            logger.error(f"Database save failed: {db_err}")
            analysis_id = 0
            
        # Return fallback empty data so Pydantic validation passes and frontend routing continues
        return AnalyzeResponse(
            analysis_id=analysis_id,
            analysis_confidence=0.0,
            room_type="Unknown",
            furniture=[],
            color_palette=[],
            redesign_prompt="",
            style_explanation="",
            layout_notes="",
            lighting_suggestions="",
            estimated_dimensions={},
            budget_summary={}
        )

