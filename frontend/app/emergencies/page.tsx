"use client";

import axios from "axios";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MapPinned, RotateCcw, Upload } from "lucide-react";
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
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);

  function buildMissingInfoMessage() {
    const missing: string[] = [];
    if (!reportText.trim() && !audioFile) {
      missing.push("add a text description or an audio recording explaining what is happening");
    }
    if (!locationText.trim() && !selectedLocation) {
      missing.push("add the location by typing it, sharing your current location, or selecting a point on the map");
    }
    if (missing.length === 0) {
      return null;
    }
    return `Before sending the report, please ${missing.join(" and ")}.`;
  }

  function resetForm() {
    setImageFile(null);
    setAudioFile(null);
    setReportText("");
    setLocationText("");
    setSelectedLocation(null);
    setLocationSource("unknown");
    setLocationNotice("Location not shared. Describe the location or select it on the map.");
    setResult(null);
    setError(null);
    setSubmittedAt(null);
  }

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
        mapSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
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
    const missingInfoMessage = buildMissingInfoMessage();
    if (missingInfoMessage) {
      setError(missingInfoMessage);
      return;
    }

    const formData = new FormData();
    if (imageFile) {
      formData.append("image", imageFile);
    }
    if (audioFile) {
      formData.append("audio", audioFile);
    }
    formData.append(
      "report_text",
      reportText.trim() || "Audio evidence submitted. Transcript pending human review.",
    );
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
    setResult(null);
    try {
      const response = await api.analyzeEvidenceIntake(formData);
      setResult(response.data as DemoIncident);
      setSubmittedAt(new Date().toLocaleString());
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail =
          typeof error.response?.data?.detail === "string"
            ? error.response.data.detail
            : Array.isArray(error.response?.data?.detail)
              ? error.response?.data.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(", ")
              : null;

        if (detail) {
          setError(`Evidence submission failed: ${detail}`);
        } else if (error.response) {
          setError(`Evidence submission failed with status ${error.response.status}.`);
        } else {
          setError("Evidence submission failed. Verify the backend is reachable through /backend.");
        }
      } else {
        setError("Evidence submission failed. Verify the backend is reachable through /backend.");
      }
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

        {result ? (
          <section className="rounded-[1.8rem] border border-emerald-400/30 bg-emerald-500/10 p-6 shadow-[0_18px_44px_rgba(5,46,22,0.28)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Evidence Sent</p>
                </div>
                <h2 className="mt-3 text-2xl text-white">Your report has been received by the ReliefLens intake queue.</h2>
                <p className="mt-3 text-sm leading-6 text-emerald-50/90">
                  Keep this tracking code if you need to reference the submission during human review.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Submit another report
              </button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tracking code</p>
                <p className="mt-2 text-lg font-semibold text-white">{result.tracking_code ?? "pending"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Status</p>
                <p className="mt-2 text-lg font-semibold text-white">{result.status ?? "received"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Received at</p>
                <p className="mt-2 text-lg font-semibold text-white">{submittedAt ?? "just now"}</p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="panel rounded-[1.8rem] p-6 space-y-5">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">What is happening?</label>
              <p className="mt-2 text-sm text-slate-400">
                Add a written description or record audio explaining what is happening.
              </p>
              <textarea
                value={reportText}
                onChange={(event) => setReportText(event.target.value)}
                rows={6}
                placeholder="Describe the emergency, or leave this empty if you will send audio instead."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Where is this happening?</label>
              <p className="mt-2 text-sm text-slate-400">
                Provide the location in text or use your current location or the map.
              </p>
              <input
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
                placeholder="Example: Santa Ana civic center"
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
              {loading ? "Sending report..." : "Analyze Evidence"}
            </button>
          </form>

          <div className="space-y-6">
            <section ref={mapSectionRef} className="panel rounded-[1.8rem] p-6">
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
