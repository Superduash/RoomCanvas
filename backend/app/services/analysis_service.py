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
        try:
            analysis_dict = await self.provider.analyze_room(image_bytes, mime_type, style_id)
            try:
                _ = AnalyzeResponse(analysis_id=0, **analysis_dict)
            except (ValidationError, TypeError) as e:
                raise AnalysisServiceError(f"Gemini returned an unexpected response shape: {e}", 500)
            generation_data = {
                "original_image_path": original_image_path,
                "style": style_id,
                "redesign_prompt": analysis_dict.get("redesign_prompt", ""),
                "prompt_version": "v1",
                "analysis_json": json.dumps(analysis_dict),
                "provider": "gemini",
                "provider_version": "google-genai 0.1.0",
                "model_used": "gemini-2.5-flash",
                "model_version": "2024-12-01",
                "status": "analyzed",
                "processing_time_sec": round(time.perf_counter() - t0, 2),
            }
            generation = self.repository.create_generation(generation_data)

            elapsed = round(time.perf_counter() - t0, 2)
            logger.info(f"Analysis complete — id={generation.id} style={style_id} ({elapsed}s)")

            return AnalyzeResponse(analysis_id=generation.id, **analysis_dict)

        except Exception as e:
            logger.error(f"Analysis provider failed: {e}. Falling back to default skeleton.")
            fallback_dict = {
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
            generation_data = {
                "original_image_path": original_image_path,
                "style": style_id,
                "redesign_prompt": fallback_dict["redesign_prompt"],
                "prompt_version": "v1",
                "analysis_json": json.dumps(fallback_dict),
                "provider": "gemini",
                "provider_version": "google-genai 0.1.0",
                "model_used": "gemini-2.5-flash",
                "model_version": "2024-12-01",
                "status": "failed_analysis",
                "processing_time_sec": round(time.perf_counter() - t0, 2),
                "error": f"Gemini failed: {str(e)}"
            }
            try:
                generation = self.repository.create_generation(generation_data)
                return AnalyzeResponse(analysis_id=generation.id, **fallback_dict)
            except Exception as db_err:
                logger.error(f"Database save also failed during fallback: {db_err}")
                raise AnalysisServiceError(f"Unable to analyze room: {e}", 500)
