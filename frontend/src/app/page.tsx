"use client";

import { useEffect, useState } from "react";
import { TopicSummary } from "@/lib/types";
import { fetchTopics } from "@/lib/api";
import TopicCard from "@/components/TopicCard";
import {
  HiAcademicCap,
  HiSparkles,
  HiChatBubbleLeftRight,
} from "react-icons/hi2";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import SplashCursor from "@/components/ui/splashcursor";
const words = [
  { text: "Socratic",className:"gradient-text" },
  { text: "Canvas", className:"text-[var(--text-primary)]" },
];

export default function Home() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTopics()
      .then(setTopics)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden py-24 sm:py-32"
        style={{ background: "var(--gradient-hero)" }}
      >
        <SplashCursor />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Gradient orbs */}
        <div className="absolute top-10 left-1/4 h-72 w-72 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-cyan-600/20 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="animate-fade-in-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-300">
              <HiSparkles className="h-4 w-4" />
              AI-Powered Generative Debate Environment
            </div>

            <h1 className="mb-6 text-5xl font-black tracking-tight sm:text-7xl">
              <TypewriterEffect words={words} />
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-[var(--text-secondary)] leading-relaxed sm:text-xl">
              Step into a world where historical thinkers and modern experts
              clash in AI-moderated debates. Challenge their reasoning, expose
              blind spots, and sharpen your critical thinking.
            </p>
          </div>

          {/* Feature pills */}
          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            {[
              { icon: HiChatBubbleLeftRight, label: "Real-time AI Debates" },
              { icon: HiAcademicCap, label: "Personalized Gap Reports" },
              { icon: HiSparkles, label: "Multi-Judge Evaluation" },
            ].map((feat) => (
              <div
                key={feat.label}
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--text-secondary)]"
              >
                <feat.icon className="h-4 w-4 text-[var(--accent-cyan)]" />
                {feat.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Topics Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
            Choose Your Arena
          </h2>
          <p className="text-[var(--text-secondary)]">
            Select a debate topic and engage with AI-powered historical personas
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="shimmer h-72 rounded-2xl"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-lg rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-red-400 font-medium mb-2">
              Failed to load topics
            </p>
            <p className="text-sm text-red-400/70">{error}</p>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Make sure the backend is running at{" "}
              <code className="text-[var(--accent-purple)]">
                localhost:8000
              </code>
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic, i) => (
              <div
                key={topic.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <TopicCard topic={topic} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-[var(--text-muted)]">
            SocraticCanvas · AI-Powered Generative Debate Environment
          </p>
        </div>
      </footer>
    </div>
  );
}
