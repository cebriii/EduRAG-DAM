from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.gemini_service import generate_socratic_hint, query_corpus

router = APIRouter()


class HistoryMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AskRequest(BaseModel):
    question: str
    conversation_history: list[HistoryMessage] = []
    knowledge_level: str = "intermedio"


class Source(BaseModel):
    filename: str
    relevance_score: float


class AskResponse(BaseModel):
    hint: str
    sources: list[Source]


@router.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")

    try:
        chunks = query_corpus(body.question)
        history = [{"role": m.role, "content": m.content} for m in body.conversation_history]
        result = generate_socratic_hint(body.question, history, chunks, body.knowledge_level)
        return AskResponse(hint=result["hint"], sources=result["sources"])
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
