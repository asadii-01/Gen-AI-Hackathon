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

### 4. Open API docs

Navigate to [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger UI.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/topics` | List all debate topics |
| `GET` | `/api/topics/{id}` | Get topic with persona details |
| `POST` | `/api/debates` | Create a new debate session |
| `GET` | `/api/debates/{id}` | Get debate state & messages |
| `POST` | `/api/debates/{id}/start` | Start debate (SSE stream) |
| `POST` | `/api/debates/{id}/intervene` | Submit student input (SSE stream) |
| `POST` | `/api/debates/{id}/judge` | Run judges (SSE stream) |
| `GET` | `/api/debates/{id}/report` | Get gap report |
| `GET` | `/api/debates/{id}/stream` | SSE stream of all messages |

## Debate Flow

1. **Choose a topic** — `GET /api/topics`
2. **Create session** — `POST /api/debates` with `{ "topic_id": "climate-policy" }`
3. **Start debate** — `POST /api/debates/{id}/start` → streams opening statements
4. **Intervene** — `POST /api/debates/{id}/intervene` with `{ "content": "..." }` → streams AI responses
5. **Repeat** for 2-3 rounds
6. **Final reflection** — `POST /api/debates/{id}/intervene` with `{ "content": "...", "is_final_reflection": true }`
7. **Judge & Report** — `POST /api/debates/{id}/judge` → streams judge results + gap report
8. **View report** — `GET /api/debates/{id}/report`

## Tech Stack

- **FastAPI** — Async web framework
- **Groq** — Free LLM inference (Llama 3.3 70B)
- **SSE** — Real-time streaming via Server-Sent Events
- **Pydantic** — Data validation and serialization
