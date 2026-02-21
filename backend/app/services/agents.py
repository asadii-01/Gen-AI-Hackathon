"""
AI Agents for SocraticCanvas: Debater, Moderator, and Judge agents.
Each agent wraps the LLM client with role-specific system prompts.
"""

from app.models.schemas import PersonaDetail, JudgeEvaluation, JudgeScore
from app.services.llm_client import get_llm_client


# ── System Prompt Builders ────────────────────────────────────────────


def build_debater_system_prompt(persona: PersonaDetail, resolution: str, opponent_name: str) -> str:
    """Build the system prompt for a debater persona."""
    return f"""You are {persona.name}, a {persona.role} from {persona.era}. Your knowledge stops at the end of {persona.era}. You are debating the resolution: "{resolution}" against {opponent_name}.

PERSONALITY PROFILE:
- Core stance: {persona.core_stance}
- You know intimately: {', '.join(persona.knowledge)}
- You believe strongly: {', '.join(persona.beliefs)}
- You distrust: {', '.join(persona.distrusts)}
- Your blind spots (things you cannot see about yourself): {', '.join(persona.blind_spots)}

COMMUNICATION STYLE:
- Speaking style: {persona.speaking_style}
- Favorite phrases you naturally use: {', '.join(f'"{p}"' for p in persona.favorite_phrases)}
- Logical fallacies you tend to commit (use them naturally, don't announce them): {', '.join(persona.fallacies)}

CONSTRAINTS:
{chr(10).join(f'- {c}' for c in persona.constraints)}
- Cannot concede your core stance
- Can acknowledge uncertainty but never change your fundamental position
- When challenged on your blind spots, deflect or minimize

DEBATE BEHAVIOR:
1. For opening statements: State your position with your strongest argument. Be passionate and in-character.
2. For subsequent responses: Address the opponent's point directly, then pivot to your argument.
3. If losing an exchange: Use your favorite phrases to reframe; never admit defeat.
4. If the opponent makes an excellent point: Acknowledge it's "interesting" but maintain your position.
5. When a student challenges you: Treat them respectfully but defend your position firmly.

IMPORTANT: You are roleplaying a specific person from a specific time. Do NOT use modern knowledge your persona wouldn't have. Stay in character at all times. Keep responses focused and under 250 words."""


def build_moderator_system_prompt(
    persona_a_name: str,
    persona_b_name: str,
    resolution: str,
) -> str:
    """Build the system prompt for the moderator."""
    return f"""You are a debate moderator facilitating a structured debate between {persona_a_name} and {persona_b_name}.

RESOLUTION: "{resolution}"

YOUR ROLE:
- Introduce the debate and set the stage
- Transition between speakers smoothly
- Highlight key points of contention
- Invite student participation at appropriate moments
- Summarize key arguments when transitioning between rounds
- Maintain neutrality — never take sides

STYLE: Professional, engaging, concise. Think of a skilled TV debate moderator.
Keep transitions under 80 words. Be direct and move the debate forward."""


JUDGE_LOGIC_PROMPT = """You are a logic expert evaluating a debate. Your job is to assess reasoning quality.

Evaluate each participant (both AI debaters and the student) on:
1. VALIDITY: Do conclusions follow from premises? (Score 1-5)
2. FALLACIES: Identify specific logical fallacies committed (list up to 3 per participant)
3. CONSISTENCY: Did the participant contradict themselves? (Note contradictions)
4. EVIDENCE USE: Did claims have supporting reasoning? (Score 1-5)

Provide your evaluation in this EXACT format:
---DEBATER_A---
Validity: [score]/5
Fallacies: [list]
Consistency: [notes]
Evidence Use: [score]/5
Overall: [score]/10
Strength: [one sentence]
Weakness: [one sentence]

---DEBATER_B---
Validity: [score]/5
Fallacies: [list]
Consistency: [notes]
Evidence Use: [score]/5
Overall: [score]/10
Strength: [one sentence]
Weakness: [one sentence]

---STUDENT---
Overall: [score]/10
Strength: [one sentence]
Weakness: [one sentence]
Recommendation: [one specific improvement suggestion]"""


JUDGE_EVIDENCE_PROMPT = """You are an evidence expert evaluating a debate. Your job is to assess factual grounding.

Evaluate each participant on:
1. ACCURACY: Are factual claims correct within the persona's knowledge constraints? (Score 1-5)
2. RELEVANCE: Does evidence support the point being made? (Score 1-5)
3. TRANSPARENCY: Does the participant acknowledge uncertainty/limitations? (Score 1-5)
4. KNOWLEDGE GAPS: What important information is missing? (Identify 2-3 gaps)

Provide your evaluation in this EXACT format:
---DEBATER_A---
Accuracy: [score]/5
Relevance: [score]/5
Transparency: [score]/5
Knowledge Gaps: [list]
Overall: [score]/10
Best-supported claim: [one sentence]
Weakest claim: [one sentence]

---DEBATER_B---
Accuracy: [score]/5
Relevance: [score]/5
Transparency: [score]/5
Knowledge Gaps: [list]
Overall: [score]/10
Best-supported claim: [one sentence]
Weakest claim: [one sentence]

---STUDENT---
Overall: [score]/10
Strength: [one sentence]
Weakness: [one sentence]
Key facts that would strengthen their position: [list 2-3]"""


JUDGE_RHETORIC_PROMPT = """You are a rhetoric expert evaluating a debate. Your job is to assess persuasive communication.

Evaluate each participant on:
1. CLARITY: Are arguments easy to follow? (Score 1-5)
2. ENGAGEMENT: Does the participant address opponent's points or ignore them? (Score 1-5)
3. TONE: Is tone appropriate and effective? (Score 1-5)
4. ADAPTABILITY: Does the participant adjust when challenged? (Score 1-5)

Provide your evaluation in this EXACT format:
---DEBATER_A---
Clarity: [score]/5
Engagement: [score]/5
Tone: [score]/5
Adaptability: [score]/5
Overall: [score]/10
Most persuasive moment: [one sentence]
Least persuasive moment: [one sentence]

---DEBATER_B---
Clarity: [score]/5
Engagement: [score]/5
Tone: [score]/5
Adaptability: [score]/5
Overall: [score]/10
Most persuasive moment: [one sentence]
Least persuasive moment: [one sentence]

---STUDENT---
Overall: [score]/10
Strength: [one sentence]
Weakness: [one sentence]
Communication recommendation: [one specific suggestion]"""


# ── Agent Classes ─────────────────────────────────────────────────────


class DebaterAgent:
    """An AI debater that argues in character as a historical/expert persona."""

    def __init__(self, persona: PersonaDetail, resolution: str, opponent_name: str):
        self.persona = persona
        self.system_prompt = build_debater_system_prompt(persona, resolution, opponent_name)
        self.llm = get_llm_client()

    async def generate_opening(self) -> str:
        """Generate an opening statement."""
        messages = [
            {
                "role": "user",
                "content": "Please deliver your opening statement on this topic. State your position clearly and make your strongest case.",
            }
        ]
        return await self.llm.agenerate(self.system_prompt, messages)

    async def generate_response(self, debate_history: list[dict[str, str]]) -> str:
        """Generate a response given the debate history."""
        return await self.llm.agenerate(self.system_prompt, debate_history)

    async def generate_response_stream(self, debate_history: list[dict[str, str]]):
        """Stream a response token by token."""
        async for token in self.llm.agenerate_stream(self.system_prompt, debate_history):
            yield token


class ModeratorAgent:
    """Facilitates debate flow and transitions between speakers."""

    def __init__(self, persona_a_name: str, persona_b_name: str, resolution: str):
        self.system_prompt = build_moderator_system_prompt(
            persona_a_name, persona_b_name, resolution
        )
        self.llm = get_llm_client()

    async def generate_introduction(self) -> str:
        """Generate the debate introduction."""
        messages = [
            {
                "role": "user",
                "content": "Please introduce this debate. Set the stage, introduce the resolution, and invite the first speaker to begin.",
            }
        ]
        return await self.llm.agenerate(self.system_prompt, messages, max_tokens=300)

    async def generate_transition(self, context: str) -> str:
        """Generate a transition between debate phases."""
        messages = [
            {
                "role": "user",
                "content": f"Transition the debate. Context: {context}. Keep it brief and engaging.",
            }
        ]
        return await self.llm.agenerate(self.system_prompt, messages, max_tokens=200)

    async def invite_student(self, round_num: int) -> str:
        """Generate an invitation for the student to participate."""
        messages = [
            {
                "role": "user",
                "content": f"This is round {round_num}. Invite the student audience member to ask a question, challenge an argument, or play devil's advocate. Be encouraging but brief.",
            }
        ]
        return await self.llm.agenerate(self.system_prompt, messages, max_tokens=150)

    async def closing_remarks(self) -> str:
        """Generate closing remarks before judging."""
        messages = [
            {
                "role": "user",
                "content": "The debate rounds are complete. Thank the debaters and the student, and announce that the judges will now evaluate the debate. Be brief.",
            }
        ]
        return await self.llm.agenerate(self.system_prompt, messages, max_tokens=150)


class JudgeAgent:
    """Evaluates the debate from a specific expert perspective."""

    def __init__(self, judge_type: str):
        self.judge_type = judge_type
        if judge_type == "logic":
            self.system_prompt = JUDGE_LOGIC_PROMPT
        elif judge_type == "evidence":
            self.system_prompt = JUDGE_EVIDENCE_PROMPT
        elif judge_type == "rhetoric":
            self.system_prompt = JUDGE_RHETORIC_PROMPT
        else:
            raise ValueError(f"Unknown judge type: {judge_type}")
        self.llm = get_llm_client()

    async def evaluate(self, debate_transcript: str) -> JudgeEvaluation:
        """Evaluate the full debate transcript."""
        messages = [
            {
                "role": "user",
                "content": f"Please evaluate the following debate transcript:\n\n{debate_transcript}",
            }
        ]
        raw = await self.llm.agenerate(
            self.system_prompt, messages, temperature=0.3, max_tokens=1500
        )
        return self._parse_evaluation(raw)

    def _parse_evaluation(self, raw: str) -> JudgeEvaluation:
        """Parse the judge's raw text into a structured evaluation.

        This uses a best-effort parser since LLM output can vary.
        Falls back to storing raw feedback if structured parsing fails.
        """
        evaluation = JudgeEvaluation(
            judge_type=self.judge_type,
            raw_feedback=raw,
        )

        try:
            sections = raw.split("---")
            for section in sections:
                section = section.strip()
                if not section:
                    continue

                lines = section.strip().split("\n")
                header = lines[0].strip().upper() if lines else ""

                if "DEBATER_A" in header:
                    overall = self._extract_score(section, "Overall")
                    evaluation.persona_a_overall = overall
                    evaluation.persona_a_scores = self._extract_all_scores(section)

                elif "DEBATER_B" in header:
                    overall = self._extract_score(section, "Overall")
                    evaluation.persona_b_overall = overall
                    evaluation.persona_b_scores = self._extract_all_scores(section)

                elif "STUDENT" in header:
                    overall = self._extract_score(section, "Overall")
                    evaluation.student_overall = overall
                    evaluation.student_scores = self._extract_all_scores(section)

                    # Extract strengths, weaknesses, recommendations
                    for line in lines:
                        line_lower = line.lower().strip()
                        if line_lower.startswith("strength:"):
                            evaluation.strengths.append(line.split(":", 1)[1].strip())
                        elif line_lower.startswith("weakness:"):
                            evaluation.weaknesses.append(line.split(":", 1)[1].strip())
                        elif line_lower.startswith("recommendation:") or line_lower.startswith("communication recommendation:"):
                            evaluation.recommendation = line.split(":", 1)[1].strip()

        except Exception:
            # If parsing fails, the raw_feedback is still available
            pass

        return evaluation

    @staticmethod
    def _extract_score(text: str, label: str) -> float:
        """Extract a numeric score from text like 'Overall: 7/10'."""
        import re
        pattern = rf"{label}:\s*(\d+(?:\.\d+)?)\s*/\s*\d+"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return 0.0

    @staticmethod
    def _extract_all_scores(text: str) -> list[JudgeScore]:
        """Extract all category scores from a section."""
        import re
        scores = []
        pattern = r"(\w[\w\s]*?):\s*(\d+(?:\.\d+)?)\s*/\s*(\d+)"
        for match in re.finditer(pattern, text):
            category = match.group(1).strip()
            score_val = float(match.group(2))
            max_val = float(match.group(3))
            # Normalize to 0-10 scale
            normalized = (score_val / max_val) * 10 if max_val > 0 else 0
            if category.lower() != "overall":
                scores.append(JudgeScore(category=category, score=normalized))
        return scores
