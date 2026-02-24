# import logging
# import os
# from typing import Awaitable, Callable

# logger = logging.getLogger(__name__)

# from claude_agent_sdk import (
#     AgentDefinition,
#     AssistantMessage,
#     ClaudeAgentOptions,
#     ClaudeSDKClient,
#     ResultMessage,
#     ToolUseBlock,
#     create_sdk_mcp_server,
#     tool,
# )

# from .scraper import scrape_url
# from .schemas import ANALYSIS_JSON_SCHEMA

# _LEAD_MODEL = os.getenv("LEAD_MODEL", "claude-sonnet-4-6")
# _ANALYZER_MODEL = os.getenv("ANALYZER_MODEL", "claude-sonnet-4-6")
# _QUESTIONS_MODEL = os.getenv("QUESTIONS_MODEL", "claude-sonnet-4-6")

# ProgressCallback = Callable[[dict], Awaitable[None]]

# # ── Custom MCP Tool ───────────────────────────────────────────────────────────

# @tool("scrape_job", "Fetch and extract text content from a job posting URL", {"url": str})
# async def _scrape_job_tool(args: dict) -> dict:
#     text = await scrape_url(args["url"])
#     return {"content": [{"type": "text", "text": text}]}


# _scraper_server = create_sdk_mcp_server(name="job_scraper", tools=[_scrape_job_tool])

# # ── Subagent Prompts ──────────────────────────────────────────────────────────

# _ANALYZER_PROMPT = """You are a job description analyzer.

# Given raw job posting text, extract and return ONLY a JSON object with:
# - role: job title (string)
# - company: company name (string)
# - location: work location — city/state or "Remote" (string)
# - skills: array of {name: string, primary: boolean}
#   - primary=true → required/core skills explicitly stated
#   - primary=false → preferred/nice-to-have
# - topics: array of {name: string, weight: integer 0-100}
#   - weight reflects how much emphasis the JD places on each domain

# Return ONLY the JSON object. No markdown, no explanation."""

# _TECH_QUESTIONS_PROMPT = """You are a technical interview question generator.

# Given a job description and extracted skills/topics, generate exactly 4 Technical questions.

# Each question must:
# - Reference specific technologies or concepts from the job posting
# - Include: text (string), difficulty ("Easy"|"Medium"|"Hard"), topic (string), hint (string)
# - hint = specific keywords, frameworks, patterns the candidate must cover

# Return ONLY a JSON array of question objects. No markdown, no explanation."""

# _SYSDESIGN_QUESTIONS_PROMPT = """You are a system design interview question generator.

# Given a job description and extracted role/skills, generate exactly 2 System Design questions.

# Each question must:
# - Reference realistic scale, constraints, or systems relevant to the role
# - Include: text (string), difficulty ("Medium"|"Hard"), topic (string), hint (string)
# - hint = key components, tradeoffs, and architectural patterns to discuss

# Return ONLY a JSON array of question objects. No markdown, no explanation."""

# _BEHAVIORAL_PROMPT = """You are a behavioral interview question generator.

# Given a job description, generate exactly 2 Behavioral questions.

# Rules:
# - Quote or directly reference specific language/phrases from the JD in the hint
# - hint = STAR framework guidance + why this question maps to the JD
# - difficulty = "Easy" or "Medium"
# - Include: text (string), difficulty (string), topic (string), hint (string)

# Return ONLY a JSON array of question objects. No markdown, no explanation."""

# # ── Subagent Definitions ──────────────────────────────────────────────────────

# _AGENTS: dict[str, AgentDefinition] = {
#     "analyzer": AgentDefinition(
#         description="Extracts role, company, location, skills[], and topics[] from raw job posting text",
#         prompt=_ANALYZER_PROMPT,
#         model=_ANALYZER_MODEL,
#     ),
#     "tech_questions": AgentDefinition(
#         description="Generates Technical interview questions from extracted job requirements",
#         prompt=_TECH_QUESTIONS_PROMPT,
#         model=_QUESTIONS_MODEL,
#     ),
#     "sysdesign_questions": AgentDefinition(
#         description="Generates System Design interview questions from extracted job requirements",
#         prompt=_SYSDESIGN_QUESTIONS_PROMPT,
#         model=_QUESTIONS_MODEL,
#     ),
#     "behavioral_questions": AgentDefinition(
#         description="Generates Behavioral interview questions targeting specific language from the job description",
#         prompt=_BEHAVIORAL_PROMPT,
#         model=_ANALYZER_MODEL,
#     ),
# }

# # ── Progress step mapping ─────────────────────────────────────────────────────

# _STEP_MAP = {
#     "scrape_job": ("scraping", "Fetching job posting..."),
#     "analyzer": ("analyzing", "Extracting skills and topics..."),
#     "tech_questions": ("technical", "Generating Technical questions..."),
#     "sysdesign_questions": ("sysdesign", "Generating System Design questions..."),
#     "behavioral_questions": ("behavioral", "Generating Behavioral questions..."),
# }

# _LEAD_PROMPT = """You are an interview prep kit generator.

# Steps:
# 1. Call scrape_job with the provided URL to fetch the raw job posting text.
# 2. Spawn the "analyzer" subagent with the raw text to extract role, company, location, skills, topics.
# 3. Spawn "tech_questions", "sysdesign_questions", and "behavioral_questions" subagents — pass them the raw text and the analyzer results.
# 4. Combine all results into a single JSON response matching the required schema exactly.

# Output must be a valid JSON object with fields:
# role, company, location, skills[], topics[], questions.technical[], questions.sysdesign[], questions.behavioral[]

# Each question has: text, difficulty (Easy/Medium/Hard), topic, hint."""

# # ── Public API ────────────────────────────────────────────────────────────────
# ########## with agent ClaudeSDKClient ################


# async def run_analysis(url: str, progress_cb: ProgressCallback) -> dict:
#     options = ClaudeAgentOptions(
#         mcp_servers={"scraper": _scraper_server},
#         allowed_tools=["mcp__scraper__scrape_job", "Task"],
#         agents=_AGENTS,
#         output_format={"type": "json_schema", "schema": ANALYSIS_JSON_SCHEMA},
#         permission_mode="bypassPermissions",
#         model=_LEAD_MODEL,
#         system_prompt=_LEAD_PROMPT,
#         max_turns=20,
#     )

#     result: dict | None = None

#     async with ClaudeSDKClient(options=options) as client:
#         await client.query(f"Analyze this job posting and build a complete interview prep kit: {url}")

#         # ✅ Use receive_response() - stops after ResultMessage
#         async for message in client.receive_response():
#             logger.info("Agent message: %s", type(message).__name__)
#             if isinstance(message, AssistantMessage):
#                 for block in message.content:
#                     logger.info("  Block: %s name=%s", type(block).__name__, getattr(block, "name", "-"))
#                     if isinstance(block, ToolUseBlock):
#                         if block.name == "Task":
#                             logger.info("  Task input: %s", block.input)
#                         step, msg = _resolve_step(block)
#                         if step:
#                             await progress_cb({"event": "progress", "step": step, "message": msg})

#             elif isinstance(message, ResultMessage):
#                 logger.info("ResultMessage: structured_output=%s", bool(message.structured_output))
#                 if message.structured_output:
#                     result = message.structured_output

#     if result is None:
#         raise ValueError("Agent did not produce structured output")

#     return result




# def _resolve_step(block: ToolUseBlock) -> tuple[str | None, str | None]:
#     if "scrape_job" in block.name:
#         return _STEP_MAP["scrape_job"]
#     if block.name == "Task":
#         desc = str(block.input.get("description") or "").lower()
#         if "analyze" in desc:
#             return _STEP_MAP["analyzer"]
#         if "technical" in desc:
#             return _STEP_MAP["tech_questions"]
#         if "system design" in desc:
#             return _STEP_MAP["sysdesign_questions"]
#         if "behavioral" in desc:
#             return _STEP_MAP["behavioral_questions"]
#     return None, None





import logging
import os
from typing import Awaitable, Callable

import anthropic

logger = logging.getLogger(__name__)

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
    text = await scrape_url(args["url"])
    return {"content": [{"type": "text", "text": text}]}


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
        model="haiku",  # ✅ Fixed: use short name
    ),
    "tech_questions": AgentDefinition(
        description="Generates Technical interview questions from extracted job requirements",
        prompt=_TECH_QUESTIONS_PROMPT,
        model="haiku",  # ✅ Fixed: use short name
    ),
    "sysdesign_questions": AgentDefinition(
        description="Generates System Design interview questions from extracted job requirements",
        prompt=_SYSDESIGN_QUESTIONS_PROMPT,
        model="haiku",  # ✅ Fixed: use short name
    ),
    "behavioral_questions": AgentDefinition(
        description="Generates Behavioral interview questions targeting specific language from the job description",
        prompt=_BEHAVIORAL_PROMPT,
        model="haiku",  # ✅ Fixed: use short name
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

_LEAD_PROMPT_URL = """You are an interview prep kit generator.

Steps:
1. Call scrape_job with the provided URL to fetch the raw job posting text.
2. Spawn the "analyzer" subagent with the raw text to extract role, company, location, skills, topics.
3. Spawn "tech_questions", "sysdesign_questions", and "behavioral_questions" subagents — pass them the raw text and the analyzer results.
4. Combine all results into a single JSON response matching the required schema exactly.

Output must be a valid JSON object with fields:
role, company, location, skills[], topics[], questions.technical[], questions.sysdesign[], questions.behavioral[]

Each question has: text, difficulty (Easy/Medium/Hard), topic, hint."""

_LEAD_PROMPT_TEXT = """You are an interview prep kit generator.

The full job description text has been provided directly — do NOT call scrape_job.

Steps:
1. Spawn the "analyzer" subagent with the provided job description text to extract role, company, location, skills, topics.
2. Spawn "tech_questions", "sysdesign_questions", and "behavioral_questions" subagents — pass them the job description text and the analyzer results.
3. Combine all results into a single JSON response matching the required schema exactly.

Output must be a valid JSON object with fields:
role, company, location, skills[], topics[], questions.technical[], questions.sysdesign[], questions.behavioral[]

Each question has: text, difficulty (Easy/Medium/Hard), topic, hint."""

# ── Public API ────────────────────────────────────────────────────────────────

async def run_analysis(
    progress_cb: ProgressCallback,
    url: str | None = None,
    jd_text: str | None = None,
) -> dict:
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
        agents=_AGENTS,
        output_format={"type": "json_schema", "schema": ANALYSIS_JSON_SCHEMA},
        permission_mode="bypassPermissions",
        model=_LEAD_MODEL,
        system_prompt=system_prompt,
        max_turns=5,
    )

    result: dict | None = None

    async with ClaudeSDKClient(options=options) as client:
        await client.query(query_msg)

        async for message in client.receive_response():
            logger.info("Agent message: %s", type(message).__name__)

            if isinstance(message, AssistantMessage):
                for block in message.content:
                    logger.info("  Block: %s name=%s", type(block).__name__, getattr(block, "name", "-"))
                    if isinstance(block, ToolUseBlock):
                        if block.name == "Task":
                            logger.info("  Task input: %s", block.input)
                        step, msg = _resolve_step(block)
                        if step:
                            await progress_cb({"event": "progress", "step": step, "message": msg})

            elif isinstance(message, ResultMessage):
                logger.info("ResultMessage: structured_output=%s", bool(message.structured_output))
                if message.structured_output:
                    result = message.structured_output

    if result is None:
        raise ValueError("Agent did not produce structured output")

    return result


async def generate_answer(question_text: str, role: str, company: str) -> str:
    ai = anthropic.AsyncAnthropic()
    msg = await ai.messages.create(
        model=_ANSWER_MODEL,
        max_tokens=1024,
        system="You are an expert interview coach. Give a clear, structured ideal answer to the interview question. Be concise but complete — cover the key points a strong candidate would hit. Use plain text, no markdown.",
        messages=[
            {"role": "user", "content": f"Role: {role} at {company}\n\nQuestion: {question_text}"}
        ],
    )
    return msg.content[0].text


def _resolve_step(block: ToolUseBlock) -> tuple[str | None, str | None]:
    if "scrape_job" in block.name:
        return _STEP_MAP["scrape_job"]
    if block.name == "Task":
        desc = str(block.input.get("description") or "").lower()
        if "analyze" in desc:
            return _STEP_MAP["analyzer"]
        if "technical" in desc:
            return _STEP_MAP["tech_questions"]
        if "system design" in desc:
            return _STEP_MAP["sysdesign_questions"]
        if "behavioral" in desc:
            return _STEP_MAP["behavioral_questions"]
    return None, None
