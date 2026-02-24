# PrepAI — AI-Powered Interview Intelligence

Paste any job posting URL. Get a personalized interview prep kit in seconds.

PrepAI scrapes the job description, extracts skills and topics, and generates tailored Technical, System Design, and Behavioral questions — all specific to the exact role and company.

![PrepAI Demo](docs/UI.png)

---

## Features

- **URL → Prep Kit**: Paste any job board URL (LinkedIn, Greenhouse, Lever, Workday, etc.)
- **Live Streaming**: Watch the AI agent work step-by-step in real time via WebSocket
- **Role Intelligence**: Extracts job title, company, key skills (core vs. preferred), and topic weights
- **Categorized Questions**: Technical, System Design, and Behavioral tabs with expandable hints
- **Difficulty Badges**: Each question rated Easy / Medium / Hard
- **Auth + History**: Register, log in, and revisit any past prep kit

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · SQLite (SQLAlchemy async) |
| AI Orchestration | Claude Agent SDK (`ClaudeSDKClient`) · `claude-sonnet-4-6` |
| Subagents | Analyzer (haiku) · 3× Question Generators (sonnet/haiku) |
| Scraping | httpx + BeautifulSoup · Playwright fallback |
| Auth | JWT (python-jose) · bcrypt (passlib) |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| Realtime | FastAPI WebSocket |

---

## Project Structure

```
PrepAI/
├── backend/
│   ├── main.py        # FastAPI app, WebSocket, history endpoints
│   ├── agent.py       # ClaudeSDKClient orchestration + subagents
│   ├── auth.py        # JWT auth, /auth/register, /auth/login
│   ├── database.py    # SQLAlchemy models (User, Analysis)
│   ├── scraper.py     # URL → clean text (httpx + playwright fallback)
│   └── schemas.py     # Pydantic models + JSON schema
├── frontend/
│   └── src/
│       ├── App.tsx                    # Screen state machine
│       ├── hooks/useAnalysis.ts       # WebSocket client hook
│       ├── screens/                   # Auth, Home, Results, History
│       └── components/                # Sidebar, QuestionCard, ScanProgress
├── docs/              # Project spec + UI prototype
├── .env.example
└── requirements.txt
```

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ (or Bun)
- An [Anthropic API key](https://console.anthropic.com)

### Backend

```bash
# 1. Install dependencies
pip install -r requirements.txt
playwright install chromium

# 2. Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY and JWT_SECRET

# 3. Start the server
#uvicorn backend.main:app --reload --port 8000

#/Users/jai79509/Documents/profile/personalProjects/.venv/bin/uvicorn backend.main:app --reload --port 8000

  cd PrepAI && uvicorn backend.main:app --reload   
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

The Vite dev server proxies `/auth`, `/analyses`, and `/ws` to the FastAPI backend automatically.

### Production Build

```bash
cd frontend && npm run build
# FastAPI serves frontend/dist/ as static files at http://localhost:8000
uvicorn backend.main:app --port 8000
```

---

## How It Works

```
User pastes URL
    │
    ▼
WebSocket /ws/analyze
    │
    ├─ scrape_job MCP tool → httpx/playwright → raw job text
    │       ↓ progress: "Fetching job posting..."
    ├─ analyzer subagent (haiku) → role, company, skills[], topics[]
    │       ↓ progress: "Extracting skills and topics..."
    ├─ tech_questions subagent (sonnet) → 4 Technical questions
    │       ↓ progress: "Generating Technical questions..."
    ├─ sysdesign_questions subagent (sonnet) → 2 System Design questions
    │       ↓ progress: "Generating System Design questions..."
    └─ behavioral_questions subagent (haiku) → 2 Behavioral questions
            ↓ progress: "Generating Behavioral questions..."
            ↓ result: full AnalysisResult JSON → saved to DB
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `JWT_SECRET` | Secret key for signing JWT tokens (use a long random string) |

---

## Agent Architecture

The backend uses `ClaudeSDKClient` from the Claude Agent SDK to orchestrate a multi-agent pipeline:

- **Lead agent** (`claude-sonnet-4-6`): Coordinates the full pipeline via a custom MCP scraper tool and spawns subagents via the `Task` tool
- **Analyzer** (`claude-haiku-4-5`): Extracts structured role metadata from raw job text
- **tech_questions** (`claude-sonnet-4-6`): Generates 4 technical questions mapped to specific stack mentions
- **sysdesign_questions** (`claude-sonnet-4-6`): Generates 2 system design questions with realistic constraints
- **behavioral_questions** (`claude-haiku-4-5`): Generates 2 behavioral questions that quote specific JD language

---

## License

MIT
