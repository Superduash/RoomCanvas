from fastapi import Header, HTTPException, Depends
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import User
from datetime import datetime
from sqlalchemy.exc import IntegrityError

async def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session — please sign in again")

    firebase_uid = decoded["uid"]
    email = decoded.get("email", "")
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    is_new = False
    
    if user is None:
        if email:
            user = db.query(User).filter(User.email == email).first()
            
        if user:
            user.firebase_uid = firebase_uid
            user.last_login_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
        else:
            user = User(
                firebase_uid=firebase_uid,
                email=email,
                display_name=decoded.get("name"),
                photo_url=decoded.get("picture"),
            )
            db.add(user)
            try:
                db.commit()
                db.refresh(user)
                is_new = True
            except IntegrityError:
                db.rollback()
                user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
                if not user:
                    raise HTTPException(status_code=500, detail="Failed to create or retrieve user")
    else:
        user.last_login_at = datetime.utcnow()
        db.commit()
        
    user._is_new = is_new
    return user
