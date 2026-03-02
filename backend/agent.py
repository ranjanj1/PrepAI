import json
import logging
import os
import re
import datetime
from pathlib import Path
from typing import Awaitable, Callable

import anthropic

logger = logging.getLogger(__name__)

# Where to save raw agent responses when JSON extraction fails
_FALLBACK_DIR = Path(__file__).parent.parent / "agent_fallbacks"


from claude_agent_sdk import (
    AgentDefinition,
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
    ToolUseBlock,
    create_sdk_mcp_server,
    tool,
)

from .scraper import scrape_url
from .schemas import ANALYSIS_JSON_SCHEMA

# Main model uses full name (for ClaudeAgentOptions.model)
_LEAD_MODEL = os.getenv("LEAD_MODEL", "claude-haiku-4-5")

# Subagent models use short names only: "sonnet", "opus", "haiku", or "inherit"
_SUBAGENT_MODEL = os.getenv("SUBAGENT_MODEL", "haiku")

# Model for answer generation (direct Anthropic API call)
_ANSWER_MODEL = os.getenv("ANSWER_MODEL", _LEAD_MODEL)

ProgressCallback = Callable[[dict], Awaitable[None]]

# ── Custom MCP Tool ───────────────────────────────────────────────────────────

@tool("scrape_job", "Fetch and extract text content from a job posting URL", {"url": str})
async def _scrape_job_tool(args: dict) -> dict:
    """
    Returns text content on success, or a clear error string on failure.
    Returning an error string (instead of raising) lets the lead agent
    surface the issue to the user rather than crashing silently.
    """
    try:
        text = await scrape_url(args["url"])
        return {"content": [{"type": "text", "text": text}]}
    except ValueError as e:
        # Validation errors (wrong URL type, login wall, etc.) — tell the agent clearly
        error_msg = str(e)
        logger.warning("scrape_job tool error: %s", error_msg)
        return {"content": [{"type": "text", "text": f"ERROR: {error_msg}"}]}
    except Exception as e:
        error_msg = f"Failed to fetch job posting: {e}. Ask the user to paste the job description text directly."
        logger.warning("scrape_job tool unexpected error: %s", e)
        return {"content": [{"type": "text", "text": f"ERROR: {error_msg}"}]}


_scraper_server = create_sdk_mcp_server(name="job_scraper", tools=[_scrape_job_tool])

# ── Subagent Prompts ──────────────────────────────────────────────────────────

_ANALYZER_PROMPT = """You are a job description analyzer.

Given raw job posting text, extract and return ONLY a JSON object with:
- role: job title (string)
- company: company name (string)
- location: work location — city/state or "Remote" (string)
- skills: array of {name: string, primary: boolean}
  - primary=true → required/core skills explicitly stated
  - primary=false → preferred/nice-to-have
- topics: array of {name: string, weight: integer 0-100}
  - weight reflects how much emphasis the JD places on each domain

Return ONLY the JSON object. No markdown, no explanation."""

_TECH_QUESTIONS_PROMPT = """You are a technical interview question generator.

Given a job description and extracted skills/topics, generate exactly 4 Technical questions.

Each question must:
- Reference specific technologies or concepts from the job posting
- Include: text (string), difficulty ("Easy"|"Medium"|"Hard"), topic (string), hint (string)
- hint = specific keywords, frameworks, patterns the candidate must cover

Return ONLY a JSON array of question objects. No markdown, no explanation."""

_SYSDESIGN_QUESTIONS_PROMPT = """You are a system design interview question generator.

Given a job description and extracted role/skills, generate exactly 2 System Design questions.

Each question must:
- Reference realistic scale, constraints, or systems relevant to the role
- Include: text (string), difficulty ("Medium"|"Hard"), topic (string), hint (string)
- hint = key components, tradeoffs, and architectural patterns to discuss

Return ONLY a JSON array of question objects. No markdown, no explanation."""

_BEHAVIORAL_PROMPT = """You are a behavioral interview question generator.

Given a job description, generate exactly 2 Behavioral questions.

Rules:
- Quote or directly reference specific language/phrases from the JD in the hint
- hint = STAR framework guidance + why this question maps to the JD
- difficulty = "Easy" or "Medium"
- Include: text (string), difficulty (string), topic (string), hint (string)

Return ONLY a JSON array of question objects. No markdown, no explanation."""

# ── Subagent Definitions ──────────────────────────────────────────────────────

_AGENTS: dict[str, AgentDefinition] = {
    "analyzer": AgentDefinition(
        description="Extracts role, company, location, skills[], and topics[] from raw job posting text",
        prompt=_ANALYZER_PROMPT,
        model="haiku",
        tools=[],  # No tools needed — text in, JSON out
    ),
    "tech_questions": AgentDefinition(
        description="Generates Technical interview questions from extracted job requirements",
        prompt=_TECH_QUESTIONS_PROMPT,
        model="haiku",
        tools=[],  # No tools needed — text in, JSON out
    ),
    "sysdesign_questions": AgentDefinition(
        description="Generates System Design interview questions from extracted job requirements",
        prompt=_SYSDESIGN_QUESTIONS_PROMPT,
        model="haiku",
        tools=[],  # No tools needed — text in, JSON out
    ),
    "behavioral_questions": AgentDefinition(
        description="Generates Behavioral interview questions targeting specific language from the job description",
        prompt=_BEHAVIORAL_PROMPT,
        model="haiku",
        tools=[],  # No tools needed — text in, JSON out
    ),
}

# ── Progress step mapping ─────────────────────────────────────────────────────

_STEP_MAP = {
    "scrape_job": ("scraping", "Fetching job posting..."),
    "analyzer": ("analyzing", "Extracting skills and topics..."),
    "tech_questions": ("technical", "Generating Technical questions..."),
    "sysdesign_questions": ("sysdesign", "Generating System Design questions..."),
    "behavioral_questions": ("behavioral", "Generating Behavioral questions..."),
}

# ── Lead agent prompts ────────────────────────────────────────────────────────

_LEAD_PROMPT_URL = """You are an interview prep kit generator. You only use the tools: mcp__scraper__scrape_job and Task. Do NOT use Bash, file tools, or any other tools.

Steps:
1. Call scrape_job with the EXACT URL provided by the user — do not modify or infer a different URL.
   - If scrape_job returns an ERROR message, stop immediately and output a JSON error:
     {"error": "<the error message from the tool>"}
2. Spawn the "analyzer" subagent with the raw text to extract role, company, location, skills, topics.
3. Spawn "tech_questions", "sysdesign_questions", and "behavioral_questions" subagents in parallel — pass them the raw text and the analyzer results.
4. Combine all results into a single JSON response matching the required schema exactly.

IMPORTANT:
- Use ONLY the exact URL the user gives you. Never guess or construct a different URL.
- Do NOT call Bash or any tool other than scrape_job and Task.
- Output must be a valid JSON object with fields:
  role, company, location, skills[], topics[], questions.technical[], questions.sysdesign[], questions.behavioral[]
- Each question has: text, difficulty (Easy/Medium/Hard), topic, hint."""

_LEAD_PROMPT_TEXT = """You are an interview prep kit generator. You only use the Task tool. Do NOT use Bash, file tools, scrape_job, or any other tools.

The full job description text has been provided directly — do NOT call scrape_job.

Steps:
1. Spawn the "analyzer" subagent with the provided job description text to extract role, company, location, skills, topics.
2. Spawn "tech_questions", "sysdesign_questions", and "behavioral_questions" subagents in parallel — pass them the job description text and the analyzer results.
3. Combine all results into a single JSON response matching the required schema exactly.

IMPORTANT:
- Do NOT call Bash or any tool other than Task.
- Output must be a valid JSON object with fields:
  role, company, location, skills[], topics[], questions.technical[], questions.sysdesign[], questions.behavioral[]
- Each question has: text, difficulty (Easy/Medium/Hard), topic, hint."""

# ── Public API ────────────────────────────────────────────────────────────────

def _save_fallback(raw_text: str, label: str) -> Path:
    """Save raw agent response to a timestamped file for debugging."""
    _FALLBACK_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    path = _FALLBACK_DIR / f"{ts}_{label}.txt"
    path.write_text(raw_text, encoding="utf-8")
    logger.warning("Raw agent response saved to: %s", path)
    return path


def _extract_json_from_text(text: str) -> dict | None:
    """
    Try to extract a JSON object from free-form text.
    Strategy 1: strip markdown fences and parse directly.
    Strategy 2: find the first { ... } block using regex.
    """
    if not text or not text.strip():
        return None

    # Strategy 1 — strip ```json ... ``` or ``` ... ``` fences
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
    try:
        data = json.loads(cleaned.strip())
        if isinstance(data, dict):
            logger.info("JSON extracted via strategy 1 (fence strip)")
            return data
    except (json.JSONDecodeError, ValueError):
        pass

    # Strategy 2 — find first outermost { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                logger.info("JSON extracted via strategy 2 (regex brace match)")
                return data
        except (json.JSONDecodeError, ValueError):
            pass

    return None


def _coerce_to_schema(data: dict) -> dict:
    """
    Coerce a loosely-structured dict to match the expected schema.
    Fills in missing fields with safe defaults so the app never crashes.
    """
    def _coerce_question(q: dict) -> dict:
        diff = q.get("difficulty", "Medium")
        if diff not in ("Easy", "Medium", "Hard"):
            diff = "Medium"
        return {
            "text":       str(q.get("text", q.get("question", ""))),
            "difficulty": diff,
            "topic":      str(q.get("topic", "")),
            "hint":       str(q.get("hint", "")),
        }

    def _coerce_questions(raw) -> list:
        if isinstance(raw, list):
            return [_coerce_question(q) for q in raw if isinstance(q, dict)]
        return []

    questions = data.get("questions", {})

    return {
        "role":     str(data.get("role", "Unknown Role")),
        "company":  str(data.get("company", "Unknown Company")),
        "location": str(data.get("location", "")),
        "skills": [
            {"name": str(s.get("name", "")), "primary": bool(s.get("primary", True))}
            for s in data.get("skills", []) if isinstance(s, dict)
        ],
        "topics": [
            {"name": str(t.get("name", "")), "weight": int(t.get("weight", 50))}
            for t in data.get("topics", []) if isinstance(t, dict)
        ],
        "questions": {
            "technical":  _coerce_questions(questions.get("technical", [])),
            "sysdesign":  _coerce_questions(questions.get("sysdesign", [])),
            "behavioral": _coerce_questions(questions.get("behavioral", [])),
        },
    }


async def run_analysis(
    progress_cb: ProgressCallback,
    url: str | None = None,
    jd_text: str | None = None,
) -> dict:
    os.environ.pop("CLAUDECODE", None)  # Allow subprocess launch inside Claude Code terminal

    if jd_text:
        system_prompt = _LEAD_PROMPT_TEXT
        allowed_tools = ["Task"]
        query_msg = f"Build a complete interview prep kit from this job description:\n\n{jd_text}"
    else:
        system_prompt = _LEAD_PROMPT_URL
        allowed_tools = ["mcp__scraper__scrape_job", "Task"]
        query_msg = f"Analyze this job posting and build a complete interview prep kit: {url}"

    options = ClaudeAgentOptions(
        mcp_servers={"scraper": _scraper_server},
        allowed_tools=allowed_tools,
        disallowed_tools=["Bash", "computer"],
        agents=_AGENTS,
        output_format={"type": "json_schema", "schema": ANALYSIS_JSON_SCHEMA},
        permission_mode="bypassPermissions",
        model=_LEAD_MODEL,
        system_prompt=system_prompt,
        max_turns=5,
    )

    result: dict | None = None
    raw_texts: list[str] = []          # Collect ALL text output from the agent

    async with ClaudeSDKClient(options=options) as client:
        await client.query(query_msg)

        async for message in client.receive_response():
            logger.info("Agent message: %s", type(message).__name__)

            if isinstance(message, AssistantMessage):
                for block in message.content:
                    block_name = getattr(block, "name", "-")
                    logger.info("  Block: %s name=%s", type(block).__name__, block_name)

                    # Collect any text blocks — could contain inline JSON
                    if hasattr(block, "text") and block.text:
                        raw_texts.append(block.text)

                    if isinstance(block, ToolUseBlock):
                        if block.name == "Task":
                            logger.info("  Task input: %s", block.input)
                        if block.name in ("Bash", "bash"):
                            logger.error("UNEXPECTED Bash tool call: %s", block.input)
                        step, msg = _resolve_step(block)
                        if step:
                            await progress_cb({"event": "progress", "step": step, "message": msg})

            elif isinstance(message, ResultMessage):
                logger.info(
                    "ResultMessage: structured_output=%s, result_text_len=%s",
                    bool(message.structured_output),
                    len(str(message.result)) if message.result else 0,
                )
                # Strategy 1 — SDK validated structured output (best case)
                if message.structured_output:
                    result = message.structured_output
                    logger.info("Result obtained via structured_output")
                elif message.result:
                    raw_texts.append(str(message.result))

    # Strategy 2 — try to extract JSON from any collected text
    if result is None and raw_texts:
        combined = "\n\n".join(raw_texts)
        logger.warning("structured_output missing — attempting JSON extraction from %d chars of raw text", len(combined))
        extracted = _extract_json_from_text(combined)
        if extracted:
            result = _coerce_to_schema(extracted)
            logger.info("Result recovered via JSON text extraction")

    # Strategy 3 — nothing worked: save the raw text to a file and return a minimal shell
    if result is None:
        combined = "\n\n".join(raw_texts) if raw_texts else "(no output captured)"
        fallback_path = _save_fallback(combined, label=url.replace("/", "_")[:40] if url else "jd_text")
        logger.error("All extraction strategies failed. Raw output saved to %s", fallback_path)
        # Return a minimal valid structure so the frontend doesn't crash
        result = _coerce_to_schema({
            "role": "Unknown Role",
            "company": "Unknown Company",
            "location": "",
            "skills": [],
            "topics": [],
            "questions": {"technical": [], "sysdesign": [], "behavioral": []},
        })
        # Add a note in questions so the user sees something meaningful
        result["questions"]["technical"].append({
            "text": f"The agent did not return structured data. Raw output saved to: {fallback_path.name}",
            "difficulty": "Medium",
            "topic": "Error",
            "hint": f"Check {fallback_path} for the full agent response.",
        })

    return result


async def generate_answer(question_text: str, role: str, company: str) -> str:
    ai = anthropic.AsyncAnthropic()
    msg = await ai.messages.create(
        model=_ANSWER_MODEL,
        max_tokens=1024,
        system="You are an expert interview coach. Give a concise, practical ideal answer.",
        messages=[
            {
                "role": "user",
                "content": f"Role: {role} at {company}\n\nQuestion: {question_text}\n\nProvide an ideal answer.",
            }
        ],
    )
    return msg.content[0].text


def _resolve_step(block: ToolUseBlock) -> tuple[str | None, str | None]:
    if "scrape_job" in block.name:
        return _STEP_MAP["scrape_job"]
    if block.name == "Task":
        desc = str(block.input.get("description") or "").lower()
        if "analyze" in desc or "extract" in desc:
            return _STEP_MAP["analyzer"]
        if "technical" in desc:
            return _STEP_MAP["tech_questions"]
        if "system design" in desc:
            return _STEP_MAP["sysdesign_questions"]
        if "behavioral" in desc:
            return _STEP_MAP["behavioral_questions"]
    return None, None