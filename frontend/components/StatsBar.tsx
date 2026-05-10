"use client";

interface StatsBarProps {
  total: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

function StatTile({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: number;
  accent: string;
  tone: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export function StatsBar({ total, p0, p1, p2, p3 }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <StatTile label="Total" value={total} accent="border-gray-800 bg-gray-900" tone="text-white" />
      <StatTile label="P0 crítico" value={p0} accent="border-red-900/60 bg-red-950/40" tone="text-red-300" />
      <StatTile label="P1 urgente" value={p1} accent="border-orange-900/60 bg-orange-950/40" tone="text-orange-300" />
      <StatTile label="P2 moderado" value={p2} accent="border-yellow-900/60 bg-yellow-950/30" tone="text-yellow-200" />
      <StatTile label="P3 bajo" value={p3} accent="border-emerald-900/60 bg-emerald-950/30" tone="text-emerald-300" />
    </div>
  );
}
