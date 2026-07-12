from fastapi import Header, HTTPException, Depends
from firebase_admin import auth as firebase_auth
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.database.models import User
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from fastapi.concurrency import run_in_threadpool

async def _get_or_create_user(db: AsyncSession, firebase_uid: str, email: str, decoded: dict) -> tuple[User, bool]:
    user = (await db.execute(select(User).where(User.firebase_uid == firebase_uid))).scalar_one_or_none()
    is_new = False
    
    if user is None:
        if email:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            
        if user:
            user.firebase_uid = firebase_uid
            user.last_login_at = datetime.utcnow()
            await db.commit()
            await db.refresh(user)
        else:
            user = User(
                firebase_uid=firebase_uid,
                email=email,
                display_name=decoded.get("name"),
                photo_url=decoded.get("picture"),
            )
            db.add(user)
            try:
                await db.commit()
                await db.refresh(user)
                is_new = True
            except IntegrityError:
                await db.rollback()
                user = (await db.execute(select(User).where(User.firebase_uid == firebase_uid))).scalar_one_or_none()
                if not user:
                    raise HTTPException(status_code=500, detail="Failed to create or retrieve user")
    else:
        user.last_login_at = datetime.utcnow()
        await db.commit()
        
    return user, is_new

async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    from app.auth.firebase_admin_init import is_firebase_available
    if not is_firebase_available():
        raise HTTPException(
            status_code=503,
            detail="Authentication service (Firebase) is currently unavailable or not configured on this server."
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()

    
    try:
        # verify_id_token can be a blocking network call, moving it to threadpool
        decoded = await run_in_threadpool(firebase_auth.verify_id_token, token)
    except Exception as e:
        import logging
        logging.getLogger("app").error(f"Firebase token verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid or expired session — please sign in again")

    firebase_uid = decoded["uid"]
    email = decoded.get("email", "")
    
    user, is_new = await _get_or_create_user(db, firebase_uid, email, decoded)
    user._is_new = is_new
    
    return user
