"""
Topic API routes for SocraticCanvas.
"""

from fastapi import APIRouter, HTTPException

from app.content.loader import get_all_topics, get_topic
from app.models.schemas import TopicSummary, TopicDetail

router = APIRouter(prefix="/api/topics", tags=["Topics"])


@router.get("", response_model=list[TopicSummary])
async def list_topics():
    """List all available debate topics."""
    return get_all_topics()


@router.get("/{topic_id}", response_model=TopicDetail)
async def get_topic_detail(topic_id: str):
    """Get detailed information about a specific topic, including full persona profiles."""
    topic = get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic not found: {topic_id}")
    return topic
