export type Role = "user" | "assistant";

export type KnowledgeLevel = "principiante" | "intermedio" | "avanzado";

export interface Source {
  filename: string;
  relevance_score: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  sources?: Source[];
  timestamp: Date;
}

export interface AskRequest {
  question: string;
  conversation_history: { role: Role; content: string }[];
  knowledge_level: KnowledgeLevel;
}

export interface AskResponse {
  hint: string;
  sources: Source[];
}

export interface DocumentInfo {
  filename: string;
  chunks: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string; // ISO string
  messages: Message[];
  knowledge_level: KnowledgeLevel;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  context: string;
}

export interface QuizEvaluation {
  score: number; // 0-4
  feedback: string;
  hint: string | null;
}

export interface QuizAnswerRecord {
  question: string;
  userAnswer: string;
  evaluation: QuizEvaluation;
}

export type QuizStatus = "idle" | "loading" | "active" | "evaluating" | "feedback" | "done";
