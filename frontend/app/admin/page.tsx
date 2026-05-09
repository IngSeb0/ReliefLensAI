"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearAdminToken, adminFetch } from "@/lib/adminAuth";
import type { DemoIncident } from "@/lib/types";

export default function AdminDashboardPage() {
  const [incidents, setIncidents] = useState<DemoIncident[]>([]);

  useEffect(() => {
    adminFetch("/api/admin/incidents")
      .then((response) => response.json())
      .then((data) => setIncidents(data as DemoIncident[]))
      .catch(() => undefined);
  }, []);

  const pendingReview = useMemo(() => incidents.filter((incident) => !incident.reviewed).length, [incidents]);
  const resolved = useMemo(() => incidents.filter((incident) => incident.status === "resolved").length, [incidents]);
  const critical = useMemo(() => incidents.filter((incident) => incident.priority === "P0" || incident.priority === "P1").length, [incidents]);

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="panel panel-strong rounded-[1.8rem] p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/70">Private Admin</p>
              <h1 className="mt-4 text-4xl text-white">Incident Operations</h1>
            </div>
            <button
              onClick={() => {
                clearAdminToken();
                window.location.href = "/admin/login";
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            >
              Logout
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="panel rounded-[1.4rem] p-4"><p className="text-xs text-slate-400">Total incidents</p><p className="mt-2 text-3xl text-white">{incidents.length}</p></div>
          <div className="panel rounded-[1.4rem] p-4"><p className="text-xs text-slate-400">P0 / P1</p><p className="mt-2 text-3xl text-white">{critical}</p></div>
          <div className="panel rounded-[1.4rem] p-4"><p className="text-xs text-slate-400">Pending review</p><p className="mt-2 text-3xl text-white">{pendingReview}</p></div>
          <div className="panel rounded-[1.4rem] p-4"><p className="text-xs text-slate-400">Resolved</p><p className="mt-2 text-3xl text-white">{resolved}</p></div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/incidents" className="panel rounded-[1.4rem] p-5 text-white">Open incident list</Link>
          <Link href="/admin/telemetry" className="panel rounded-[1.4rem] p-5 text-white">Open telemetry</Link>
          <Link href="/emergencies" className="panel rounded-[1.4rem] p-5 text-white">Open public portal</Link>
        </section>

        <section className="panel rounded-[1.8rem] p-6">
          <h2 className="text-2xl text-white">Recent incidents</h2>
          <div className="mt-4 space-y-3">
            {incidents.slice(0, 5).map((incident) => (
              <Link key={incident.incident_id} href={`/admin/incidents/${incident.incident_id}`} className="block rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <p className="font-semibold text-white">{incident.title}</p>
                <p className="mt-1">{incident.priority} · {incident.severity} · {incident.location.label}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
