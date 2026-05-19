import { useRef, KeyboardEvent } from "react";

interface Props {
  onSend: (question: string) => void;
  isLoading: boolean;
}

export function InputBar({ onSend, isLoading }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const value = textareaRef.current?.value.trim() ?? "";
    if (!value || isLoading) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className="border-t-2 border-gray-700 bg-gray-900 px-4 py-3">
      <div className="flex items-end gap-2 bg-gray-800 border border-gray-600 rounded-2xl px-4 py-2">
        <textarea
          ref={textareaRef}
          rows={1}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={isLoading}
          placeholder="Escribe tu pregunta... (Enter para enviar, Shift+Enter para nueva línea)"
          className="flex-1 resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none max-h-[120px] leading-relaxed disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "..." : "Preguntar"}
        </button>
      </div>
      <p className="text-[10px] text-gray-600 text-center mt-1">
        El tutor te dará pistas, no el código completo
      </p>
    </div>
  );
}
