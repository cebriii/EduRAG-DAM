import ReactMarkdown from "react-markdown";
import type { Message } from "../types";
import { SourcesPanel } from "./SourcesPanel";

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">
          T
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-800 border border-gray-600 text-gray-100 rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm max-w-none prose-invert prose-code:bg-gray-700 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-700 prose-pre:rounded-lg">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.sources && message.sources.length > 0 && (
              <SourcesPanel sources={message.sources} />
            )}
          </div>
        )}

        <span
          className={`block text-right mt-1 text-[10px] ${
            isUser ? "text-blue-200" : "text-gray-500"
          }`}
        >
          {message.timestamp.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-bold ml-2 mt-1 shrink-0">
          Tú
        </div>
      )}
    </div>
  );
}
