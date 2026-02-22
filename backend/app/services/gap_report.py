"""
Gap Report generator for SocraticCanvas.
Synthesizes judge evaluations into a personalized student feedback report.
"""

from app.models.schemas import GapReport, JudgeEvaluation
from app.services.llm_client import get_llm_client


GAP_REPORT_SYSTEM_PROMPT = """Based on all three judge evaluations, generate a personalized "Gap Report" for the student user.

Include:
1. REASONING BLIND SPOTS: 2-3 logical weaknesses demonstrated in their interventions
2. EVIDENCE GAPS: 2-3 factual areas they need to explore
3. RHETORICAL OPPORTUNITIES: 2-3 communication improvements
4. FOLLOW-UP QUESTIONS: 3 questions that would deepen their understanding
5. RECOMMENDED READINGS: 2-3 sources based on debate content

Use this EXACT format:
---REASONING_BLIND_SPOTS---
- [blind spot 1]
- [blind spot 2]
- [blind spot 3]

---EVIDENCE_GAPS---
- [gap 1]
- [gap 2]
- [gap 3]

---RHETORICAL_OPPORTUNITIES---
- [opportunity 1]
- [opportunity 2]
- [opportunity 3]

---FOLLOW_UP_QUESTIONS---
- [question 1]
- [question 2]
- [question 3]

---RECOMMENDED_READINGS---
- [reading 1]
- [reading 2]
- [reading 3]

---SUMMARY---
[A brief 2-3 sentence encouraging summary of the student's performance and key areas for growth.]

Format as clean, actionable insights. Use encouraging but honest tone."""


async def generate_gap_report(
    debate_transcript: str,
    judge_evaluations: list[JudgeEvaluation],
) -> GapReport:
    """Generate a personalized gap report from judge evaluations."""
    llm = get_llm_client()

    # Compile judge feedback into a prompt
    judge_summaries = []
    for judge_eval in judge_evaluations:
        judge_summaries.append(
            f"=== {judge_eval.judge_type.upper()} JUDGE ===\n{judge_eval.raw_feedback}"
        )

    context = f"""DEBATE TRANSCRIPT:
{debate_transcript}

JUDGE EVALUATIONS:
{chr(10).join(judge_summaries)}"""

    messages = [{"role": "user", "content": context}]
    raw = await llm.agenerate(
        GAP_REPORT_SYSTEM_PROMPT, messages, temperature=0.4, max_tokens=1500
    )

    return _parse_gap_report(raw, judge_evaluations)


def _parse_gap_report(raw: str, judge_evaluations: list[JudgeEvaluation]) -> GapReport:
    """Parse the LLM's raw gap report text into a structured GapReport."""
    import re

    # Initialize with empty structured fields; only fall back to raw on complete failure
    report = GapReport(
        overall_summary="",
        judge_evaluations=judge_evaluations,
    )

    try:
        # Split on ---HEADER--- delimiters, keeping header names as capture groups.
        # Produces: ["", "REASONING_BLIND_SPOTS", "<items>", "EVIDENCE_GAPS", "<items>", ...]
        parts = re.split(r"---([^-]+)---", raw)

        # parts[0] is any text before first section (discard)
        # Then alternating (header, body) pairs follow
        it = iter(parts[1:])
        for header_raw, body in zip(it, it):
            header = header_raw.strip().upper()
            body = body.strip()

            # Extract bullet-point items
            items = [
                line.strip().lstrip("- ").strip()
                for line in body.splitlines()
                if line.strip() and line.strip().startswith("-")
            ]

            if "REASONING_BLIND_SPOTS" in header or "REASONING BLIND SPOTS" in header:
                report.reasoning_blind_spots = items
            elif "EVIDENCE_GAPS" in header or "EVIDENCE GAPS" in header:
                report.evidence_gaps = items
            elif "RHETORICAL_OPPORTUNITIES" in header or "RHETORICAL OPPORTUNITIES" in header:
                report.rhetorical_opportunities = items
            elif "FOLLOW_UP_QUESTIONS" in header or "FOLLOW UP QUESTIONS" in header:
                report.follow_up_questions = items
            elif "RECOMMENDED_READINGS" in header or "RECOMMENDED READINGS" in header:
                report.recommended_readings = items
            elif "SUMMARY" in header:
                summary_lines = [line.strip() for line in body.splitlines() if line.strip()]
                report.overall_summary = " ".join(summary_lines)

    except Exception:
        # If parsing completely fails, store the raw text so nothing is lost
        report.overall_summary = raw

    return report
