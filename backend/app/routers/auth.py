from datetime import datetime, timezone
import logging

_log = logging.getLogger("app.auth")
from fastapi import APIRouter, Depends, Response, UploadFile, File, BackgroundTasks
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

class SyncRequest(BaseModel):
    display_name: str | None = None

@router.post("/sync", response_model=UserOut)
async def sync_user(body: SyncRequest, response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Called once right after sign-up/sign-in on the frontend. get_current_user already
    upserts the row; this endpoint's job is just to refresh last_login_at and
    return the canonical profile so the frontend can populate the header/account UI.
    """
    if body.display_name and not user.display_name:
        user.display_name = body.display_name
    
    user.last_login_at = datetime.now(timezone.utc)
    try:
        await db.commit()
        await db.refresh(user)
    except Exception as exc:
        await db.rollback()
        _log.error(f"Failed to update last_login_at in /auth/sync: {exc}")
        # Non-fatal: user object is still valid from get_current_user, just return it

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
    from fastapi import HTTPException
    from sqlalchemy.exc import IntegrityError
    
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
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="That username is already taken. Please choose another.")
    except Exception as exc:
        await db.rollback()
        _log.error(f"Failed to update user profile: {exc}")
        raise HTTPException(status_code=500, detail="Failed to save profile changes. Please try again.")
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
async def delete_account(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Collect every file this user owns BEFORE the cascade delete removes the rows
    result = await db.execute(select(Generation).where(Generation.user_id == user.id))
    generations = result.scalars().all()
    files = [user.photo_url] if user.photo_url else []
    for g in generations:
        if g.original_image_path:
            files.append(g.original_image_path)
        for v in getattr(g, "variations", []):
            if v.image_path:
                files.append(v.image_path)

    await db.delete(user)   # cascades Generations + Variations at the DB row level
    await db.commit()

    # Clean up files in background
    def _cleanup():
        for f in files:
            StorageService.delete_file_if_exists(f)
    
    background_tasks.add_task(_cleanup)

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

@router.post("/avatar", response_model=UserOut)
async def upload_avatar(
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.utils.image_utils import validate_image_file
    from app.utils.exceptions import InvalidImageError
    from fastapi import HTTPException

    try:
        validate_image_file(image)
    except InvalidImageError as e:
        raise HTTPException(status_code=400, detail=str(e))

    old_photo_key = user.photo_url  # capture before overwrite, to clean up after

    try:
        key = await StorageService.save_upload(image, prefix="avatars")
        photo_url = StorageService.resolve_public_url(key)
    except Exception as e:
        _log.error(f"Avatar upload failed for user {user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not upload photo. Please try again.")

    # Persist to DB right here — don't make the frontend do a second PATCH call for this
    user.photo_url = photo_url
    try:
        await db.commit()
        await db.refresh(user)
    except Exception as exc:
        await db.rollback()
        _log.error(f"Failed to save photo_url for user {user.id}: {exc}")
        raise HTTPException(status_code=500, detail="Photo uploaded but failed to save to your profile. Please try again.")

    # Clean up the old avatar file now that the new one is safely saved
    if old_photo_key and old_photo_key != photo_url:
        StorageService.delete_by_url_if_exists(old_photo_key)

    return user
