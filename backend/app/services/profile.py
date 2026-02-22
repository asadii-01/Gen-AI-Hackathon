"""
Profile CRUD service for SocraticCanvas.
Manages user profile data in SQLite.
"""

import json
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.database import get_db
from app.models.user import UserProfileUpdate, UserResponse
from app.services.auth import _row_to_user_response


async def get_profile(user_id: str) -> UserResponse:
    """Get full user profile."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return _row_to_user_response(row)
    finally:
        await db.close()


async def update_profile(user_id: str, data: UserProfileUpdate) -> UserResponse:
    """Update user profile fields (partial update)."""
    db = await get_db()
    try:
        # Build dynamic SET clause from non-None fields
        updates: dict = {}
        update_data = data.model_dump(exclude_none=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        for field, value in update_data.items():
            if isinstance(value, list):
                updates[field] = json.dumps(value)
            else:
                updates[field] = value

        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [user_id]

        result = await db.execute(
            f"UPDATE users SET {set_clause} WHERE id = ?",
            values,
        )
        await db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        return await get_profile(user_id)
    finally:
        await db.close()


async def delete_account(user_id: str) -> dict:
    """Delete a user account and all their gap reports."""
    db = await get_db()
    try:
        # Delete gap reports first (FK constraint)
        await db.execute("DELETE FROM gap_reports WHERE user_id = ?", (user_id,))
        result = await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
        await db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        return {"detail": "Account deleted successfully"}
    finally:
        await db.close()
