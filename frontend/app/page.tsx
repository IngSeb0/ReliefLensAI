"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { AMDPanel } from "@/components/AMDPanel";
import { IncidentCard } from "@/components/IncidentCard";
import { StatsBar } from "@/components/StatsBar";
import { UploadPanel } from "@/components/UploadPanel";
import { api } from "@/lib/api";
import type {
  AMDPerformanceMetric,
  CrisisRoomSummary,
  DispatchMessage,
  Incident,
  Priority,
  ResourceRecommendation,
} from "@/lib/types";

type PriorityFilter = "ALL" | Priority;

const FILTERS: PriorityFilter[] = ["ALL", "P0", "P1", "P2", "P3"];

export default function CrisisRoomPage() {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState<string>("Sin sesión activa");
  const [summary, setSummary] = useState<CrisisRoomSummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<ResourceRecommendation[]>([]);
  const [dispatchMessages, setDispatchMessages] = useState<DispatchMessage[]>([]);
  const [amdMetrics, setAmdMetrics] = useState<AMDPerformanceMetric | null>(null);
  const [filter, setFilter] = useState<PriorityFilter>("ALL");
  const [lastError, setLastError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      await api.getHealth();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  const fetchAmdMetrics = useCallback(async () => {
    try {
      const res = await api.getAMDMetrics();
      setAmdMetrics(res.data as AMDPerformanceMetric);
    } catch {
      setAmdMetrics(null);
    }
  }, []);

  const fetchIncidents = useCallback(async (sid: string) => {
    const res = await api.getIncidents(sid);
    setIncidents(Array.isArray(res.data) ? (res.data as Incident[]) : []);
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchAmdMetrics();
    const interval = setInterval(fetchAmdMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchAmdMetrics, fetchHealth]);

  const filteredIncidents = useMemo(
    () => (filter === "ALL" ? incidents : incidents.filter((incident) => incident.priority === filter)),
    [filter, incidents],
  );

  const counts = useMemo(
    () => ({
      total: incidents.length,
      p0: incidents.filter((incident) => incident.priority === "P0").length,
      p1: incidents.filter((incident) => incident.priority === "P1").length,
      p2: incidents.filter((incident) => incident.priority === "P2").length,
      p3: incidents.filter((incident) => incident.priority === "P3").length,
    }),
    [incidents],
  );

  const resourcesByIncident = useMemo(() => {
    const map = new Map<string, ResourceRecommendation[]>();
    for (const resource of resources) {
      const bucket = map.get(resource.incident_id) ?? [];
      bucket.push(resource);
      map.set(resource.incident_id, bucket);
    }
    return map;
  }, [resources]);

  const dispatchByIncident = useMemo(() => {
    const map = new Map<string, DispatchMessage>();
    for (const message of dispatchMessages) {
      if (!map.has(message.incident_id)) {
        map.set(message.incident_id, message);
      }
    }
    return map;
  }, [dispatchMessages]);

  function handleResults(nextSummary: CrisisRoomSummary) {
    setSummary(nextSummary);
    setSessionId(nextSummary.session_id);
    setScenarioName(nextSummary.scenario_name);
    setResources(nextSummary.resource_recommendations ?? []);
    setDispatchMessages(nextSummary.dispatch_messages ?? []);
    setAmdMetrics(nextSummary.amd_metrics ?? null);
    setLastError(null);
    fetchIncidents(nextSummary.session_id).catch(() => {
      setLastError("No se pudo refrescar la lista de incidentes de la sesión.");
    });
  }

  async function handleRefresh() {
    await fetchHealth();
    await fetchAmdMetrics();
    if (sessionId) {
      try {
        await fetchIncidents(sessionId);
      } catch {
        setLastError("No se pudo actualizar la sesión actual.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">ReliefLens AI</p>
              <h1 className="text-lg font-semibold text-white">Crisis Room</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                backendOnline
                  ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
                  : backendOnline === false
                    ? "border-red-900/60 bg-red-950/40 text-red-300"
                    : "border-gray-800 bg-gray-900 text-gray-400"
              }`}
            >
              {backendOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {backendOnline ? "Backend online" : backendOnline === false ? "Backend offline" : "Verificando"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-orange-900/60 bg-orange-950/40 px-3 py-2 text-xs text-orange-300">
              <Activity className="h-3.5 w-3.5" />
              AMD MI300X
            </span>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-sm font-semibold text-white">Ingesta</h2>
            <p className="mt-1 text-sm text-gray-400">Demo guiada y prueba rápida para validar el backend.</p>
            <div className="mt-4">
              <UploadPanel
                processing={processing}
                onProcessing={setProcessing}
                onError={setLastError}
                onResults={(nextSummary) => handleResults(nextSummary)}
              />
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-sm font-semibold text-white">Sesión activa</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Escenario</dt>
                <dd className="mt-1 text-gray-200">{scenarioName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Session ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-gray-300">{sessionId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Estado</dt>
                <dd className="mt-1 text-gray-200">{summary?.status ?? "idle"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tiempo de proceso</dt>
                <dd className="mt-1 text-gray-200">
                  {summary ? `${summary.processing_time_seconds.toFixed(2)} s` : "—"}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          <StatsBar total={counts.total} p0={counts.p0} p1={counts.p1} p2={counts.p2} p3={counts.p3} />

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Operational Incidents</h2>
                <p className="mt-1 text-sm text-gray-400">
                  {filteredIncidents.length} visibles de {incidents.length} incidentes consolidados.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {FILTERS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFilter(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filter === option ? "bg-white text-gray-950" : "bg-gray-950 text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    {option === "ALL" ? "Todos" : option}
                  </button>
                ))}
              </div>
            </div>

            {lastError ? (
              <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {lastError}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {filteredIncidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/40 px-6 py-12 text-center">
                  <p className="text-sm font-medium text-gray-300">Sin incidentes cargados</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Ejecuta la demo o procesa mensajes de texto desde el panel izquierdo.
                  </p>
                </div>
              ) : (
                filteredIncidents.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    resources={resourcesByIncident.get(incident.id) ?? []}
                    dispatch={dispatchByIncident.get(incident.id) ?? null}
                    onApprove={(id) =>
                      setIncidents((prev) =>
                        prev.map((current) => (current.id === id ? { ...current, human_approved: true } : current)),
                      )
                    }
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <AMDPanel metrics={amdMetrics} />

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Guardrails</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-gray-400">
              <li>Los incidentes P0 y P1 requieren aprobación humana antes de despacho.</li>
              <li>La evidencia multimodal se mantiene vinculada al incidente consolidado.</li>
              <li>Este sistema apoya coordinación; no sustituye respuesta médica ni emergencias oficiales.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-sm font-semibold text-white">Dispatch readiness</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                <dt className="text-gray-500">Mensajes listos</dt>
                <dd className="mt-1 font-mono text-xl text-white">{dispatchMessages.length}</dd>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                <dt className="text-gray-500">Recursos activos</dt>
                <dd className="mt-1 font-mono text-xl text-white">{resources.length}</dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
