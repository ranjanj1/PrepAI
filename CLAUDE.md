# PrepAI – CLAUDE.md

AI-powered interview prep kit generator. Paste a job URL or raw JD text → get personalized questions, hints, and AI answers.

## Stack

**Backend:** Python 3.10 · FastAPI · SQLite + SQLAlchemy async (aiosqlite) · Claude Agent SDK · Anthropic API
**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS
**Auth:** JWT (python-jose) + bcrypt · 7-day tokens

## Running

```bash
# Backend — run from PrepAI/ root
uvicorn backend.main:app --reload

# Frontend
cd frontend && npm run dev
```

Backend: `http://localhost:8000` · Frontend: `http://localhost:5173`

## File Structure

```
PrepAI/
├── prepai.db                        # SQLite DB (single source of truth)
├── backend/
│   ├── main.py                      # FastAPI app, all endpoints, WS handler
│   ├── agent.py                     # Claude Agent SDK logic + Anthropic API calls
│   ├── auth.py                      # JWT auth, /auth/register, /auth/login
│   ├── database.py                  # SQLAlchemy models + engine
│   ├── schemas.py                   # ANALYSIS_JSON_SCHEMA (structured output)
│   ├── scraper.py                   # scrape_url() — fetches job posting HTML
│   └── test/
│       ├── test_db.py               # DB inspection script
│       └── test_agent.py
└── frontend/src/
    ├── App.tsx                      # Root: screen routing + state
    ├── api.ts                       # All fetch calls (auth, analyses, answers, custom questions)
    ├── types.ts                     # Shared TS interfaces
    ├── hooks/useAnalysis.ts         # WS connection + analysis state
    ├── screens/
    │   ├── AuthScreen.tsx
    │   ├── HomeScreen.tsx           # URL/JD toggle input + ScanProgress
    │   ├── ResultsScreen.tsx        # Tabs + QuestionCards + add question form
    │   └── HistoryScreen.tsx
    └── components/
        ├── QuestionCard.tsx         # Expandable card: hint + AI answer + custom delete
        ├── ScanProgress.tsx         # Animated step checklist (hides scraping step in JD mode)
        └── Sidebar.tsx              # Role/company/skills/topics panel
```

## Database Schema

```
users              — id, email, password_hash, created_at
analyses           — id, user_id, job_url, role, company, result_json (full JSON blob), created_at
answers            — id, analysis_id, question_text, answer_text, created_at
custom_questions   — id, analysis_id, category, text, difficulty, topic, hint, created_at
```

- `result_json` stores the entire AI-generated prep kit (skills, topics, all questions)
- `answers` upsert on (analysis_id, question_text)
- `custom_questions.category` ∈ `technical | sysdesign | behavioral`
- DB path is absolute: `Path(__file__).parent.parent / "prepai.db"` — always resolves to `PrepAI/prepai.db` regardless of CWD

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register → JWT token |
| POST | /auth/login | Login → JWT token |
| WS | /ws/analyze?token= | Stream analysis progress + result |
| GET | /analyses | List user's past analyses |
| GET | /analyses/{id} | Get full analysis (result_json) |
| GET | /analyses/{id}/answers | Load all saved AI answers |
| POST | /analyses/{id}/answers | Generate + save answer for a question |
| GET | /analyses/{id}/custom-questions | List user's custom questions |
| POST | /analyses/{id}/custom-questions | Add custom question |
| DELETE | /analyses/{id}/custom-questions/{q_id} | Delete custom question |

## WebSocket Protocol

Client → Server: `{ url: string }` or `{ jd_text: string }`

Server → Client events:
- `{ event: "progress", step: string, message: string }`
- `{ event: "heartbeat" }` — every 10s to keep connection alive
- `{ event: "result", data: AnalysisResult, analysis_id: number }`
- `{ event: "error", message: string }`

Steps: `scraping → analyzing → technical → sysdesign → behavioral`
JD text mode skips `scraping`.

## Agent Architecture (`backend/agent.py`)

- **Lead agent** (`_LEAD_MODEL` = `LEAD_MODEL` env, default `claude-haiku-4-5`) orchestrates via Claude Agent SDK
- **4 subagents** (all `haiku` short name): `analyzer`, `tech_questions`, `sysdesign_questions`, `behavioral_questions`
- **MCP tool**: `scrape_job` — custom tool wrapping `scrape_url()`, only added to `allowed_tools` in URL mode
- **Structured output**: JSON schema enforced via `output_format` on `ClaudeAgentOptions`
- **`generate_answer()`** — direct `anthropic.AsyncAnthropic()` call, model from `ANSWER_MODEL` env (defaults to `_LEAD_MODEL`)
- **Timeout**: 120s `asyncio.wait_for` in `main.py`; `max_turns=5` on agent options
- **Nested session fix**: `os.environ.pop("CLAUDECODE", None)` called at start of `run_analysis` to allow subprocess launch inside Claude Code terminal

## Key env vars (`.env`)

```
ANTHROPIC_API_KEY=...
JWT_SECRET=...
LEAD_MODEL=claude-haiku-4-5        # Full model ID for lead agent
SUBAGENT_MODEL=haiku               # Short name for subagents
ANSWER_MODEL=claude-haiku-4-5      # Full model ID for answer generation
```

## Frontend State Flow

```
useAnalysis (WS state) → App.tsx (screen routing) → ResultsScreen
                                                          ↓
                                              analysisId + answers + customQuestions
                                                          ↓
                                                    QuestionCard[]
```

- `analysisId` flows from WS result event (`msg.analysis_id`) or from history (`HistoryScreen.onLoad(result, url, id)`)
- Answers loaded once on mount in `ResultsScreen`, updated locally on generate
- Custom questions loaded once on mount, mutated locally on add/delete

## Known Issues / Notes

- `ClaudeSDKClient` is imported but unused (Pylance hint, not an error) — kept for reference
- The commented-out code at the top of `agent.py` is the original implementation — can be cleaned up
- `job_url` field in `analyses` stores the URL or a truncated JD preview (first 80 chars) for JD-mode analyses
