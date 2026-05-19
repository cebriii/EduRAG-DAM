import re
import time
from io import BytesIO
from pathlib import Path

import chromadb
from google import genai
from pypdf import PdfReader

from app.core.config import settings

_genai_client = genai.Client(api_key=settings.gemini_api_key)
_EMBED_MODEL = "gemini-embedding-001"
_COLLECTION_NAME = "edurag_apuntes"
_CHROMA_PATH = Path(__file__).resolve().parents[2] / "data" / "chroma_db"
_chroma_client = chromadb.PersistentClient(path=str(_CHROMA_PATH))

_CHUNK_SIZE = 1500
_CHUNK_OVERLAP = 200
_EMBED_BATCH_SIZE = 10


def _get_collection() -> chromadb.Collection:
    return _chroma_client.get_or_create_collection(
        _COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def list_documents() -> list[dict]:
    collection = _get_collection()
    if collection.count() == 0:
        return []
    result = collection.get(include=["metadatas"])
    counts: dict[str, int] = {}
    for meta in result["metadatas"]:
        fname = meta.get("source_file", "")
        if fname:
            counts[fname] = counts.get(fname, 0) + 1
    return [{"filename": f, "chunks": c} for f, c in sorted(counts.items())]


def _extract_text(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _chunk_text(text: str) -> list[str]:
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        return []
    chunks, start, length = [], 0, len(text)
    while start < length:
        end = min(start + _CHUNK_SIZE, length)
        if end < length:
            search_from = start + int(_CHUNK_SIZE * 0.8)
            last_m = None
            for m in re.finditer(r"[.!?]\s", text[search_from:end]):
                last_m = m
            if last_m:
                end = search_from + last_m.end()
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        next_start = end - _CHUNK_OVERLAP
        start = next_start if next_start > start else end
    return chunks


def _embed_texts(texts: list[str]) -> list[list[float]]:
    all_embeddings = []
    for i in range(0, len(texts), _EMBED_BATCH_SIZE):
        batch = texts[i: i + _EMBED_BATCH_SIZE]
        result = _genai_client.models.embed_content(model=_EMBED_MODEL, contents=batch)
        all_embeddings.extend([e.values for e in result.embeddings])
        if i + _EMBED_BATCH_SIZE < len(texts):
            time.sleep(0.5)
    return all_embeddings


def ingest_pdf(file_bytes: bytes, filename: str) -> dict:
    collection = _get_collection()
    existing = collection.get(where={"source_file": filename}, limit=1)
    if existing["ids"]:
        return {"filename": filename, "chunks": 0, "skipped": True, "error": None}

    try:
        text = _extract_text(file_bytes)
        if not text.strip():
            return {"filename": filename, "chunks": 0, "skipped": False,
                    "error": "Sin texto extraíble (¿PDF escaneado?)"}

        chunks = _chunk_text(text)
        if not chunks:
            return {"filename": filename, "chunks": 0, "skipped": False,
                    "error": "No se generaron fragmentos"}

        embeddings = _embed_texts(chunks)
        stem = Path(filename).stem
        collection.add(
            ids=[f"{stem}_{i}" for i in range(len(chunks))],
            embeddings=embeddings,
            documents=chunks,
            metadatas=[{"source_file": filename, "chunk_index": i} for i in range(len(chunks))],
        )
        return {"filename": filename, "chunks": len(chunks), "skipped": False, "error": None}

    except Exception as e:
        return {"filename": filename, "chunks": 0, "skipped": False, "error": str(e)}


def delete_document(filename: str) -> dict:
    collection = _get_collection()
    result = collection.get(where={"source_file": filename})
    ids = result["ids"]
    if ids:
        collection.delete(ids=ids)
    return {"filename": filename, "deleted": len(ids)}


def delete_all_documents() -> dict:
    collection = _get_collection()
    total = collection.count()
    if total > 0:
        all_ids = collection.get()["ids"]
        collection.delete(ids=all_ids)
    return {"deleted": total}
