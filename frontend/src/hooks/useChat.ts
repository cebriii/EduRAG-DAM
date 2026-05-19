import { useEffect, useState } from "react";
import { askTutor } from "../services/api";
import type { ChatSession, KnowledgeLevel, Message, Role } from "../types";

const MAX_HISTORY = 10;
const STORAGE_KEY = "edurag_sessions";
const ACTIVE_KEY = "edurag_active_session";

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function newSession(): ChatSession {
  return {
    id: makeId(),
    title: "Nueva conversación",
    createdAt: new Date().toISOString(),
    messages: [],
    knowledge_level: "intermedio",
  };
}

function deserializeSessions(raw: string): ChatSession[] {
  try {
    return (JSON.parse(raw) as any[]).map((s) => ({
      ...s,
      messages: (s.messages as any[]).map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp as string),
      })),
    }));
  } catch {
    return [];
  }
}

function getInitial(): { sessions: ChatSession[]; activeId: string } {
  const raw = localStorage.getItem(STORAGE_KEY);
  const stored = raw ? deserializeSessions(raw) : [];
  if (stored.length > 0) {
    const savedActive = localStorage.getItem(ACTIVE_KEY);
    const activeId =
      savedActive && stored.find((s) => s.id === savedActive)
        ? savedActive
        : stored[0].id;
    return { sessions: stored, activeId };
  }
  const s = newSession();
  return { sessions: [s], activeId: s.id };
}

export function useChat() {
  const [{ sessions, activeId }, setState] = useState(getInitial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const activeSession = sessions.find((s) => s.id === activeId);
  const messages = activeSession?.messages ?? [];
  const activeKnowledgeLevel: KnowledgeLevel = activeSession?.knowledge_level ?? "intermedio";

  function updateActiveMessages(updater: (prev: Message[]) => Message[]) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => {
        if (s.id !== prev.activeId) return s;
        const msgs = updater(s.messages);
        const title =
          msgs.find((m) => m.role === "user")?.content.slice(0, 45) ??
          "Nueva conversación";
        return { ...s, messages: msgs, title };
      }),
    }));
  }

  async function sendMessage(question: string) {
    if (!question.trim() || isLoading) return;
    setError(null);

    const userMsg: Message = {
      id: makeId(),
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    updateActiveMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = [...messages, userMsg]
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.role as Role, content: m.content }));

      const response = await askTutor({
        question: question.trim(),
        conversation_history: history.slice(0, -1),
        knowledge_level: activeKnowledgeLevel,
      });

      const tutorMsg: Message = {
        id: makeId(),
        role: "assistant",
        content: response.hint,
        sources: response.sources,
        timestamp: new Date(),
      };

      updateActiveMessages((prev) => [...prev, tutorMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  function clearChat() {
    const s = newSession();
    setState((prev) => ({ sessions: [s, ...prev.sessions], activeId: s.id }));
    setError(null);
  }

  function loadSession(id: string) {
    setState((prev) => ({ ...prev, activeId: id }));
    setError(null);
  }

  function setSessionLevel(level: KnowledgeLevel) {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.id === prev.activeId ? { ...s, knowledge_level: level } : s,
      ),
    }));
  }

  function deleteSession(id: string) {
    setState((prev) => {
      const remaining = prev.sessions.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const s = newSession();
        return { sessions: [s], activeId: s.id };
      }
      const activeId = prev.activeId === id ? remaining[0].id : prev.activeId;
      return { sessions: remaining, activeId };
    });
  }

  return {
    messages,
    sessions,
    activeSessionId: activeId,
    activeKnowledgeLevel,
    isLoading,
    error,
    sendMessage,
    setSessionLevel,
    clearChat,
    loadSession,
    deleteSession,
  };
}
