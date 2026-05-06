"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { UploadPanel } from "@/components/UploadPanel";
import { IncidentCard } from "@/components/IncidentCard";
import { AMDPanel } from "@/components/AMDPanel";
import { StatsBar } from "@/components/StatsBar";
import { api } from "@/lib/api";
import type { Incident, CrisisRoomSummary, AMDPerformanceMetric, Priority } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mock data — used as fallback when backend is unreachable
// ---------------------------------------------------------------------------
const MOCK_INCIDENTS: Incident[] = [
  {
    id: "inc_001",
    title: "Personas atrapadas en techo - Calle Insurgentes #45",
    description:
      "Familia de 4 personas atrapada en techo por inundación. Agua llega a 1.5m. Necesitan rescate urgente.",
    priority: "P0",
    status: "new",
    location: "Calle Insurgentes #45, Barrio Santa Ana",
    coordinates: { lat: 19.4326, lon: -99.1332 },
    affected_people: 4,
    confidence: 0.95,
    evidence: [
      {
        id: "ev1",
        modality: "text",
        description:
          "WhatsApp: 'Estamos atrapados en el techo, el agua no para de subir'",
      },
      {
        id: "ev2",
        modality: "image",
        description:
          "Imagen: Vista aérea mostrando 4 personas en techo rodeadas de agua",
      },
    ],
    created_at: "2024-01-15T14:23:00Z",
    human_approved: false,
  },
  {
    id: "inc_002",
    title: "Adulto mayor con fractura - Centro Comunitario",
    description:
      "Hombre de 70 años con posible fractura de cadera por caída. Requiere atención médica urgente.",
    priority: "P0",
    status: "acknowledged",
    location: "Centro Comunitario, Av. Principal",
    affected_people: 1,
    confidence: 0.92,
    evidence: [
      {
        id: "ev3",
        modality: "audio",
        description: "Audio: Voz de mujer reportando adulto mayor caído",
      },
    ],
    created_at: "2024-01-15T14:31:00Z",
    human_approved: false,
  },
  {
    id: "inc_003",
    title: "Edificio con daños estructurales - Av. Libertad 223",
    description:
      "Edificio de 3 pisos con grietas visibles. 12 familias evacuadas preventivamente.",
    priority: "P1",
    status: "new",
    location: "Av. Libertad 223, Barrio Santa Ana",
    affected_people: 12,
    confidence: 0.88,
    evidence: [
      {
        id: "ev4",
        modality: "image",
        description:
          "Imagen: Grietas en fachada del edificio, columnas visiblemente dañadas",
      },
    ],
    created_at: "2024-01-15T14:45:00Z",
    human_approved: false,
  },
  {
    id: "inc_004",
    title: "Necesidad de agua potable - Sector Norte",
    description:
      "30 familias sin agua potable. Red municipal contaminada por inundación.",
    priority: "P2",
    status: "new",
    location: "Sector Norte, Barrio Santa Ana",
    affected_people: 30,
    confidence: 0.85,
    evidence: [
      {
        id: "ev5",
        modality: "csv",
        description:
          "CSV: Múltiples reportes del sector norte sobre contaminación del agua",
      },
    ],
    created_at: "2024-01-15T15:00:00Z",
    human_approved: false,
  },
  {
    id: "inc_005",
    title: "Zona segura establecida - Escuela Primaria",
    description:
      "Escuela primaria habilitada como albergue temporal. Capacidad para 150 personas.",
    priority: "P3",
    status: "resolved",
    location: "Escuela Primaria, Calle Flores",
    affected_people: 85,
    confidence: 0.98,
    evidence: [
      {
        id: "ev6",
        modality: "text",
        description:
          "Mensaje: La escuela está abierta y hay voluntarios atendiendo",
      },
    ],
    created_at: "2024-01-15T14:10:00Z",
    human_approved: true,
  },
];

const MOCK_AMD_METRICS: AMDPerformanceMetric = {
  gpu_utilization: 78.5,
  memory_used_gb: 245.3,
  memory_total_gb: 304.0,
  tokens_per_second: 847.2,
  requests_processed: 142,
  avg_latency_ms: 284.5,
  model_name: "Qwen/Qwen2.5-72B-Instruct",
  rocm_version: "6.1.0",
};

// ---------------------------------------------------------------------------
// Priority filter button
// ---------------------------------------------------------------------------
type PriorityFilter = "ALL" | Priority;

const FILTER_OPTS: { label: string; value: PriorityFilter; color: string }[] =
  [
    { label: "Todos", value: "ALL", color: "bg-gray-700 text-gray-300" },
    { label: "P0", value: "P0", color: "bg-red-700/80 text-red-200" },
    { label: "P1", value: "P1", color: "bg-orange-700/80 text-orange-200" },
    { label: "P2", value: "P2", color: "bg-yellow-700/80 text-yellow-200" },
    { label: "P3", value: "P3", color: "bg-green-700/80 text-green-200" },
  ];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CrisisRoomPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [amdMetrics, setAmdMetrics] = useState<AMDPerformanceMetric | null>(null);
  const [amdLoading, setAmdLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<PriorityFilter>("ALL");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ---- stats ----
  const total = incidents.length;
  const p0 = incidents.filter((i) => i.priority === "P0").length;
  const p1 = incidents.filter((i) => i.priority === "P1").length;
  const p2 = incidents.filter((i) => i.priority === "P2").length;
  const p3 = incidents.filter((i) => i.priority === "P3").length;

  const filtered =
    filter === "ALL" ? incidents : incidents.filter((i) => i.priority === filter);

  // ---- health check on mount ----
  useEffect(() => {
    api
      .getHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // ---- fetch AMD metrics (with auto-refresh every 5s) ----
  const fetchAMD = useCallback(async () => {
    setAmdLoading(true);
    try {
      const res = await api.getAMDMetrics();
      setAmdMetrics(res.data as AMDPerformanceMetric);
    } catch {
      setAmdMetrics(MOCK_AMD_METRICS);
    } finally {
      setAmdLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAMD();
    const id = setInterval(fetchAMD, 5000);
    return () => clearInterval(id);
  }, [fetchAMD]);

  // ---- fetch incidents for a session ----
  const fetchIncidents = useCallback(async (sid?: string) => {
    try {
      const res = await api.getIncidents(sid);
      const data = res.data;
      if (Array.isArray(data)) {
        setIncidents(data as Incident[]);
      } else if (data?.incidents) {
        setIncidents(data.incidents as Incident[]);
      }
    } catch {
      // keep current incidents
    }
  }, []);

  // ---- demo results handler ----
  function handleResults(summary: CrisisRoomSummary, isDemo: boolean) {
    setDemoMode(isDemo);
    setSessionId(summary.session_id);
    if (summary.incidents && summary.incidents.length > 0) {
      setIncidents(summary.incidents);
    } else if (isDemo) {
      setIncidents(MOCK_INCIDENTS);
    } else {
      fetchIncidents(summary.session_id);
    }
    if (summary.amd_metrics) {
      setAmdMetrics(summary.amd_metrics);
    }
  }

  function handleApprove(id: string) {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, human_approved: true } : inc
      )
    );
  }

  async function handleRefresh() {
    if (sessionId) {
      await fetchIncidents(sessionId);
    }
    fetchAMD();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800/60 px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse shrink-0" />
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              🚨 ReliefLensAI{" "}
              <span className="text-gray-400 font-normal">— Crisis Room</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {demoMode && (
              <span className="flex items-center gap-1.5 bg-yellow-900/60 border border-yellow-700/50 text-yellow-300 px-2.5 py-1 rounded-full font-semibold">
                🎭 Demo Mode
              </span>
            )}
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                backendOnline === true
                  ? "bg-green-900/40 text-green-400 border border-green-800/40"
                  : backendOnline === false
                    ? "bg-red-900/40 text-red-400 border border-red-800/40"
                    : "bg-gray-800 text-gray-400"
              }`}
            >
              {backendOnline === true ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {backendOnline === true
                ? "Backend Online"
                : backendOnline === false
                  ? "Backend Offline"
                  : "Checking…"}
            </span>
            <span className="bg-orange-950/60 border border-orange-700/40 text-orange-400 px-2.5 py-1 rounded-full font-bold">
              AMD MI300X
            </span>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Main layout                                                          */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-6 flex gap-6">
        {/* ---- Left panel (1/3) ---- */}
        <aside className="w-80 lg:w-96 shrink-0 flex flex-col gap-5">
          {/* Upload */}
          <section className="bg-gray-900 border border-gray-700/60 rounded-xl p-4">
            <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <span>📂</span> Cargar Reporte
            </h2>
            <UploadPanel
              onResults={handleResults}
              onProcessing={setProcessing}
              processing={processing}
            />
          </section>

          {/* Processing status */}
          {processing && (
            <div className="bg-blue-950/60 border border-blue-700/40 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-200">
                  Procesando pipeline…
                </p>
                <p className="text-xs text-blue-400 mt-0.5">
                  Clasificando incidentes con AMD MI300X
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          {incidents.length > 0 && (
            <section className="bg-gray-900 border border-gray-700/60 rounded-xl p-4">
              <h2 className="text-sm font-bold text-gray-200 mb-3 flex items-center gap-2">
                <span>📊</span> Resumen
              </h2>
              <StatsBar
                total={total}
                p0={p0}
                p1={p1}
                p2={p2}
                p3={p3}
              />
            </section>
          )}

          {/* AMD Panel */}
          <AMDPanel metrics={amdMetrics} loading={amdLoading} />
        </aside>

        {/* ---- Center panel (2/3) ---- */}
        <section className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              🗂️ Incidentes
              {incidents.length > 0 && (
                <span className="text-xs font-normal text-gray-400">
                  ({filtered.length} / {total})
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1.5">
              {FILTER_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    filter === opt.value
                      ? `${opt.color} ring-1 ring-white/20`
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {incidents.length === 0 && !processing && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-24 text-gray-500">
              <AlertTriangle className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-base font-medium mb-1">Sin incidentes</p>
              <p className="text-sm">
                Cargue un reporte o ejecute el Demo Santa Ana
              </p>
            </div>
          )}

          {/* Incident cards */}
          <div className="space-y-3">
            {filtered.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onApprove={handleApprove}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

