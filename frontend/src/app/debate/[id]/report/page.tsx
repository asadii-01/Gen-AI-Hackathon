"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GapReport } from "@/lib/types";
import { fetchGapReport } from "@/lib/api";
import {
  HiArrowLeft,
  HiLightBulb,
  HiDocumentMagnifyingGlass,
  HiChatBubbleLeftRight,
  HiAcademicCap,
  HiBookOpen,
  HiExclamationTriangle,
  HiScale,
  HiHome,
} from "react-icons/hi2";

export default function GapReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [report, setReport] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGapReport(sessionId)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="shimmer h-12 w-72 rounded-lg mb-8" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-40 rounded-2xl" />
          ))}
        </div>
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-red-400 text-lg font-medium mb-2">
          {error || "Report not available"}
        </p>
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--accent-purple)] hover:underline"
        >
          ← Back to Debate
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 animate-fade-in-up">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <HiArrowLeft className="h-4 w-4" />
          Back to Debate
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4]">
            <HiDocumentMagnifyingGlass className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-3xl font-black gradient-text">
            Your Gap Report
          </h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Personalized analysis of your debate performance with actionable insights
        </p>
      </div>

      {/* Judge Evaluations */}
      {report.judge_evaluations.length > 0 && (
        <div className="mb-10 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 mb-4">
            <HiScale className="h-5 w-5 text-[var(--accent-purple)]" />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Judge Evaluations
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {report.judge_evaluations.map((evaluation, i) => {
              const colors = ["purple", "cyan", "amber"];
              const c = colors[i % colors.length];
              return (
                <div key={i} className="glass-card p-5">
                  <h3
                    className={`text-sm font-bold uppercase tracking-wider mb-4 text-${c}-400`}
                  >
                    {evaluation.judge_type} Judge
                  </h3>

                  <div className="space-y-3">
                    <ScoreRow
                      label="Debater A"
                      score={evaluation.persona_a_overall}
                      color="blue"
                    />
                    <ScoreRow
                      label="Debater B"
                      score={evaluation.persona_b_overall}
                      color="rose"
                    />
                    <ScoreRow
                      label="Student"
                      score={evaluation.student_overall}
                      color="emerald"
                    />
                  </div>

                  {evaluation.recommendation && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {evaluation.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overall Summary */}
      {report.overall_summary && (
        <div className="glass-card p-6 mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-3">
            <HiLightBulb className="h-5 w-5 text-[var(--accent-gold)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Overall Summary
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {report.overall_summary}
          </p>
        </div>
      )}

      {/* Gap Sections Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
        <GapSection
          icon={<HiExclamationTriangle className="h-5 w-5 text-red-400" />}
          title="Reasoning Blind Spots"
          items={report.reasoning_blind_spots}
          delay="0.3s"
        />
        <GapSection
          icon={<HiDocumentMagnifyingGlass className="h-5 w-5 text-cyan-400" />}
          title="Evidence Gaps"
          items={report.evidence_gaps}
          delay="0.35s"
        />
        <GapSection
          icon={<HiChatBubbleLeftRight className="h-5 w-5 text-purple-400" />}
          title="Rhetorical Opportunities"
          items={report.rhetorical_opportunities}
          delay="0.4s"
        />
        <GapSection
          icon={<HiAcademicCap className="h-5 w-5 text-emerald-400" />}
          title="Follow-up Questions"
          items={report.follow_up_questions}
          delay="0.45s"
        />
      </div>

      {/* Recommended Readings */}
      {report.recommended_readings.length > 0 && (
        <div
          className="glass-card p-6 mb-10 animate-fade-in-up"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <HiBookOpen className="h-5 w-5 text-[var(--accent-gold)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Recommended Readings
            </h2>
          </div>
          <ul className="space-y-2">
            {report.recommended_readings.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg bg-[var(--bg-secondary)]/60 px-4 py-3"
              >
                <span className="text-[var(--accent-cyan)] font-bold text-sm mt-0.5">
                  {i + 1}.
                </span>
                <p className="text-sm text-[var(--text-secondary)]">{r}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Back to Topics */}
      <div className="text-center pb-10 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-8 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-white/[0.06] hover:border-[var(--accent-purple)]/30"
        >
          <HiHome className="h-4 w-4" />
          Back to Topics
        </button>
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  const pct = (score / 10) * 100;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
        <span className={`text-xs font-bold text-${color}-400`}>
          {score.toFixed(1)}/10
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--bg-secondary)]">
        <div
          className={`h-1.5 rounded-full bg-${color == "emerald" ? "green" : color}-400 transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GapSection({
  icon,
  title,
  items,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  delay: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: delay }}>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          {title}
        </h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-[var(--text-secondary)] leading-relaxed"
          >
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
