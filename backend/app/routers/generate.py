"""
generate.py — /api/generate endpoint.

Day 1: Uses mock services.  On Day 4, replace the three service instantiations
below with real PyTorch implementations — no other code in this file changes.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.config import settings
from app.database.session import get_db
from app.repositories.generation_repository import GenerationRepository
from app.schemas.generation import GenerateResponse
from app.utils.image_utils import validate_image_file, save_upload
from app.utils.exceptions import InvalidImageError, InferenceServiceError

from ai.service import AIService
from ai.services.orchestrator import GenerationOrchestrator

router = APIRouter()
logger = logging.getLogger(__name__)

def get_ai_service(db: Session = Depends(get_db)) -> AIService:
    """Dependency that wires DB session into the AI Service."""
    repo = GenerationRepository(db)
    orchestrator = GenerationOrchestrator(repository=repo)
    return AIService(orchestrator=orchestrator)

@router.post(
    "/generate",
    response_model=GenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate interior design variations",
    description=(
        "Accepts a room photo and a design style, runs the full AI pipeline "
        "and returns 3 distinct design variations."
    ),
)
async def generate_design(
    image: UploadFile = File(..., description="Room photo (PNG / JPG / WEBP, max 10 MB)"),
    style: str = Form(..., description="Design style key, e.g. 'modern_minimalist'"),
    ai_service: AIService = Depends(get_ai_service),
) -> GenerateResponse:
    logger.info("POST /api/generate — style=%r  filename=%r", style, image.filename)

    # 1. Validate uploaded file (content-type + size)
    try:
        validate_image_file(image)
    except InvalidImageError as exc:
        logger.warning("Upload validation failed: %s", exc.message)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    except Exception as exc:
        logger.error("Unexpected validation error: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image validation failed.")

    # 2. Persist the original upload to disk
    try:
        saved_path = save_upload(image, settings.UPLOAD_DIR)
        logger.info("Upload saved → %s", saved_path)
    except Exception as exc:
        logger.error("Failed to save upload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store uploaded file.",
        )

    # 3. Run the full generation pipeline
    try:
        result = ai_service.generate_design(
            image_path=saved_path,
            style=style,
            n=settings.NUM_VARIATIONS,
        )
        return result
    except InferenceServiceError as exc:
        logger.error("Pipeline failed: %s", exc.message)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=exc.message)
    except Exception as exc:
        logger.error("Uncaught pipeline error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during design generation.",
        )
