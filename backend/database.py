from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

_DB_PATH = Path(__file__).parent.parent / "prepai.db"
DATABASE_URL = f"sqlite+aiosqlite:///{_DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="user")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    job_url: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String, default="")
    company: Mapped[str] = mapped_column(String, default="")
    result_json: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="not_applied", server_default="not_applied")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    user: Mapped["User"] = relationship(back_populates="analyses")
    answers: Mapped[list["Answer"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")
    custom_questions: Mapped[list["CustomQuestion"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(Integer, ForeignKey("analyses.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    analysis: Mapped["Analysis"] = relationship(back_populates="answers")


class CustomQuestion(Base):
    __tablename__ = "custom_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(Integer, ForeignKey("analyses.id"), nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)  # technical | sysdesign | behavioral
    text: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, default="Medium")
    topic: Mapped[str] = mapped_column(String, default="")
    hint: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    analysis: Mapped["Analysis"] = relationship(back_populates="custom_questions")


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # SQLite-safe migration: add status column to existing DBs
    import aiosqlite
    async with aiosqlite.connect(_DB_PATH) as db:
        cursor = await db.execute("PRAGMA table_info(analyses)")
        cols = {row[1] for row in await cursor.fetchall()}
        if "status" not in cols:
            await db.execute("ALTER TABLE analyses ADD COLUMN status VARCHAR NOT NULL DEFAULT 'not_applied'")
            await db.commit()


async def get_session():
    async with AsyncSession(engine) as session:
        yield session
