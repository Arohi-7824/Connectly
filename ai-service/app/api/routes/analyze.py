from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.pipelines.risk_scoring import run_pipeline

router = APIRouter()


class AnalyzeRequest(BaseModel):
    text: str
    language: Optional[str] = "auto"
    sender_age: Optional[int] = None
    recipient_age: Optional[int] = None
    relationship_context: Optional[dict] = {
        "trust_level": "unknown",
        "conversation_age_days": 0,
        "total_messages": 0,
        "flagged_count": 0,
    }
    last_n_messages: Optional[list[str]] = []


class AnalyzeResponse(BaseModel):
    risk_score: float
    category: str
    flagged: bool
    explanation: str
    layers: Optional[dict] = None


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    return run_pipeline(payload.text, history=payload.last_n_messages)