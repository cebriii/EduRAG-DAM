import type { KnowledgeLevel } from "../types";

const LEVELS: KnowledgeLevel[] = ["principiante", "intermedio", "avanzado"];

const LABELS: Record<KnowledgeLevel, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

const ACTIVE_STYLES: Record<KnowledgeLevel, string> = {
  principiante: "border-green-500 text-green-400 bg-green-950",
  intermedio: "border-blue-500 text-blue-400 bg-blue-950",
  avanzado: "border-orange-500 text-orange-400 bg-orange-950",
};

interface Props {
  level: KnowledgeLevel;
  onChange: (level: KnowledgeLevel) => void;
}

export function LevelSelector({ level, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 shrink-0">Nivel:</span>
      <div className="flex gap-1">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => onChange(l)}
            className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
              l === level
                ? ACTIVE_STYLES[l]
                : "border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-500"
            }`}
          >
            {LABELS[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
