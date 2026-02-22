"use client";

import Link from "next/link";
import { TopicSummary } from "@/lib/types";
import { HiArrowRight, HiUserCircle } from "react-icons/hi2";

const topicIcons: Record<string, string> = {
  "climate-policy": "🌍",
  "ai-regulation": "🤖",
  "healthcare-access": "🏥",
};

export default function TopicCard({ topic }: { topic: TopicSummary }) {
  return (
    <Link href={`/topics/${topic.id}`}>
      <div className="glass-card group relative overflow-hidden p-6 cursor-pointer h-full flex flex-col">
        {/* Gradient accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] opacity-60 group-hover:opacity-100 transition-opacity" />

        {/* Topic header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{topicIcons[topic.id] || "💬"}</span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-purple)] transition-colors">
              {topic.title}
            </h3>
          </div>
          <HiArrowRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] group-hover:translate-x-1 transition-all" />
        </div>

        {/* Resolution */}
        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed italic">
          &quot;{topic.resolution}&quot;
        </p>

        {/* Personas */}
        <div className="mt-auto space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-[var(--bg-secondary)]/60 p-3">
            <HiUserCircle className="h-5 w-5 text-[var(--accent-blue)] mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {topic.persona_a.name}
                </span>
                <span className="text-[10px] font-medium text-[var(--accent-purple)] bg-[var(--accent-purple)]/10 px-1.5 py-0.5 rounded-full">
                  {topic.persona_a.era}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                {topic.persona_a.core_stance}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <span className="text-xs font-bold text-[var(--accent-gold)]">VS</span>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-[var(--bg-secondary)]/60 p-3">
            <HiUserCircle className="h-5 w-5 text-[var(--accent-red)] mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {topic.persona_b.name}
                </span>
                <span className="text-[10px] font-medium text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded-full">
                  {topic.persona_b.era}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                {topic.persona_b.core_stance}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
