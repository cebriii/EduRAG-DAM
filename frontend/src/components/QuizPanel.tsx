import { useEffect, useRef, useState } from "react";
import { listDocuments } from "../services/api";
import type { DocumentInfo, KnowledgeLevel } from "../types";
import { useQuiz } from "../hooks/useQuiz";

function Stars({ score }: { score: number }) {
  return (
    <span className="text-yellow-400 text-lg tracking-tight">
      {"★".repeat(score)}
      <span className="text-gray-600">{"★".repeat(4 - score)}</span>
    </span>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5">
      <div
        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function gradeLabel(pct: number): { label: string; color: string } {
  if (pct >= 100) return { label: "¡Perfecto!", color: "text-green-400" };
  if (pct >= 85) return { label: "Muy bien", color: "text-green-400" };
  if (pct >= 70) return { label: "Bien", color: "text-blue-400" };
  if (pct >= 50) return { label: "En proceso", color: "text-yellow-400" };
  return { label: "Hay que repasar más", color: "text-red-400" };
}

export function QuizPanel({ onGoToChat, knowledgeLevel }: { onGoToChat: () => void; knowledgeLevel: KnowledgeLevel }) {
  const quiz = useQuiz();
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [answer, setAnswer] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch(() => {});
  }, []);

  // Limpiar respuesta al avanzar de pregunta
  useEffect(() => {
    if (quiz.status === "active") {
      setAnswer("");
      textareaRef.current?.focus();
    }
  }, [quiz.status, quiz.currentIndex]);

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (quiz.status === "idle") {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-950 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <span className="text-4xl">🎯</span>
            <h2 className="text-lg font-semibold text-gray-100 mt-2">Modo Quiz</h2>
            <p className="text-sm text-gray-500 mt-1">
              Genera preguntas a partir de tus apuntes y comprueba lo que sabes.
            </p>
          </div>

          {quiz.error && (
            <div className="mb-4 bg-red-950 border border-red-800 text-red-400 text-xs px-4 py-2 rounded-xl">
              ⚠️ {quiz.error}
            </div>
          )}

          {/* Selector de documento */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Generar preguntas sobre
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="source"
                  checked={selectedSource === null}
                  onChange={() => setSelectedSource(null)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-200">📚 Todos los apuntes</span>
              </label>
              {docs.map((d) => (
                <label key={d.filename} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="source"
                    checked={selectedSource === d.filename}
                    onChange={() => setSelectedSource(d.filename)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-300 truncate" title={d.filename}>
                    📄 {d.filename}
                  </span>
                </label>
              ))}
              {docs.length === 0 && (
                <p className="text-xs text-gray-600">
                  No hay apuntes indexados. Sube un PDF desde el panel lateral.
                </p>
              )}
            </div>
          </div>

          {/* Número de preguntas */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Número de preguntas
            </p>
            <div className="flex gap-2">
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumQuestions(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    numQuestions === n
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-600"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => quiz.startQuiz(numQuestions, selectedSource, knowledgeLevel)}
            disabled={docs.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors"
          >
            Generar Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Cargando ───────────────────────────────────────────────────────────────
  if (quiz.status === "loading") {
    return (
      <div className="flex-1 bg-gray-950 flex flex-col items-center justify-center gap-4 text-gray-400">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm">Generando {numQuestions} preguntas…</p>
      </div>
    );
  }

  // ── Pregunta activa / evaluando ────────────────────────────────────────────
  if (quiz.status === "active" || quiz.status === "evaluating") {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-950 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-xl">
          {/* Cabecera */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              Pregunta {quiz.currentIndex + 1} / {quiz.totalQuestions}
            </span>
            <button
              onClick={quiz.reset}
              className="text-xs text-gray-600 hover:text-gray-400 underline"
            >
              Cancelar
            </button>
          </div>
          <ProgressBar current={quiz.currentIndex + 1} total={quiz.totalQuestions} />

          {/* Pregunta */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mt-4 mb-4">
            <p className="text-sm font-medium text-gray-100 leading-relaxed">
              {quiz.current?.question}
            </p>
          </div>

          {/* Área de respuesta */}
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={quiz.status === "evaluating"}
            placeholder="Escribe tu respuesta aquí..."
            rows={5}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50 transition-colors"
          />

          <button
            onClick={() => quiz.submitAnswer(answer)}
            disabled={quiz.status === "evaluating" || !answer.trim()}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
          >
            {quiz.status === "evaluating" ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Evaluando…
              </>
            ) : (
              "Enviar respuesta"
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Feedback ───────────────────────────────────────────────────────────────
  if (quiz.status === "feedback" && quiz.currentEvaluation) {
    const ev = quiz.currentEvaluation;
    const isLast = quiz.currentIndex + 1 >= quiz.totalQuestions;
    return (
      <div className="flex-1 overflow-y-auto bg-gray-950 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              Pregunta {quiz.currentIndex + 1} / {quiz.totalQuestions}
            </span>
          </div>
          <ProgressBar current={quiz.currentIndex + 1} total={quiz.totalQuestions} />

          {/* Puntuación */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mt-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Puntuación
              </p>
              <div className="flex items-center gap-2">
                <Stars score={ev.score} />
                <span className="text-xs text-gray-500">{ev.score}/4</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
              Feedback del tutor
            </p>
            <p className="text-sm text-gray-200 leading-relaxed">{ev.feedback}</p>

            {ev.hint && (
              <div className="mt-3 bg-blue-950 border border-blue-800 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-300">
                  💡 <span className="font-semibold">Pista:</span> {ev.hint}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={quiz.nextQuestion}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {isLast ? "Ver resultados finales" : "Siguiente pregunta →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Resumen final ──────────────────────────────────────────────────────────
  if (quiz.status === "done") {
    const pct = quiz.maxScore > 0 ? Math.round((quiz.totalScore / quiz.maxScore) * 100) : 0;
    const grade = gradeLabel(pct);
    return (
      <div className="flex-1 overflow-y-auto bg-gray-950 px-6 py-8">
        <div className="max-w-xl mx-auto">
          {/* Cabecera resultado */}
          <div className="text-center mb-6">
            <span className="text-5xl">{pct >= 70 ? "🏆" : pct >= 50 ? "📚" : "💪"}</span>
            <h2 className="text-lg font-bold text-gray-100 mt-2">Quiz completado</h2>
            <p className={`text-2xl font-bold mt-1 ${grade.color}`}>
              {quiz.totalScore}/{quiz.maxScore} — {pct}%
            </p>
            <p className={`text-sm mt-0.5 ${grade.color}`}>{grade.label}</p>
          </div>

          {/* Desglose por pregunta */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Desglose por pregunta
            </p>
            <div className="space-y-3">
              {quiz.history.map((record, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 border-b border-gray-800 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-xs text-gray-600 shrink-0 mt-0.5 w-5">P{i + 1}</span>
                  <p className="flex-1 text-xs text-gray-300 leading-snug min-w-0 truncate" title={record.question}>
                    {record.question}
                  </p>
                  <div className="shrink-0 flex items-center gap-1">
                    <Stars score={record.evaluation.score} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              onClick={quiz.reset}
              className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 font-semibold rounded-xl py-3 transition-colors text-sm"
            >
              Nuevo Quiz
            </button>
            <button
              onClick={onGoToChat}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 transition-colors text-sm"
            >
              Ir al Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
