"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopicDetail } from "@/lib/types";
import { fetchTopicDetail, createDebate } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import PersonaCard from "@/components/PersonaCard";
import {
  HiArrowLeft,
  HiBolt,
  HiChatBubbleLeftRight,
  HiSparkles,
} from "react-icons/hi2";

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTopicDetail(topicId)
      .then(setTopic)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [topicId]);

  async function handleStartDebate() {
    // Require login before starting a debate
    if (!user) {
      router.push("/login");
      return;
    }
    setStarting(true);
    try {
      const session = await createDebate(topicId);
      router.push(`/debate/${session.id}`);
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="shimmer h-12 w-64 rounded-lg mb-8" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="shimmer h-96 rounded-2xl" />
          <div className="shimmer h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-red-400 text-lg font-medium mb-2">
          {error || "Topic not found"}
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-[var(--accent-purple)] hover:underline"
        >
          ← Back to Topics
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="mb-8 flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <HiArrowLeft className="h-4 w-4" />
        Back to Topics
      </button>

      {/* Topic Header */}
      <div className="mb-10 animate-fade-in-up">
        <h1 className="text-4xl font-black mb-3 gradient-text">
          {topic.title}
        </h1>
        <p className="text-lg text-[var(--text-secondary)] italic max-w-3xl">
          &quot;{topic.resolution}&quot;
        </p>
      </div>

      {/* Persona Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-10">
        <div className="animate-slide-left">
          <PersonaCard persona={topic.persona_a} variant="a" />
        </div>
        <div className="animate-slide-right">
          <PersonaCard persona={topic.persona_b} variant="b" />
        </div>
      </div>

      {/* Curveball Interventions */}
      {topic.curveball_interventions.length > 0 && (
        <div className="glass-card p-6 mb-10 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-2 mb-4">
            <HiBolt className="h-5 w-5 text-[var(--accent-gold)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Curveball Questions
            </h3>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Try throwing these curveball questions during the debate to challenge both debaters:
          </p>
          <div className="space-y-2">
            {topic.curveball_interventions.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg bg-[var(--bg-secondary)]/60 px-4 py-3"
              >
                <HiChatBubbleLeftRight className="h-4 w-4 text-[var(--accent-cyan)] mt-0.5 shrink-0" />
                <p className="text-sm text-[var(--text-secondary)]">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start Debate CTA */}
      <div className="text-center animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
        <button
          onClick={handleStartDebate}
          disabled={starting}
          className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] px-10 py-4 text-lg font-bold text-white shadow-2xl shadow-purple-500/25 transition-all hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {starting ? (
            <>
              <div className="loading-dots">
                <span />
                <span />
                <span />
              </div>
              Creating Session...
            </>
          ) : (
            <>
              <HiSparkles className="h-5 w-5" />
              Start Debate
            </>
          )}
        </button>
      </div>
    </div>
  );
}
