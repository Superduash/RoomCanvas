from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.config import settings
from app.cache.redis_cache import cached_json

router = APIRouter(prefix="/providers", tags=["Providers"])

def get_cached_providers_data():
    def compute_fn():
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
    return cached_json("providers:v1", 3600, compute_fn)

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
    data = get_cached_providers_data()
    response = JSONResponse(content=data)
    response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=3600"
    return response
