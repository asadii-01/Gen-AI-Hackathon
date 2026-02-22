"""
User models for authentication.
"""

from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


# ── Request Models ───────────────────────────────────────────────────

class UserRegister(BaseModel):
    """Registration request."""
    email: str = Field(..., min_length=3)
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """Login request."""
    email: str
    password: str


# ── Response Models ──────────────────────────────────────────────────

class UserResponse(BaseModel):
    """Public user info (never includes password)."""
    id: str
    email: str
    username: str
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT token returned after login/register."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── In-Memory Store ──────────────────────────────────────────────────

# key = user_id, value = full user dict (including hashed_password)
users_db: dict[str, dict] = {}

# secondary index: email -> user_id  (for fast login lookup)
email_index: dict[str, str] = {}
