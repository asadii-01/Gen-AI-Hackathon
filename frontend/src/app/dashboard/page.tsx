"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  fetchProfile,
  updateProfile,
  fetchGapReportHistory,
  fetchGapReportDetail,
  deleteGapReportHistory,
} from "@/lib/api";
import { User, UserProfileUpdate, GapReportListItem, GapReportRecord } from "@/lib/types";
import {
  HiUser,
  HiDocumentText,
  HiPencilSquare,
  HiXMark,
  HiCheck,
  HiTrash,
  HiChevronDown,
  HiChevronUp,
  HiAcademicCap,
  HiLightBulb,
  HiBookOpen,
  HiChatBubbleLeftRight,
  HiExclamationTriangle,
  HiSparkles,
  HiCalendar,
  HiPlusCircle,
} from "react-icons/hi2";

type Tab = "profile" | "reports";

/* ── Tag Input component ──────────────────────────────────────────── */

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-medium text-[var(--text-primary)]"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, j) => j !== i))}
              className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              <HiXMark className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--accent-purple)] focus:ring-1 focus:ring-[var(--accent-purple)]/40"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[var(--text-secondary)] hover:border-[var(--accent-purple)] hover:text-[var(--accent-purple)] transition-all"
        >
          <HiPlusCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Profile Tab ──────────────────────────────────────────────────── */

function ProfileTab({ user, onUpdated }: { user: User; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<UserProfileUpdate>({
    username: user.username,
    study_domain: user.study_domain || "",
    bio: user.bio || "",
    interests: user.interests || [],
    strengths: user.strengths || [],
    weaknesses: user.weaknesses || [],
    learning_goals: user.learning_goals || [],
  });

  // Sync form when user changes
  useEffect(() => {
    setForm({
      username: user.username,
      study_domain: user.study_domain || "",
      bio: user.bio || "",
      interests: user.interests || [],
      strengths: user.strengths || [],
      weaknesses: user.weaknesses || [],
      learning_goals: user.learning_goals || [],
    });
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await updateProfile(form);
      setSuccess("Profile updated successfully!");
      setEditing(false);
      onUpdated();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const tagFields = [
    { key: "interests" as const, label: "Interests", placeholder: "e.g. Philosophy, AI Ethics" },
    { key: "strengths" as const, label: "Strengths", placeholder: "e.g. Logical reasoning" },
    { key: "weaknesses" as const, label: "Areas to Improve", placeholder: "e.g. Evidence citation" },
    { key: "learning_goals" as const, label: "Learning Goals", placeholder: "e.g. Master rhetoric" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Your Profile</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--accent-purple)] hover:text-[var(--accent-purple)]"
          >
            <HiPencilSquare className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400 animate-fade-in">
          {success}
        </div>
      )}

      {editing ? (
        /* ── Edit Mode ── */
        <form onSubmit={handleSave} className="glass-card p-6 space-y-5" style={{ transform: "none" }}>
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Username
            </label>
            <input
              value={form.username || ""}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--accent-purple)] focus:ring-1 focus:ring-[var(--accent-purple)]/40"
            />
          </div>

          {/* Study Domain */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Study Domain
            </label>
            <input
              value={form.study_domain || ""}
              onChange={(e) => setForm({ ...form, study_domain: e.target.value })}
              placeholder="e.g. Computer Science, Philosophy"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--accent-purple)] focus:ring-1 focus:ring-[var(--accent-purple)]/40"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Bio
            </label>
            <textarea
              value={form.bio || ""}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              placeholder="Tell us about yourself..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--accent-purple)] focus:ring-1 focus:ring-[var(--accent-purple)]/40 resize-none"
            />
          </div>

          {/* Tag fields */}
          {tagFields.map((field) => (
            <TagInput
              key={field.key}
              label={field.label}
              tags={(form[field.key] as string[]) || []}
              onChange={(tags) => setForm({ ...form, [field.key]: tags })}
              placeholder={field.placeholder}
            />
          ))}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? (
                <div className="loading-dots"><span /><span /><span /></div>
              ) : (
                <><HiCheck className="h-4 w-4" /> Save Changes</>
              )}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-white/[0.16]"
            >
              <HiXMark className="h-4 w-4" /> Cancel
            </button>
          </div>
        </form>
      ) : (
        /* ── View Mode ── */
        <div className="glass-card p-6 space-y-6" style={{ transform: "none" }}>
          {/* Avatar + basic info */}
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] text-2xl font-bold text-white uppercase shadow-lg shadow-purple-500/20">
              {user.username.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{user.username}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
              {user.study_domain && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 px-3 py-0.5 text-xs font-medium text-[var(--accent-purple)]">
                  <HiAcademicCap className="h-3 w-3" />
                  {user.study_domain}
                </span>
              )}
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Bio</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Tag sections */}
          {[
            { label: "Interests", items: user.interests, icon: HiLightBulb, color: "cyan" },
            { label: "Strengths", items: user.strengths, icon: HiSparkles, color: "green" },
            { label: "Areas to Improve", items: user.weaknesses, icon: HiExclamationTriangle, color: "amber" },
            { label: "Learning Goals", items: user.learning_goals, icon: HiBookOpen, color: "purple" },
          ]
            .filter((s) => s.items && s.items.length > 0)
            .map((section) => {
              const colorMap: Record<string, string> = {
                cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
                green: "border-green-500/20 bg-green-500/10 text-green-300",
                amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
                purple: "border-purple-500/20 bg-purple-500/10 text-purple-300",
              };
              const tagClass = colorMap[section.color] || colorMap.cyan;
              return (
                <div key={section.label}>
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    <section.icon className="h-3.5 w-3.5" />
                    {section.label}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item, i) => (
                      <span
                        key={i}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${tagClass}`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

          {/* Member since */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] pt-2 border-t border-white/[0.06]">
            <HiCalendar className="h-3.5 w-3.5" />
            Member since {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reports Tab ──────────────────────────────────────────────────── */

function ReportsTab() {
  const [reports, setReports] = useState<GapReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GapReportRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await fetchGapReportHistory();
      setReports(data);
    } catch {
      setError("Failed to load gap reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const d = await fetchGapReportDetail(id);
      setDetail(d);
    } catch {
      setError("Failed to load report detail");
      setExpandedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this gap report? This cannot be undone.")) return;
    try {
      await deleteGapReportHistory(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (expandedId === id) {
        setExpandedId(null);
        setDetail(null);
      }
    } catch {
      setError("Failed to delete report");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-16 text-center" style={{ transform: "none" }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-4">
          <HiDocumentText className="h-7 w-7 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Gap Reports Yet</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm">
          Complete a debate while logged in to generate your first personalized gap report.
        </p>
      </div>
    );
  }

  const reportSections = [
    { key: "reasoning_blind_spots" as const, label: "Reasoning Blind Spots", icon: HiExclamationTriangle, color: "text-amber-400" },
    { key: "evidence_gaps" as const, label: "Evidence Gaps", icon: HiBookOpen, color: "text-red-400" },
    { key: "rhetorical_opportunities" as const, label: "Rhetorical Opportunities", icon: HiSparkles, color: "text-cyan-400" },
    { key: "follow_up_questions" as const, label: "Follow-up Questions", icon: HiChatBubbleLeftRight, color: "text-purple-400" },
    { key: "recommended_readings" as const, label: "Recommended Readings", icon: HiBookOpen, color: "text-green-400" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[var(--text-primary)]">
        Gap Report History
        <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">({reports.length})</span>
      </h2>

      {reports.map((report) => {
        const isExpanded = expandedId === report.id;
        return (
          <div key={report.id} className="glass-card overflow-hidden" style={{ transform: "none" }}>
            {/* Summary row */}
            <button
              onClick={() => toggleExpand(report.id)}
              className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#06b6d4]/20 border border-white/[0.06]">
                <HiDocumentText className="h-5 w-5 text-[var(--accent-purple)]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[var(--text-primary)] truncate">{report.topic_title}</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">
                  {report.overall_summary}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <HiCalendar className="h-3 w-3" />
                  {new Date(report.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(report.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDelete(report.id);
                  }}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <HiTrash className="h-4 w-4" />
                </span>
                {isExpanded ? (
                  <HiChevronUp className="h-5 w-5 text-[var(--text-muted)]" />
                ) : (
                  <HiChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
                )}
              </div>
            </button>

            {/* Expandable detail */}
            {isExpanded && (
              <div className="border-t border-white/[0.06] p-5 animate-fade-in">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="loading-dots"><span /><span /><span /></div>
                  </div>
                ) : detail ? (
                  <div className="space-y-5">
                    {/* Overall Summary */}
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Overall Summary</h4>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{detail.overall_summary}</p>
                    </div>

                    {/* Report sections */}
                    {reportSections.map((section) => {
                      const items = detail[section.key];
                      if (!items || items.length === 0) return null;
                      return (
                        <div key={section.key}>
                          <h4 className={`flex items-center gap-1.5 text-sm font-semibold mb-2 ${section.color}`}>
                            <section.icon className="h-4 w-4" />
                            {section.label}
                          </h4>
                          <ul className="space-y-2">
                            {items.map((item, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-secondary)]"
                              >
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Dashboard Page ───────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Load full profile
  useEffect(() => {
    if (user) {
      fetchProfile()
        .then(setProfile)
        .catch(() => setProfile(user))
        .finally(() => setProfileLoading(false));
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof HiUser }[] = [
    { id: "profile", label: "Profile", icon: HiUser },
    { id: "reports", label: "Gap Reports", icon: HiDocumentText },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-20 right-1/4 h-80 w-80 rounded-full bg-purple-600/10 blur-[140px]" />
      <div className="absolute bottom-20 left-1/4 h-80 w-80 rounded-full bg-cyan-600/10 blur-[140px]" />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 relative z-10">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Manage your profile and review your debate performance
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#8b5cf6]/20 to-[#06b6d4]/20 text-[var(--text-primary)] border border-white/[0.08] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          {activeTab === "profile" ? (
            profileLoading ? (
              <div className="space-y-4">
                <div className="shimmer h-12 rounded-xl" />
                <div className="shimmer h-48 rounded-2xl" />
              </div>
            ) : (
              <ProfileTab
                user={profile || user}
                onUpdated={async () => {
                  await refreshUser();
                  const updated = await fetchProfile();
                  setProfile(updated);
                }}
              />
            )
          ) : (
            <ReportsTab />
          )}
        </div>
      </div>
    </div>
  );
}
