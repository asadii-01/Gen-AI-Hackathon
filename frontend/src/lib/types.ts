// ── Enums ────────────────────────────────────────────────────────────

export enum DebatePhase {
  CREATED = "created",
  OPENING_A = "opening_a",
  OPENING_B = "opening_b",
  STUDENT_TURN = "student_turn",
  RESPONSE_A = "response_a",
  RESPONSE_B = "response_b",
  JUDGING = "judging",
  GAP_REPORT = "gap_report",
  COMPLETED = "completed",
}

export enum AgentRole {
  DEBATER_A = "debater_a",
  DEBATER_B = "debater_b",
  MODERATOR = "moderator",
  JUDGE_LOGIC = "judge_logic",
  JUDGE_EVIDENCE = "judge_evidence",
  JUDGE_RHETORIC = "judge_rhetoric",
  GAP_REPORTER = "gap_reporter",
  STUDENT = "student",
}

// ── Persona & Topic Models ───────────────────────────────────────────

export interface PersonaSummary {
  id: string;
  name: string;
  era: string;
  role: string;
  core_stance: string;
}

export interface PersonaDetail extends PersonaSummary {
  knowledge: string[];
  beliefs: string[];
  distrusts: string[];
  blind_spots: string[];
  speaking_style: string;
  favorite_phrases: string[];
  fallacies: string[];
  constraints: string[];
}

export interface TopicSummary {
  id: string;
  title: string;
  resolution: string;
  persona_a: PersonaSummary;
  persona_b: PersonaSummary;
}

export interface TopicDetail {
  id: string;
  title: string;
  resolution: string;
  persona_a: PersonaDetail;
  persona_b: PersonaDetail;
  curveball_interventions: string[];
  argument_map_a: string[];
  argument_map_b: string[];
}

// ── Debate Session Models ────────────────────────────────────────────

export interface DebateMessage {
  id: string;
  role: AgentRole;
  persona_name: string;
  content: string;
  timestamp?: string;
}

export interface CreateDebateRequest {
  topic_id: string;
}

export interface StudentIntervention {
  content: string;
  is_final_reflection: boolean;
}

export interface DebateSessionResponse {
  id: string;
  topic_id: string;
  topic_title: string;
  phase: DebatePhase;
  current_round: number;
  max_rounds: number;
  messages: DebateMessage[];
  persona_a: PersonaSummary;
  persona_b: PersonaSummary;
  created_at: string;
}

// ── Judge & Report Models ────────────────────────────────────────────

export interface JudgeScore {
  category: string;
  score: number;
  details: string;
}

export interface JudgeEvaluation {
  judge_type: string;
  persona_a_scores: JudgeScore[];
  persona_b_scores: JudgeScore[];
  student_scores: JudgeScore[];
  persona_a_overall: number;
  persona_b_overall: number;
  student_overall: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  raw_feedback: string;
}

export interface GapReport {
  reasoning_blind_spots: string[];
  evidence_gaps: string[];
  rhetorical_opportunities: string[];
  follow_up_questions: string[];
  recommended_readings: string[];
  overall_summary: string;
  judge_evaluations: JudgeEvaluation[];
}

// ── SSE Event Types ──────────────────────────────────────────────────

export interface SSEMessageEvent {
  id: string;
  role: string;
  persona_name: string;
  content: string;
}

export interface SSEPhaseChangeEvent {
  phase: string;
  message?: string;
  round?: number;
  judge?: string;
}

export interface SSEJudgeResultEvent {
  judge_type: string;
  persona_a_overall: number;
  persona_b_overall: number;
  student_overall: number;
  raw_feedback: string;
}

// ── Auth Models ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
