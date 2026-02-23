"""
TTS Route — Exposes Kokoro TTS as POST /api/tts endpoint.
Accepts text + role, returns WAV audio.
"""

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services.kokoro_tts import get_tts_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["TTS"])


class TTSRequest(BaseModel):
    """Request body for TTS synthesis."""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize")
    role: str = Field(
        default="moderator",
        description="Agent role for voice selection (moderator, debater_a, debater_b, etc.)"
    )
    persona_name: str = Field(
        default="",
        description="Persona display name (used to infer gender for debater voices)"
    )


@router.post("/tts")
async def synthesize_speech(request: TTSRequest):
    """
    Convert text to speech using Kokoro TTS with role-specific voices.

    Returns WAV audio bytes with appropriate content-type header.
    """
    try:
        tts = get_tts_service()
        audio_bytes = tts.synthesize(
            text=request.text,
            role=request.role,
            persona_name=request.persona_name,
        )

        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline; filename=speech.wav",
                "Cache-Control": "public, max-age=3600",
            },
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="TTS service unavailable — Kokoro library not installed.",
        )
    except Exception as e:
        logger.error(f"TTS synthesis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"TTS synthesis failed: {str(e)}",
        )
