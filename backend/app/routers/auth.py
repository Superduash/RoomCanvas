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
    created_at: datetime
    class Config:
        from_attributes = True

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
