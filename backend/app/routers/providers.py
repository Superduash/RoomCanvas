from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/providers", tags=["Providers"])

@router.get(
    "",
    status_code=200,
    responses={
        200: {
            "description": "Provider configuration and active status.",
            "content": {
                "application/json": {
                    "example": {
                        "analysis": {
                            "active": "gemini",
                            "configured": True
                        },
                        "generation": {
                            "active": "replicate",
                            "configured": True
                        }
                    }
                }
            }
        }
    }
)
def get_providers():
    """
    Get the status of the configured external AI providers (Gemini for analysis, Replicate for generation).
    """
    return {
        "analysis": {
            "active": settings.ACTIVE_ANALYSIS_PROVIDER,
            "configured": bool(settings.GEMINI_API_KEY)
        },
        "generation": {
            "active": settings.ACTIVE_GENERATION_PROVIDER,
            "configured": bool(settings.REPLICATE_API_TOKEN)
        }
    }
