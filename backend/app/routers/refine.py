"""
refine.py — POST /api/refine
Edits an existing generation with a new instruction via Replicate.
Invalidates history and parent generation cache after success.
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.repositories.generation_repository import GenerationRepository
from app.services.refinement_service import RefinementService
from app.schemas.generation import RefineRequest, RefineResponse
from app.cache import invalidate_generation_cache
from app.middleware.rate_limit import RateLimiter
from app.auth.dependencies import get_current_user
from app.database.models import User

router = APIRouter(prefix="/refine", tags=["Refinement"])

@router.post(
    "",
    response_model=RefineResponse,
    status_code=201,
    dependencies=[Depends(RateLimiter("refine", 20, 3600))],

    responses={
        201: {
            "description": "Refinement task scheduled in background.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 2,
                        "original_image_path": "storage/uploads/xyz.jpg",
                        "room_type_detected": "Living Room",
                        "room_confidence": 0.95,
                        "style": "scandinavian",
                        "redesign_prompt": "make the sofa blue",
                        "prompt_version": "v1",
                        "analysis_json": "{}",
                        "parent_generation_id": 1,
                        "provider": "replicate",
                        "provider_version": "replicate-python 1.0.0",
                        "model_used": "black-forest-labs/flux-kontext-pro",
                        "model_version": "latest",
                        "status": "pending",
                        "error": None,
                        "processing_time_sec": 0.0,
                        "selected_variation_id": None,
                        "created_at": "2026-07-08T22:25:01",
                        "variations": []
                    }
                }
            }
        }
    }
)

async def refine_design(
    request: RefineRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repository = GenerationRepository(db)
    service = RefinementService(repository)
    
    # 1. Prepare child row
    result = await service.prepare_refinement(
        request.generation_id,
        request.instruction,
        user_id=current_user.id
    )
    
    # 2. Invalidate parent and list caches
    import asyncio
    asyncio.create_task(asyncio.to_thread(invalidate_generation_cache, request.generation_id, current_user.id))
    
    # 3. Schedule Replicate task
    background_tasks.add_task(
        service.run_refinement_task,
        result.id,
        request.generation_id,
        request.instruction
    )
    
    return result
