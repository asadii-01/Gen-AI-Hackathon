# SocraticCanvas Frontend

Next.js web client for the AI-Powered Generative Debate Platform.

## Quick Start

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Prerequisite:** The backend server must be running at `http://localhost:8000`. See [backend/README.md](../backend/README.md).

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Hero section, feature overview, and CTA |
| `/login` | Login | Email & password authentication |
| `/register` | Register | Create a new account |
| `/topics` | Topic Browser | Browse debate topics with persona cards |
| `/debate/[id]` | Debate Arena | Real-time AI debate with SSE streaming |
| `/debate/[id]/report` | Gap Report | Post-debate analysis with scores and recommendations |
| `/dashboard` | User Dashboard | Profile management & gap report history |

## Features

### 🎤 Speech-to-Text (STT)
- Browser-native `SpeechRecognition` API (Chrome/Edge)
- Mic button next to the text input — click to dictate your intervention
- Live transcript fills the textarea in real-time
- Pulsing red indicator while recording

### 🔊 Text-to-Speech (TTS)
- Per-message speaker button (🔊) on every AI message
- Calls `POST /api/tts` on the backend (Kokoro-ONNX)
- Gender-aware voices — male personas get male voices, female personas get female voices
- **Sentence pipelining** — first sentence plays almost instantly; rest synthesize in background
- Click the speaker button again to stop playback

### 💬 Real-Time Debate
- Server-Sent Events (SSE) for streaming AI responses
- Phase-aware UI (created → opening → rebuttal → final → judging → complete)
- Round tracking with visual indicator
- Student intervention with optional "final reflection" mode

### 📊 Gap Reports
- Three-judge evaluation (Logic, Evidence, Rhetoric)
- Radar chart visualization of scores
- Actionable recommendations for improvement
- Auto-saved to user account when logged in

## Project Structure

```
frontend/src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout with Navbar
│   ├── globals.css             # Global styles, animations, CSS variables
│   ├── login/page.tsx          # Login form
│   ├── register/page.tsx       # Registration form
│   ├── topics/page.tsx         # Topic browser
│   ├── dashboard/page.tsx      # User dashboard
│   └── debate/[id]/
│       ├── page.tsx            # Debate arena (SSE, TTS, STT)
│       └── report/page.tsx     # Gap report viewer
├── components/
│   ├── ChatMessage.tsx         # Message bubble with speaker button
│   ├── Navbar.tsx              # Top navigation bar
│   ├── PersonaCard.tsx         # Debate persona info card
│   ├── PhaseIndicator.tsx      # Debate phase/round badge
│   └── TopicCard.tsx           # Topic selection card
├── hooks/
│   └── useSpeechRecognition.ts # Browser STT hook
└── lib/
    ├── api.ts                  # API client (fetch, SSE, TTS)
    ├── auth-context.tsx        # JWT auth context provider
    └── types.ts                # TypeScript interfaces & enums
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Tailwind CSS 4** | Utility-first styling |
| **react-icons** | Icon library (Heroicons set) |
| **Web Speech API** | Browser-native STT |

## Environment

Configure the API base URL in `.env`.

## Build for Production

```bash
npm run build
npm start
```
