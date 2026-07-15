from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.config import settings
from app.cache.redis_cache import cached_json

router = APIRouter(prefix="/providers", tags=["Providers"])

def get_cached_providers_data():
    def compute_fn():
        gemini_key = settings.GEMINI_API_KEY
        replicate_key = settings.REPLICATE_API_TOKEN
        return {
            "analysis": {
                "active": getattr(settings, "ACTIVE_ANALYSIS_PROVIDER", "gemini"),
                "configured": bool(gemini_key)
            },
            "generation": {
                "active": getattr(settings, "ACTIVE_GENERATION_PROVIDER", "replicate"),
                "configured": bool(replicate_key)
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
