"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/adminAuth";
import { getIncidentId, normalizeIncident } from "@/lib/incidents";
import type { DemoIncident } from "@/lib/types";

const CriticalMap = dynamic(
  () => import("@/components/CriticalMap").then((module) => module.CriticalMap),
  { ssr: false },
);

export default function AdminIncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const incidentId = typeof params.id === "string" ? params.id : "";
  const [incident, setIncident] = useState<DemoIncident | null>(null);
  const [status, setStatus] = useState("received");
  const [reviewed, setReviewed] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [assignedTeam, setAssignedTeam] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch(`/api/admin/incidents/${incidentId}`)
      .then((response) => response.json())
      .then((data) => {
        const nextIncident = normalizeIncident(data);
        setIncident(nextIncident);
        setStatus(nextIncident.status ?? "received");
        setReviewed(Boolean(nextIncident.reviewed));
        setAdminNotes(nextIncident.admin_notes ?? "");
        setAssignedTeam(nextIncident.assigned_team ?? "");
      })
      .catch(() => undefined);
  }, [incidentId]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const response = await adminFetch(`/api/admin/incidents/${incidentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reviewed,
          admin_notes: adminNotes,
          assigned_team: assignedTeam,
        }),
      });
      const updated = normalizeIncident(await response.json());
      setIncident(updated);
      setSaveMessage("Review saved successfully. Incident updates are now stored.");
    } catch {
      setSaveError("The review could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!incident) {
    return <main className="min-h-screen px-4 py-8 text-white">Loading incident...</main>;
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="panel rounded-[1.8rem] p-6">
          <h1 className="text-3xl text-white">{incident.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{incident.summary}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
            <span>{incident.incident_type}</span>
            <span>{incident.severity}</span>
            <span>{Math.round(incident.confidence * 100)}% confidence</span>
            <span>{incident.analysis_provider ?? "rule_based_fallback"}</span>
            <span>{incident.human_review_required ? "human review required" : "human review not flagged"}</span>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="panel rounded-[1.8rem] p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Evidence text</p>
              <p className="mt-2 text-sm text-slate-300">{incident.evidence.text.report_text}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Image metadata</p>
              <p className="mt-2 text-sm text-slate-300">{incident.evidence.image.filename ?? "No image uploaded"}</p>
              <p className="mt-2 text-sm text-slate-400">{incident.evidence.image.findings ?? "No image findings available."}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Audio metadata</p>
              <p className="mt-2 text-sm text-slate-300">{incident.evidence.audio.filename ?? "No audio uploaded"}</p>
              <p className="mt-2 text-sm text-slate-400">{incident.evidence.audio.transcript ?? "No audio transcript available."}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Location</p>
              <p className="mt-2 text-sm text-slate-300">
                {incident.location.label} · {incident.location.source} · {Math.round(incident.location.confidence * 100)}%
              </p>
            </div>
          </section>

          <section className="panel rounded-[1.8rem] p-6">
            {incident.location.lat !== null && incident.location.lng !== null ? (
              <CriticalMap incidents={[incident]} activeIncidentId={getIncidentId(incident)} />
            ) : (
              <p className="text-sm text-slate-400">Location pending human review.</p>
            )}
          </section>
        </div>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="panel rounded-[1.8rem] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Evidence summary</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{incident.evidence_summary ?? incident.summary}</p>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-400">Detected risks</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {incident.detected_risks.length > 0 ? incident.detected_risks.map((risk) => (
                <span key={risk} className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs text-red-100">
                  {risk}
                </span>
              )) : <p className="text-sm text-slate-400">No explicit risks detected.</p>}
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-400">Evidence findings</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {incident.evidence_findings.map((finding) => <p key={finding}>{finding}</p>)}
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-400">Recommended resources</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {incident.recommended_resources.map((resource) => <p key={resource}>{resource}</p>)}
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-400">Analysis admin notes</p>
            <p className="mt-3 text-sm text-slate-300">{incident.analysis_admin_notes ?? "No model notes available."}</p>
          </section>

          <section className="panel rounded-[1.8rem] p-6 space-y-4">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
              {["received", "new", "triaged", "in_review", "dispatched", "resolved", "rejected"].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              Reviewed
            </label>
            <input value={assignedTeam} onChange={(e) => setAssignedTeam(e.target.value)} placeholder="Assigned team" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={6} placeholder="Admin notes" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
            {saveMessage ? (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{saveMessage}</span>
                </div>
              </div>
            ) : null}
            {saveError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {saveError}
              </div>
            ) : null}
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving review..." : "Save"}
            </button>
          </section>
        </section>
      </div>
    </main>
  );
}
