import asyncio
import json
import logging
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .agent import generate_answer, run_analysis
from .auth import ALGORITHM, SECRET_KEY, get_current_user, router as auth_router
from .database import Analysis, Answer, CustomQuestion, User, engine, get_session, init_db

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


# ── History endpoints ─────────────────────────────────────────────────────────

@app.get("/analyses")
async def list_analyses(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Analysis)
        .where(Analysis.user_id == user.id)
        .order_by(Analysis.created_at.desc())
    )
    analyses = result.scalars().all()
    return [
        {
            "id": a.id,
            "job_url": a.job_url,
            "role": a.role,
            "company": a.company,
            "status": a.status,
            "created_at": a.created_at.isoformat(),
        }
        for a in analyses
    ]


@app.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    analysis = await session.get(Analysis, analysis_id)
    if not analysis or analysis.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "id": analysis.id,
        "job_url": analysis.job_url,
        "created_at": analysis.created_at.isoformat(),
        "result": json.loads(analysis.result_json),
    }


# ── WebSocket: streaming analysis ─────────────────────────────────────────────

async def _verify_ws_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


@app.websocket("/ws/analyze")
async def analyze_ws(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()

    user_id = await _verify_ws_token(token)
    if user_id is None:
        await websocket.send_json({"event": "error", "message": "Unauthorized"})
        await websocket.close(code=4001)
        return

    try:
        data = await websocket.receive_json()
        url = (data.get("url") or "").strip()
        jd_text = (data.get("jd_text") or "").strip()

        if not url and not jd_text:
            await websocket.send_json({"event": "error", "message": "URL or job description text is required"})
            return

        async def progress_cb(event: dict) -> None:
            await websocket.send_json(event)

        async def _heartbeat():
            while True:
                await asyncio.sleep(10)
                await websocket.send_json({"event": "heartbeat"})

        heartbeat = asyncio.create_task(_heartbeat())
        try:
            result = await asyncio.wait_for(
                run_analysis(progress_cb, url=url or None, jd_text=jd_text or None),
                timeout=120,
            )
        except asyncio.TimeoutError:
            raise ValueError("Analysis timed out after 120 seconds. Please try again.")
        finally:
            heartbeat.cancel()

        display_url = url or jd_text[:80] + "..." if len(jd_text) > 80 else jd_text

        logger.info("Saving to DB...")
        async with AsyncSession(engine) as session:
            analysis = Analysis(
                user_id=user_id,
                job_url=display_url,
                role=result.get("role", ""),
                company=result.get("company", ""),
                result_json=json.dumps(result),
            )
            session.add(analysis)
            await session.commit()
        logger.info("DB saved. Sending result...")

        await websocket.send_json({"event": "result", "data": result, "analysis_id": analysis.id})
        logger.info("Result sent.")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"event": "error", "message": str(e)})


# ── Status endpoint ───────────────────────────────────────────────────────────

_VALID_STATUSES = {"not_applied", "applied", "interview", "offer", "rejected"}

@app.patch("/analyses/{analysis_id}/status")
async def update_status(
    analysis_id: int,
    body: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    analysis = await session.get(Analysis, analysis_id)
    if not analysis or analysis.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    status = (body.get("status") or "").strip()
    if status not in _VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {_VALID_STATUSES}")
    analysis.status = status
    await session.commit()
    return {"status": status}


# ── Answer endpoints ──────────────────────────────────────────────────────────

@app.get("/analyses/{analysis_id}/answers")
async def list_answers(
    analysis_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    analysis = await session.get(Analysis, analysis_id)
    if not analysis or analysis.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    result = await session.execute(select(Answer).where(Answer.analysis_id == analysis_id))
    return [{"question_text": a.question_text, "answer_text": a.answer_text} for a in result.scalars().all()]


@app.post("/analyses/{analysis_id}/answers")
async def create_answer(
    analysis_id: int,
    body: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    analysis = await session.get(Analysis, analysis_id)
    if not analysis or analysis.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")

    question_text = (body.get("question_text") or "").strip()
    if not question_text:
        raise HTTPException(status_code=400, detail="question_text is required")

    answer_text = await generate_answer(question_text, analysis.role, analysis.company)

    existing = await session.execute(
        select(Answer).where(Answer.analysis_id == analysis_id, Answer.question_text == question_text)
    )
    row = existing.scalar_one_or_none()
    if row:
        row.answer_text = answer_text
    else:
        session.add(Answer(analysis_id=analysis_id, question_text=question_text, answer_text=answer_text))
    await session.commit()

    return {"question_text": question_text, "answer_text": answer_text}


# ── Custom question endpoints ─────────────────────────────────────────────────

@app.get("/analyses/{analysis_id}/custom-questions")
async def list_custom_questions(
    analysis_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    analysis = await session.get(Analysis, analysis_id)
    if not analysis or analysis.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    result = await session.execute(
        select(CustomQuestion).where(CustomQuestion.analysis_id == analysis_id)
    )
    return [
        {"id": q.id, "category": q.category, "text": q.text,
         "difficulty": q.difficulty, "topic": q.topic, "hint": q.hint}
        for q in result.scalars().all()
    ]


@app.post("/analyses/{analysis_id}/custom-questions", status_code=201)
async def create_custom_question(
    analysis_id: int,
    body: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    analysis = await session.get(Analysis, analysis_id)
    if not analysis or analysis.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")

    text = (body.get("text") or "").strip()
    category = (body.get("category") or "").strip()
    if not text or category not in ("technical", "sysdesign", "behavioral"):
        raise HTTPException(status_code=400, detail="text and valid category are required")

    q = CustomQuestion(
        analysis_id=analysis_id,
        category=category,
        text=text,
        difficulty=body.get("difficulty") or "Medium",
        topic=(body.get("topic") or "").strip(),
        hint=(body.get("hint") or "").strip(),
    )
    session.add(q)
    await session.commit()
    await session.refresh(q)
    return {"id": q.id, "category": q.category, "text": q.text,
            "difficulty": q.difficulty, "topic": q.topic, "hint": q.hint}


@app.delete("/analyses/{analysis_id}/custom-questions/{question_id}", status_code=204)
async def delete_custom_question(
    analysis_id: int,
    question_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    analysis = await session.get(Analysis, analysis_id)
    if not analysis or analysis.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    q = await session.get(CustomQuestion, question_id)
    if not q or q.analysis_id != analysis_id:
        raise HTTPException(status_code=404, detail="Question not found")
    await session.delete(q)
    await session.commit()


# ── Serve frontend in production ──────────────────────────────────────────────
import os

_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=_FRONTEND_DIST, html=True), name="static")
