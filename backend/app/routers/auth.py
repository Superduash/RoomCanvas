from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.database.models import User
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

class UserOut(BaseModel):
    id: int
    email: str
    display_name: str | None
    photo_url: str | None
    username: str | None
    bio: str | None
    theme_preference: str
    email_notifications: bool
    created_at: datetime
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    display_name: str | None = None
    username: str | None = None
    bio: str | None = None

class SettingsUpdate(BaseModel):
    theme_preference: str | None = None
    email_notifications: bool | None = None

@router.post("/sync", response_model=UserOut)
def sync_user(response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Called once right after sign-up/sign-in on the frontend. get_current_user already
    upserts the row; this endpoint's job is just to refresh last_login_at and
    return the canonical profile so the frontend can populate the header/account UI.
    """
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    if getattr(user, "_is_new", False):
        response.status_code = 201
    else:
        response.status_code = 200
        
    return user

@router.get("/me", response_model=UserOut, status_code=200)
def get_me(user: User = Depends(get_current_user)):
    return user

@router.patch("/me", response_model=UserOut)
def update_profile(updates: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if updates.display_name is not None:
        user.display_name = updates.display_name
    if updates.username is not None:
        user.username = updates.username
    if updates.bio is not None:
        user.bio = updates.bio
    db.commit()
    db.refresh(user)
    return user

@router.patch("/me/settings", response_model=UserOut)
def update_settings(updates: SettingsUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if updates.theme_preference is not None:
        user.theme_preference = updates.theme_preference
    if updates.email_notifications is not None:
        user.email_notifications = updates.email_notifications
    db.commit()
    db.refresh(user)
    return user

@router.delete("/me", status_code=204)
def delete_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(user)
    db.commit()
    return Response(status_code=204)
