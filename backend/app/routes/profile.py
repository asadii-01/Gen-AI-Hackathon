"""
Profile routes — view, update, delete user profile.
"""

from fastapi import APIRouter, Depends

from app.models.user import UserProfileUpdate, UserResponse
from app.services.auth import get_current_user
from app.services.profile import get_profile, update_profile, delete_account

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("", response_model=UserResponse)
async def get_my_profile(current_user: UserResponse = Depends(get_current_user)):
    """Get the current user's full profile."""
    return await get_profile(current_user.id)


@router.put("", response_model=UserResponse)
async def update_my_profile(
    data: UserProfileUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    """Update the current user's profile fields."""
    return await update_profile(current_user.id, data)


@router.delete("")
async def delete_my_account(current_user: UserResponse = Depends(get_current_user)):
    """Delete the current user's account and all associated data."""
    return await delete_account(current_user.id)
