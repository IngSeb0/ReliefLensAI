"use client";

import { useEffect, useState } from "react";
import { AMDPanel } from "@/components/AMDPanel";
import { adminFetch } from "@/lib/adminAuth";
import type { AdminTelemetryResponse } from "@/lib/types";

export default function AdminTelemetryPage() {
  const [telemetry, setTelemetry] = useState<AdminTelemetryResponse | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/telemetry")
      .then((response) => response.json())
      .then((data) => setTelemetry(data as AdminTelemetryResponse))
      .catch(() => undefined);
  }, []);

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="panel rounded-[1.8rem] p-6">
          <h1 className="text-3xl text-white">Admin Telemetry</h1>
          <p className="mt-2 text-sm text-slate-300">Backend health, environment, demo mode, and AMD telemetry with graceful fallback.</p>
        </section>
        <AMDPanel
          metrics={telemetry?.amd_metrics ?? null}
          backendOnline={telemetry ? telemetry.health === "healthy" : null}
          demoMode={telemetry?.demo_mode ?? null}
          appEnv={telemetry?.app_env ?? null}
        />
      </div>
    </main>
  );
}
