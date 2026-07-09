"""
history.py — History, generation fetch, variation select, delete.
Caches read operations; invalidates on every mutation.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.repositories.generation_repository import GenerationRepository
from app.schemas.generation import GenerationOut
from pydantic import BaseModel
from app.cache import (
    get_cached_history, set_cached_history, invalidate_history_cache,
    get_cached_generation, set_cached_generation, invalidate_generation_cache,
)
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


def get_repo(db: Session = Depends(get_db)) -> GenerationRepository:
    return GenerationRepository(db)


# ── GET /api/history ───────────────────────────────────────────────────────────
@router.get(
    "/history",
    response_model=list[GenerationOut],
    tags=["History"],
    responses={
        200: {
            "description": "Successfully retrieved design history.",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "original_image_path": "storage/uploads/room.jpg",
                            "room_type_detected": "Living Room",
                            "room_confidence": 0.95,
                            "style": "scandinavian",
                            "redesign_prompt": "Bright living room with ash wood furniture and sage accents.",
                            "prompt_version": "v1",
                            "analysis_json": "{}",
                            "parent_generation_id": None,
                            "provider": "replicate",
                            "provider_version": "replicate-python 1.0.0",
                            "model_used": "black-forest-labs/flux-kontext-pro",
                            "model_version": "latest",
                            "status": "completed",
                            "error": None,
                            "processing_time_sec": 15.4,
                            "selected_variation_id": 1,
                            "created_at": "2026-07-08T22:20:12",
                            "variations": [
                                {
                                    "id": 1,
                                    "generation_id": 1,
                                    "image_path": "storage/generated/variant1.png",
                                    "seed": 0,
                                    "created_at": "2026-07-08T22:20:27"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    }
)
def list_history(
    limit: int = 50,
    repo: GenerationRepository = Depends(get_repo),
):
    """
    Retrieve list of past design generations ordered from newest to oldest.
    """
    cached = get_cached_history(limit)
    if cached is not None:
        return JSONResponse(content=cached)

    results = repo.list_all(limit=limit)
    serialized = [GenerationOut.model_validate(r).model_dump(mode="json") for r in results]
    set_cached_history(limit, serialized)

    response = JSONResponse(content=serialized)
    response.headers["Cache-Control"] = "no-store"  # Mutates frequently
    return response


# ── DELETE /api/history/all ───────────────────────────────────────────────────
@router.delete(
    "/history/all",
    tags=["History"],
    responses={
        200: {
            "description": "All history deleted."
        }
    }
)
def delete_all_history(
    background_tasks: BackgroundTasks,
    repo: GenerationRepository = Depends(get_repo),
):
    """
    Truncate all history and clear files.
    """
    generations = repo.list_all(limit=1000)
    files = []
    for g in generations:
        if g.original_image_path:
            files.append(g.original_image_path)
        for v in g.variations:
            if v.image_path:
                files.append(v.image_path)
    
    # In SQLite, refinements reference parent generations via parent_generation_id.
    # To delete all successfully, we must delete refinements (children) first.
    from app.database.models import Generation
    try:
        # 1. Delete all generations that have a parent (refinements)
        repo.db.query(Generation).filter(Generation.parent_generation_id.isnot(None)).delete(synchronize_session=False)
        # 2. Delete all root generations
        repo.db.query(Generation).filter(Generation.parent_generation_id.is_(None)).delete(synchronize_session=False)
        repo.db.commit()
    except Exception as ex:
        repo.db.rollback()
        logger.error(f"Error truncating generations: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error clearing history: {ex}"
        )
    
    # Clear all cache keys
    invalidate_history_cache()
    
    import os
    def _delete_files():
        for f in files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception as ex:
                pass
    background_tasks.add_task(_delete_files)
    
    return {"deleted": True}


# ── GET /api/history/{id} ──────────────────────────────────────────────────────
@router.get(
    "/history/{generation_id}",
    response_model=GenerationOut,
    tags=["History"],
    responses={
        200: {
            "description": "Successfully retrieved generation details."
        },
        404: {
            "description": "Generation not found.",
            "content": {"application/json": {"example": {"detail": "Generation 123 not found."}}}
        }
    }
)
def get_generation(
    generation_id: int,
    repo: GenerationRepository = Depends(get_repo),
):
    """
    Fetch complete details of a single generation request by ID (legacy route).
    """
    cached = get_cached_generation(generation_id)
    if cached is not None:
        return cached

    generation = repo.get_by_id(generation_id)
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Generation {generation_id} not found.")
    serialized = GenerationOut.model_validate(generation).model_dump(mode="json")
    if generation.status == "completed":
        set_cached_generation(generation_id, serialized)
    return serialized


# ── GET /api/generation/{id} ──────────────────────────────────────────────────
@router.get(
    "/generation/{generation_id}",
    response_model=GenerationOut,
    tags=["Generation"],
    responses={
        200: {
            "description": "Successfully retrieved generation details."
        },
        404: {
            "description": "Generation not found.",
            "content": {"application/json": {"example": {"detail": "Generation 123 not found."}}}
        }
    }
)
def get_generation_by_id(
    generation_id: int,
    repo: GenerationRepository = Depends(get_repo),
):
    """
    Fetch a single generation (initial or refined) by ID — canonical path.
    """
    cached = get_cached_generation(generation_id)
    if cached is not None:
        return cached

    generation = repo.get_by_id(generation_id)
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Generation {generation_id} not found.")
    serialized = GenerationOut.model_validate(generation).model_dump(mode="json")
    if generation.status == "completed":
        set_cached_generation(generation_id, serialized)
    return serialized


# ── POST /api/history/{id}/select/{variation_id} ──────────────────────────────
@router.post(
    "/history/{generation_id}/select/{variation_id}",
    response_model=GenerationOut,
    tags=["History"],
    responses={
        200: {
            "description": "Successfully registered selected variation."
        },
        400: {
            "description": "Validation failed (e.g. variation does not belong to generation).",
            "content": {"application/json": {"example": {"detail": "Variation 2 does not belong to Generation 1"}}}
        }
    }
)
def select_variation(
    generation_id: int,
    variation_id: int,
    repo: GenerationRepository = Depends(get_repo),
):
    """
    Register which design variation was chosen/saved by the user.
    """
    try:
        generation = repo.set_selected_variation(generation_id, variation_id)
        invalidate_generation_cache(generation_id)
        return generation
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to set selected variation: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Internal database update error.")


# ── DELETE /api/history/{id} ──────────────────────────────────────────────────
@router.delete(
    "/history/{generation_id}",
    tags=["History"],
    responses={
        200: {
            "description": "Generation successfully deleted from DB and filesystem.",
            "content": {"application/json": {"example": {"deleted": True}}}
        },
        404: {
            "description": "Generation not found.",
            "content": {"application/json": {"example": {"detail": "Generation 123 not found."}}}
        }
    }
)
def delete_generation(
    generation_id: int,
    background_tasks: BackgroundTasks,
    repo: GenerationRepository = Depends(get_repo),
):
    """
    Delete a generation record, its child variations, and all associated image files.
    
    File cleanup is performed asynchronously in a background task to return immediately.
    """
    generation = repo.get_by_id(generation_id)
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Generation {generation_id} not found.")

    files = []
    
    # Collect files from refinement generations (children) first to avoid FK constraint failures
    children = repo.get_children(generation_id)
    for child in children:
        if child.original_image_path:
            files.append(child.original_image_path)
        for v in child.variations:
            if v.image_path:
                files.append(v.image_path)
        repo.delete(child.id)
        invalidate_generation_cache(child.id)

    # Collect files from parent generation
    if generation.original_image_path:
        files.append(generation.original_image_path)
    for v in generation.variations:
        if v.image_path:
            files.append(v.image_path)

    repo.delete(generation_id)
    invalidate_generation_cache(generation_id)
    invalidate_history_cache()

    import os
    def _delete_files():
        for f in files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception as ex:
                logger.warning(f"Could not delete file {f}: {ex}")

    background_tasks.add_task(_delete_files)

    return {"deleted": True}


class RenameRequest(BaseModel):
    room_type_detected: str

# ── PATCH /api/history/{id} ───────────────────────────────────────────
@router.patch(
    "/history/{generation_id}",
    response_model=GenerationOut,
    tags=["History"],
    responses={
        200: {"description": "Generation renamed."},
        404: {"description": "Generation not found."},
        422: {"description": "Validation error."},
    }
)
def rename_generation(
    generation_id: int,
    req: RenameRequest,
    repo: GenerationRepository = Depends(get_repo),
):
    """
    Rename a generation by updating room_type_detected.
    Also invalidates both the individual and history list caches.
    """
    if not req.room_type_detected or not req.room_type_detected.strip():
        raise HTTPException(status_code=422, detail="Name cannot be empty.")
    
    generation = repo.get_by_id(generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail=f"Generation {generation_id} not found.")

    try:
        generation.room_type_detected = req.room_type_detected.strip()
        repo.db.commit()
        repo.db.refresh(generation)
    except Exception as ex:
        repo.db.rollback()
        logger.error(f"Failed to rename generation {generation_id}: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error renaming generation: {ex}"
        )

    invalidate_generation_cache(generation_id)
    invalidate_history_cache()
    logger.info(f"Renamed Generation id={generation_id} to '{generation.room_type_detected}'")

    return generation


# ── DELETE /api/history/refinement/{id} ───────────────────────────────────────
@router.delete(
    "/history/refinement/{generation_id}",
    tags=["History"],
)
def delete_refinement(
    generation_id: int,
    background_tasks: BackgroundTasks,
    repo: GenerationRepository = Depends(get_repo),
):
    """
    Delete a specific refinement generation.
    Cascades: removes variation images from filesystem, invalidates both
    the parent generation cache and the history list cache.
    """
    generation = repo.get_by_id(generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail=f"Refinement {generation_id} not found.")
        
    if generation.parent_generation_id is None:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a root generation via this endpoint. Use DELETE /api/history/{id}"
        )
    
    parent_id = generation.parent_generation_id
    files = []
    for v in generation.variations:
        if v.image_path:
            files.append(v.image_path)
    
    try:
        repo.delete(generation_id)
    except Exception as ex:
        logger.error(f"Failed to delete refinement {generation_id}: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error deleting refinement: {ex}"
        )
    
    # Invalidate both the parent generation and the full history list
    invalidate_generation_cache(parent_id)
    invalidate_history_cache()
    
    import os
    def _delete_files():
        for f in files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception as e:
                logger.warning(f"Could not delete file {f}: {e}")
    background_tasks.add_task(_delete_files)
    
    return {"deleted": True}
