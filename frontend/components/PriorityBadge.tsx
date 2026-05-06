import type { Priority } from "@/lib/types";

const PRIORITY_CONFIG: Record<Priority, { bg: string; text: string; label: string }> = {
  P0: { bg: "bg-red-600/90", text: "text-white", label: "P0" },
  P1: { bg: "bg-orange-500/90", text: "text-white", label: "P1" },
  P2: { bg: "bg-yellow-500/90", text: "text-gray-950", label: "P2" },
  P3: { bg: "bg-emerald-500/90", text: "text-white", label: "P3" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];

  return (
    <span className={`inline-flex min-w-11 items-center justify-center rounded-md px-2.5 py-1 text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
