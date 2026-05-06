"use client";

import { Activity, Cpu, MemoryStick, Zap } from "lucide-react";
import type { AMDPerformanceMetric } from "@/lib/types";

interface AMDPanelProps {
  metrics: AMDPerformanceMetric | null;
  loading?: boolean;
}

function ProgressBar({
  value,
  max = 100,
  tone,
}: {
  value: number;
  max?: number;
  tone: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-gray-800">
      <div className={`h-2 rounded-full transition-all duration-500 ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AMDPanel({ metrics, loading }: AMDPanelProps) {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-white">AMD Performance</h3>
        </div>
        <span className="text-xs text-gray-500">{loading ? "Actualizando" : "Telemetría activa"}</span>
      </div>

      <div className="mt-3 rounded-lg border border-orange-900/50 bg-orange-950/40 px-3 py-2 text-xs text-orange-300">
        {metrics?.model_name ?? "Modelo no disponible"}{metrics?.rocm_version ? ` · ROCm ${metrics.rocm_version}` : ""}
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Utilización GPU
            </span>
            <span className="font-mono text-orange-300">
              {metrics ? `${metrics.gpu_utilization.toFixed(1)}%` : "—"}
            </span>
          </div>
          <ProgressBar value={metrics?.gpu_utilization ?? 0} tone="bg-orange-500" />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <MemoryStick className="h-3.5 w-3.5" />
              Memoria HBM
            </span>
            <span className="font-mono text-purple-300">
              {metrics ? `${metrics.memory_used_gb.toFixed(1)} / ${metrics.memory_total_gb.toFixed(0)} GB` : "—"}
            </span>
          </div>
          <ProgressBar
            value={metrics?.memory_used_gb ?? 0}
            max={metrics?.memory_total_gb ?? 1}
            tone="bg-purple-500"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
            Tokens/s
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-white">
            {metrics ? metrics.tokens_per_second.toFixed(0) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
          <p className="text-xs text-gray-500">Latencia media</p>
          <p className="mt-1 font-mono text-xl font-semibold text-white">
            {metrics ? `${metrics.avg_latency_ms.toFixed(0)} ms` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
          <p className="text-xs text-gray-500">Requests</p>
          <p className="mt-1 font-mono text-lg font-semibold text-white">
            {metrics?.requests_processed ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
          <p className="text-xs text-gray-500">Potencia</p>
          <p className="mt-1 font-mono text-lg font-semibold text-white">
            {metrics?.power_watts ? `${metrics.power_watts.toFixed(0)} W` : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
