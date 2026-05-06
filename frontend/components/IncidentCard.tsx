"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  CheckCircle,
  Send,
  FileText,
  Image,
  Mic,
  Table,
} from "lucide-react";
import { PriorityBadge } from "@/components/PriorityBadge";
import type { Incident, EvidenceItem } from "@/lib/types";
import { api } from "@/lib/api";

const MODALITY_ICON: Record<string, React.ReactNode> = {
  text: <FileText className="w-3.5 h-3.5 text-blue-400" />,
  image: <Image className="w-3.5 h-3.5 text-purple-400" />,
  audio: <Mic className="w-3.5 h-3.5 text-green-400" />,
  csv: <Table className="w-3.5 h-3.5 text-yellow-400" />,
  video: <Image className="w-3.5 h-3.5 text-pink-400" />,
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Nuevo", color: "text-blue-400" },
  acknowledged: { label: "Recibido", color: "text-yellow-400" },
  in_progress: { label: "En progreso", color: "text-orange-400" },
  resolved: { label: "Resuelto", color: "text-green-400" },
  cancelled: { label: "Cancelado", color: "text-gray-400" },
};

interface IncidentCardProps {
  incident: Incident;
  onApprove?: (id: string) => void;
}

function EvidenceChip({ item }: { item: EvidenceItem }) {
  return (
    <div className="flex items-start gap-2 bg-gray-700/60 rounded-md px-3 py-2 text-xs text-gray-300">
      <span className="mt-0.5 shrink-0">
        {MODALITY_ICON[item.modality] ?? MODALITY_ICON["text"]}
      </span>
      <span className="leading-snug">{item.description}</span>
    </div>
  );
}

export function IncidentCard({ incident, onApprove }: IncidentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState(
    incident.dispatch_message?.message_text ?? ""
  );
  const [generatingDispatch, setGeneratingDispatch] = useState(false);
  const [approved, setApproved] = useState(incident.human_approved);

  const statusCfg = STATUS_LABELS[incident.status] ?? STATUS_LABELS["new"];

  async function handleGenerateDispatch() {
    setGeneratingDispatch(true);
    try {
      const res = await api.generateDispatch(incident.id);
      setDispatchMsg(
        res.data?.message_text ?? res.data?.dispatch_message?.message_text ?? ""
      );
    } catch {
      setDispatchMsg(
        `🚨 DESPACHO ${incident.priority} — ${incident.title}\n📍 ${incident.location}\n👥 ${incident.affected_people} personas afectadas.\nAcción requerida inmediata. Confirmar recepción.`
      );
    } finally {
      setGeneratingDispatch(false);
    }
  }

  async function handleApprove() {
    try {
      await api.approveIncident(incident.id);
    } catch {
      // optimistic update regardless
    }
    setApproved(true);
    onApprove?.(incident.id);
  }

  const confidencePct = Math.round((incident.confidence ?? 0) * 100);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        incident.priority === "P0"
          ? "border-red-700/60 bg-gray-900/90"
          : incident.priority === "P1"
            ? "border-orange-700/40 bg-gray-900/80"
            : "border-gray-700/40 bg-gray-900/70"
      }`}
    >
      {/* Header — always visible */}
      <button
        className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className="shrink-0 mt-0.5">
          <PriorityBadge priority={incident.priority} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-snug truncate">
            {incident.title}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {incident.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {incident.affected_people} personas
            </span>
            <span className={statusCfg.color}>{statusCfg.label}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 ml-2">
          <span className="text-xs text-gray-500">{confidencePct}%</span>
          {approved && (
            <CheckCircle className="w-4 h-4 text-green-400" />
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-700/50 pt-3">
          {/* Description */}
          <p className="text-sm text-gray-300 leading-relaxed">
            {incident.description}
          </p>

          {/* Evidence */}
          {incident.evidence && incident.evidence.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Evidencias ({incident.evidence.length})
              </h4>
              <div className="space-y-1.5">
                {incident.evidence.map((ev) => (
                  <EvidenceChip key={ev.id} item={ev} />
                ))}
              </div>
            </div>
          )}

          {/* Dispatch message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Mensaje de Despacho
              </h4>
              <button
                onClick={handleGenerateDispatch}
                disabled={generatingDispatch}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Send className="w-3 h-3" />
                {generatingDispatch ? "Generando…" : "Generar"}
              </button>
            </div>
            {dispatchMsg ? (
              <pre className="text-xs text-gray-300 bg-gray-800 rounded-lg p-3 whitespace-pre-wrap font-sans leading-relaxed border border-gray-700">
                {dispatchMsg}
              </pre>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Sin mensaje — haga clic en &quot;Generar&quot;
              </p>
            )}
          </div>

          {/* Approve button */}
          <div className="flex justify-end">
            <button
              onClick={handleApprove}
              disabled={approved}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                approved
                  ? "bg-green-800/50 text-green-300 cursor-default"
                  : "bg-green-600 hover:bg-green-500 text-white"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {approved ? "Aprobado ✓" : "Aprobar (Human-in-Loop)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
