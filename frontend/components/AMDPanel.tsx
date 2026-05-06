"use client";

import { Cpu, MemoryStick, Zap, Activity } from "lucide-react";
import type { AMDPerformanceMetric } from "@/lib/types";

interface AMDPanelProps {
  metrics: AMDPerformanceMetric | null;
  loading?: boolean;
}

function ProgressBar({
  value,
  max = 100,
  color = "bg-orange-500",
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function AMDPanel({ metrics, loading }: AMDPanelProps) {
  const m = metrics;

  return (
    <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-bold text-white">AMD Performance</h3>
        </div>
        {loading && (
          <span className="text-xs text-gray-500 animate-pulse">
            Actualizando…
          </span>
        )}
      </div>

      {/* AMD badge */}
      <div className="inline-flex items-center gap-2 bg-orange-950/60 border border-orange-700/40 rounded-lg px-3 py-1.5">
        <span className="text-orange-400 text-xs font-bold tracking-wide">
          AMD MI300X + ROCm {m?.rocm_version ?? "6.1.0"}
        </span>
      </div>

      {/* Model name */}
      {m?.model_name && (
        <p className="text-xs text-gray-400 truncate">
          🤖 {m.model_name}
        </p>
      )}

      {/* GPU Utilization */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="flex items-center gap-1.5 text-gray-400">
            <Activity className="w-3.5 h-3.5" />
            GPU Utilización
          </span>
          <span className="font-mono font-bold text-orange-400">
            {m ? `${m.gpu_utilization.toFixed(1)}%` : "—"}
          </span>
        </div>
        <ProgressBar value={m?.gpu_utilization ?? 0} color="bg-orange-500" />
      </div>

      {/* Memory */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="flex items-center gap-1.5 text-gray-400">
            <MemoryStick className="w-3.5 h-3.5" />
            Memoria HBM3
          </span>
          <span className="font-mono font-bold text-purple-400">
            {m
              ? `${m.memory_used_gb.toFixed(0)} / ${m.memory_total_gb.toFixed(0)} GB`
              : "—"}
          </span>
        </div>
        <ProgressBar
          value={m?.memory_used_gb ?? 0}
          max={m?.memory_total_gb ?? 304}
          color="bg-purple-500"
        />
      </div>

      {/* Tokens per second */}
      <div className="bg-orange-950/40 border border-orange-800/30 rounded-lg px-3 py-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          Tokens / segundo
        </span>
        <span className="font-mono text-xl font-extrabold text-orange-400">
          {m ? m.tokens_per_second.toFixed(0) : "—"}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800/60 rounded-lg px-3 py-2">
          <p className="text-gray-500">Requests</p>
          <p className="font-mono font-bold text-white mt-0.5">
            {m?.requests_processed ?? "—"}
          </p>
        </div>
        <div className="bg-gray-800/60 rounded-lg px-3 py-2">
          <p className="text-gray-500">Latencia avg</p>
          <p className="font-mono font-bold text-white mt-0.5">
            {m ? `${m.avg_latency_ms.toFixed(0)} ms` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
