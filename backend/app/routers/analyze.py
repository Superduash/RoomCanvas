from fastapi import APIRouter, Depends, UploadFile, File, Form
from app.database.session import get_db
from sqlalchemy.orm import Session
from app.repositories.generation_repository import GenerationRepository
from app.services.analysis_service import AnalysisService
from app.services.storage_service import StorageService
from app.utils.image_utils import validate_image_file
from app.schemas.generation import AnalyzeResponse
from app.middleware.rate_limit import RateLimiter
from app.auth.dependencies import get_current_user
from app.database.models import User

router = APIRouter(prefix="/analyze", tags=["Analysis"])

@router.post(
    "",
    response_model=AnalyzeResponse,
    status_code=201,
    dependencies=[Depends(RateLimiter("analyze", 10, 3600))],

    responses={
        201: {
            "description": "Room analyzed successfully (or gracefully handled fallback in case of AI provider failure).",
            "content": {
                "application/json": {
                    "example": {
                        "analysis_id": 1,
                        "room_type": "Living Room",
                        "furniture": [
                            {"item": "Sofa", "description": "3-seater beige fabric sofa", "estimated_price_range": "$500-$800"}
                        ],
                        "estimated_dimensions": {"width_ft": 12.5, "length_ft": 15.0, "confidence": "high"},
                        "layout_notes": "Good flow, keep main pathway clear.",
                        "color_palette": [
                            {"name": "Off White", "hex": "#F5F5F0"}
                        ],
                        "lighting_suggestions": "Add warm floor lamps to corners.",
                        "estimated_budget_range": "$1500-$2500",
                        "style_explanation": "Scandinavian design maximizes natural light and space efficiency.",
                        "redesign_prompt": "Scandinavian living room with beige sofa, ash wood coffee table, and soft green wall accents."
                    }
                }
            }
        },
        400: {
            "description": "Invalid image payload or dimensions exceed limitations.",
            "content": {
                "application/json": {
                    "example": {"detail": "Unsupported file format: text/plain. Only JPEG, PNG, and WEBP are allowed."}
                }
            }
        }
    }
)
async def analyze_room(
    image: UploadFile = File(...),
    style: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a room image and generate detailed interior design analysis recommendations.
    
    If the external AI provider fails or times out, a graceful fallback analysis response 
    will still be generated to allow manual refinement rather than crashing the flow.
    """
    validate_image_file(image)
    original_image_path = StorageService.save_upload(image)
    
    repository = GenerationRepository(db)
    service = AnalysisService(repository)
    
    # Read bytes for analysis
    image.file.seek(0)
    image_bytes = image.file.read()
    
    response = await service.create_analysis(
        image_bytes=image_bytes,
        mime_type=image.content_type or "image/jpeg",
        style_id=style,
        original_image_path=original_image_path,
        user_id=current_user.id
    )
    
    return response
