import type { AskRequest, AskResponse, DocumentInfo, KnowledgeLevel } from "../types";

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:8000/api";

export async function askTutor(payload: AskRequest): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text}`);
  }

  return res.json() as Promise<AskResponse>;
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json() as { documents: DocumentInfo[] };
  return data.documents;
}

export async function uploadDocument(
  file: File,
): Promise<{ filename: string; chunks: number; skipped: boolean }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/documents/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ filename: string; chunks: number; skipped: boolean }>;
}

export async function deleteDocument(filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text}`);
  }
}

export async function deleteAllDocuments(): Promise<void> {
  const res = await fetch(`${API_BASE}/documents`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text}`);
  }
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

import type { QuizEvaluation, QuizQuestion } from "../types";

export async function generateQuiz(
  numQuestions: number,
  sourceFile: string | null,
  knowledgeLevel: KnowledgeLevel = "intermedio",
): Promise<QuizQuestion[]> {
  const res = await fetch(`${API_BASE}/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ num_questions: numQuestions, source_file: sourceFile, knowledge_level: knowledgeLevel }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).detail ?? `Error ${res.status}`);
  }
  const data = await res.json() as { questions: QuizQuestion[] };
  return data.questions;
}

export async function evaluateAnswer(
  question: string,
  userAnswer: string,
  questionContext: string,
  knowledgeLevel: KnowledgeLevel = "intermedio",
): Promise<QuizEvaluation> {
  const res = await fetch(`${API_BASE}/quiz/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      user_answer: userAnswer,
      question_context: questionContext,
      knowledge_level: knowledgeLevel,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).detail ?? `Error ${res.status}`);
  }
  return res.json() as Promise<QuizEvaluation>;
}
