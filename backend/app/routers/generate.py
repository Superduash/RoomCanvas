"""
generate.py — POST /api/generate
Turns an analysis into a redesigned room image via Replicate.
Invalidates history cache after successful generation.
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.repositories.generation_repository import GenerationRepository
from app.services.generation_service import GenerationService
from app.schemas.generation import GenerateRequest, GenerateResponse
from app.cache import invalidate_history_cache

router = APIRouter(prefix="/generate", tags=["Generation"])


@router.post(
    "",
    response_model=GenerateResponse,
    status_code=201,
    responses={
        201: {
            "description": "Generation task scheduled in background.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "original_image_path": "storage/uploads/xyz.jpg",
                        "room_type_detected": "Living Room",
                        "room_confidence": 0.95,
                        "style": "scandinavian",
                        "redesign_prompt": "A bright Scandinavian living room with ash oak furniture and sage accents.",
                        "prompt_version": "v1",
                        "analysis_json": "{}",
                        "parent_generation_id": None,
                        "provider": "replicate",
                        "provider_version": "replicate-python 1.0.0",
                        "model_used": "black-forest-labs/flux-kontext-pro",
                        "model_version": "latest",
                        "status": "pending",
                        "error": None,
                        "processing_time_sec": 0.0,
                        "selected_variation_id": None,
                        "created_at": "2026-07-08T22:20:12",
                        "variations": []
                    }
                }
            }
        }
    }
)
async def generate_design(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    repository = GenerationRepository(db)
    service = GenerationService(repository)
    
    # 1. Prepare row to pending state
    result = service.prepare_generation(request.analysis_id, force_new=request.force_new)
    
    # 2. Invalidate cache so UI sees status change
    invalidate_history_cache()
    
    # 3. Schedule Replicate task
    if result.status == "pending":
        background_tasks.add_task(service.run_generation_task, result.id)
    
    return result
