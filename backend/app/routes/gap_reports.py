"""
Gap report history routes — list, view, delete past debate gap reports.
"""

from fastapi import APIRouter, Depends

from app.models.user import UserResponse, GapReportRecord, GapReportListItem
from app.services.auth import get_current_user
from app.services.gap_report_store import (
    get_user_gap_reports,
    get_gap_report_by_id,
    delete_gap_report,
)

router = APIRouter(prefix="/api/gap-reports", tags=["Gap Reports"])


@router.get("", response_model=list[GapReportListItem])
async def list_my_gap_reports(
    current_user: UserResponse = Depends(get_current_user),
):
    """List all gap reports for the current user (summary view)."""
    return await get_user_gap_reports(current_user.id)


@router.get("/{report_id}", response_model=GapReportRecord)
async def get_my_gap_report(
    report_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Get a specific gap report by ID."""
    return await get_gap_report_by_id(report_id, current_user.id)


@router.delete("/{report_id}")
async def delete_my_gap_report(
    report_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a specific gap report."""
    return await delete_gap_report(report_id, current_user.id)
