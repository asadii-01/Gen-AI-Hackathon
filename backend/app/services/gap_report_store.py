"""
Gap Report persistence service for SocraticCanvas.
Saves and retrieves gap reports from SQLite.
"""

import json
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.database import get_db
from app.models.user import GapReportRecord, GapReportListItem
from app.models.schemas import GapReport


async def save_gap_report(
    user_id: str,
    debate_session_id: str,
    topic_title: str,
    gap_report: GapReport,
) -> GapReportRecord:
    """Persist a gap report to the database."""
    db = await get_db()
    try:
        report_id = uuid.uuid4().hex[:16]
        now = datetime.now(timezone.utc).isoformat()

        # Serialize judge evaluations to JSON
        judge_evals_json = json.dumps(
            [je.model_dump() for je in gap_report.judge_evaluations]
        )

        await db.execute(
            """INSERT INTO gap_reports
               (id, user_id, debate_session_id, topic_title,
                reasoning_blind_spots, evidence_gaps, rhetorical_opportunities,
                follow_up_questions, recommended_readings, overall_summary,
                judge_evaluations, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                report_id,
                user_id,
                debate_session_id,
                topic_title,
                json.dumps(gap_report.reasoning_blind_spots),
                json.dumps(gap_report.evidence_gaps),
                json.dumps(gap_report.rhetorical_opportunities),
                json.dumps(gap_report.follow_up_questions),
                json.dumps(gap_report.recommended_readings),
                gap_report.overall_summary,
                judge_evals_json,
                now,
            ),
        )
        await db.commit()

        return GapReportRecord(
            id=report_id,
            user_id=user_id,
            debate_session_id=debate_session_id,
            topic_title=topic_title,
            reasoning_blind_spots=gap_report.reasoning_blind_spots,
            evidence_gaps=gap_report.evidence_gaps,
            rhetorical_opportunities=gap_report.rhetorical_opportunities,
            follow_up_questions=gap_report.follow_up_questions,
            recommended_readings=gap_report.recommended_readings,
            overall_summary=gap_report.overall_summary,
            created_at=datetime.fromisoformat(now),
        )
    finally:
        await db.close()


async def get_user_gap_reports(user_id: str) -> list[GapReportListItem]:
    """List all gap reports for a user (summary view)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT id, debate_session_id, topic_title, overall_summary, created_at
               FROM gap_reports
               WHERE user_id = ?
               ORDER BY created_at DESC""",
            (user_id,),
        )
        rows = await cursor.fetchall()
        return [
            GapReportListItem(
                id=row["id"],
                debate_session_id=row["debate_session_id"],
                topic_title=row["topic_title"],
                overall_summary=row["overall_summary"] or "",
                created_at=datetime.fromisoformat(row["created_at"]),
            )
            for row in rows
        ]
    finally:
        await db.close()


async def get_gap_report_by_id(report_id: str, user_id: str) -> GapReportRecord:
    """Get a single gap report by ID (must belong to the user)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM gap_reports WHERE id = ? AND user_id = ?",
            (report_id, user_id),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gap report not found",
            )

        return GapReportRecord(
            id=row["id"],
            user_id=row["user_id"],
            debate_session_id=row["debate_session_id"],
            topic_title=row["topic_title"] or "",
            reasoning_blind_spots=json.loads(row["reasoning_blind_spots"]) if row["reasoning_blind_spots"] else [],
            evidence_gaps=json.loads(row["evidence_gaps"]) if row["evidence_gaps"] else [],
            rhetorical_opportunities=json.loads(row["rhetorical_opportunities"]) if row["rhetorical_opportunities"] else [],
            follow_up_questions=json.loads(row["follow_up_questions"]) if row["follow_up_questions"] else [],
            recommended_readings=json.loads(row["recommended_readings"]) if row["recommended_readings"] else [],
            overall_summary=row["overall_summary"] or "",
            created_at=datetime.fromisoformat(row["created_at"]),
        )
    finally:
        await db.close()


async def delete_gap_report(report_id: str, user_id: str) -> dict:
    """Delete a gap report (must belong to the user)."""
    db = await get_db()
    try:
        result = await db.execute(
            "DELETE FROM gap_reports WHERE id = ? AND user_id = ?",
            (report_id, user_id),
        )
        await db.commit()

        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gap report not found",
            )

        return {"detail": "Gap report deleted successfully"}
    finally:
        await db.close()
