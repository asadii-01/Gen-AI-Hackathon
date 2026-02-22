import {
  TopicSummary,
  TopicDetail,
  DebateSessionResponse,
  GapReport,
  AuthResponse,
  User,
  UserProfileUpdate,
  GapReportListItem,
  GapReportRecord,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Auth helpers ─────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sc_token");
}

export function setToken(token: string): void {
  localStorage.setItem("sc_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("sc_token");
}

export async function registerUser(
  email: string,
  username: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || "Registration failed");
  }
  const data: AuthResponse = await res.json();
  setToken(data.access_token);
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Invalid email or password");
  }
  const data: AuthResponse = await res.json();
  setToken(data.access_token);
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const token = getToken();
  if (!token) throw new Error("No token");
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    removeToken();
    throw new Error("Not authenticated");
  }
  return res.json();
}

// ── Profile helpers ──────────────────────────────────────────────────

export async function fetchProfile(): Promise<User> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updateProfile(data: UserProfileUpdate): Promise<User> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Update failed" }));
    throw new Error(err.detail || "Failed to update profile");
  }
  return res.json();
}

export async function deleteAccount(): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/profile`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete account");
}

// ── Gap Report History helpers ───────────────────────────────────────

export async function fetchGapReportHistory(): Promise<GapReportListItem[]> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/gap-reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch gap reports");
  return res.json();
}

export async function fetchGapReportDetail(
  reportId: string
): Promise<GapReportRecord> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/gap-reports/${reportId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Gap report not found");
  return res.json();
}

export async function deleteGapReportHistory(reportId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}/gap-reports/${reportId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete gap report");
}

// ── REST helpers ─────────────────────────────────────────────────────

export async function fetchTopics(): Promise<TopicSummary[]> {
  const res = await fetch(`${API_BASE}/topics`);
  if (!res.ok) throw new Error("Failed to fetch topics");
  return res.json();
}

export async function fetchTopicDetail(id: string): Promise<TopicDetail> {
  const res = await fetch(`${API_BASE}/topics/${id}`);
  if (!res.ok) throw new Error("Topic not found");
  return res.json();
}

export async function createDebate(
  topicId: string
): Promise<DebateSessionResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/debates`, {
    method: "POST",
    headers,
    body: JSON.stringify({ topic_id: topicId }),
  });
  if (!res.ok) throw new Error("Failed to create debate");
  return res.json();
}

export async function fetchDebate(
  sessionId: string
): Promise<DebateSessionResponse> {
  const res = await fetch(`${API_BASE}/debates/${sessionId}`);
  if (!res.ok) throw new Error("Debate not found");
  return res.json();
}

export async function fetchGapReport(sessionId: string): Promise<GapReport> {
  const res = await fetch(`${API_BASE}/debates/${sessionId}/report`);
  if (!res.ok) throw new Error("Gap report not available");
  return res.json();
}

// ── SSE helper for POST-based EventSource ────────────────────────────

export interface SSECallbacks {
  onMessage?: (data: Record<string, unknown>) => void;
  onPhaseChange?: (data: Record<string, unknown>) => void;
  onJudgeResult?: (data: Record<string, unknown>) => void;
  onReport?: (data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  onDone?: (msg: string) => void;
}

/**
 * Connect to a POST-based SSE endpoint.
 * The backend uses POST for /start, /intervene, /judge endpoints.
 * Returns an AbortController so the caller can cancel.
 */
export function connectSSE(
  url: string,
  callbacks: SSECallbacks,
  method: "POST" | "GET" = "POST",
  body?: Record<string, unknown>
): AbortController {
  const controller = new AbortController();

  const fullUrl = `${API_BASE}${url}`;

  const fetchOptions: RequestInit = {
    method,
    signal: controller.signal,
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
  };

  if (body && method === "POST") {
    fetchOptions.body = JSON.stringify(body);
  }

  fetch(fullUrl, fetchOptions)
    .then(async (response) => {
      if (!response.ok) {
        callbacks.onError?.(`HTTP ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        let currentData = "";

        for (const rawLine of lines) {
          // Normalize \r\n line endings — sse-starlette uses \r\n by default,
          // so after splitting on \n, lines may have a trailing \r.
          const line = rawLine.trimEnd();

          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            currentData = line.slice(5).trim();
          } else if (line === "") {
            // Empty line = end of event block (SSE spec delimiter)
            if (currentEvent && currentData) {
              let parsed: Record<string, unknown>;
              try {
                parsed = JSON.parse(currentData);
              } catch {
                parsed = { raw: currentData };
              }

              switch (currentEvent) {
                case "message":
                  callbacks.onMessage?.(parsed);
                  break;
                case "phase_change":
                  callbacks.onPhaseChange?.(parsed);
                  break;
                case "judge_result":
                  callbacks.onJudgeResult?.(parsed);
                  break;
                case "report":
                  callbacks.onReport?.(parsed);
                  break;
                case "error":
                  callbacks.onError?.(currentData);
                  break;
                case "done":
                  callbacks.onDone?.(currentData);
                  break;
              }
            }

            currentEvent = "";
            currentData = "";
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError?.(err.message);
      }
    });

  return controller;
}
