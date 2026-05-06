"use client";

import { useMemo, useState } from "react";
import { AlertCircle, FileText, Loader2, Play, SendHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import type { CrisisRoomSummary } from "@/lib/types";

interface UploadPanelProps {
  onResults: (summary: CrisisRoomSummary, demoMode: boolean) => void;
  onProcessing: (processing: boolean) => void;
  processing: boolean;
  onError?: (message: string) => void;
}

const QUICK_TEST_MESSAGES = [
  "Hay una familia atrapada en el techo de una casa en Barrio Santa Ana, el agua sigue subiendo.",
  "Adulto mayor con posible fractura en el centro comunitario, necesita atención médica.",
  "Tenemos 20 personas refugiadas en la escuela, falta agua potable.",
];

export function UploadPanel({
  onResults,
  onProcessing,
  processing,
  onError,
}: UploadPanelProps) {
  const [rawMessages, setRawMessages] = useState(QUICK_TEST_MESSAGES.join("\n"));
  const messages = useMemo(
    () => rawMessages.split("\n").map((line) => line.trim()).filter(Boolean),
    [rawMessages],
  );

  async function handleLoadDemo() {
    onProcessing(true);
    try {
      const res = await api.runDemo();
      onResults(res.data as CrisisRoomSummary, false);
    } catch {
      onError?.("No se pudo ejecutar el escenario demo. Verifica que el backend esté disponible.");
    } finally {
      onProcessing(false);
    }
  }

  async function handleQuickProcess() {
    if (messages.length === 0) {
      return;
    }

    const sessionId = crypto.randomUUID();
    const payload = {
      session_id: sessionId,
      scenario_name: "Quick Manual Intake",
      reports: messages.map((content) => ({
        id: crypto.randomUUID(),
        session_id: sessionId,
        report_type: "text",
        content,
        metadata: { source: "frontend_quick_test" },
        created_at: new Date().toISOString(),
      })),
    };

    onProcessing(true);
    try {
      const res = await api.processBatch(payload);
      onResults(res.data as CrisisRoomSummary, false);
    } catch {
      onError?.("No se pudo procesar la prueba rápida. Revisa la conexión con el backend.");
    } finally {
      onProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Demo recomendada
        </p>
        <p className="mt-1 text-sm leading-6 text-gray-300">
          Ejecuta el escenario Santa Ana para mostrar la tubería completa: ingestión, normalización,
          deduplicación, prioridad, recursos y despacho.
        </p>
        <button
          onClick={handleLoadDemo}
          disabled={processing}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Ejecutar Demo Santa Ana
        </button>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 text-blue-400" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Prueba rápida
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-300">
              Pega mensajes de texto separados por línea para validar el backend sin depender del
              dataset demo.
            </p>
          </div>
        </div>

        <textarea
          value={rawMessages}
          onChange={(e) => setRawMessages(e.target.value)}
          rows={8}
          className="mt-3 w-full resize-none rounded-lg border border-gray-800 bg-gray-900 px-3 py-3 text-sm text-gray-100 outline-none ring-0 placeholder:text-gray-500 focus:border-blue-600"
          placeholder="Un reporte por línea"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{messages.length} mensajes listos para procesar</span>
          </div>
          <button
            onClick={handleQuickProcess}
            disabled={processing || messages.length === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            Procesar texto
          </button>
        </div>
      </div>
    </div>
  );
}
