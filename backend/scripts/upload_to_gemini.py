"""
upload_to_gemini.py
-------------------
Extrae texto de PDFs, genera embeddings con Gemini y los almacena en
ChromaDB local (backend/data/chroma_db/). No requiere la Semantic
Retrieval API de Google AI Studio.

Uso:
    py backend/scripts/upload_to_gemini.py
    py backend/scripts/upload_to_gemini.py --reset
    py backend/scripts/upload_to_gemini.py --dataset-dir ruta/a/pdfs
"""

import argparse
import os
import re
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR  = PROJECT_ROOT / "backend"
DOCS_DATASET = PROJECT_ROOT / "docs" / "dataset"
ENV_FILE     = BACKEND_DIR / ".env"
CHROMA_PATH  = BACKEND_DIR / "data" / "chroma_db"

sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(ENV_FILE)

from google import genai
from pypdf import PdfReader
import chromadb

CHUNK_SIZE       = 1500
CHUNK_OVERLAP    = 200
EMBED_BATCH_SIZE = 10
EMBED_MODEL      = "gemini-embedding-001"
COLLECTION_NAME  = "edurag_apuntes"


# ════════════════════════════════════════════════════════════════════════════
# Extracción y chunking
# ════════════════════════════════════════════════════════════════════════════

def extract_text_from_pdf(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        try:
            pages.append(page.extract_text() or "")
        except Exception as e:
            print(f"  [AVISO] Página {i} de '{pdf_path.name}': {e}")
    return "\n".join(pages)


def chunk_text(text: str) -> list[str]:
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        return []
    chunks, start, length = [], 0, len(text)
    while start < length:
        end = min(start + CHUNK_SIZE, length)
        if end < length:
            search_from = start + int(CHUNK_SIZE * 0.8)
            last_m = None
            for m in re.finditer(r"[.!?]\s", text[search_from:end]):
                last_m = m
            if last_m:
                end = search_from + last_m.end()
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        next_start = end - CHUNK_OVERLAP
        start = next_start if next_start > start else end
    return chunks


# ════════════════════════════════════════════════════════════════════════════
# Embeddings
# ════════════════════════════════════════════════════════════════════════════

def embed_texts(client: genai.Client, texts: list[str]) -> list[list[float]]:
    """Genera embeddings en lotes para respetar el rate limit."""
    all_embeddings = []
    for i in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[i: i + EMBED_BATCH_SIZE]
        result = client.models.embed_content(model=EMBED_MODEL, contents=batch)
        all_embeddings.extend([e.values for e in result.embeddings])
        if i + EMBED_BATCH_SIZE < len(texts):
            time.sleep(0.5)
    return all_embeddings


# ════════════════════════════════════════════════════════════════════════════
# ChromaDB
# ════════════════════════════════════════════════════════════════════════════

def get_collection(reset: bool = False) -> chromadb.Collection:
    CHROMA_PATH.mkdir(parents=True, exist_ok=True)
    chroma = chromadb.PersistentClient(path=str(CHROMA_PATH))
    if reset:
        try:
            chroma.delete_collection(COLLECTION_NAME)
            print("  Colección anterior eliminada.")
        except Exception:
            pass
    return chroma.get_or_create_collection(
        COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def document_exists(collection: chromadb.Collection, source_file: str) -> bool:
    results = collection.get(where={"source_file": source_file}, limit=1)
    return len(results["ids"]) > 0


def upload_pdf(
    client: genai.Client,
    collection: chromadb.Collection,
    pdf_path: Path,
) -> dict:
    result = {"filename": pdf_path.name, "chunks": 0, "skipped": False, "error": None}

    if document_exists(collection, pdf_path.name):
        print(f"  [SKIP] '{pdf_path.name}' ya existe en la base vectorial.")
        result["skipped"] = True
        return result

    try:
        print(f"  Extrayendo texto...")
        text = extract_text_from_pdf(pdf_path)
        if not text.strip():
            print(f"  [AVISO] Sin texto extraíble (¿PDF escaneado?).")
            result["error"] = "Sin texto extraíble"
            return result

        chunks = chunk_text(text)
        print(f"  {len(chunks)} fragmentos — generando embeddings...")

        embeddings = embed_texts(client, chunks)

        ids = [f"{pdf_path.stem}_{i}" for i in range(len(chunks))]
        metadatas = [{"source_file": pdf_path.name, "chunk_index": i} for i in range(len(chunks))]

        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )

        result["chunks"] = len(chunks)
        print(f"  OK: {len(chunks)} fragmentos almacenados.")

    except Exception as e:
        result["error"] = str(e)
        print(f"  [ERROR]: {e}")

    return result


# ════════════════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════════════════

def parse_args():
    p = argparse.ArgumentParser(description="Indexa PDFs en ChromaDB con embeddings de Gemini")
    p.add_argument("--reset", action="store_true", help="Borra la base vectorial y la recrea")
    p.add_argument("--dataset-dir", default=str(DOCS_DATASET))
    return p.parse_args()


def main():
    args = parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY no encontrada en .env")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    print("\n[1/3] Inicializando base vectorial...")
    collection = get_collection(reset=args.reset)
    print(f"  Colección '{COLLECTION_NAME}': {collection.count()} fragmentos existentes.")

    dataset_dir = Path(args.dataset_dir)
    pdf_files = sorted(set(
        list(dataset_dir.glob("*.pdf")) + list(dataset_dir.glob("*.PDF"))
        + list(dataset_dir.glob("*/*.pdf")) + list(dataset_dir.glob("*/*.PDF"))
    ))

    if not pdf_files:
        print(f"\n[AVISO] No hay PDFs en: {dataset_dir}")
        sys.exit(0)

    print(f"\n[2/3] PDFs encontrados: {len(pdf_files)}")
    for f in pdf_files:
        print(f"  - {f.name}")

    print(f"\n[3/3] Indexando...")
    results = []
    for pdf_path in pdf_files:
        print(f"\nProcesando: {pdf_path.name}")
        results.append(upload_pdf(client, collection, pdf_path))

    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    for r in results:
        if r["skipped"]:
            status, detail = "SKIP", "ya existía"
        elif r["error"]:
            status, detail = "ERROR", r["error"]
        else:
            status, detail = "OK", f"{r['chunks']} fragmentos"
        print(f"  [{status}] {r['filename']}: {detail}")

    total = sum(r["chunks"] for r in results)
    print(f"\nTotal fragmentos indexados : {total}")
    print(f"Total en la colección     : {collection.count()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
