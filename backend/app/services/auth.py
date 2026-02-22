"""
Authentication service — password hashing, JWT tokens, user CRUD.
"""

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import get_settings
from app.models.user import (
    UserRegister,
    UserResponse,
    TokenResponse,
    users_db,
    email_index,
)

# ── Password Hashing (bcrypt directly) ───────────────────────────────


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT Helpers ───────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str:
    """Returns user_id or raises HTTPException."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


# ── FastAPI Dependency ────────────────────────────────────────────────

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UserResponse:
    """Dependency: extract and validate JWT, return UserResponse."""
    user_id = decode_access_token(credentials.credentials)
    user_data = users_db.get(user_id)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return UserResponse(
        id=user_data["id"],
        email=user_data["email"],
        username=user_data["username"],
        created_at=user_data["created_at"],
    )


# ── User CRUD ─────────────────────────────────────────────────────────

def register_user(data: UserRegister) -> TokenResponse:
    """Create a new user, return JWT + user info."""
    # Check duplicate email
    if data.email.lower() in email_index:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_id = uuid.uuid4().hex[:16]
    now = datetime.now(timezone.utc)

    user_record = {
        "id": user_id,
        "email": data.email.lower(),
        "username": data.username,
        "hashed_password": hash_password(data.password),
        "created_at": now,
    }

    users_db[user_id] = user_record
    email_index[data.email.lower()] = user_id

    token = create_access_token(user_id)
    user_resp = UserResponse(id=user_id, email=user_record["email"], username=data.username, created_at=now)
    return TokenResponse(access_token=token, user=user_resp)


def login_user(email: str, password: str) -> TokenResponse:
    """Validate credentials, return JWT + user info."""
    user_id = email_index.get(email.lower())
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user_record = users_db[user_id]
    if not verify_password(password, user_record["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user_id)
    user_resp = UserResponse(
        id=user_id,
        email=user_record["email"],
        username=user_record["username"],
        created_at=user_record["created_at"],
    )
    return TokenResponse(access_token=token, user=user_resp)
