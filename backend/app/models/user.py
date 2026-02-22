"""
User models for authentication and profile management.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


# ── Request Models ───────────────────────────────────────────────────

class UserRegister(BaseModel):
    """Registration request."""
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """Login request."""
    email: str
    password: str


class UserProfileUpdate(BaseModel):
    """Profile update request — all fields optional (partial update)."""
    username: Optional[str] = Field(None, min_length=2, max_length=50)
    study_domain: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    interests: Optional[list[str]] = None
    strengths: Optional[list[str]] = None
    weaknesses: Optional[list[str]] = None
    learning_goals: Optional[list[str]] = None


# ── Response Models ──────────────────────────────────────────────────

class UserResponse(BaseModel):
    """Public user info (never includes password)."""
    id: str
    email: str
    username: str
    study_domain: str = ""
    bio: str = ""
    interests: list[str] = []
    strengths: list[str] = []
    weaknesses: list[str] = []
    learning_goals: list[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    """JWT token returned after login/register."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Gap Report History Models ────────────────────────────────────────

class GapReportRecord(BaseModel):
    """Full gap report from the database."""
    id: str
    user_id: str
    debate_session_id: str
    topic_title: str = ""
    reasoning_blind_spots: list[str] = []
    evidence_gaps: list[str] = []
    rhetorical_opportunities: list[str] = []
    follow_up_questions: list[str] = []
    recommended_readings: list[str] = []
    overall_summary: str = ""
    created_at: datetime


class GapReportListItem(BaseModel):
    """Lightweight summary for listing gap reports."""
    id: str
    debate_session_id: str
    topic_title: str = ""
    overall_summary: str = ""
    created_at: datetime
