"use client";

interface StatsBarProps {
  total: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

interface StatBoxProps {
  label: string;
  value: number;
  bg: string;
  text: string;
  pulse?: boolean;
}

function StatBox({ label, value, bg, text, pulse }: StatBoxProps) {
  return (
    <div className={`rounded-xl p-3 ${bg} flex flex-col items-center`}>
      <span
        className={`text-2xl font-extrabold font-mono ${text} ${pulse ? "animate-pulse" : ""}`}
      >
        {value}
      </span>
      <span className="text-xs text-gray-400 mt-0.5 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

export function StatsBar({ total, p0, p1, p2, p3 }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatBox
        label="Total"
        value={total}
        bg="bg-blue-950/60 border border-blue-800/40"
        text="text-blue-300"
      />
      <StatBox
        label="P0 Crítico"
        value={p0}
        bg="bg-red-950/60 border border-red-800/40"
        text="text-red-400"
        pulse={p0 > 0}
      />
      <StatBox
        label="P1 Urgente"
        value={p1}
        bg="bg-orange-950/60 border border-orange-800/40"
        text="text-orange-400"
      />
      <StatBox
        label="P2 / P3"
        value={p2 + p3}
        bg="bg-yellow-950/60 border border-yellow-800/40"
        text="text-yellow-400"
      />
    </div>
  );
}
