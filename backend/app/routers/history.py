from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.repositories.generation_repository import GenerationRepository
from app.schemas.generation import GenerationOut
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

def get_generation_repository(db: Session = Depends(get_db)) -> GenerationRepository:
    return GenerationRepository(db)

@router.get("/history", response_model=list[GenerationOut])
def list_history(
    limit: int = 50,
    repo: GenerationRepository = Depends(get_generation_repository)
):
    """
    Returns a list of past designs, ordered from most recent to oldest.
    """
    try:
        return repo.list_all(limit=limit)
    except Exception as e:
        logger.error(f"Failed to fetch design history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve history: {e}"
        )

@router.get("/history/{generation_id}", response_model=GenerationOut)
def get_generation(
    generation_id: int,
    repo: GenerationRepository = Depends(get_generation_repository)
):
    """
    Fetches the complete details of a single generation request by ID.
    """
    generation = repo.get_by_id(generation_id)
    if not generation:
        logger.warning(f"Generation ID {generation_id} requested but not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation with ID {generation_id} not found."
        )
    return generation

@router.post("/history/{generation_id}/select/{variation_id}", response_model=GenerationOut)
def select_variation(
    generation_id: int,
    variation_id: int,
    repo: GenerationRepository = Depends(get_generation_repository)
):
    """
    Registers which design variation was chosen by the user.
    """
    try:
        return repo.set_selected_variation(generation_id, variation_id)
    except ValueError as ve:
        logger.warning(f"Selected variation validation failed: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Failed to set selected variation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal database update error: {e}"
        )
