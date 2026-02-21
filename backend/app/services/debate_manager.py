"""
Debate Session Manager for SocraticCanvas.
Manages debate state machine, in-memory session storage, and orchestrates agents.
"""

import uuid
import json
import asyncio
import logging
from datetime import datetime
from typing import AsyncGenerator

from app.models.enums import DebatePhase, AgentRole
from app.models.schemas import (
    DebateMessage,
    DebateSessionResponse,
    GapReport,
    JudgeEvaluation,
    PersonaSummary,
    StreamEvent,
)
from app.content.loader import get_topic, get_personas_for_topic
from app.services.agents import DebaterAgent, ModeratorAgent, JudgeAgent
from app.services.gap_report import generate_gap_report

logger = logging.getLogger(__name__)


class DebateSession:
    """Holds the state for a single debate session."""

    def __init__(self, session_id: str, topic_id: str):
        topic = get_topic(topic_id)
        if not topic:
            raise ValueError(f"Topic not found: {topic_id}")

        self.id = session_id
        self.topic_id = topic_id
        self.topic_title = topic.title
        self.resolution = topic.resolution
        self.phase = DebatePhase.CREATED
        self.current_round = 0
        self.max_rounds = 3
        self.messages: list[DebateMessage] = []
        self.judge_evaluations: list[JudgeEvaluation] = []
        self.gap_report: GapReport | None = None
        self.created_at = datetime.utcnow()

        # Set up personas
        self.persona_a = topic.persona_a
        self.persona_b = topic.persona_b

        # Create agents
        self.debater_a = DebaterAgent(
            self.persona_a, self.resolution, self.persona_b.name
        )
        self.debater_b = DebaterAgent(
            self.persona_b, self.resolution, self.persona_a.name
        )
        self.moderator = ModeratorAgent(
            self.persona_a.name, self.persona_b.name, self.resolution
        )

    def add_message(self, role: AgentRole, persona_name: str, content: str) -> DebateMessage:
        """Add a message to the debate transcript."""
        msg = DebateMessage(
            id=str(uuid.uuid4()),
            role=role,
            persona_name=persona_name,
            content=content,
        )
        self.messages.append(msg)
        return msg

    def get_debate_history_for_agent(self, agent_role: AgentRole) -> list[dict[str, str]]:
        """Build the conversation history from the perspective of a specific agent.

        Maps debate messages to assistant/user roles relative to the agent.
        """
        history = []
        for msg in self.messages:
            if msg.role == agent_role:
                history.append({"role": "assistant", "content": msg.content})
            elif msg.role == AgentRole.STUDENT:
                history.append({
                    "role": "user",
                    "content": f"[Student says]: {msg.content}",
                })
            elif msg.role == AgentRole.MODERATOR:
                history.append({
                    "role": "user",
                    "content": f"[Moderator]: {msg.content}",
                })
            else:
                # Opponent speech
                history.append({
                    "role": "user",
                    "content": f"[{msg.persona_name}]: {msg.content}",
                })
        return history

    def get_full_transcript(self) -> str:
        """Build a human-readable transcript of the full debate."""
        lines = []
        for msg in self.messages:
            speaker = msg.persona_name or msg.role.value
            lines.append(f"[{speaker}]: {msg.content}")
        return "\n\n".join(lines)

    def to_response(self) -> DebateSessionResponse:
        """Convert to API response model."""
        return DebateSessionResponse(
            id=self.id,
            topic_id=self.topic_id,
            topic_title=self.topic_title,
            phase=self.phase,
            current_round=self.current_round,
            max_rounds=self.max_rounds,
            messages=self.messages,
            persona_a=PersonaSummary(
                id=self.persona_a.id,
                name=self.persona_a.name,
                era=self.persona_a.era,
                role=self.persona_a.role,
                core_stance=self.persona_a.core_stance,
            ),
            persona_b=PersonaSummary(
                id=self.persona_b.id,
                name=self.persona_b.name,
                era=self.persona_b.era,
                role=self.persona_b.role,
                core_stance=self.persona_b.core_stance,
            ),
            created_at=self.created_at,
        )


class DebateSessionManager:
    """Manages all debate sessions and orchestrates the debate flow."""

    def __init__(self):
        self._sessions: dict[str, DebateSession] = {}

    def create_session(self, topic_id: str) -> DebateSession:
        """Create a new debate session."""
        session_id = str(uuid.uuid4())
        session = DebateSession(session_id, topic_id)
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> DebateSession | None:
        """Retrieve a session by ID."""
        return self._sessions.get(session_id)

    async def start_debate(self, session_id: str) -> AsyncGenerator[StreamEvent, None]:
        """Start the debate: moderator introduction + opening statements.

        Yields StreamEvents for real-time updates.
        """
        session = self._sessions.get(session_id)
        if not session:
            yield StreamEvent(event="error", data="Session not found")
            return

        if session.phase != DebatePhase.CREATED:
            yield StreamEvent(event="error", data="Debate already started")
            return

        # ── Moderator Introduction ──
        session.phase = DebatePhase.OPENING_A
        yield StreamEvent(
            event="phase_change",
            data={"phase": session.phase.value, "message": "Debate starting..."},
        )

        try:
            intro = await session.moderator.generate_introduction()
            msg = session.add_message(AgentRole.MODERATOR, "Moderator", intro)
            yield StreamEvent(
                event="message",
                data={
                    "id": msg.id,
                    "role": msg.role.value,
                    "persona_name": msg.persona_name,
                    "content": msg.content,
                },
            )
        except Exception as e:
            logger.error(f"Moderator intro error: {e}")
            yield StreamEvent(event="error", data=f"Failed to generate introduction: {str(e)}")
            return

        # ── Debater A Opening ──
        try:
            opening_a = await session.debater_a.generate_opening()
            msg = session.add_message(
                AgentRole.DEBATER_A, session.persona_a.name, opening_a
            )
            yield StreamEvent(
                event="message",
                data={
                    "id": msg.id,
                    "role": msg.role.value,
                    "persona_name": msg.persona_name,
                    "content": msg.content,
                },
            )
        except Exception as e:
            logger.error(f"Debater A opening error: {e}")
            yield StreamEvent(event="error", data=f"Failed to generate opening statement A: {str(e)}")
            return

        # ── Moderator Transition ──
        session.phase = DebatePhase.OPENING_B
        yield StreamEvent(
            event="phase_change",
            data={"phase": session.phase.value},
        )

        try:
            transition = await session.moderator.generate_transition(
                f"{session.persona_a.name} has delivered their opening. Now invite {session.persona_b.name}."
            )
            msg = session.add_message(AgentRole.MODERATOR, "Moderator", transition)
            yield StreamEvent(
                event="message",
                data={
                    "id": msg.id,
                    "role": msg.role.value,
                    "persona_name": msg.persona_name,
                    "content": msg.content,
                },
            )
        except Exception as e:
            logger.error(f"Moderator transition error: {e}")

        # ── Debater B Opening ──
        try:
            history_b = session.get_debate_history_for_agent(AgentRole.DEBATER_B)
            opening_b = await session.debater_b.generate_response(history_b)
            msg = session.add_message(
                AgentRole.DEBATER_B, session.persona_b.name, opening_b
            )
            yield StreamEvent(
                event="message",
                data={
                    "id": msg.id,
                    "role": msg.role.value,
                    "persona_name": msg.persona_name,
                    "content": msg.content,
                },
            )
        except Exception as e:
            logger.error(f"Debater B opening error: {e}")
            yield StreamEvent(event="error", data=f"Failed to generate opening statement B: {str(e)}")
            return

        # ── Move to student turn ──
        session.phase = DebatePhase.STUDENT_TURN
        session.current_round = 1
        yield StreamEvent(
            event="phase_change",
            data={"phase": session.phase.value, "round": session.current_round},
        )

        try:
            invite = await session.moderator.invite_student(session.current_round)
            msg = session.add_message(AgentRole.MODERATOR, "Moderator", invite)
            yield StreamEvent(
                event="message",
                data={
                    "id": msg.id,
                    "role": msg.role.value,
                    "persona_name": msg.persona_name,
                    "content": msg.content,
                },
            )
        except Exception as e:
            logger.error(f"Student invite error: {e}")

        yield StreamEvent(event="done", data="Opening phase complete. Awaiting student intervention.")

    async def process_student_intervention(
        self,
        session_id: str,
        content: str,
        is_final_reflection: bool = False,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Process a student intervention and generate AI responses.

        Yields StreamEvents for real-time updates.
        """
        session = self._sessions.get(session_id)
        if not session:
            yield StreamEvent(event="error", data="Session not found")
            return

        if session.phase != DebatePhase.STUDENT_TURN:
            yield StreamEvent(
                event="error",
                data=f"Cannot accept intervention in phase: {session.phase.value}",
            )
            return

        # Record student message
        student_msg = session.add_message(AgentRole.STUDENT, "Student", content)
        yield StreamEvent(
            event="message",
            data={
                "id": student_msg.id,
                "role": student_msg.role.value,
                "persona_name": "Student",
                "content": student_msg.content,
            },
        )

        if is_final_reflection:
            # Skip debater responses, go straight to judging
            session.phase = DebatePhase.JUDGING
            yield StreamEvent(
                event="phase_change",
                data={"phase": session.phase.value, "message": "Final reflection received. Moving to judging..."},
            )
            yield StreamEvent(event="done", data="Final reflection recorded. Ready for judging.")
            return

        # ── Debater A Response ──
        session.phase = DebatePhase.RESPONSE_A
        yield StreamEvent(
            event="phase_change",
            data={"phase": session.phase.value},
        )

        try:
            history_a = session.get_debate_history_for_agent(AgentRole.DEBATER_A)
            response_a = await session.debater_a.generate_response(history_a)
            msg_a = session.add_message(
                AgentRole.DEBATER_A, session.persona_a.name, response_a
            )
            yield StreamEvent(
                event="message",
                data={
                    "id": msg_a.id,
                    "role": msg_a.role.value,
                    "persona_name": msg_a.persona_name,
                    "content": msg_a.content,
                },
            )
        except Exception as e:
            logger.error(f"Debater A response error: {e}")
            yield StreamEvent(event="error", data=f"Failed to generate Debater A response: {str(e)}")
            return

        # ── Debater B Response ──
        session.phase = DebatePhase.RESPONSE_B
        yield StreamEvent(
            event="phase_change",
            data={"phase": session.phase.value},
        )

        try:
            history_b = session.get_debate_history_for_agent(AgentRole.DEBATER_B)
            response_b = await session.debater_b.generate_response(history_b)
            msg_b = session.add_message(
                AgentRole.DEBATER_B, session.persona_b.name, response_b
            )
            yield StreamEvent(
                event="message",
                data={
                    "id": msg_b.id,
                    "role": msg_b.role.value,
                    "persona_name": msg_b.persona_name,
                    "content": msg_b.content,
                },
            )
        except Exception as e:
            logger.error(f"Debater B response error: {e}")
            yield StreamEvent(event="error", data=f"Failed to generate Debater B response: {str(e)}")
            return

        # ── Next phase ──
        session.current_round += 1

        if session.current_round > session.max_rounds:
            # Debate rounds over, move to judging
            session.phase = DebatePhase.JUDGING
            yield StreamEvent(
                event="phase_change",
                data={"phase": session.phase.value, "message": "All rounds complete. Moving to judging..."},
            )

            try:
                closing = await session.moderator.closing_remarks()
                msg = session.add_message(AgentRole.MODERATOR, "Moderator", closing)
                yield StreamEvent(
                    event="message",
                    data={
                        "id": msg.id,
                        "role": msg.role.value,
                        "persona_name": msg.persona_name,
                        "content": msg.content,
                    },
                )
            except Exception as e:
                logger.error(f"Closing remarks error: {e}")

            yield StreamEvent(event="done", data="Debate rounds complete. Ready for judging.")
        else:
            # Student turn again
            session.phase = DebatePhase.STUDENT_TURN
            yield StreamEvent(
                event="phase_change",
                data={"phase": session.phase.value, "round": session.current_round},
            )

            try:
                invite = await session.moderator.invite_student(session.current_round)
                msg = session.add_message(AgentRole.MODERATOR, "Moderator", invite)
                yield StreamEvent(
                    event="message",
                    data={
                        "id": msg.id,
                        "role": msg.role.value,
                        "persona_name": msg.persona_name,
                        "content": msg.content,
                    },
                )
            except Exception as e:
                logger.error(f"Student invite error: {e}")

            yield StreamEvent(
                event="done",
                data=f"Round {session.current_round - 1} complete. Awaiting student intervention.",
            )

    async def run_judges(self, session_id: str) -> AsyncGenerator[StreamEvent, None]:
        """Run all three judges on the debate transcript.

        Yields StreamEvents for real-time updates.
        """
        session = self._sessions.get(session_id)
        if not session:
            yield StreamEvent(event="error", data="Session not found")
            return

        if session.phase != DebatePhase.JUDGING:
            yield StreamEvent(
                event="error",
                data=f"Cannot judge in phase: {session.phase.value}",
            )
            return

        transcript = session.get_full_transcript()

        # Run all 3 judges
        judge_types = ["logic", "evidence", "rhetoric"]
        for judge_type in judge_types:
            yield StreamEvent(
                event="phase_change",
                data={"phase": "judging", "judge": judge_type, "message": f"Judge ({judge_type}) evaluating..."},
            )

            try:
                judge = JudgeAgent(judge_type)
                evaluation = await judge.evaluate(transcript)
                session.judge_evaluations.append(evaluation)
                yield StreamEvent(
                    event="judge_result",
                    data={
                        "judge_type": judge_type,
                        "persona_a_overall": evaluation.persona_a_overall,
                        "persona_b_overall": evaluation.persona_b_overall,
                        "student_overall": evaluation.student_overall,
                        "raw_feedback": evaluation.raw_feedback,
                    },
                )
            except Exception as e:
                logger.error(f"Judge {judge_type} error: {e}")
                yield StreamEvent(event="error", data=f"Judge ({judge_type}) failed: {str(e)}")

        # Generate Gap Report
        session.phase = DebatePhase.GAP_REPORT
        yield StreamEvent(
            event="phase_change",
            data={"phase": session.phase.value, "message": "Generating your personalized Gap Report..."},
        )

        try:
            report = await generate_gap_report(transcript, session.judge_evaluations)
            session.gap_report = report
            session.phase = DebatePhase.COMPLETED

            yield StreamEvent(
                event="report",
                data={
                    "reasoning_blind_spots": report.reasoning_blind_spots,
                    "evidence_gaps": report.evidence_gaps,
                    "rhetorical_opportunities": report.rhetorical_opportunities,
                    "follow_up_questions": report.follow_up_questions,
                    "recommended_readings": report.recommended_readings,
                    "overall_summary": report.overall_summary,
                },
            )
        except Exception as e:
            logger.error(f"Gap report error: {e}")
            yield StreamEvent(event="error", data=f"Gap report generation failed: {str(e)}")

        yield StreamEvent(
            event="done",
            data="Debate complete! Review your Gap Report above.",
        )


# ── Singleton Manager ────────────────────────────────────────────────

_manager: DebateSessionManager | None = None


def get_debate_manager() -> DebateSessionManager:
    """Get or create the singleton debate manager."""
    global _manager
    if _manager is None:
        _manager = DebateSessionManager()
    return _manager
