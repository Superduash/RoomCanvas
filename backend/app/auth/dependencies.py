from fastapi import Header, HTTPException, Depends
from firebase_admin import auth as firebase_auth
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.database.models import User
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from fastapi.concurrency import run_in_threadpool
import logging

_log = logging.getLogger("app.auth")


async def _get_or_create_user(db: AsyncSession, firebase_uid: str, email: str, decoded: dict) -> tuple[User, bool]:
    user = (await db.execute(select(User).where(User.firebase_uid == firebase_uid))).scalar_one_or_none()
    is_new = False

    if user is None:
        if email:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()

        if user:
            # Existing user matched by email — attach their Firebase UID
            user.firebase_uid = firebase_uid
            user.last_login_at = datetime.now(timezone.utc)
            try:
                await db.commit()
                await db.refresh(user)
            except Exception as exc:
                await db.rollback()
                _log.error(f"Failed to update existing user firebase_uid: {exc}")
                raise HTTPException(status_code=500, detail="Database error updating user session. Please try again.")
        else:
            # Brand new user
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
            except IntegrityError as exc:
                await db.rollback()
                _log.warning(f"IntegrityError creating user (race condition), fetching existing: {exc}")
                user = (await db.execute(select(User).where(User.firebase_uid == firebase_uid))).scalar_one_or_none()
                if not user:
                    raise HTTPException(status_code=500, detail="Failed to create or retrieve user after conflict.")
            except Exception as exc:
                await db.rollback()
                _log.error(f"Unexpected DB error creating user: {exc}")
                raise HTTPException(status_code=500, detail="Database error creating user. Please try again.")
    else:
        # Existing user — update email if changed and last login
        if email and user.email != email:
            user.email = email   # keep in sync with Firebase after email changes
        user.last_login_at = datetime.now(timezone.utc)
        try:
            await db.commit()
        except Exception as exc:
            await db.rollback()
            _log.warning(f"Failed to update last_login_at (non-fatal): {exc}")
            # Non-fatal — user is still valid, continue

    return user, is_new


async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    from app.auth.firebase_admin_init import is_firebase_available
    if not is_firebase_available():
        raise HTTPException(
            status_code=503,
            detail=(
                "Authentication service (Firebase) is not configured on this server. "
                "Set FIREBASE_SERVICE_ACCOUNT_JSON in your environment variables."
            )
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header. Expected: Bearer <token>")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        decoded = await run_in_threadpool(firebase_auth.verify_id_token, token)
    except firebase_auth.ExpiredIdTokenError:
        _log.warning("Firebase token verification failed: token is expired.")
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    except firebase_auth.InvalidIdTokenError as e:
        _log.warning(f"Firebase token verification failed: invalid token — {e}")
        raise HTTPException(status_code=401, detail="Invalid session token. Please sign in again.")
    except firebase_auth.CertificateFetchError as e:
        _log.error(f"Firebase certificate fetch error (network issue): {e}")
        raise HTTPException(status_code=503, detail="Authentication service temporarily unavailable. Please try again shortly.")
    except Exception as e:
        _log.error(f"Firebase token verification failed with unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=401, detail=f"Session verification failed: {type(e).__name__}. Please sign in again.")

    firebase_uid = decoded["uid"]
    email = decoded.get("email", "")

    user, is_new = await _get_or_create_user(db, firebase_uid, email, decoded)
    user._is_new = is_new

    return user
