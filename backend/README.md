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

### Text-to-Speech (TTS)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/tts` | Synthesize speech from text |

**Request body:**
```json
{
  "text": "Hello, this is a test.",
  "role": "debater_a",
  "persona_name": "Dr. Sarah Chen"
}
```

**Response:** `audio/wav` binary data.

The `persona_name` field is used to infer gender and assign an appropriate voice. See [TTS Setup](#tts-setup-kokoro-onnx) below.

## TTS Setup (Kokoro-ONNX)

The backend uses [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) for fast, offline text-to-speech with distinct voices per debate persona.

### 1. Install TTS dependencies

```bash
pip install kokoro-onnx soundfile
```

### 2. Download model files

Download both files into `backend/voice-models/`:

```bash
mkdir -p voice-models
cd voice-models
# Model (~300MB, or ~80MB quantized)
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
# Voice pack
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

### 3. Verify file integrity (SHA256)

After downloading, verify the checksums to ensure the files are intact.

<!-- ⚠️ MAINTAINER NOTE: Update these hashes when model versions change.
     Files: backend/voice-models/kokoro-v1.0.onnx, backend/voice-models/voices-v1.0.bin -->

**Expected SHA256 hashes:**

| File | SHA256 |
|------|--------|
| `kokoro-v1.0.onnx` | `7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5` |
| `voices-v1.0.bin` | `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d` |

**Linux / macOS:**

```bash
cd backend/voice-models/
echo "7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5  kokoro-v1.0.onnx" | sha256sum -c -
echo "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d  voices-v1.0.bin"  | sha256sum -c -
```

If either check prints **FAILED**, delete the corrupted file and re-download it.

**Windows (PowerShell):**

```powershell
cd backend\voice-models\
if ((Get-FileHash kokoro-v1.0.onnx -Algorithm SHA256).Hash -ne "7D5DF8ECF7D4B1878015A32686053FD0EEBE2BC377234608764CC0EF3636A6C5") { Write-Error "❌ kokoro-v1.0.onnx checksum mismatch! Delete and re-download."; exit 1 }
if ((Get-FileHash voices-v1.0.bin  -Algorithm SHA256).Hash -ne "BCA610B8308E8D99F32E6FE4197E7EC01679264EFED0CAC9140FE9C29F1FBF7D") { Write-Error "❌ voices-v1.0.bin checksum mismatch! Delete and re-download.";  exit 1 }
Write-Output "✅ All checksums verified."
```

### Voice Mapping

Voices are automatically assigned based on the agent role and persona gender:

| Role | Voice | Description |
|------|-------|-------------|
| Moderator | `am_adam` | Authoritative male |
| Judge (Logic) | `af_sarah` | Clear, precise female |
| Judge (Evidence) | `am_michael` | Sophisticated male |
| Judge (Rhetoric) | `bf_emma` | British female |
| Gap Reporter | `af_nicole` | Upbeat female |
| **Debater (male persona)** | `am_adam` / `bm_george` | Inferred from persona name |
| **Debater (female persona)** | `af_bella` / `af_sarah` | Inferred from persona name |

> Gender is inferred from the persona's first name (e.g., "Dr. Sarah Chen" → female → `af_bella`). If unknown, debater A defaults to female and debater B to male for vocal variety.

### Performance

- **Sentence pipelining:** The frontend splits text into sentences and requests each one separately, so the first sentence plays almost instantly while the rest generate in the background.
- **LRU cache:** The backend caches up to 200 synthesized audio segments. Replaying a message is instant on the second click.

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
- **kokoro-onnx** — Offline TTS with persona-specific voices
