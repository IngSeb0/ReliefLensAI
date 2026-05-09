"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/adminAuth";
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

  useEffect(() => {
    adminFetch(`/api/admin/incidents/${incidentId}`)
      .then((response) => response.json())
      .then((data) => {
        const nextIncident = data as DemoIncident;
        setIncident(nextIncident);
        setStatus(nextIncident.status ?? "received");
        setReviewed(Boolean(nextIncident.reviewed));
        setAdminNotes(nextIncident.admin_notes ?? "");
        setAssignedTeam(nextIncident.assigned_team ?? "");
      })
      .catch(() => undefined);
  }, [incidentId]);

  async function handleSave() {
    const response = await adminFetch(`/api/admin/incidents/${incidentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        reviewed,
        admin_notes: adminNotes,
        assigned_team: assignedTeam,
      }),
    });
    const updated = (await response.json()) as DemoIncident;
    setIncident(updated);
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
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Audio metadata</p>
              <p className="mt-2 text-sm text-slate-300">{incident.evidence.audio.filename ?? "No audio uploaded"}</p>
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
              <CriticalMap incidents={[incident]} activeIncidentId={incident.incident_id} />
            ) : (
              <p className="text-sm text-slate-400">Location pending human review.</p>
            )}
          </section>
        </div>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="panel rounded-[1.8rem] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Evidence findings</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {incident.evidence_findings.map((finding) => <p key={finding}>{finding}</p>)}
            </div>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-400">Recommended resources</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {incident.recommended_resources.map((resource) => <p key={resource}>{resource}</p>)}
            </div>
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
            <button onClick={handleSave} className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950">Save</button>
          </section>
        </section>
      </div>
    </main>
  );
}
