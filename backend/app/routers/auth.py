from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, ConfigDict
from app.database.session import get_db
from app.database.models import User, Generation
from app.auth.dependencies import get_current_user
from app.services.storage_service import StorageService
import random, re

router = APIRouter(prefix="/auth", tags=["Auth"])

class UserOut(BaseModel):
    id: str | int
    email: str
    display_name: str | None
    photo_url: str | None
    username: str | None
    bio: str | None
    theme_preference: str
    email_notifications: bool
    profile_completed: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    display_name: str | None = None
    username: str | None = None
    bio: str | None = None
    photo_url: str | None = None
    theme_preference: str | None = None
    profile_completed: bool | None = None

class SettingsUpdate(BaseModel):
    theme_preference: str | None = None
    email_notifications: bool | None = None

@router.post("/sync", response_model=UserOut)
async def sync_user(response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Called once right after sign-up/sign-in on the frontend. get_current_user already
    upserts the row; this endpoint's job is just to refresh last_login_at and
    return the canonical profile so the frontend can populate the header/account UI.
    """
    user.last_login_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    
    if getattr(user, "_is_new", False):
        response.status_code = 201
    else:
        response.status_code = 200
        
    return user

@router.get("/me", response_model=UserOut, status_code=200)
async def get_me(user: User = Depends(get_current_user)):
    return user

@router.patch("/me", response_model=UserOut)
async def update_profile(updates: UserUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if updates.display_name is not None:
        user.display_name = updates.display_name
    if updates.username is not None:
        user.username = updates.username
    if updates.bio is not None:
        user.bio = updates.bio
    if updates.photo_url is not None:
        user.photo_url = updates.photo_url
    if updates.theme_preference is not None:
        user.theme_preference = updates.theme_preference
    if updates.profile_completed is not None:
        user.profile_completed = updates.profile_completed
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/me/settings", response_model=UserOut)
async def update_settings(updates: SettingsUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if updates.theme_preference is not None:
        user.theme_preference = updates.theme_preference
    if updates.email_notifications is not None:
        user.email_notifications = updates.email_notifications
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/me", status_code=204)
async def delete_account(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.delete(user)
    await db.commit()
    return Response(status_code=204)

@router.get("/check-username")
async def check_username(username: str, db: AsyncSession = Depends(get_db)):
    exists = await db.scalar(select(User).where(User.username == username)) is not None
    return {"available": not exists}

@router.get("/username-suggest")
async def suggest_usernames(display_name: str, db: AsyncSession = Depends(get_db)):
    base = re.sub(r'[^a-z0-9]', '', display_name.lower())[:15] or "user"
    suggestions = []
    attempts = 0
    while len(suggestions) < 3 and attempts < 20:
        candidate = f"{base}_{random.randint(10,99)}" if suggestions else base
        exists = await db.scalar(select(User).where(User.username == candidate))
        if not exists:
            suggestions.append(candidate)
        attempts += 1
    return {"suggestions": suggestions}

@router.get("/me/stats")
async def get_user_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total = await db.scalar(
        select(func.count(Generation.id)).where(Generation.user_id == user.id, Generation.status == 'completed')
    )
    style_row = await db.execute(
        select(Generation.style, func.count(Generation.style).label('cnt'))
        .where(Generation.user_id == user.id)
        .group_by(Generation.style)
        .order_by(func.count(Generation.style).desc())
        .limit(1)
    )
    top_style = style_row.first()
    return {
        "total_designs": total or 0,
        "favorite_style": top_style[0] if top_style else None,
        "member_since": user.created_at.isoformat() if user.created_at else None,
    }

@router.post("/avatar")
async def upload_avatar(image: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Saves the uploaded avatar locally and returns its static URL path."""
    import asyncio
    from fastapi.concurrency import run_in_threadpool
    
    original_path = await run_in_threadpool(StorageService.save_upload, image)
    photo_url = f"/static/{original_path}"
    
    return {"photo_url": photo_url}
