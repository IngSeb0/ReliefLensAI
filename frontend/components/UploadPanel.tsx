"use client";

import { useMemo, useState } from "react";
import { AlertCircle, FileText, Loader2, Play, SendHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import type { CrisisRoomSummary } from "@/lib/types";

interface UploadPanelProps {
  onResults: (summary: CrisisRoomSummary) => void;
  onProcessing: (processing: boolean) => void;
  processing: boolean;
  onError?: (message: string) => void;
}

const QUICK_TEST_MESSAGES = [
  "Hay una familia atrapada en el techo de una casa en Barrio Santa Ana, el agua sigue subiendo.",
  "Adulto mayor con posible fractura en el centro comunitario, necesita atencion medica.",
  "Tenemos 20 personas refugiadas en la escuela, falta agua potable.",
];

export function UploadPanel({ onResults, onProcessing, processing, onError }: UploadPanelProps) {
  const [rawMessages, setRawMessages] = useState(QUICK_TEST_MESSAGES.join("\n"));
  const messages = useMemo(
    () => rawMessages.split("\n").map((line) => line.trim()).filter(Boolean),
    [rawMessages],
  );

  async function handleLoadDemo() {
    onProcessing(true);
    try {
      const res = await api.runDemo();
      onResults(res.data as CrisisRoomSummary);
    } catch {
      onError?.("The Santa Ana scenario could not be executed. Verify backend availability.");
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
      onResults(res.data as CrisisRoomSummary);
    } catch {
      onError?.("Quick text processing failed. Check the backend connection through /backend.");
    } finally {
      onProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Scenario Run</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Launch the Santa Ana synthetic scenario to demonstrate the full triage pipeline from intake to dispatch drafting.
        </p>
        <button
          onClick={handleLoadDemo}
          disabled={processing}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {processing ? "Running scenario" : "Run Santa Ana demo"}
        </button>
      </div>

      <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 text-sky-300" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Manual Intake</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Paste one report per line to validate deterministic triage without relying on the seeded dataset.
            </p>
          </div>
        </div>

        <textarea
          value={rawMessages}
          onChange={(e) => setRawMessages(e.target.value)}
          rows={7}
          className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
          placeholder="One report per line"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{messages.length} messages ready</span>
          </div>
          <button
            onClick={handleQuickProcess}
            disabled={processing || messages.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            Process text
          </button>
        </div>
      </div>
    </div>
  );
}
