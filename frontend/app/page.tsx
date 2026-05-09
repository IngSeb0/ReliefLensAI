"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, MapPin, RadioTower, RefreshCw, ShieldAlert } from "lucide-react";
import { AMDPanel } from "@/components/AMDPanel";
import { ImageEvidencePanel } from "@/components/ImageEvidencePanel";
import { UploadPanel } from "@/components/UploadPanel";
import { api } from "@/lib/api";
import { DEMO_INCIDENTS, SEVERITY_STYLES } from "@/lib/demo";
import type { AMDPerformanceMetric, CrisisRoomSummary, DemoIncident } from "@/lib/types";

const CriticalMap = dynamic(
  () => import("@/components/CriticalMap").then((module) => module.CriticalMap),
  { ssr: false },
);

interface HealthPayload {
  status: string;
  demo_mode: boolean;
  app_env: string;
}

function mapSummaryToDemoIncidents(summary: CrisisRoomSummary): DemoIncident[] {
  return summary.critical_incidents.map((incident, index) => ({
    incident_id: incident.id,
    incident_type: incident.signal_ids?.[0] ?? "incident",
    title: incident.title,
    summary: incident.description,
    severity:
      incident.priority === "P0" ? "critical" : incident.priority === "P1" ? "high" : incident.priority === "P2" ? "medium" : "low",
    priority: incident.priority,
    location: {
      lat: incident.coordinates?.lat ?? null,
      lng: incident.coordinates?.lon ?? null,
      label: incident.location ?? "Location pending human review",
      source: incident.coordinates ? "text_location" : "unknown",
      confidence: incident.coordinates ? incident.confidence : 0,
    },
    evidence: {
      image: {
        filename: null,
        content_type: null,
        size_bytes: null,
        exif_gps_found: false,
      },
      audio: {
        filename: null,
        content_type: null,
        size_bytes: null,
        transcript: null,
        status: null,
      },
      text: {
        report_text: incident.description,
        location_text: incident.location ?? "",
      },
    },
    evidence_findings: [`Pipeline summary generated from session ${summary.session_id}.`],
    recommended_resources: [],
    confidence: incident.confidence,
    human_review_required: true,
    safety_note: "Decision support only. Not connected to emergency services.",
    updated_at: incident.updated_at ?? incident.created_at,
    evidence_count: incident.evidence.length,
  }));
}

export default function CrisisOperationsDashboard() {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [amdMetrics, setAmdMetrics] = useState<AMDPerformanceMetric | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState<CrisisRoomSummary | null>(null);
  const [incidents, setIncidents] = useState<DemoIncident[]>(DEMO_INCIDENTS);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(DEMO_INCIDENTS[0]?.incident_id ?? null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [draftLocation, setDraftLocation] = useState<{ lat: number; lng: number } | null>(null);

  const activeIncident = useMemo(
    () => incidents.find((incident) => incident.incident_id === activeIncidentId) ?? incidents[0] ?? null,
    [activeIncidentId, incidents],
  );

  const criticalCount = incidents.filter((incident) => incident.priority === "P0").length;
  const highCount = incidents.filter((incident) => incident.priority === "P1").length;

  const fetchHealth = useCallback(async () => {
    try {
      const response = await api.getHealth();
      const payload = response.data as HealthPayload;
      setHealth(payload);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
      setHealth(null);
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      const response = await api.getDemoIncidents();
      const payload = response.data as DemoIncident[];
      if (Array.isArray(payload) && payload.length > 0) {
        setIncidents(payload);
        setActiveIncidentId((current) => current ?? payload[0].incident_id);
      }
    } catch {
      setIncidents((current) => (current.length > 0 ? current : DEMO_INCIDENTS));
    }
  }, []);

  const fetchAmdMetrics = useCallback(async () => {
    try {
      const response = await api.getAMDMetrics();
      setAmdMetrics(response.data as AMDPerformanceMetric);
    } catch {
      setAmdMetrics(null);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchIncidents();
    fetchAmdMetrics();
    const interval = setInterval(fetchAmdMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchAmdMetrics, fetchHealth, fetchIncidents]);

  function handleSummary(summary: CrisisRoomSummary) {
    setSessionSummary(summary);
    const nextIncidents = mapSummaryToDemoIncidents(summary);
    if (nextIncidents.length > 0) {
      setIncidents(nextIncidents);
      setActiveIncidentId(nextIncidents[0].incident_id);
    }
    setAmdMetrics(summary.amd_metrics ?? null);
    setLastError(null);
  }

  function handleEvidenceIncident(nextIncident: DemoIncident) {
    setIncidents((current) => [nextIncident, ...current.filter((incident) => incident.incident_id !== nextIncident.incident_id)]);
    setActiveIncidentId(nextIncident.incident_id);
    setSelectionMode(false);
    setLastError(null);
  }

  async function handleRefresh() {
    await Promise.allSettled([fetchHealth(), fetchIncidents(), fetchAmdMetrics()]);
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 xl:px-8">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section className="panel panel-strong overflow-hidden rounded-[2rem] p-6 lg:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-sky-200/70">ReliefLens AI</p>
              <h1 className="mt-4 max-w-3xl text-5xl leading-none text-white md:text-6xl">
                Crisis Operations Dashboard
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                Multimodal disaster triage powered by AMD Developer Cloud. Browser location, image EXIF, text mentions, and map correction all feed a human-reviewed incident queue.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                  {backendOnline === null ? "Backend check pending" : backendOnline ? "AMD backend reachable" : "Backend unavailable"}
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                  {health?.demo_mode ?? true ? "Synthetic demo mode" : "Live backend mode"}
                </div>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh feeds
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.6rem] border border-red-400/20 bg-red-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-red-200/70">P0 Critical</p>
                <p className="mt-3 font-mono text-4xl text-white">{criticalCount}</p>
                <p className="mt-2 text-sm text-red-100/80">Immediate human review required before any dispatch action.</p>
              </div>
              <div className="rounded-[1.6rem] border border-orange-400/20 bg-orange-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-orange-100/70">P1 High</p>
                <p className="mt-3 font-mono text-4xl text-white">{highCount}</p>
                <p className="mt-2 text-sm text-orange-100/80">High urgency operational items affecting movement, access, or care.</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-1 h-5 w-5 text-sky-300" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Safety Notice</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Synthetic demo. Human-in-the-loop required. Not connected to emergency services. A photo alone is not treated as exact location evidence unless EXIF GPS exists.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <ImageEvidencePanel
              onIncidentCreated={handleEvidenceIncident}
              draftLocation={draftLocation}
              selectionMode={selectionMode}
              onSelectionModeChange={setSelectionMode}
            />
            <section className="panel rounded-[1.6rem] p-5">
              <div className="flex items-center gap-2">
                <RadioTower className="h-4 w-4 text-sky-300" />
                <h2 className="text-2xl text-white">Text Intake</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Run the seeded scenario or push manual text signals through the deterministic triage pipeline.
              </p>
              <div className="mt-5">
                <UploadPanel onResults={handleSummary} onProcessing={setProcessing} processing={processing} onError={setLastError} />
              </div>
            </section>
          </div>

          <section className="panel rounded-[1.8rem] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Critical Incident Map</p>
                <h2 className="mt-2 text-3xl text-white">Santa Ana Demo Area</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
                {selectionMode ? "Click map to set review point" : "OpenStreetMap / react-leaflet"}
              </div>
            </div>

            <div className="mt-5">
              <CriticalMap
                incidents={incidents}
                activeIncidentId={activeIncidentId}
                onIncidentSelect={setActiveIncidentId}
                selectionMode={selectionMode}
                draftLocation={draftLocation}
                onLocationPick={setDraftLocation}
              />
            </div>

            {activeIncident ? (
              <div className={`mt-5 rounded-[1.5rem] border p-4 ${SEVERITY_STYLES[activeIncident.severity].panel}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Selected incident</p>
                    <h3 className="mt-2 text-2xl text-white">{activeIncident.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${SEVERITY_STYLES[activeIncident.severity].badge}`}>
                      {activeIncident.severity}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                      {activeIncident.priority}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{activeIncident.summary}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Location label</p>
                    <p className="mt-2 text-sm text-white">{activeIncident.location.label}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Location source</p>
                    <p className="mt-2 text-sm text-white">{activeIncident.location.source}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Location confidence</p>
                    <p className="mt-2 font-mono text-sm text-white">{Math.round(activeIncident.location.confidence * 100)}%</p>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="panel rounded-[1.6rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Live Queue</p>
                <h2 className="mt-2 text-3xl text-white">Latest Incidents</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
                {incidents.length} tracked
              </div>
            </div>

            {lastError ? (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {lastError}
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {incidents.map((incident) => (
                <button
                  key={incident.incident_id}
                  onClick={() => setActiveIncidentId(incident.incident_id)}
                  className={`block w-full rounded-[1.4rem] border p-4 text-left transition hover:border-sky-300/30 hover:bg-white/5 ${
                    activeIncidentId === incident.incident_id ? "border-sky-300/40 bg-white/[0.08]" : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{incident.incident_type}</p>
                      <h3 className="mt-2 text-lg text-white">{incident.title}</h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white">
                      {incident.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{incident.summary}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className={`rounded-full px-3 py-1 font-semibold ${SEVERITY_STYLES[incident.severity].badge}`}>
                      {incident.severity}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      {incident.location.lat !== null && incident.location.lng !== null
                        ? `${incident.location.label} (${incident.location.source})`
                        : "Location pending human review"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="panel rounded-[1.8rem] p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-300" />
              <h2 className="text-3xl text-white">Dispatch Recommendations</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Advisory resource planning only. Human operators remain responsible for approval and any external communication.
            </p>

            {activeIncident ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {activeIncident.recommended_resources.map((resource) => (
                  <div key={resource} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Suggested resource</p>
                    <p className="mt-3 text-lg text-white">{resource}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Recommendation produced by rule-based fallback analysis and requires human confirmation.
                    </p>
                  </div>
                ))}
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Evidence findings</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    {activeIncident.evidence_findings.map((finding) => (
                      <p key={finding}>{finding}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Review status</p>
                  <p className="mt-3 text-sm text-slate-300">
                    {activeIncident.human_review_required ? "Human review required before dispatch." : "No review gate set."}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{activeIncident.safety_note}</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
                Select an incident to review resource recommendations.
              </div>
            )}
          </section>

          <AMDPanel
            metrics={amdMetrics}
            backendOnline={backendOnline}
            demoMode={health?.demo_mode ?? null}
            appEnv={health?.app_env ?? null}
          />
        </section>

        {sessionSummary ? (
          <section className="panel rounded-[1.6rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Latest Pipeline Run</p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-500">Scenario</p>
                <p className="mt-2 text-lg text-white">{sessionSummary.scenario_name}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-500">Reports</p>
                <p className="mt-2 font-mono text-2xl text-white">{sessionSummary.total_reports}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-500">Signals</p>
                <p className="mt-2 font-mono text-2xl text-white">{sessionSummary.total_signals}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-500">Processing time</p>
                <p className="mt-2 font-mono text-2xl text-white">{sessionSummary.processing_time_seconds.toFixed(2)} s</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
