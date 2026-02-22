"""
Authentication service — password hashing, JWT tokens, user CRUD.
Uses SQLite for persistent storage.
"""

import json
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import get_settings
from app.database import get_db
from app.models.user import (
    UserRegister,
    UserResponse,
    TokenResponse,
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


def _row_to_user_response(row) -> UserResponse:
    """Convert a SQLite row to UserResponse."""
    return UserResponse(
        id=row["id"],
        email=row["email"],
        username=row["username"],
        study_domain=row["study_domain"] or "",
        bio=row["bio"] or "",
        interests=json.loads(row["interests"]) if row["interests"] else [],
        strengths=json.loads(row["strengths"]) if row["strengths"] else [],
        weaknesses=json.loads(row["weaknesses"]) if row["weaknesses"] else [],
        learning_goals=json.loads(row["learning_goals"]) if row["learning_goals"] else [],
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else None,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UserResponse:
    """Dependency: extract and validate JWT, return UserResponse."""
    user_id = decode_access_token(credentials.credentials)

    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return _row_to_user_response(row)
    finally:
        await db.close()


# ── User CRUD ─────────────────────────────────────────────────────────

async def register_user(data: UserRegister) -> TokenResponse:
    """Create a new user, return JWT + user info."""
    db = await get_db()
    try:
        # Check duplicate email
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (data.email.lower(),))
        existing = await cursor.fetchone()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user_id = uuid.uuid4().hex[:16]
        now = datetime.now(timezone.utc).isoformat()

        await db.execute(
            """INSERT INTO users (id, email, username, hashed_password, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, data.email.lower(), data.username, hash_password(data.password), now, now),
        )
        await db.commit()

        user_resp = UserResponse(
            id=user_id,
            email=data.email.lower(),
            username=data.username,
            created_at=datetime.fromisoformat(now),
            updated_at=datetime.fromisoformat(now),
        )
        token = create_access_token(user_id)
        return TokenResponse(access_token=token, user=user_resp)
    finally:
        await db.close()


async def login_user(email: str, password: str) -> TokenResponse:
    """Validate credentials, return JWT + user info."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        if not verify_password(password, row["hashed_password"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        token = create_access_token(row["id"])
        user_resp = _row_to_user_response(row)
        return TokenResponse(access_token=token, user=user_resp)
    finally:
        await db.close()
