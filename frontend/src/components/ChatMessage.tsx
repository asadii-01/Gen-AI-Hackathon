"use client";

import { AgentRole } from "@/lib/types";
import {
  HiUserCircle,
  HiAcademicCap,
  HiScale,
  HiChatBubbleLeftRight,
  HiSpeakerWave,
} from "react-icons/hi2";

interface Props {
  role: string;
  personaName: string;
  content: string;
  isNew?: boolean;
  onSpeak?: (content: string, role: string) => void;
  isSpeakingThis?: boolean;
}

const roleStyles: Record<
  string,
  { bg: string; border: string; accent: string; icon: React.ReactNode }
> = {
  [AgentRole.MODERATOR]: {
    bg: "bg-amber-500/[0.06]",
    border: "border-amber-500/20",
    accent: "text-amber-400",
    icon: <HiScale className="h-5 w-5 text-amber-400" />,
  },
  [AgentRole.DEBATER_A]: {
    bg: "bg-blue-500/[0.06]",
    border: "border-blue-500/20",
    accent: "text-blue-400",
    icon: <HiUserCircle className="h-5 w-5 text-blue-400" />,
  },
  [AgentRole.DEBATER_B]: {
    bg: "bg-rose-500/[0.06]",
    border: "border-rose-500/20",
    accent: "text-rose-400",
    icon: <HiUserCircle className="h-5 w-5 text-rose-400" />,
  },
  [AgentRole.STUDENT]: {
    bg: "bg-emerald-500/[0.06]",
    border: "border-emerald-500/20",
    accent: "text-emerald-400",
    icon: <HiAcademicCap className="h-5 w-5 text-emerald-400" />,
  },
  [AgentRole.JUDGE_LOGIC]: {
    bg: "bg-purple-500/[0.06]",
    border: "border-purple-500/20",
    accent: "text-purple-400",
    icon: <HiChatBubbleLeftRight className="h-5 w-5 text-purple-400" />,
  },
  [AgentRole.JUDGE_EVIDENCE]: {
    bg: "bg-cyan-500/[0.06]",
    border: "border-cyan-500/20",
    accent: "text-cyan-400",
    icon: <HiChatBubbleLeftRight className="h-5 w-5 text-cyan-400" />,
  },
  [AgentRole.JUDGE_RHETORIC]: {
    bg: "bg-orange-500/[0.06]",
    border: "border-orange-500/20",
    accent: "text-orange-400",
    icon: <HiChatBubbleLeftRight className="h-5 w-5 text-orange-400" />,
  },
};

const defaultStyle = {
  bg: "bg-slate-500/[0.06]",
  border: "border-slate-500/20",
  accent: "text-slate-400",
  icon: <HiChatBubbleLeftRight className="h-5 w-5 text-slate-400" />,
};

export default function ChatMessage({
  role,
  personaName,
  content,
  isNew,
  onSpeak,
  isSpeakingThis,
}: Props) {
  const style = roleStyles[role] || defaultStyle;
  const isStudent = role === AgentRole.STUDENT;
  const showSpeaker = !isStudent && onSpeak;

  return (
    <div
      className={`flex ${isStudent ? "justify-end" : "justify-start"} ${
        isNew ? "animate-fade-in-up" : ""
      }`}
    >
      <div
        className={`relative max-w-[85%] rounded-2xl border p-4 ${style.bg} ${style.border} ${
          isStudent ? "rounded-br-md" : "rounded-bl-md"
        }`}
      >
        {/* Speaker label */}
        <div className="flex items-center gap-2 mb-2">
          {style.icon}
          <span className={`text-sm font-semibold ${style.accent}`}>
            {personaName || role}
          </span>

          {/* TTS Speaker button */}
          {showSpeaker && (
            <button
              onClick={() => onSpeak!(content, role)}
              className={`ml-auto flex items-center justify-center h-7 w-7 rounded-full transition-all ${
                isSpeakingThis
                  ? "bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] speaking-indicator"
                  : "text-[var(--text-muted)] hover:text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10"
              }`}
              title={isSpeakingThis ? "Speaking..." : "Listen to this message"}
              aria-label={isSpeakingThis ? "Speaking..." : "Listen to this message"}
            >
              <HiSpeakerWave className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}
