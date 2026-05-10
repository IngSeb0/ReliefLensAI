"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, FileText, Image, MapPin, Mic, Radio, Send, Table, Users } from "lucide-react";
import { PriorityBadge } from "@/components/PriorityBadge";
import { api } from "@/lib/api";
import type { DispatchMessage, EvidenceItem, Incident, ResourceRecommendation } from "@/lib/types";

const MODALITY_ICON: Record<string, React.ReactNode> = {
  text: <FileText className="h-3.5 w-3.5 text-blue-400" />,
  image: <Image className="h-3.5 w-3.5 text-purple-400" />,
  audio: <Mic className="h-3.5 w-3.5 text-emerald-400" />,
  csv: <Table className="h-3.5 w-3.5 text-yellow-400" />,
  location: <MapPin className="h-3.5 w-3.5 text-cyan-400" />,
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  acknowledged: "Recibido",
  in_progress: "En progreso",
  resolved: "Resuelto",
};

interface IncidentCardProps {
  incident: Incident;
  resources?: ResourceRecommendation[];
  dispatch?: DispatchMessage | null;
  onApprove?: (id: string) => void;
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2">
      <span className="mt-0.5 shrink-0">{MODALITY_ICON[item.modality] ?? MODALITY_ICON.text}</span>
      <span className="text-xs leading-5 text-gray-300">{item.description}</span>
    </div>
  );
}

export function IncidentCard({ incident, resources = [], dispatch, onApprove }: IncidentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [approved, setApproved] = useState(incident.human_approved);
  const [dispatchMessage, setDispatchMessage] = useState(dispatch?.message ?? "");
  const [generatingDispatch, setGeneratingDispatch] = useState(false);

  const confidencePct = Math.round(incident.confidence * 100);
  const statusLabel = STATUS_LABELS[incident.status] ?? incident.status;
  const resourceSummary = useMemo(
    () =>
      resources
        .map((resource) =>
          resource.quantity ? `${resource.quantity} ${resource.description}` : resource.description,
        )
        .slice(0, 3)
        .join(" · "),
    [resources],
  );

  async function handleApprove() {
    try {
      await api.approveIncident(incident.id);
    } catch {
      // optimistic update
    }
    setApproved(true);
    onApprove?.(incident.id);
  }

  async function handleGenerateDispatch() {
    setGeneratingDispatch(true);
    try {
      const res = await api.generateDispatch(incident.id);
      setDispatchMessage(res.data?.message ?? "");
    } finally {
      setGeneratingDispatch(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="shrink-0">
          <PriorityBadge priority={incident.priority} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">{incident.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {incident.location ?? "Ubicación no disponible"}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {incident.affected_people ?? 0} personas
                </span>
                <span>{statusLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-500">{confidencePct}%</span>
              {approved ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : null}
              {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </div>
          </div>

          {!expanded && resourceSummary ? (
            <p className="mt-2 truncate text-xs text-gray-500">{resourceSummary}</p>
          ) : null}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-gray-800 px-4 pb-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Situación</h4>
                <p className="mt-2 text-sm leading-6 text-gray-300">{incident.description}</p>
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Evidencia ({incident.evidence.length})
                </h4>
                <div className="mt-2 space-y-2">
                  {incident.evidence.map((item) => (
                    <EvidenceRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recursos sugeridos</h4>
                {resources.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {resources.map((resource) => (
                      <div key={resource.id} className="rounded-md border border-gray-800 bg-gray-900 px-3 py-2">
                        <p className="text-sm font-medium text-white">
                          {resource.quantity ? `${resource.quantity} ` : ""}
                          {resource.description}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {resource.urgency} · {resource.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">Sin recursos asociados en esta sesión.</p>
                )}
              </section>

              <section className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Mensaje de despacho
                  </h4>
                  <button
                    onClick={handleGenerateDispatch}
                    disabled={generatingDispatch}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {generatingDispatch ? "Generando" : "Generar"}
                  </button>
                </div>
                <div className="mt-2 rounded-md border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-300">
                  {dispatchMessage || "Todavía no hay mensaje generado para este incidente."}
                </div>
              </section>

              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs text-gray-400">
                  <Radio className="h-3.5 w-3.5 text-orange-400" />
                  Human-in-the-loop requerido para despacho crítico
                </div>
                <button
                  onClick={handleApprove}
                  disabled={approved}
                  className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                    approved ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {approved ? "Aprobado" : "Aprobar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
