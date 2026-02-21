from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from .enums import DebatePhase, AgentRole


# ── Persona & Topic Models ──────────────────────────────────────────


class PersonaSummary(BaseModel):
    """Brief persona info for topic listings."""

    id: str
    name: str
    era: str
    role: str
    core_stance: str


class PersonaDetail(PersonaSummary):
    """Full persona profile."""

    knowledge: list[str] = []
    beliefs: list[str] = []
    distrusts: list[str] = []
    blind_spots: list[str] = []
    speaking_style: str = ""
    favorite_phrases: list[str] = []
    fallacies: list[str] = []
    constraints: list[str] = []


class TopicSummary(BaseModel):
    """Brief topic info for listing."""

    id: str
    title: str
    resolution: str
    persona_a: PersonaSummary
    persona_b: PersonaSummary


class TopicDetail(BaseModel):
    """Full topic with persona details."""

    id: str
    title: str
    resolution: str
    persona_a: PersonaDetail
    persona_b: PersonaDetail
    curveball_interventions: list[str] = []
    argument_map_a: list[str] = []
    argument_map_b: list[str] = []


# ── Debate Session Models ────────────────────────────────────────────


class DebateMessage(BaseModel):
    """A single message in the debate."""

    id: str
    role: AgentRole
    persona_name: str = ""
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CreateDebateRequest(BaseModel):
    """Request to create a new debate session."""

    topic_id: str


class StudentIntervention(BaseModel):
    """Student's input during the debate."""

    content: str
    is_final_reflection: bool = False


class DebateSessionResponse(BaseModel):
    """Response representing current debate state."""

    id: str
    topic_id: str
    topic_title: str
    phase: DebatePhase
    current_round: int
    max_rounds: int
    messages: list[DebateMessage] = []
    persona_a: PersonaSummary
    persona_b: PersonaSummary
    created_at: datetime


# ── Judge & Report Models ────────────────────────────────────────────


class JudgeScore(BaseModel):
    """Scores from a single judge evaluation."""

    category: str
    score: float = Field(ge=0, le=10)
    details: str = ""


class JudgeEvaluation(BaseModel):
    """Complete evaluation from one judge."""

    judge_type: str  # "logic", "evidence", "rhetoric"
    persona_a_scores: list[JudgeScore] = []
    persona_b_scores: list[JudgeScore] = []
    student_scores: list[JudgeScore] = []
    persona_a_overall: float = Field(default=0.0, ge=0, le=10)
    persona_b_overall: float = Field(default=0.0, ge=0, le=10)
    student_overall: float = Field(default=0.0, ge=0, le=10)
    strengths: list[str] = []
    weaknesses: list[str] = []
    recommendation: str = ""
    raw_feedback: str = ""


class GapReport(BaseModel):
    """Personalized gap report for the student."""

    reasoning_blind_spots: list[str] = []
    evidence_gaps: list[str] = []
    rhetorical_opportunities: list[str] = []
    follow_up_questions: list[str] = []
    recommended_readings: list[str] = []
    overall_summary: str = ""
    judge_evaluations: list[JudgeEvaluation] = []


# ── SSE Stream Models ─────────────────────────────────────────────────


class StreamEvent(BaseModel):
    """Server-Sent Event wrapper."""

    event: str  # "message", "phase_change", "judge_result", "report", "error", "done"
    data: dict | str
