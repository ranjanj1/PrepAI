from typing import Literal
from pydantic import BaseModel


class Skill(BaseModel):
    name: str
    primary: bool


class Topic(BaseModel):
    name: str
    weight: int  # 0–100


class Question(BaseModel):
    text: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    topic: str
    hint: str


class Questions(BaseModel):
    technical: list[Question]
    sysdesign: list[Question]
    behavioral: list[Question]


class AnalysisResult(BaseModel):
    role: str
    company: str
    location: str
    skills: list[Skill]
    topics: list[Topic]
    questions: Questions


ANALYSIS_JSON_SCHEMA = {
    "type": "object",
    "required": ["role", "company", "location", "skills", "topics", "questions", "company_overview"],
    "properties": {
        "role": {"type": "string"},
        "company": {"type": "string"},
        "location": {"type": "string"},
        "skills": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "primary"],
                "properties": {
                    "name": {"type": "string"},
                    "primary": {"type": "boolean"},
                },
            },
        },
        "topics": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "weight"],
                "properties": {
                    "name": {"type": "string"},
                    "weight": {"type": "integer", "minimum": 0, "maximum": 100},
                },
            },
        },
        "company_overview": {
            "type": "object",
            "required": ["description", "culture", "interview_focus", "research_tips"],
            "properties": {
                "description": {"type": "string"},
                "culture": {"type": "array", "items": {"type": "string"}},
                "interview_focus": {"type": "array", "items": {"type": "string"}},
                "research_tips": {"type": "array", "items": {"type": "string"}},
            },
        },
        "questions": {
            "type": "object",
            "required": ["technical", "sysdesign", "behavioral"],
            "properties": {
                "technical": {"type": "array", "items": {"$ref": "#/$defs/Question"}},
                "sysdesign": {"type": "array", "items": {"$ref": "#/$defs/Question"}},
                "behavioral": {"type": "array", "items": {"$ref": "#/$defs/Question"}},
            },
        },
    },
    "$defs": {
        "Question": {
            "type": "object",
            "required": ["text", "difficulty", "topic", "hint"],
            "properties": {
                "text": {"type": "string"},
                "difficulty": {"type": "string", "enum": ["Easy", "Medium", "Hard"]},
                "topic": {"type": "string"},
                "hint": {"type": "string"},
            },
        }
    },
}
