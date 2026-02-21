from enum import Enum


class DebatePhase(str, Enum):
    """Phases of a debate session."""

    CREATED = "created"
    OPENING_A = "opening_a"
    OPENING_B = "opening_b"
    STUDENT_TURN = "student_turn"
    RESPONSE_A = "response_a"
    RESPONSE_B = "response_b"
    JUDGING = "judging"
    GAP_REPORT = "gap_report"
    COMPLETED = "completed"


class AgentRole(str, Enum):
    """Roles for AI agents in the debate system."""

    DEBATER_A = "debater_a"
    DEBATER_B = "debater_b"
    MODERATOR = "moderator"
    JUDGE_LOGIC = "judge_logic"
    JUDGE_EVIDENCE = "judge_evidence"
    JUDGE_RHETORIC = "judge_rhetoric"
    GAP_REPORTER = "gap_reporter"
    STUDENT = "student"
