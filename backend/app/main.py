from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router
from app.api.routes.documents import router as documents_router
from app.api.routes.quiz import router as quiz_router
from app.core.config import settings

app = FastAPI(title="EduRAG-DAM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(quiz_router, prefix="/api")


@app.get("/")
def health_check():
    return {"status": "ok", "corpus": settings.corpus_id}
