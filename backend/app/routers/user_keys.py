from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.database.models import User
from app.services.key_service import KeyService
import httpx
from app.ai.providers.provider_registry import get_active_image_provider_info

router = APIRouter(prefix="/settings/keys", tags=["User Keys"])

class KeySetRequest(BaseModel):
    provider: str
    api_key: str
    preferred_model: str | None = None

class ProviderStatus(BaseModel):
    provider: str
    preferred_model: str | None = None

class ActiveProviderResponse(BaseModel):
    is_available: bool
    provider_name: str | None = None
    is_platform: bool = False

async def validate_api_key(provider: str, api_key: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if provider == "groq":
                resp = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                if resp.status_code != 200:
                    raise ValueError(f"Invalid Groq API key: {resp.text}")
            elif provider == "gemini":
                # Quick generateContent to test
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                    json={"contents": [{"parts": [{"text": "Hello"}]}]}
                )
                if resp.status_code != 200:
                    raise ValueError(f"Invalid Gemini API key: {resp.text}")
            elif provider == "replicate":
                resp = await client.get(
                    "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                if resp.status_code != 200:
                    raise ValueError(f"Invalid Replicate API key: {resp.text}")
            else:
                raise ValueError(f"Unknown provider: {provider}")
    except httpx.RequestError as e:
        raise ValueError(f"Network error validating key: {str(e)}")

@router.get("", response_model=list[ProviderStatus])
async def get_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    key_service = KeyService(db, user.id)
    return await key_service.get_all_configured_providers()

@router.get("/active", response_model=ActiveProviderResponse)
async def get_active_provider(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await get_active_image_provider_info(db, user.id)

@router.put("")
async def set_key(
    req: KeySetRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        await validate_api_key(req.provider, req.api_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    key_service = KeyService(db, user.id)
    try:
        await key_service.save_key(req.provider, req.api_key, req.preferred_model)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Key saved successfully"}

@router.delete("/{provider}")
async def delete_key(
    provider: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    key_service = KeyService(db, user.id)
    deleted = await key_service.delete_key(provider)
    if not deleted:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"message": "Key deleted"}
