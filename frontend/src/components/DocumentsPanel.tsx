import { useEffect, useRef, useState } from "react";
import { deleteAllDocuments, deleteDocument, listDocuments, uploadDocument } from "../services/api";
import type { DocumentInfo } from "../types";

export function DocumentsPanel() {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setDocs(await listDocuments());
    } catch {
      // backend no disponible aún
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(file);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (filename: string) => {
    setError(null);
    try {
      await deleteDocument(filename);
      setDocs((prev) => prev.filter((d) => d.filename !== filename));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("¿Eliminar todos los apuntes indexados? Esta acción no se puede deshacer.")) return;
    setError(null);
    try {
      await deleteAllDocuments();
      setDocs([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar todos");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Apuntes indexados
      </p>

      {/* Zona de carga */}
      <div
        className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors mb-3 ${
          dragOver
            ? "border-blue-500 bg-blue-950"
            : "border-gray-600 hover:border-blue-600 hover:bg-gray-800"
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-blue-400 py-1">
            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="text-xs">Indexando…</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500">Arrastra PDFs aquí</p>
            <p className="text-xs text-blue-400 font-medium mt-0.5">o haz clic para subir</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950 border border-red-800 rounded-lg px-2 py-1.5 mb-2 leading-snug">
          {error}
        </p>
      )}

      {/* Botón eliminar todo */}
      {docs.length > 0 && (
        <button
          onClick={handleDeleteAll}
          className="w-full text-xs text-red-500 hover:text-red-400 hover:bg-red-950 border border-red-800 rounded-lg py-1.5 transition-colors mb-2"
        >
          Eliminar todos los apuntes
        </button>
      )}

      {/* Lista de documentos */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
        {docs.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-6 leading-relaxed px-2">
            Ningún apunte indexado.<br />Sube un PDF para empezar.
          </p>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.filename}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 group"
            >
              <span className="text-base text-gray-500 mt-0.5 shrink-0 leading-none">📄</span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium text-gray-300 truncate leading-snug"
                  title={doc.filename}
                >
                  {doc.filename}
                </p>
                <p className="text-xs text-gray-600">{doc.chunks} fragmentos</p>
              </div>
              <button
                onClick={() => handleDelete(doc.filename)}
                className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 text-lg leading-none mt-0.5"
                title={`Eliminar ${doc.filename}`}
                aria-label={`Eliminar ${doc.filename}`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
