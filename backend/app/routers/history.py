"""
history.py — History, generation fetch, variation select, delete.
Caches read operations; invalidates on every mutation.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.database.session import get_db, engine
from app.repositories.generation_repository import GenerationRepository
from app.schemas.project import ProjectOut, ProjectDetailsOut
from app.schemas.generation import GenerationOut
from pydantic import BaseModel
from app.cache import (
    get_cached_history, set_cached_history, invalidate_history_cache,
    get_cached_generation, set_cached_generation, invalidate_generation_cache,
)
from app.auth.dependencies import get_current_user
from app.database.models import User, Generation
import logging
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)


def get_repo(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)) -> GenerationRepository:
    return GenerationRepository(db, user_id=current_user.id)


# ── GET /api/history ───────────────────────────────────────────────────────────
@router.get(
    "/history",
    response_model=list[ProjectOut],
    tags=["History"],
)
async def list_history(
    limit: int = 50,
    repo: GenerationRepository = Depends(get_repo),
    current_user: User = Depends(get_current_user),
):
    cached = get_cached_history(current_user.id, limit)
    if cached is not None:
        return JSONResponse(content=cached)

    results = await repo.list_projects(limit=limit)
    serialized = [ProjectOut.model_validate(r).model_dump(mode="json") for r in results]
    set_cached_history(current_user.id, limit, serialized)

    response = JSONResponse(content=serialized)
    response.headers["Cache-Control"] = "no-store"
    return response

# ── GET /api/projects/{project_id} ────────────────────────────────────────────
@router.get(
    "/projects/{project_id}",
    response_model=ProjectDetailsOut,
    tags=["History"],
)
async def get_project_timeline(
    project_id: int,
    repo: GenerationRepository = Depends(get_repo),
):
    timeline = await repo.get_project_timeline(project_id)
    if not timeline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project {project_id} not found.")
        
    root = timeline[0]
    
    completed_gens = [g for g in timeline if g.status == "completed"]
    if not completed_gens:
        latest = timeline[-1]
    else:
        latest = max(completed_gens, key=lambda g: g.created_at)
        
    last_updated_at = max(g.created_at for g in timeline)
    version_count = len(timeline)
    
    project = {
        "id": root.id,
        "original_image_path": root.original_image_path,
        "room_type_detected": root.room_type_detected,
        "style": root.style,
        "created_at": root.created_at,
        "last_updated_at": last_updated_at,
        "version_count": version_count,
        "latest_generation": latest
    }
    
    return {
        "project": project,
        "timeline": timeline
    }


# ── DELETE /api/history/all ───────────────────────────────────────────────────
@router.delete(
    "/history/all",
    tags=["History"],
)
async def delete_all_history(
    background_tasks: BackgroundTasks,
    repo: GenerationRepository = Depends(get_repo),
):
    generations = await repo.list_all(limit=1000)
    files = []
    for g in generations:
        if g.original_image_path:
            files.append(g.original_image_path)
        for v in g.variations:
            if v.image_path:
                files.append(v.image_path)
    
    try:
        from sqlalchemy import delete, update
        from app.database.models import Generation, Variation
        
        # Break cyclic FKs
        await repo.db.execute(
            update(Generation)
            .where(Generation.user_id == repo.user_id)
            .values(selected_variation_id=None, parent_generation_id=None)
        )
        await repo.db.flush()

        gen_ids = [g.id for g in generations]
        if gen_ids:
            # Delete variations explicitly
            await repo.db.execute(delete(Variation).where(Variation.generation_id.in_(gen_ids)))
            await repo.db.flush()
            
        # Delete generations
        await repo.db.execute(delete(Generation).where(Generation.user_id == repo.user_id))
        await repo.db.commit()
    except Exception as ex:
        await repo.db.rollback()
        logger.error(f"Error truncating generations: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while clearing history."
        )
    
    asyncio.create_task(asyncio.to_thread(invalidate_history_cache, repo.user_id))
    
    from app.services.storage_service import StorageService
    def _delete_files():
        for f in files:
            StorageService.delete_file_if_exists(f)
    background_tasks.add_task(_delete_files)
    
    return {"deleted": True}


# ── GET /api/history/{id} ──────────────────────────────────────────────────────
@router.get(
    "/history/{generation_id}",
    response_model=GenerationOut,
    tags=["History"],
)
async def get_generation(
    generation_id: int,
    repo: GenerationRepository = Depends(get_repo),
):
    cached = get_cached_generation(generation_id)
    if cached is not None:
        return cached

    generation = await repo.get_by_id(generation_id)
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
)
async def get_generation_by_id(
    generation_id: int,
    repo: GenerationRepository = Depends(get_repo),
):
    return await get_generation(generation_id, repo)





# ── POST /api/history/{id}/select/{variation_id} ──────────────────────────────
@router.post(
    "/history/{generation_id}/select/{variation_id}",
    response_model=GenerationOut,
    tags=["History"],
)
async def select_variation(
    generation_id: int,
    variation_id: int,
    repo: GenerationRepository = Depends(get_repo),
):
    try:
        generation = await repo.set_selected_variation(generation_id, variation_id)
        asyncio.create_task(asyncio.to_thread(invalidate_generation_cache, generation_id, repo.user_id))
        return generation
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to set selected variation: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred while resetting the active variation.")


class RenameRequest(BaseModel):
    room_type_detected: str

# ── PATCH /api/history/{id} ───────────────────────────────────────────
@router.patch(
    "/history/{generation_id}",
    response_model=GenerationOut,
    tags=["History"],
)
async def rename_generation(
    generation_id: int,
    req: RenameRequest,
    repo: GenerationRepository = Depends(get_repo),
):
    if not req.room_type_detected or not req.room_type_detected.strip():
        raise HTTPException(status_code=422, detail="Name cannot be empty.")
    
    generation = await repo.get_by_id(generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail=f"Generation {generation_id} not found.")

    try:
        generation.room_type_detected = req.room_type_detected.strip()
        await repo.db.commit()
        await repo.db.refresh(generation)
    except Exception as ex:
        await repo.db.rollback()
        logger.error(f"Failed to rename generation {generation_id}: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while renaming the project."
        )

    asyncio.create_task(asyncio.to_thread(invalidate_generation_cache, generation_id, repo.user_id))
    logger.info(f"Renamed Generation id={generation_id} to '{generation.room_type_detected}'")

    return generation


async def _collect_and_prepare_delete(repo: GenerationRepository, generation) -> list[str]:
    """Re-parents children and returns the list of storage files safe to delete
    (i.e. not still referenced by any other generation). Does NOT delete the DB row itself."""
    children = await repo.get_children(generation.id)
    for child in children:
        child.parent_generation_id = generation.parent_generation_id
    if children:
        await repo.db.flush()

    files = []
    if generation.original_image_path:
        still_referenced = await repo.count_generations_referencing_path(generation.original_image_path)
        if still_referenced <= 1:
            files.append(generation.original_image_path)
        else:
            logger.info(f"Keeping original_image_path {generation.original_image_path} — still used by {still_referenced - 1} other generation(s)")

    for v in generation.variations:
        if v.image_path:
            still_referenced = await repo.count_generations_referencing_path(v.image_path)
            if still_referenced > 1:
                logger.warning(f"Skipped deleting {v.image_path} — still referenced by {still_referenced - 1} other generation(s)")
            else:
                files.append(v.image_path)
    return files


# ── DELETE /api/history/{id} ──────────────────────────────────────────────────
@router.delete(
    "/history/{generation_id}",
    tags=["History"],
)
async def delete_generation(
    generation_id: int,
    background_tasks: BackgroundTasks,
    repo: GenerationRepository = Depends(get_repo),
):
    generation = await repo.get_by_id(generation_id)
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Generation {generation_id} not found.")

    try:
        files = await _collect_and_prepare_delete(repo, generation)
        
        # Break cyclic FKs for this generation before deletion
        from sqlalchemy import update
        from app.database.models import Generation
        await repo.db.execute(
            update(Generation)
            .where(Generation.id == generation_id)
            .values(selected_variation_id=None, parent_generation_id=None)
        )
        await repo.db.flush()
        
        await repo.delete(generation_id)
    except Exception as ex:
        await repo.db.rollback()
        logger.error(f"Failed to delete generation {generation_id}: {ex}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while deleting this design.")

    asyncio.create_task(asyncio.to_thread(invalidate_generation_cache, generation_id, repo.user_id))
    if generation.parent_generation_id:
        asyncio.create_task(asyncio.to_thread(invalidate_generation_cache, generation.parent_generation_id, repo.user_id))

    from app.services.storage_service import StorageService
    background_tasks.add_task(lambda: [StorageService.delete_file_if_exists(f) for f in files])

    return {"deleted": True}


# ── DELETE /api/history/refinement/{id} ───────────────────────────────────────
@router.delete(
    "/history/refinement/{generation_id}",
    tags=["History"],
)
async def delete_refinement(
    generation_id: int,
    background_tasks: BackgroundTasks,
    repo: GenerationRepository = Depends(get_repo),
):
    generation = await repo.get_by_id(generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail=f"Refinement {generation_id} not found.")
        
    if generation.parent_generation_id is None:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a root generation via this endpoint. Use DELETE /api/history/{id}"
        )
    
    try:
        files = await _collect_and_prepare_delete(repo, generation)
        
        # Break cyclic FKs for this generation before deletion
        from sqlalchemy import update
        from app.database.models import Generation
        await repo.db.execute(
            update(Generation)
            .where(Generation.id == generation_id)
            .values(selected_variation_id=None, parent_generation_id=None)
        )
        await repo.db.flush()
        
        await repo.delete(generation_id)
    except Exception as ex:
        await repo.db.rollback()
        logger.error(f"Failed to delete refinement {generation_id}: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting the refinement."
        )
    
    asyncio.create_task(asyncio.to_thread(invalidate_generation_cache, generation.parent_generation_id, repo.user_id))
    
    from app.services.storage_service import StorageService
    background_tasks.add_task(lambda: [StorageService.delete_file_if_exists(f) for f in files])
    
    return {"deleted": True}


# ── DELETE /api/projects/{project_id} ─────────────────────────────────────────
@router.delete(
    "/projects/{project_id}",
    tags=["History"],
)
async def delete_project(
    project_id: int,
    background_tasks: BackgroundTasks,
    repo: GenerationRepository = Depends(get_repo),
):
    # Fetch the root and all its children
    timeline = await repo.get_project_timeline(project_id)
    if not timeline:
        raise HTTPException(status_code=404, detail="Project not found")
        
    root = timeline[0]
    if root.id != project_id or root.parent_generation_id is not None:
        raise HTTPException(status_code=400, detail="Provided ID is not a project root.")

    files = []
    # Collect all associated files for this entire project
    for generation in timeline:
        if generation.original_image_path and generation.original_image_path not in files:
            files.append(generation.original_image_path)
        for variation in generation.variations:
            if variation.image_path:
                files.append(variation.image_path)

    try:
        from sqlalchemy import delete, update
        from app.database.models import Generation, Variation
        gen_ids = [g.id for g in timeline]
        
        # Break cyclic FKs for this project
        await repo.db.execute(
            update(Generation)
            .where(Generation.id.in_(gen_ids))
            .values(selected_variation_id=None, parent_generation_id=None)
        )
        await repo.db.flush()
        
        # Delete variations explicitly
        await repo.db.execute(delete(Variation).where(Variation.generation_id.in_(gen_ids)))
        await repo.db.flush()
        
        # Delete generations
        await repo.db.execute(delete(Generation).where(Generation.id.in_(gen_ids)))
        await repo.db.commit()
    except Exception as ex:
        await repo.db.rollback()
        logger.error(f"Failed to delete project {project_id}: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting the project."
        )

    # Invalidate cache
    asyncio.create_task(asyncio.to_thread(invalidate_history_cache, repo.user_id))
    for g_id in gen_ids:
        asyncio.create_task(asyncio.to_thread(invalidate_generation_cache, g_id, repo.user_id))

    # Background task to clean up storage
    from app.services.storage_service import StorageService
    def _delete_files():
        for f in files:
            # Final sanity check just in case some other project is using the original_image (shouldn't happen but safe)
            # Actually since we delete the whole timeline synchronously above, count_generations_referencing_path would return 0 now.
            StorageService.delete_file_if_exists(f)

    background_tasks.add_task(_delete_files)

    return {"deleted": True}
