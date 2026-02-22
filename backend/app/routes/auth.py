"""
Auth routes — register, login, me.
"""

from fastapi import APIRouter, Depends

from app.models.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.services.auth import register_user, login_user, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister):
    """Create a new user account and return a JWT token."""
    return await register_user(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Authenticate with email & password, return a JWT token."""
    return await login_user(data.email, data.password)


@router.get("/me", response_model=UserResponse)
async def me(current_user: UserResponse = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user
