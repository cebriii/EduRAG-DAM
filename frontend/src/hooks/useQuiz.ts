import { useState } from "react";
import { evaluateAnswer, generateQuiz } from "../services/api";
import type {
  KnowledgeLevel,
  QuizAnswerRecord,
  QuizEvaluation,
  QuizQuestion,
  QuizStatus,
} from "../types";

interface QuizState {
  status: QuizStatus;
  questions: QuizQuestion[];
  currentIndex: number;
  currentEvaluation: QuizEvaluation | null;
  history: QuizAnswerRecord[];
  error: string | null;
  knowledgeLevel: KnowledgeLevel;
}

const INITIAL: QuizState = {
  status: "idle",
  questions: [],
  currentIndex: 0,
  currentEvaluation: null,
  history: [],
  error: null,
  knowledgeLevel: "intermedio",
};

export function useQuiz() {
  const [state, setState] = useState<QuizState>(INITIAL);

  async function startQuiz(numQuestions: number, sourceFile: string | null, knowledgeLevel: KnowledgeLevel = "intermedio") {
    setState({ ...INITIAL, status: "loading", knowledgeLevel });
    try {
      const questions = await generateQuiz(numQuestions, sourceFile, knowledgeLevel);
      if (!questions.length) throw new Error("El modelo no devolvió preguntas.");
      setState({ ...INITIAL, status: "active", questions, knowledgeLevel });
    } catch (e) {
      setState({ ...INITIAL, status: "idle", error: e instanceof Error ? e.message : "Error desconocido" });
    }
  }

  async function submitAnswer(userAnswer: string) {
    const { questions, currentIndex } = state;
    const q = questions[currentIndex];
    setState((s) => ({ ...s, status: "evaluating" }));
    try {
      const evaluation = await evaluateAnswer(q.question, userAnswer, q.context, state.knowledgeLevel);
      setState((s) => ({ ...s, status: "feedback", currentEvaluation: evaluation }));
    } catch (e) {
      setState((s) => ({
        ...s,
        status: "feedback",
        currentEvaluation: {
          score: 0,
          feedback: "No se pudo evaluar la respuesta. Continúa con la siguiente pregunta.",
          hint: null,
        },
      }));
    }
  }

  function nextQuestion() {
    const { questions, currentIndex, currentEvaluation, history, state: _s } = {
      ...state,
      state: state,
    };
    const q = questions[currentIndex];
    const record: QuizAnswerRecord = {
      question: q.question,
      userAnswer: "",
      evaluation: currentEvaluation!,
    };

    const newHistory = [...history, record];
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      setState((s) => ({ ...s, status: "done", history: newHistory }));
    } else {
      setState((s) => ({
        ...s,
        status: "active",
        currentIndex: nextIndex,
        currentEvaluation: null,
        history: newHistory,
      }));
    }
  }

  function reset() {
    setState(INITIAL);
  }

  const current = state.questions[state.currentIndex] ?? null;
  const totalScore = state.history.reduce((sum, r) => sum + r.evaluation.score, 0);
  const maxScore = state.history.length * 4;

  return {
    status: state.status,
    questions: state.questions,
    current,
    currentIndex: state.currentIndex,
    totalQuestions: state.questions.length,
    currentEvaluation: state.currentEvaluation,
    history: state.history,
    error: state.error,
    totalScore,
    maxScore,
    startQuiz,
    submitAnswer,
    nextQuestion,
    reset,
  };
}
