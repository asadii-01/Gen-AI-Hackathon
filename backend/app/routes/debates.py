"""
Debate API routes for SocraticCanvas.
Handles debate lifecycle: create, start, intervene, judge, and report.
"""

import json
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sse_starlette.sse import EventSourceResponse

from app.models.schemas import (
    CreateDebateRequest,
    DebateSessionResponse,
    StudentIntervention,
    GapReport,
    StreamEvent,
)
from app.models.user import UserResponse
from app.services.debate_manager import get_debate_manager
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/debates", tags=["Debates"])

# Optional auth — allows debates without login, but links to user if logged in
_bearer = HTTPBearer(auto_error=False)


async def _get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> UserResponse | None:
    """Return the current user if a valid token is provided, else None."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except Exception:
        return None


def _stream_event_to_sse(event: StreamEvent) -> dict:
    """Convert a StreamEvent to SSE-compatible format."""
    data = event.data if isinstance(event.data, str) else json.dumps(event.data)
    return {"event": event.event, "data": data}


@router.post("", response_model=DebateSessionResponse, status_code=201)
async def create_debate(
    request: CreateDebateRequest,
    current_user: UserResponse | None = Depends(_get_optional_user),
):
    """Create a new debate session for a given topic."""
    manager = get_debate_manager()
    try:
        user_id = current_user.id if current_user else None
        session = manager.create_session(request.topic_id, user_id=user_id)
        return session.to_response()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{session_id}", response_model=DebateSessionResponse)
async def get_debate(session_id: str):
    """Get the current state of a debate session."""
    manager = get_debate_manager()
    session = manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.to_response()


@router.post("/{session_id}/start")
async def start_debate(session_id: str):
    """Start the debate: generates moderator intro and both opening statements.

    Returns SSE stream with real-time updates.
    """
    manager = get_debate_manager()
    session = manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        async for event in manager.start_debate(session_id):
            yield _stream_event_to_sse(event)

    return EventSourceResponse(event_generator())


@router.post("/{session_id}/intervene")
async def submit_intervention(session_id: str, intervention: StudentIntervention):
    """Submit a student intervention (question, challenge, or final reflection).

    Returns SSE stream with debater responses.
    """
    manager = get_debate_manager()
    session = manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        async for event in manager.process_student_intervention(
            session_id, intervention.content, intervention.is_final_reflection
        ):
            yield _stream_event_to_sse(event)

    return EventSourceResponse(event_generator())


@router.post("/{session_id}/judge")
async def judge_debate(session_id: str):
    """Run all three judges on the debate and generate the gap report.

    Returns SSE stream with judge evaluations and final report.
    """
    manager = get_debate_manager()
    session = manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        async for event in manager.run_judges(session_id):
            yield _stream_event_to_sse(event)

    return EventSourceResponse(event_generator())


@router.get("/{session_id}/report", response_model=GapReport)
async def get_gap_report(session_id: str):
    """Get the final gap report for a completed debate."""
    manager = get_debate_manager()
    session = manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.gap_report is None:
        raise HTTPException(
            status_code=400,
            detail="Gap report not yet generated. Run /judge first.",
        )

    return session.gap_report


@router.get("/{session_id}/stream")
async def stream_debate(session_id: str):
    """SSE endpoint for streaming real-time debate updates.

    Connect to this endpoint to receive all debate events as they happen.
    Useful for the frontend to show live updates.
    """
    manager = get_debate_manager()
    session = manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_generator():
        # Send current state
        yield {
            "event": "state",
            "data": json.dumps({
                "phase": session.phase.value,
                "current_round": session.current_round,
                "message_count": len(session.messages),
            }),
        }

        # Send all existing messages
        for msg in session.messages:
            yield {
                "event": "message",
                "data": json.dumps({
                    "id": msg.id,
                    "role": msg.role.value,
                    "persona_name": msg.persona_name,
                    "content": msg.content,
                }),
            }

    return EventSourceResponse(event_generator())
