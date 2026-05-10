"use client";

import { Activity, Cpu, MemoryStick, Zap } from "lucide-react";
import type { AMDPerformanceMetric } from "@/lib/types";

interface AMDPanelProps {
  metrics: AMDPerformanceMetric | null;
  backendOnline?: boolean | null;
  demoMode?: boolean | null;
  appEnv?: string | null;
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
    <div className="h-2 overflow-hidden rounded-full bg-slate-900">
      <div className={`h-2 rounded-full transition-all duration-500 ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AMDPanel({ metrics, backendOnline, demoMode, appEnv, loading }: AMDPanelProps) {
  return (
    <section className="panel rounded-[1.6rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-orange-400" />
          <h3 className="text-2xl text-white">AMD Telemetry</h3>
        </div>
        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {loading ? "Refreshing" : "Operations feed"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Backend</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {backendOnline === null ? "Checking" : backendOnline ? "Online" : "Unavailable"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Demo mode</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {demoMode === null ? "Unknown" : demoMode ? "Enabled" : "Disabled"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">App env</p>
          <p className="mt-2 text-sm font-semibold text-white">{appEnv ?? "Unavailable"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-xs text-orange-100">
        {metrics?.model_name ?? "Metrics unavailable"}
        {metrics?.rocm_version ? ` | ROCm ${metrics.rocm_version}` : " | ROCm status unavailable"}
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              GPU utilization
            </span>
            <span className="font-mono text-orange-300">
              {metrics ? `${metrics.gpu_utilization.toFixed(1)}%` : "-"}
            </span>
          </div>
          <ProgressBar value={metrics?.gpu_utilization ?? 0} tone="bg-orange-500" />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <MemoryStick className="h-3.5 w-3.5" />
              HBM memory
            </span>
            <span className="font-mono text-purple-300">
              {metrics ? `${metrics.memory_used_gb.toFixed(1)} / ${metrics.memory_total_gb.toFixed(0)} GB` : "-"}
            </span>
          </div>
          <ProgressBar value={metrics?.memory_used_gb ?? 0} max={metrics?.memory_total_gb ?? 1} tone="bg-purple-500" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
            Tokens/s
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-white">
            {metrics ? metrics.tokens_per_second.toFixed(0) : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <p className="text-xs text-slate-500">Average latency</p>
          <p className="mt-1 font-mono text-xl font-semibold text-white">
            {metrics ? `${metrics.avg_latency_ms.toFixed(0)} ms` : "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <p className="text-xs text-slate-500">Requests</p>
          <p className="mt-1 font-mono text-lg font-semibold text-white">
            {metrics?.requests_processed ?? "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <p className="text-xs text-slate-500">Power</p>
          <p className="mt-1 font-mono text-lg font-semibold text-white">
            {metrics?.power_watts ? `${metrics.power_watts.toFixed(0)} W` : "-"}
          </p>
        </div>
      </div>

      {!metrics || metrics.model_name === "unavailable" ? (
        <p className="mt-4 text-sm text-slate-400">
          AMD metrics are not currently available from the backend. The dashboard keeps the telemetry panel visible with a graceful fallback.
        </p>
      ) : null}
    </section>
  );
}
