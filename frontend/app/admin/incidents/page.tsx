"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/adminAuth";
import { getIncidentId, normalizeIncidents } from "@/lib/incidents";
import type { DemoIncident } from "@/lib/types";

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<DemoIncident[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  useEffect(() => {
    adminFetch("/api/admin/incidents")
      .then((response) => response.json())
      .then((data) => setIncidents(normalizeIncidents(data)))
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(
    () =>
      incidents.filter((incident) => {
        if (statusFilter !== "all" && incident.status !== statusFilter) return false;
        if (priorityFilter !== "all" && incident.priority !== priorityFilter) return false;
        if (severityFilter !== "all" && incident.severity !== severityFilter) return false;
        return true;
      }),
    [incidents, priorityFilter, severityFilter, statusFilter],
  );

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="panel rounded-[1.8rem] p-6">
          <h1 className="text-3xl text-white">Admin Incidents</h1>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
              {["all", "received", "new", "triaged", "in_review", "dispatched", "resolved", "rejected"].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
              {["all", "P0", "P1", "P2", "P3"].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
              {["all", "critical", "high", "medium", "low"].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </section>

        <section className="space-y-3">
          {filtered.map((incident) => (
            <div key={getIncidentId(incident)} className="panel rounded-[1.4rem] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg text-white">{incident.title}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {incident.priority} · {incident.severity} · {incident.status}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {incident.analysis_provider ?? "rule_based_fallback"} · {Math.round(incident.confidence * 100)}% confidence
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {incident.location.label} · {incident.location.source} · {incident.created_at ?? "unknown"}
                  </p>
                </div>
                <Link href={`/admin/incidents/${getIncidentId(incident)}`} className="rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950">
                  Open
                </Link>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
