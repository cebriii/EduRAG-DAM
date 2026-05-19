import type { ChatSession, KnowledgeLevel } from "../types";

const LEVEL_BADGE: Record<KnowledgeLevel, { label: string; color: string }> = {
  principiante: { label: "Princ.", color: "text-green-500" },
  intermedio: { label: "Inter.", color: "text-blue-500" },
  avanzado: { label: "Avanz.", color: "text-orange-500" },
};

interface Props {
  sessions: ChatSession[];
  activeSessionId: string;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function SessionsList({ sessions, activeSessionId, onLoad, onDelete, onNew }: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <button
        onClick={onNew}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 mb-3 transition-colors shrink-0"
      >
        <span className="text-base leading-none">+</span>
        Nueva conversación
      </button>

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 shrink-0">
        Historial
      </p>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onLoad(session.id)}
            className={`group flex items-start gap-1 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
              session.id === activeSessionId
                ? "bg-gray-700 border border-gray-600"
                : "hover:bg-gray-800"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs truncate leading-snug ${
                  session.id === activeSessionId
                    ? "text-blue-300 font-medium"
                    : "text-gray-300"
                }`}
              >
                {session.title}
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-gray-500 leading-snug">
                  {relativeTime(session.createdAt)}
                </p>
                {session.knowledge_level && (
                  <span className={`text-xs leading-snug ${LEVEL_BADGE[session.knowledge_level].color}`}>
                    · {LEVEL_BADGE[session.knowledge_level].label}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
              className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 shrink-0 text-lg leading-none mt-0.5 transition-colors"
              title="Eliminar sesión"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
