# 🏛️ SocraticCanvas

**AI-Powered Generative Debate Platform** — Learn critical thinking by engaging with AI personas in structured debates, then receive personalized gap reports from AI judges.

---

## ✨ What Is SocraticCanvas?

SocraticCanvas drops you into a live debate between two AI personas — each with a unique background, era, blind spots, and rhetorical style. You observe, challenge, and intervene as a student. After the debate, three specialized AI judges evaluate the arguments and generate a personalized **Gap Report** highlighting your reasoning blind spots, evidence gaps, and rhetorical opportunities.

### Key Features

- 🎭 **Distinct AI Personas** — Historical and modern characters with authentic voices, knowledge cutoffs, and biases
- 💬 **Real-Time Streaming** — Live debate via Server-Sent Events (SSE)
- 🎤 **Voice Input** — Speak your interventions using browser-native Speech-to-Text
- 🔊 **Voice Output** — AI messages spoken aloud with persona-specific voices (Kokoro TTS)
- ⚖️ **Three AI Judges** — Logic, Evidence, and Rhetoric evaluators score every argument
- 📊 **Gap Reports** — Personalized analysis with actionable improvement recommendations
- 👤 **User Accounts** — Register, login, and track your debate history

## 🏗️ Architecture

```
┌──────────────────────────────────┐
│           Frontend               │
│     Next.js 16 · React 19       │
│     Tailwind CSS 4 · TypeScript │
│     Web Speech API (STT)        │
│         localhost:3000           │
└──────────────┬───────────────────┘
               │  REST + SSE
┌──────────────▼───────────────────┐
│            Backend               │
│     FastAPI · Python             │
│     Groq (Llama 3.3 70B)        │
│     Kokoro-ONNX (TTS)           │
│     SQLite · JWT Auth            │
│         localhost:8000           │
└──────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Groq API key** — free at [console.groq.com/keys](https://console.groq.com/keys)

### 1. Clone the repository

```bash
git clone https://github.com/asadii-01/Gen-AI-Hackathon.git
cd Gen-AI-Hackathon
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env → add your GROQ_API_KEY
```

#### TTS setup (optional)

```bash
pip install kokoro-onnx soundfile

mkdir voice-models && cd voice-models
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ..
```

#### Start the backend

```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 📖 Debate Flow

```
  📚 Choose a Topic
        ↓
  🎭 Persona A opens → 🎭 Persona B responds
        ↓
  🙋 You intervene (type or speak)
        ↓
  🎭 Both personas respond to you
        ↓
  🔁 Repeat for 2–3 rounds
        ↓
  ✍️ Submit your final reflection
        ↓
  ⚖️ Three AI judges evaluate
        ↓
  📊 Gap Report generated
```

## 🎭 Debate Topics & Personas

| Topic | Persona A | Persona B |
|-------|-----------|-----------|
| **Climate Policy** | James Patterson — 1995 Oil Executive | Dr. Sarah Chen — 2024 Climate Scientist |
| **AI Regulation** | Marcus Webb — 2014 Tech Libertarian | Dr. Amara Okafor — 2024 AI Safety Researcher |
| **Healthcare Access** | Dr. Robert Thornton — 1985 Free Market Economist | Elena Vasquez — 2024 Universal Healthcare Advocate |

Each persona has era-specific knowledge cutoffs, blind spots, rhetorical tendencies, and favorite fallacies — making every debate unique and educational.

## 🔊 Voice System

| Role | Voice | Gender-Aware |
|------|-------|:---:|
| Moderator | `am_adam` | — |
| Debaters | Auto-selected | ✅ Inferred from persona name |
| Judge (Logic) | `af_sarah` | — |
| Judge (Evidence) | `am_michael` | — |
| Judge (Rhetoric) | `bf_emma` | — |

- **STT**: Browser-native `SpeechRecognition` — click the 🎤 button to speak
- **TTS**: Click the 🔊 button on any AI message to hear it with sentence-level pipelining for near-instant playback

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| **Backend** | FastAPI, Python, Pydantic |
| **LLM** | Groq Cloud — Llama 3.3 70B |
| **TTS** | Kokoro-ONNX (offline, ~300MB model) |
| **STT** | Web Speech API (browser-native) |
| **Database** | SQLite + aiosqlite |
| **Auth** | bcrypt + JWT |
| **Streaming** | Server-Sent Events (SSE) |

## 📁 Project Structure

```
Gen-AI-Hackathon/
├── backend/               # FastAPI server
│   ├── app/
│   │   ├── main.py        # App entry point
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic (debate manager, LLM, TTS)
│   │   ├── models/        # Pydantic models
│   │   └── content/       # Persona & topic loader
│   ├── content/           # SocraticCanvasContent.md (personas, topics)
│   ├── voice-models/      # Kokoro ONNX model files
│   ├── requirements.txt
│   └── README.md
├── frontend/              # Next.js client
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom hooks (STT)
│   │   └── lib/           # API client, types, auth context
│   ├── package.json
│   └── README.md
└── README.md              # ← You are here
```

## 📚 Documentation

- [**Backend README**](./backend/README.md) — API endpoints, debate flow, TTS setup, database schema
- [**Frontend README**](./frontend/README.md) — Pages, components, project structure, environment config

## 📄 License

This project was built for the Gen AI Hackathon.
