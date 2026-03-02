"""
Scraper adapted from brushyourskill/main.py (get_with_retry + transform_job logic).
Extended with async httpx, generic extraction, and playwright fallback.
"""
import asyncio
import logging

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

_MIN_TEXT_LENGTH = 200
_MAX_TEXT_LENGTH = 12000

# Domains that always need playwright — no point trying httpx first
_JS_HEAVY_DOMAINS = ("workday.com", "myworkdayjobs.com", "icims.com")

# Known job board domains — if URL doesn't look like a direct job posting, warn
_JOB_BOARD_DOMAINS = (
    "linkedin.com", "greenhouse.io", "lever.co", "workday.com",
    "myworkdayjobs.com", "icims.com", "jobvite.com", "smartrecruiters.com",
    "ashbyhq.com", "rippling.com", "indeed.com", "glassdoor.com",
)


def _looks_like_job_posting(url: str) -> bool:
    """
    Heuristic check: is this URL likely a direct job posting page?
    Warns if it looks like a generic homepage or /careers landing page.
    """
    url_lower = url.lower()
    # Generic careers pages (not a specific job)
    suspicious_paths = ["/careers", "/jobs", "/openings", "/positions", "/work-with-us"]
    for path in suspicious_paths:
        if url_lower.rstrip("/").endswith(path):
            return False
    return True


async def scrape_url(url: str, retries: int = 3) -> str:
    """Fetch a job posting URL and return clean text. Falls back to playwright if needed."""

    if not _looks_like_job_posting(url):
        raise ValueError(
            f"The URL '{url}' looks like a generic careers page, not a specific job posting. "
            "Please paste the direct link to the individual job listing."
        )

    if any(d in url for d in _JS_HEAVY_DOMAINS):
        logger.info("JS-heavy domain detected, using playwright: %s", url)
        return await _playwright_scrape(url)

    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            logger.info("httpx attempt %d: %s", attempt + 1, url)
            async with httpx.AsyncClient(
                headers=_HEADERS, timeout=15, follow_redirects=True
            ) as client:
                r = await client.get(url)
                r.raise_for_status()
                text = _extract_text(r.text)
                if len(text) >= _MIN_TEXT_LENGTH:
                    logger.info("httpx succeeded, extracted %d chars", len(text))
                    return text[:_MAX_TEXT_LENGTH]
                logger.warning("httpx got response but text too short (%d chars)", len(text))
        except httpx.ConnectError as e:
            last_error = e
            logger.warning("httpx attempt %d failed (DNS/connection): %s", attempt + 1, e)
            # DNS failures won't recover with retries — bail early and try playwright
            break
        except Exception as e:
            last_error = e
            logger.warning("httpx attempt %d failed: %s", attempt + 1, e)
            if attempt < retries - 1:
                await asyncio.sleep(1)

    logger.info("Falling back to playwright: %s", url)
    try:
        return await _playwright_scrape(url)
    except Exception as playwright_err:
        # Both methods failed — raise a clear user-facing error
        raise ValueError(
            f"Could not fetch the job posting at '{url}'. "
            "The page may be behind a login wall, the URL may be incorrect, or the site may be blocking scrapers. "
            "Try pasting the job description text directly instead."
        ) from playwright_err


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    # Remove noise elements
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "noscript"]):
        tag.decompose()

    # LinkedIn-specific extraction (from brushyourskill transform_job)
    div = soup.find("div", class_="description__text description__text--rich")
    if div:
        for el in div.find_all(["span", "a"]):
            el.decompose()
        for ul in div.find_all("ul"):
            for li in ul.find_all("li"):
                li.insert(0, "- ")
        text = div.get_text(separator="\n").strip()
        text = text.replace("\n\n", "\n").replace("::marker", "-")
        text = text.replace("-\n", "- ").replace("Show less", "").replace("Show more", "")
        return text

    # Generic: try semantic content containers in priority order
    for selector in [
        # Workday
        '[data-automation-id="jobPostingDescription"]',
        '[data-automation-id="job-posting-details"]',
        # Generic
        "main",
        "article",
        '[class*="job-description"]',
        '[id*="job-description"]',
        '[class*="description"]',
        '[class*="job-details"]',
        '[id*="job-details"]',
    ]:
        el = soup.select_one(selector)
        if el:
            return el.get_text(separator="\n").strip()

    # Last resort: full body text
    return soup.get_text(separator="\n").strip()


async def _playwright_scrape(url: str) -> str:
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.set_extra_http_headers(_HEADERS)
            # domcontentloaded is safe for SPAs; networkidle hangs on Workday/LinkedIn
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            # Give JS time to render content
            await page.wait_for_timeout(3000)
            html = await page.content()
        finally:
            await browser.close()

    text = _extract_text(html)
    if len(text) < _MIN_TEXT_LENGTH:
        raise ValueError(f"Could not extract meaningful content from: {url}")
    return text[:_MAX_TEXT_LENGTH]