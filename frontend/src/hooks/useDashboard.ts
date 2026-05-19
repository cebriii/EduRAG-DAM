import { useMemo } from "react";
import type { ChatSession } from "../types";

export interface DayActivity {
  day: string;
  preguntas: number;
}

export interface DocUsage {
  filename: string;
  usos: number;
}

export interface SessionStat {
  id: string;
  title: string;
  date: string;
  questions: number;
  topDoc: string | null;
  level: string;
}

export interface DashboardStats {
  totalSessions: number;
  totalQuestions: number;
  activeDays: number;
  maxQuestionsInSession: number;
  activityLast14Days: DayActivity[];
  topDocuments: DocUsage[];
  recentSessions: SessionStat[];
}

export function useDashboard(sessions: ChatSession[]): DashboardStats {
  return useMemo(() => {
    const activeSessions = sessions.filter((s) => s.messages.length > 0);
    const allMessages = activeSessions.flatMap((s) => s.messages);
    const userMessages = allMessages.filter((m) => m.role === "user");
    const assistantMessages = allMessages.filter((m) => m.role === "assistant");

    const totalSessions = activeSessions.length;
    const totalQuestions = userMessages.length;

    const uniqueDays = new Set(
      userMessages.map((m) => m.timestamp.toLocaleDateString("es-ES"))
    );
    const activeDays = uniqueDays.size;

    const maxQuestionsInSession =
      activeSessions.length > 0
        ? Math.max(
            ...activeSessions.map(
              (s) => s.messages.filter((m) => m.role === "user").length
            )
          )
        : 0;

    // Actividad por día: últimos 14 días, incluyendo días sin actividad
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const activityLast14Days: DayActivity[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      });
      const dayKey = d.toLocaleDateString("es-ES");
      const count = userMessages.filter(
        (m) => m.timestamp.toLocaleDateString("es-ES") === dayKey
      ).length;
      activityLast14Days.push({ day: dayLabel, preguntas: count });
    }

    // Documentos más consultados (deduplicado por mensaje)
    const docCount: Record<string, number> = {};
    assistantMessages.forEach((m) => {
      const seen = new Set<string>();
      (m.sources ?? []).forEach((s) => {
        if (!seen.has(s.filename)) {
          seen.add(s.filename);
          docCount[s.filename] = (docCount[s.filename] || 0) + 1;
        }
      });
    });

    const topDocuments = Object.entries(docCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([filename, usos]) => ({
        filename: filename.replace(/\.pdf$/i, ""),
        usos,
      }));

    // Sesiones recientes (últimas 5 con mensajes)
    const recentSessions: SessionStat[] = [...activeSessions]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5)
      .map((s) => {
        const questions = s.messages.filter((m) => m.role === "user").length;
        const dc: Record<string, number> = {};
        s.messages
          .filter((m) => m.role === "assistant")
          .flatMap((m) => m.sources ?? [])
          .forEach((src) => {
            dc[src.filename] = (dc[src.filename] || 0) + 1;
          });
        const topDoc =
          Object.entries(dc).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        return {
          id: s.id,
          title: s.title,
          date: new Date(s.createdAt).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          questions,
          topDoc: topDoc ? topDoc.replace(/\.pdf$/i, "") : null,
          level: s.knowledge_level ?? "intermedio",
        };
      });

    return {
      totalSessions,
      totalQuestions,
      activeDays,
      maxQuestionsInSession,
      activityLast14Days,
      topDocuments,
      recentSessions,
    };
  }, [sessions]);
}
