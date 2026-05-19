import time
from pathlib import Path

import chromadb
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.prompts import get_socratic_prompt

_genai_client = genai.Client(api_key=settings.gemini_api_key)
_MODEL_NAME = "gemini-3.1-flash-lite"
_MAX_HISTORY_TURNS = 10
_MIN_RELEVANCE_SCORE = 0.30
_MAX_RETRIES = 3
_RETRY_DELAY = 2  # segundos entre reintentos por 503
_EMBED_MODEL = "gemini-embedding-001"
_COLLECTION_NAME = "edurag_apuntes"

# ChromaDB: backend/data/chroma_db  (parents[0]=services, [1]=app, [2]=backend)
_CHROMA_PATH = Path(__file__).resolve().parents[2] / "data" / "chroma_db"
_chroma_client = chromadb.PersistentClient(path=str(_CHROMA_PATH))


def _get_collection() -> chromadb.Collection:
    return _chroma_client.get_or_create_collection(
        _COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def query_corpus(question: str, num_results: int = 5) -> list[dict]:
    """
    Busca fragmentos relevantes en ChromaDB usando embeddings de Gemini.
    Lanza ValueError si la base vectorial está vacía.
    """
    collection = _get_collection()

    if collection.count() == 0:
        raise ValueError(
            "La base de apuntes está vacía. "
            "Ejecuta primero: python backend/scripts/upload_to_gemini.py"
        )

    embed_result = _genai_client.models.embed_content(
        model=_EMBED_MODEL,
        contents=[question],
    )
    query_embedding = embed_result.embeddings[0].values

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(num_results, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for doc, metadata, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        relevance = round(1.0 - distance, 4)  # distancia coseno → similitud
        if relevance >= _MIN_RELEVANCE_SCORE:
            chunks.append({
                "text": doc,
                "source_file": metadata.get("source_file", "Apuntes"),
                "relevance_score": relevance,
            })

    return chunks


def build_context(chunks: list[dict]) -> str:
    if not chunks:
        return "No se encontraron fragmentos relevantes en los apuntes para esta pregunta."
    parts = [f"[Fuente: {c['source_file']}]\n{c['text']}" for c in chunks]
    return "\n---\n".join(parts)


def generate_socratic_hint(
    question: str,
    conversation_history: list[dict],
    context_chunks: list[dict],
    knowledge_level: str = "intermedio",
) -> dict:
    """
    Genera una pista socrática usando Gemini con historial de conversación.
    Devuelve {"hint": str, "sources": list[{filename, relevance_score}]}.
    """
    context_block = build_context(context_chunks)

    recent = conversation_history[-_MAX_HISTORY_TURNS:]
    history = [
        types.Content(
            role="user" if msg["role"] == "user" else "model",
            parts=[types.Part(text=msg["content"])],
        )
        for msg in recent
    ]

    chat = _genai_client.chats.create(
        model=_MODEL_NAME,
        history=history,
        config=types.GenerateContentConfig(
            system_instruction=get_socratic_prompt(knowledge_level),
            temperature=0.7,
        ),
    )

    user_message = (
        f"CONTEXTO DE LOS APUNTES (úsalo como base, no como respuesta directa):\n{context_block}\n\n"
        f"PREGUNTA DEL ALUMNO:\n{question}\n\n"
        f"Recuerda: si el contexto contiene la respuesta exacta, conviértela en una explicación "
        f"del concepto general más una pista sobre un elemento concreto. No reveles el dato final."
    )

    for attempt in range(_MAX_RETRIES):
        try:
            response = chat.send_message(user_message)
            break
        except Exception as e:
            if attempt < _MAX_RETRIES - 1 and ("503" in str(e) or "UNAVAILABLE" in str(e)):
                time.sleep(_RETRY_DELAY)
                continue
            raise

    sources = [
        {"filename": c["source_file"], "relevance_score": c["relevance_score"]}
        for c in context_chunks
    ]

    return {"hint": response.text, "sources": sources}
