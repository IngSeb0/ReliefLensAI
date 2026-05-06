"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X, Play, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CrisisRoomSummary } from "@/lib/types";

interface UploadPanelProps {
  onResults: (summary: CrisisRoomSummary, demoMode: boolean) => void;
  onProcessing: (processing: boolean) => void;
  processing: boolean;
}

interface FileItem {
  name: string;
  size: number;
  type: string;
}

export function UploadPanel({
  onResults,
  onProcessing,
  processing,
}: UploadPanelProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const items: FileItem[] = Array.from(newFiles).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setFiles((prev) => [
      ...prev,
      ...items.filter((nf) => !prev.find((pf) => pf.name === nf.name)),
    ]);
  }, []);

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleLoadDemo() {
    onProcessing(true);
    try {
      const res = await api.runDemo();
      onResults(res.data as CrisisRoomSummary, false);
    } catch {
      // Backend unreachable — return mock summary signal
      onResults(
        {
          session_id: "demo-mock",
          total_incidents: 5,
          p0_count: 2,
          p1_count: 1,
          p2_count: 1,
          p3_count: 1,
          incidents: [],
          processing_time_ms: 1240,
          status: "completed",
        },
        true
      );
    } finally {
      onProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Drag & drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-950/30"
            : "border-gray-600 hover:border-gray-500 bg-gray-800/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".txt,.csv,.png,.jpg,.jpeg,.mp3,.wav,.pdf"
          onChange={(e) => addFiles(e.target.files)}
        />
        <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-300 font-medium">
          Arrastre archivos aquí
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Texto, imágenes, audio, CSV
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li
              key={f.name}
              className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2 text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="flex-1 truncate text-gray-300">{f.name}</span>
              <span className="text-gray-500 shrink-0">
                {formatBytes(f.size)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.name);
                }}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Load Demo button */}
      <button
        onClick={handleLoadDemo}
        disabled={processing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-orange-950/40"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Procesando…
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            🌪️ Cargar Demo Santa Ana
          </>
        )}
      </button>
    </div>
  );
}
