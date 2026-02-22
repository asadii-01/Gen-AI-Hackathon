"use client";

import { DebatePhase } from "@/lib/types";

interface Props {
  phase: string;
  currentRound: number;
  maxRounds: number;
}

const phaseLabels: Record<string, { label: string; color: string }> = {
  [DebatePhase.CREATED]: {
    label: "Ready to Start",
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  },
  [DebatePhase.OPENING_A]: {
    label: "Opening — Debater A",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  [DebatePhase.OPENING_B]: {
    label: "Opening — Debater B",
    color: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  [DebatePhase.STUDENT_TURN]: {
    label: "Your Turn",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  [DebatePhase.RESPONSE_A]: {
    label: "Debater A Responding",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  [DebatePhase.RESPONSE_B]: {
    label: "Debater B Responding",
    color: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  [DebatePhase.JUDGING]: {
    label: "Judges Evaluating",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  [DebatePhase.GAP_REPORT]: {
    label: "Generating Report",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  [DebatePhase.COMPLETED]: {
    label: "Debate Complete",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
};

export default function PhaseIndicator({ phase, currentRound, maxRounds }: Props) {
  const info = phaseLabels[phase] || {
    label: phase,
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };

  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${info.color}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
        {info.label}
      </span>

      {currentRound > 0 && (
        <span className="text-xs text-[var(--text-muted)] font-medium">
          Round {currentRound} / {maxRounds}
        </span>
      )}
    </div>
  );
}
