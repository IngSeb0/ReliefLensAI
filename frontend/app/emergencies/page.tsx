"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertCircle, Loader2, MapPinned, Upload } from "lucide-react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { api } from "@/lib/api";
import type { DemoIncident } from "@/lib/types";

const EmergencyLocationMap = dynamic(
  () => import("@/components/EmergencyLocationMap").then((module) => module.EmergencyLocationMap),
  { ssr: false },
);

export default function EmergenciesPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [reportText, setReportText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<"browser_geolocation" | "map_click" | "user_text" | "unknown">("unknown");
  const [locationNotice, setLocationNotice] = useState("Location not shared. Describe the location or select it on the map.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoIncident | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationNotice("Location not shared. Describe the location or select it on the map.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationSource("browser_geolocation");
        setLocationNotice("Browser location shared.");
      },
      () => {
        setLocationSource("unknown");
        setLocationNotice("Location not shared. Describe the location or select it on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    if (imageFile) {
      formData.append("image", imageFile);
    }
    if (audioFile) {
      formData.append("audio", audioFile);
    }
    formData.append("report_text", reportText);
    formData.append("location_text", locationText);
    if (selectedLocation) {
      formData.append("client_lat", selectedLocation.lat.toString());
      formData.append("client_lng", selectedLocation.lng.toString());
      formData.append("location_source", locationSource === "unknown" ? "map_click" : locationSource);
    } else {
      formData.append("location_source", locationText.trim() ? "user_text" : "unknown");
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.analyzeEvidenceIntake(formData);
      setResult(response.data as DemoIncident);
    } catch {
      setError("Evidence submission failed. Verify the backend is reachable through /backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="panel panel-strong rounded-[1.8rem] p-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-sky-200/70">Public Intake</p>
          <h1 className="mt-4 text-4xl text-white md:text-5xl">Report Emergency Evidence</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            This is a decision-support demo. It is not connected to emergency services.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="panel rounded-[1.8rem] p-6 space-y-5">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">What is happening?</label>
              <textarea
                value={reportText}
                onChange={(event) => setReportText(event.target.value)}
                rows={6}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Where is this happening?</label>
              <input
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none"
              />
            </div>

            <label className="block rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
              <span className="mb-3 flex items-center gap-2 text-sm text-slate-200">
                <Upload className="h-4 w-4 text-sky-300" />
                Image upload
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-300"
              />
            </label>

            <AudioRecorder onAudioReady={setAudioFile} />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={useCurrentLocation}
                className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100"
              >
                Use my current location
              </button>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                <MapPinned className="h-4 w-4" />
                {locationNotice}
              </div>
            </div>

            {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
              Analyze Evidence
            </button>
          </form>

          <div className="space-y-6">
            <section className="panel rounded-[1.8rem] p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Map Selection</p>
              <p className="mt-2 text-sm text-slate-300">Click the map to select or adjust location.</p>
              <div className="mt-4">
                <EmergencyLocationMap
                  selectedLocation={selectedLocation}
                  onLocationSelect={(location) => {
                    setSelectedLocation(location);
                    setLocationSource("map_click");
                    setLocationNotice("Selected location from map");
                  }}
                />
              </div>
            </section>

            {result ? (
              <section className="panel rounded-[1.8rem] p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Submission Received</p>
                <div className="mt-4 space-y-2 text-sm text-slate-200">
                  <p>Tracking code: {result.tracking_code}</p>
                  <p>Incident ID: {result.incident_id}</p>
                  <p>Status: {result.status}</p>
                  <p>Priority: {result.priority}</p>
                  <p>Severity: {result.severity}</p>
                  <p>Location: {result.location.label}</p>
                  <p>Location source: {result.location.source}</p>
                  <p>Location confidence: {Math.round(result.location.confidence * 100)}%</p>
                  <p>Human review required: {result.human_review_required ? "yes" : "no"}</p>
                  <p>{result.safety_note}</p>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
