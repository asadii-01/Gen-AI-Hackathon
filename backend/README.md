# SocraticCanvas Backend

AI-Powered Generative Debate Environment — Backend API

## Quick Start

### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your Groq API key (get one free at https://console.groq.com/keys)
```

### 3. Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

The SQLite database (`socratic_canvas.db`) is created automatically on first startup.

### 4. Open API docs

Navigate to [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger UI.

## API Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register a new account |
| `POST` | `/api/auth/login` | Login with email & password |
| `GET` | `/api/auth/me` | Get current authenticated user |

### User Profile (🔒 requires JWT)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/profile` | Get full user profile |
| `PUT` | `/api/profile` | Update profile (partial) |
| `DELETE` | `/api/profile` | Delete account & all data |

**Profile fields:** `username`, `study_domain`, `bio`, `interests`, `strengths`, `weaknesses`, `learning_goals`

### Topics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/topics` | List all debate topics |
| `GET` | `/api/topics/{id}` | Get topic with persona details |

### Debates

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/debates` | Create a new debate session |
| `GET` | `/api/debates/{id}` | Get debate state & messages |
| `POST` | `/api/debates/{id}/start` | Start debate (SSE stream) |
| `POST` | `/api/debates/{id}/intervene` | Submit student input (SSE stream) |
| `POST` | `/api/debates/{id}/judge` | Run judges (SSE stream) |
| `GET` | `/api/debates/{id}/report` | Get gap report |
| `GET` | `/api/debates/{id}/stream` | SSE stream of all messages |

> **Note:** If a Bearer token is included when creating a debate, the gap report is automatically saved to the user's account after judging.

### Gap Report History (🔒 requires JWT)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/gap-reports` | List all past gap reports |
| `GET` | `/api/gap-reports/{id}` | Get full gap report detail |
| `DELETE` | `/api/gap-reports/{id}` | Delete a gap report |

## Debate Flow

1. **Choose a topic** — `GET /api/topics`
2. **Create session** — `POST /api/debates` with `{ "topic_id": "climate-policy" }`
3. **Start debate** — `POST /api/debates/{id}/start` → streams opening statements
4. **Intervene** — `POST /api/debates/{id}/intervene` with `{ "content": "..." }` → streams AI responses
5. **Repeat** for 2-3 rounds
6. **Final reflection** — `POST /api/debates/{id}/intervene` with `{ "content": "...", "is_final_reflection": true }`
7. **Judge & Report** — `POST /api/debates/{id}/judge` → streams judge results + gap report (auto-saved if logged in)
8. **View report** — `GET /api/debates/{id}/report` or `GET /api/gap-reports` for history

## Data Storage

- **SQLite** (`socratic_canvas.db`) — persistent storage for users, profiles, and gap report history
- **In-memory** — active debate sessions (reset on server restart)

### Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts, credentials, and profile info |
| `gap_reports` | Saved gap reports linked to users |

## Tech Stack

- **FastAPI** — Async web framework
- **SQLite + aiosqlite** — Async persistent storage
- **Groq** — Free LLM inference (Llama 3.3 70B)
- **SSE** — Real-time streaming via Server-Sent Events
- **Pydantic** — Data validation and serialization
- **bcrypt + JWT** — Authentication
