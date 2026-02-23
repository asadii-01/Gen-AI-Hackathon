"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DebateSessionResponse, DebateMessage, DebatePhase, AgentRole } from "@/lib/types";
import { fetchDebate, connectSSE, fetchTTSAudio } from "@/lib/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import ChatMessage from "@/components/ChatMessage";
import PhaseIndicator from "@/components/PhaseIndicator";
import {
  HiPaperAirplane,
  HiArrowLeft,
  HiScale,
  HiCheck,
  HiDocumentText,
  HiMicrophone,
} from "react-icons/hi2";

export default function DebateArenaPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<DebateSessionResponse | null>(null);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [phase, setPhase] = useState<string>(DebatePhase.CREATED);
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(3);
  const [input, setInput] = useState("");
  const [isFinalReflection, setIsFinalReflection] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // ── TTS state ─────────────────────────────────────────────────────

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);

  // ── STT ───────────────────────────────────────────────────────────
  const {
    isSupported: sttSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const newMessageIdsRef = useRef<Set<string>>(new Set());

  // Track which message IDs already existed to identify new ones
  const existingIdsRef = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── STT → textarea sync ──────────────────────────────────────────
  useEffect(() => {
    if (transcript) {
      setInput((prev) => (prev && !isListening ? prev : transcript));
    }
  }, [transcript]);

  // ── Split text into sentences for pipelining ─────────────────────
  const splitSentences = useCallback((text: string): string[] => {
    // Split on sentence-ending punctuation followed by space or end
    const raw = text.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g);
    if (!raw) return [text];
    return raw.map((s) => s.trim()).filter((s) => s.length > 0);
  }, []);

  // ── Stop current TTS playback ────────────────────────────────────
  const stopTTS = useCallback(() => {
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    setSpeakingMessageId(null);
    setTtsLoading(false);
  }, []);

  // ── TTS playback with sentence-level pipelining ──────────────────
  // Splits text into sentences, plays each sequentially.
  // The first sentence plays almost instantly; the rest synthesize
  // in the background while earlier sentences are still playing.
  const playTTS = useCallback(
    async (text: string, role: string, personaName: string, messageId?: string) => {
      // Stop any current playback first
      stopTTS();

      // Toggle off if clicking the same message
      if (messageId && speakingMessageId === messageId) {
        return;
      }

      const sentences = splitSentences(text);
      if (sentences.length === 0) return;

      const abort = new AbortController();
      ttsAbortRef.current = abort;

      setSpeakingMessageId(messageId || null);
      setTtsLoading(true);

      try {
        // Pipeline: prefetch next sentence while current one plays
        for (let i = 0; i < sentences.length; i++) {
          if (abort.signal.aborted) break;

          // Start fetching this sentence
          const blobPromise = fetchTTSAudio(sentences[i], role, personaName);

          // Also prefetch the NEXT sentence in parallel (warm the cache)
          if (i + 1 < sentences.length) {
            fetchTTSAudio(sentences[i + 1], role, personaName).catch(() => {});
          }

          const blob = await blobPromise;
          if (abort.signal.aborted) break;

          // First sentence arrived — hide the loading spinner
          if (i === 0) setTtsLoading(false);

          const url = URL.createObjectURL(blob);

          await new Promise<void>((resolve, reject) => {
            if (abort.signal.aborted) {
              URL.revokeObjectURL(url);
              reject(new DOMException("Aborted", "AbortError"));
              return;
            }

            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error("Audio playback failed"));
            };

            // Listen for abort while playing
            const onAbort = () => {
              audio.pause();
              URL.revokeObjectURL(url);
              reject(new DOMException("Aborted", "AbortError"));
            };
            abort.signal.addEventListener("abort", onAbort, { once: true });

            audio.play().catch(reject);
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Normal cancellation — do nothing
        } else {
          console.error("TTS playback failed:", err);
        }
      } finally {
        if (ttsAbortRef.current === abort) {
          setSpeakingMessageId(null);
          setTtsLoading(false);
          ttsAbortRef.current = null;
        }
      }
    },
    [speakingMessageId, splitSentences, stopTTS]
  );

  // Load initial session state
  useEffect(() => {
    fetchDebate(sessionId)
      .then((data) => {
        setSession(data);
        setMessages(data.messages);
        setPhase(data.phase);
        setCurrentRound(data.current_round);
        setMaxRounds(data.max_rounds);
        data.messages.forEach((m) => existingIdsRef.current.add(m.id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // SSE event handlers
  const handleSSEMessage = useCallback(
    (data: Record<string, unknown>) => {
      const msg = data as unknown as DebateMessage;
      newMessageIdsRef.current.add(msg.id);
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    },
    [playTTS]
  );

  const handlePhaseChange = useCallback(
    (data: Record<string, unknown>) => {
      if (data.phase) setPhase(data.phase as string);
      if (data.round) setCurrentRound(data.round as number);
      if (data.message) setStatusMessage(data.message as string);
    },
    []
  );

  const handleDone = useCallback((msg: string) => {
    setIsStreaming(false);
    setStatusMessage(msg);
  }, []);

  const handleError = useCallback((err: string) => {
    setIsStreaming(false);
    setError(err);
  }, []);

  // Start debate
  function startDebate() {
    setIsStreaming(true);
    setError("");
    setStatusMessage("Starting debate...");

    controllerRef.current = connectSSE(
      `/debates/${sessionId}/start`,
      {
        onMessage: handleSSEMessage,
        onPhaseChange: handlePhaseChange,
        onDone: handleDone,
        onError: handleError,
      },
      "POST"
    );
  }

  // Submit student intervention
  function submitIntervention() {
    if (!input.trim()) return;

    // Stop STT if active
    if (isListening) {
      stopListening();
      resetTranscript();
    }

    setIsStreaming(true);
    setError("");
    setStatusMessage(
      isFinalReflection ? "Submitting final reflection..." : "Processing your input..."
    );

    controllerRef.current = connectSSE(
      `/debates/${sessionId}/intervene`,
      {
        onMessage: handleSSEMessage,
        onPhaseChange: handlePhaseChange,
        onDone: handleDone,
        onError: handleError,
      },
      "POST",
      { content: input, is_final_reflection: isFinalReflection }
    );

    setInput("");
    resetTranscript();
  }

  // Run judges
  function runJudges() {
    setIsStreaming(true);
    setError("");
    setStatusMessage("Judges are evaluating the debate...");

    controllerRef.current = connectSSE(
      `/debates/${sessionId}/judge`,
      {
        onMessage: handleSSEMessage,
        onPhaseChange: handlePhaseChange,
        onJudgeResult: (data) => {
          setStatusMessage(
            `Judge (${data.judge_type}) completed evaluation`
          );
        },
        onReport: () => {
          setStatusMessage("Gap report generated!");
          setPhase(DebatePhase.COMPLETED);
        },
        onDone: handleDone,
        onError: handleError,
      },
      "POST"
    );
  }

  // Toggle mic
  function toggleMic() {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      stopTTS();
    };
  }, [stopTTS]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="shimmer h-16 rounded-xl mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-red-400 text-lg font-medium mb-2">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-[var(--accent-purple)] hover:underline"
        >
          ← Back to Topics
        </button>
      </div>
    );
  }

  const showStartButton = phase === DebatePhase.CREATED;
  const showInput = phase === DebatePhase.STUDENT_TURN && !isStreaming;
  const showJudgeButton =
    phase === DebatePhase.JUDGING && !isStreaming;
  const showReportButton = phase === DebatePhase.COMPLETED;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="glass border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <HiArrowLeft className="h-4 w-4" />
              Exit
            </button>
            <div className="h-5 w-px bg-white/[0.1]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {session?.topic_title}
            </h2>
          </div>
          <div className="flex items-center gap-3">

            <PhaseIndicator
              phase={phase}
              currentRound={currentRound}
              maxRounds={maxRounds}
            />
          </div>
        </div>
      </div>

      {/* Personas bar */}
      {session && (
        <div className="border-b border-white/[0.06] bg-[var(--bg-secondary)]/40 px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
              <span className="font-medium text-blue-400">
                {session.persona_a.name}
              </span>
              <span className="text-[var(--text-muted)]">
                ({session.persona_a.era})
              </span>
            </div>
            <span className="font-bold text-[var(--accent-gold)]">VS</span>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="font-medium text-rose-400">
                {session.persona_b.name}
              </span>
              <span className="text-[var(--text-muted)]">
                ({session.persona_b.era})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Start button */}
          {showStartButton && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  Ready to Begin?
                </h3>
                <p className="text-[var(--text-secondary)]">
                  Click below to start the debate. The AI debaters will deliver their opening statements.
                </p>
              </div>
              <button
                onClick={startDebate}
                className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-purple-500/25 transition-all hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <HiScale className="h-5 w-5" />
                Begin Debate
              </button>
            </div>
          )}

          {/* Message feed */}
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              personaName={msg.persona_name}
              content={msg.content}
              isNew={newMessageIdsRef.current.has(msg.id)}
              onSpeak={(content, role) => playTTS(content, role, msg.persona_name, msg.id)}
              isSpeakingThis={speakingMessageId === msg.id}
            />
          ))}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex justify-start animate-fade-in">
              <div className="glass-card px-5 py-3">
                <div className="loading-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          {/* Status message */}
          {statusMessage && !isStreaming && (
            <div className="text-center animate-fade-in">
              <p className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 px-4 py-2 text-sm text-[var(--accent-purple)]">
                <HiCheck className="h-4 w-4" />
                {statusMessage}
              </p>
            </div>
          )}

          {/* Judge button */}
          {showJudgeButton && (
            <div className="text-center py-6 animate-fade-in-up">
              <button
                onClick={runJudges}
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-amber-500 px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-purple-500/25 transition-all hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <HiScale className="h-5 w-5" />
                Run Judges & Generate Report
              </button>
            </div>
          )}

          {/* View report button */}
          {showReportButton && (
            <div className="text-center py-6 animate-fade-in-up">
              <button
                onClick={() => router.push(`/debate/${sessionId}/report`)}
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-purple-500/25 transition-all hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <HiDocumentText className="h-5 w-5" />
                View Gap Report
              </button>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="text-center animate-fade-in">
              <p className="inline-block rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Student input area */}
      {showInput && (
        <div className="glass border-t border-white/[0.06] px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            {/* Final reflection toggle */}
            <div className="mb-3 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isFinalReflection}
                  onChange={(e) => setIsFinalReflection(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-[var(--bg-secondary)] text-[var(--accent-purple)] focus:ring-[var(--accent-purple)]/50"
                />
                <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  This is my final reflection
                </span>
              </label>
              {isFinalReflection && (
                <span className="text-xs text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 px-2 py-0.5 rounded-full">
                  Will skip to judging phase
                </span>
              )}
            </div>

            {/* Input row */}
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitIntervention();
                  }
                }}
                placeholder={
                  isListening
                    ? "🎙️ Listening... speak your response"
                    : "Ask a question, challenge an argument, or present your perspective..."
                }
                rows={2}
                className={`flex-1 resize-none rounded-xl border px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-all ${
                  isListening
                    ? "border-red-500/40 bg-red-500/[0.04] focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20"
                    : "border-white/[0.08] bg-[var(--bg-secondary)] focus:border-[var(--accent-purple)]/40 focus:ring-1 focus:ring-[var(--accent-purple)]/20"
                }`}
              />

              {/* Mic button */}
              {sttSupported && (
                <button
                  onClick={toggleMic}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all ${
                    isListening
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/30 pulse-mic hover:bg-red-600"
                      : "bg-white/[0.06] text-[var(--text-muted)] border border-white/[0.08] hover:text-[var(--text-primary)] hover:bg-white/[0.1]"
                  }`}
                  title={isListening ? "Stop listening" : "Speak your response"}
                >
                  <HiMicrophone className="h-5 w-5" />
                </button>
              )}

              {/* Send button */}
              <button
                onClick={submitIntervention}
                disabled={!input.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] text-white shadow-lg shadow-purple-500/20 transition-all hover:shadow-purple-500/40 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <HiPaperAirplane className="h-5 w-5" />
              </button>
            </div>

            {/* Listening indicator */}
            {isListening && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-400 animate-fade-in">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Listening... Speak now. Click mic again to stop.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
