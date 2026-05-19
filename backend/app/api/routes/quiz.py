from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.quiz_service import evaluate_quiz_answer, generate_quiz_questions

router = APIRouter(prefix="/quiz", tags=["quiz"])


class GenerateRequest(BaseModel):
    num_questions: int = Field(default=5, ge=1, le=10)
    source_file: str | None = None
    knowledge_level: str = "intermedio"


class EvaluateRequest(BaseModel):
    question: str
    user_answer: str
    question_context: str
    knowledge_level: str = "intermedio"


@router.post("/generate")
def generate(req: GenerateRequest):
    try:
        questions = generate_quiz_questions(
            num_questions=req.num_questions,
            source_file=req.source_file,
            knowledge_level=req.knowledge_level,
        )
        return {"questions": questions}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando quiz: {e}")


@router.post("/evaluate")
def evaluate(req: EvaluateRequest):
    if not req.user_answer.strip():
        return {"score": 0, "feedback": "No has escrito ninguna respuesta.", "hint": None}
    try:
        return evaluate_quiz_answer(
            question=req.question,
            user_answer=req.user_answer,
            question_context=req.question_context,
            knowledge_level=req.knowledge_level,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluando respuesta: {e}")
