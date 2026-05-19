import json
import re
import time
from pathlib import Path

import chromadb
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.prompts import get_quiz_evaluation_prompt, get_quiz_generation_prompt

_genai_client = genai.Client(api_key=settings.gemini_api_key)
_MODEL_NAME = "gemini-3.1-flash-lite"
_COLLECTION_NAME = "edurag_apuntes"
_CHROMA_PATH = Path(__file__).resolve().parents[2] / "data" / "chroma_db"
_chroma_client = chromadb.PersistentClient(path=str(_CHROMA_PATH))
_MAX_RETRIES = 3
_RETRY_DELAY = 2


def _get_collection() -> chromadb.Collection:
    return _chroma_client.get_or_create_collection(
        _COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def _parse_json(raw: str) -> any:
    raw = raw.strip()
    # Eliminar bloques markdown si Gemini los incluye
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def _call_gemini(system: str, user_prompt: str, temperature: float) -> str:
    for attempt in range(_MAX_RETRIES):
        try:
            response = _genai_client.models.generate_content(
                model=_MODEL_NAME,
                contents=[types.Content(role="user", parts=[types.Part(text=user_prompt)])],
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=temperature,
                    response_mime_type="application/json",
                ),
            )
            return response.text
        except Exception as e:
            if attempt < _MAX_RETRIES - 1 and ("503" in str(e) or "UNAVAILABLE" in str(e)):
                time.sleep(_RETRY_DELAY)
                continue
            raise


def _get_chunks_for_quiz(source_file: str | None, limit: int = 25) -> list[dict]:
    collection = _get_collection()
    if collection.count() == 0:
        raise ValueError("La base de apuntes está vacía. Sube algún PDF antes de generar un quiz.")

    kwargs: dict = {"include": ["documents", "metadatas"], "limit": limit}
    if source_file:
        kwargs["where"] = {"source_file": {"$eq": source_file}}

    result = collection.get(**kwargs)

    chunks = []
    for doc, meta in zip(result["documents"], result["metadatas"]):
        chunks.append({
            "text": doc,
            "source_file": meta.get("source_file", "Apuntes"),
        })
    return chunks


def generate_quiz_questions(num_questions: int, source_file: str | None, knowledge_level: str = "intermedio") -> list[dict]:
    chunks = _get_chunks_for_quiz(source_file)
    if not chunks:
        raise ValueError(
            f"No se encontraron fragmentos para '{source_file}'."
            if source_file else "No hay apuntes indexados."
        )

    context_block = "\n---\n".join(
        f"[{c['source_file']}]\n{c['text']}" for c in chunks
    )

    user_prompt = (
        f"Genera exactamente {num_questions} preguntas de desarrollo basándote en estos apuntes:\n\n"
        f"{context_block}"
    )

    raw = _call_gemini(get_quiz_generation_prompt(knowledge_level), user_prompt, temperature=0.8)
    questions = _parse_json(raw)

    if not isinstance(questions, list):
        raise ValueError("Respuesta inesperada del modelo al generar preguntas.")

    return questions[:num_questions]


def evaluate_quiz_answer(question: str, user_answer: str, question_context: str, knowledge_level: str = "intermedio") -> dict:
    user_prompt = (
        f"PREGUNTA: {question}\n\n"
        f"RESPUESTA DEL ALUMNO: {user_answer}\n\n"
        f"CONTEXTO DE REFERENCIA (apuntes):\n{question_context}"
    )

    raw = _call_gemini(get_quiz_evaluation_prompt(knowledge_level), user_prompt, temperature=0.3)
    result = _parse_json(raw)

    # Garantizar estructura mínima
    return {
        "score": int(result.get("score", 0)),
        "feedback": result.get("feedback", ""),
        "hint": result.get("hint"),
    }
