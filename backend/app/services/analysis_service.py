"""
analysis_service.py — Orchestrates Gemini room analysis.
"""
import time
import logging
import json
from app.ai.providers.provider_registry import get_analysis_provider
from app.schemas.generation import AnalyzeResponse
from app.repositories.generation_repository import GenerationRepository
from app.utils.exceptions import AnalysisServiceError, InteriorAIError
from pydantic import ValidationError

logger = logging.getLogger(__name__)


class AnalysisService:
    def __init__(self, repository: GenerationRepository):
        self.repository = repository
        self.provider = get_analysis_provider()  # singleton — no construction cost

    async def create_analysis(
        self,
        image_bytes: bytes,
        mime_type: str,
        style_id: str,
        original_image_path: str,
    ) -> AnalyzeResponse:
        t0 = time.perf_counter()
        analysis_dict = None
        error_msg = None
        status = "analyzed"

        # 1. Try to get analysis from AI Provider
        try:
            analysis_dict = await self.provider.analyze_room(image_bytes, mime_type, style_id)
            # Validate response shape
            _ = AnalyzeResponse(analysis_id=0, **analysis_dict)
        except Exception as e:
            logger.error(f"Analysis provider failed: {e}. Falling back to default skeleton.")
            error_msg = f"Provider failed: {str(e)}"
            status = "failed_analysis"
            analysis_dict = {
                "room_type": "Unknown",
                "furniture": [],
                "estimated_dimensions": {"width_ft": 0.0, "length_ft": 0.0, "confidence": "low"},
                "layout_notes": "Unable to analyze room layout dynamically. You can still generate a design manually by specifying options.",
                "color_palette": [],
                "lighting_suggestions": "Unable to analyze lighting.",
                "estimated_budget_range": "N/A",
                "style_explanation": "Unable to analyze style dynamically.",
                "redesign_prompt": f"Redesign this room in {style_id.replace('_', ' ')} style."
            }

        # 2. Save generation to DB
        generation_data = {
            "original_image_path": original_image_path,
            "style": style_id,
            "redesign_prompt": analysis_dict.get("redesign_prompt", ""),
            "prompt_version": "v1",
            "analysis_json": json.dumps(analysis_dict),
            "provider": self.provider.__class__.__name__.replace('Provider', '').lower(),
            "provider_version": "v1",
            "model_used": getattr(self.provider, 'model_name', "unknown"),
            "model_version": getattr(self.provider, 'model_version', "latest"),
            "status": status,
            "processing_time_sec": round(time.perf_counter() - t0, 2),
        }
        if error_msg:
            generation_data["error"] = error_msg

        analysis_id = 0
        try:
            generation = self.repository.create_generation(generation_data)
            analysis_id = generation.id
            elapsed = round(time.perf_counter() - t0, 2)
            logger.info(f"Analysis complete — id={analysis_id} style={style_id} ({elapsed}s) status={status}")
        except Exception as db_err:
            logger.error(f"Database save failed: {db_err}")
            # Do NOT crash. Return the analysis anyway, so the user can see it.
            # But the user won't be able to generate from it. Still better than 500.
        
        return AnalyzeResponse(analysis_id=analysis_id, **analysis_dict)

