import { useState } from "react";
import type { Source } from "../types";

interface Props {
  sources: Source[];
}

export function SourcesPanel({ sources }: Props) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  // Deduplicar por filename, quedarse con la puntuación más alta
  const unique = Object.values(
    sources.reduce<Record<string, Source>>((acc, s) => {
      if (!acc[s.filename] || s.relevance_score > acc[s.filename].relevance_score) {
        acc[s.filename] = s;
      }
      return acc;
    }, {})
  );

  return (
    <div className="mt-3 text-xs border-t border-gray-700 pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-blue-400 hover:text-blue-300 underline focus:outline-none"
      >
        {open ? "Ocultar fuentes" : `Ver fuentes (${unique.length})`}
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5 pl-2 border-l-2 border-blue-800">
          {unique.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="truncate max-w-[160px] text-gray-300" title={s.filename}>
                📄 {s.filename}
              </span>
              <div className="flex-1 bg-gray-700 rounded-full h-1.5 max-w-[80px]">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${Math.round(s.relevance_score * 100)}%` }}
                />
              </div>
              <span className="text-gray-500 whitespace-nowrap">
                {Math.round(s.relevance_score * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
