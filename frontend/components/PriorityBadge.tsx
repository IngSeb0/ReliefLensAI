import type { Priority } from "@/lib/types";

const PRIORITY_CONFIG: Record<
  Priority,
  { bg: string; text: string; ring: string; label: string; pulse: boolean }
> = {
  P0: {
    bg: "bg-red-600",
    text: "text-white",
    ring: "ring-red-500",
    label: "P0 CRÍTICO",
    pulse: true,
  },
  P1: {
    bg: "bg-orange-500",
    text: "text-white",
    ring: "ring-orange-400",
    label: "P1 URGENTE",
    pulse: false,
  },
  P2: {
    bg: "bg-yellow-500",
    text: "text-gray-950",
    ring: "ring-yellow-400",
    label: "P2 MODERADO",
    pulse: false,
  },
  P3: {
    bg: "bg-green-500",
    text: "text-white",
    ring: "ring-green-400",
    label: "P3 BAJO",
    pulse: false,
  },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG["P3"];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring} ${cfg.pulse ? "animate-pulse" : ""}`}
    >
      {cfg.label}
    </span>
  );
}
