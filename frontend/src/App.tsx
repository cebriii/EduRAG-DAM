import { useState } from "react";
import { ChatWindow } from "./components/ChatWindow";
import { Dashboard } from "./components/Dashboard";
import { DocumentsPanel } from "./components/DocumentsPanel";
import { InputBar } from "./components/InputBar";
import { LevelSelector } from "./components/LevelSelector";
import { QuizPanel } from "./components/QuizPanel";
import { SessionsList } from "./components/SessionsList";
import { useChat } from "./hooks/useChat";
import type { Message } from "./types";

type View = "chat" | "dashboard" | "quiz";

function exportToMarkdown(title: string, messages: Message[]) {
  const date = new Date().toLocaleString("es-ES");
  const lines: string[] = [
    `# ${title}`,
    `_Exportado el ${date}_`,
    "",
    "---",
    "",
  ];

  for (const msg of messages) {
    if (msg.role === "user") {
      lines.push("**Tú**", "", msg.content);
    } else {
      lines.push("**Tutor EduRAG**", "", msg.content);
      if (msg.sources?.length) {
        const srcs = msg.sources
          .map((s) => `${s.filename} (${s.relevance_score.toFixed(2)})`)
          .join(", ");
        lines.push("", `_Fuentes: ${srcs}_`);
      }
    }
    lines.push("", "---", "");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g, "").trim() || "conversacion"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [view, setView] = useState<View>("chat");

  const {
    messages,
    sessions,
    activeSessionId,
    activeKnowledgeLevel,
    isLoading,
    error,
    sendMessage,
    setSessionLevel,
    clearChat,
    loadSession,
    deleteSession,
  } = useChat();

  const activeTitle =
    sessions.find((s) => s.id === activeSessionId)?.title ?? "conversacion";

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 border-r-2 border-gray-700 p-5 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-5 shrink-0">
          <span className="text-2xl">🎓</span>
          <div>
            <h1 className="text-base font-semibold text-gray-100 leading-tight">EduRAG</h1>
            <p className="text-xs text-gray-500">Tutor socrático DAM2</p>
          </div>
        </div>

        {/* Navegación principal */}
        <div className="flex gap-1 mb-1 shrink-0">
          <button
            onClick={() => setView("chat")}
            className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium rounded-lg px-2 py-1.5 transition-colors ${
              view === "chat"
                ? "bg-gray-700 text-gray-100 border border-gray-600"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setView("dashboard")}
            className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium rounded-lg px-2 py-1.5 transition-colors ${
              view === "dashboard"
                ? "bg-gray-700 text-gray-100 border border-gray-600"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
            }`}
          >
            📊 Stats
          </button>
        </div>
        <button
          onClick={() => setView("quiz")}
          className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg px-2 py-2 mb-3 transition-colors shrink-0 ${
            view === "quiz"
              ? "bg-blue-700 text-white border border-blue-500"
              : "text-blue-400 hover:text-blue-300 hover:bg-gray-800 border border-gray-700"
          }`}
        >
          🎯 Modo Quiz
        </button>

        {/* Historial de sesiones */}
        <SessionsList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNew={clearChat}
          onLoad={(id) => { loadSession(id); setView("chat"); }}
          onDelete={deleteSession}
        />

        {/* Divisor */}
        <hr className="my-4 border-gray-700 shrink-0" />

        {/* Apuntes */}
        <div className="flex flex-col shrink-0" style={{ height: "13rem" }}>
          <DocumentsPanel />
        </div>
      </aside>

      {/* Main area */}
      <main className="flex flex-col flex-1 min-w-0">
        {/* Header móvil */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b-2 border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <span className="font-semibold text-gray-100 text-sm">EduRAG — Tutor DAM2</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(view === "chat" ? "dashboard" : "chat")}
              className="text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg px-2 py-1"
            >
              {view === "chat" ? "📊" : "💬"}
            </button>
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-300 underline"
            >
              Nueva
            </button>
          </div>
        </header>

        {/* Vista Chat */}
        {view === "chat" && (
          <>
            <div className="flex items-center justify-between px-4 pt-2 shrink-0">
              <LevelSelector level={activeKnowledgeLevel} onChange={setSessionLevel} />
              {messages.length > 0 && (
                <button
                  onClick={() => exportToMarkdown(activeTitle, messages)}
                  className="text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 px-2 py-1 rounded-lg transition-colors"
                  title="Exportar conversación como Markdown"
                >
                  ↓ Exportar .md
                </button>
              )}
            </div>

            {error && (
              <div className="mx-4 mt-3 bg-red-950 border border-red-800 text-red-400 text-xs px-4 py-2 rounded-xl">
                ⚠️ {error}
              </div>
            )}

            <ChatWindow messages={messages} isLoading={isLoading} />
            <InputBar onSend={sendMessage} isLoading={isLoading} />
          </>
        )}

        {/* Vista Dashboard */}
        {view === "dashboard" && <Dashboard sessions={sessions} />}

        {/* Vista Quiz */}
        {view === "quiz" && (
          <QuizPanel onGoToChat={() => setView("chat")} knowledgeLevel={activeKnowledgeLevel} />
        )}
      </main>
    </div>
  );
}
