"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AlertCircle, Crosshair, Loader2, MapPinned, Mic, Upload, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { ImageAnalysisResponse } from "@/lib/types";

interface ImageEvidencePanelProps {
  onIncidentCreated: (incident: ImageAnalysisResponse) => void;
  draftLocation: { lat: number; lng: number } | null;
  selectionMode: boolean;
  onSelectionModeChange: (enabled: boolean) => void;
}

export function ImageEvidencePanel({
  onIncidentCreated,
  draftLocation,
  selectionMode,
  onSelectionModeChange,
}: ImageEvidencePanelProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [reportText, setReportText] = useState(
    "Smoke visible near hillside homes. Residents report blocked access and need evacuation support.",
  );
  const [locationText, setLocationText] = useState("Santa Ana hillside neighborhood");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageAnalysisResponse | null>(null);
  const [browserLocation, setBrowserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (draftLocation) {
      setLocationStatus(`Map point selected: ${draftLocation.lat.toFixed(4)}, ${draftLocation.lng.toFixed(4)}`);
    }
  }, [draftLocation]);

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location services are unavailable in this browser. Describe the location or select it on the map.");
      return;
    }

    setLocationStatus("Requesting browser location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setBrowserLocation(next);
        setLocationStatus(`Browser location shared: ${next.lat.toFixed(4)}, ${next.lng.toFixed(4)}`);
      },
      () => {
        setBrowserLocation(null);
        setLocationStatus("Location not shared. Describe the location or select it on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!imageFile && !audioFile && !reportText.trim()) {
      setError("Provide at least a field report, image, or audio file before analysis.");
      return;
    }

    const formData = new FormData();
    if (imageFile) {
      formData.append("image", imageFile);
    }
    if (audioFile) {
      formData.append("audio", audioFile);
    }
    formData.append("report_text", reportText);
    formData.append("location_text", locationText);

    if (browserLocation) {
      formData.append("client_lat", browserLocation.lat.toString());
      formData.append("client_lng", browserLocation.lng.toString());
      formData.append("location_source", "browser_geolocation");
    } else if (draftLocation) {
      formData.append("client_lat", draftLocation.lat.toString());
      formData.append("client_lng", draftLocation.lng.toString());
      formData.append("location_source", "map_click");
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.analyzeEvidenceIntake(formData);
      const nextIncident = response.data as ImageAnalysisResponse;
      setResult(nextIncident);
      onIncidentCreated(nextIncident);
    } catch {
      setError("Evidence analysis failed. Verify the AMD backend is reachable through /backend.");
    } finally {
      setLoading(false);
    }
  }

  const activeLocation =
    browserLocation
      ? { label: "Browser geolocation", value: `${browserLocation.lat.toFixed(4)}, ${browserLocation.lng.toFixed(4)}` }
      : draftLocation
        ? { label: "Map selection", value: `${draftLocation.lat.toFixed(4)}, ${draftLocation.lng.toFixed(4)}` }
        : null;

  return (
    <section className="panel rounded-[1.6rem] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/70">Evidence Intake</p>
          <h2 className="mt-2 text-2xl text-white">Analyze Evidence</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
          Human Review
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
          <span className="mb-3 flex items-center gap-2 text-sm text-slate-200">
            <Upload className="h-4 w-4 text-sky-300" />
            Upload image
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-sky-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sky-100 hover:file:bg-sky-500/30"
          />
        </label>

        <label className="block rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
          <span className="mb-3 flex items-center gap-2 text-sm text-slate-200">
            <Mic className="h-4 w-4 text-orange-300" />
            Upload audio (optional)
          </span>
          <input
            type="file"
            accept="audio/*"
            onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-orange-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orange-100 hover:file:bg-orange-500/30"
          />
        </label>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">What is happening?</label>
          <textarea
            value={reportText}
            onChange={(event) => setReportText(event.target.value)}
            rows={5}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Where is this happening? (optional)</label>
          <input
            value={locationText}
            onChange={(event) => setLocationText(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
            placeholder="Example: Santa Ana river crossing"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/20"
          >
            <Crosshair className="h-4 w-4" />
            Use my current location
          </button>
          <button
            type="button"
            onClick={() => onSelectionModeChange(!selectionMode)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              selectionMode
                ? "border-orange-400/40 bg-orange-500/15 text-orange-100"
                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            <MapPinned className="h-4 w-4" />
            {selectionMode ? "Selecting on map" : "Adjust location on map"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
          {locationStatus ?? "Location not shared. Describe the location or select it on the map."}
          {activeLocation ? (
            <div className="mt-2 text-xs text-slate-400">
              {activeLocation.label}: {activeLocation.value}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
          {loading ? "Analyzing evidence" : "Analyze Evidence"}
        </button>
      </form>

      {result ? (
        <div className="mt-5 space-y-3 rounded-[1.4rem] border border-white/10 bg-slate-950/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Latest result</p>
              <h3 className="mt-2 text-lg text-white">{result.title}</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              {result.priority} / {result.severity}
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-300">{result.summary}</p>
          <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
            <div>
              <p className="uppercase tracking-[0.2em] text-slate-500">Location resolution</p>
              <div className="mt-2 space-y-1">
                <p>{result.location.label}</p>
                <p>Source: {result.location.source}</p>
                <p>Confidence: {Math.round(result.location.confidence * 100)}%</p>
              </div>
            </div>
            <div>
              <p className="uppercase tracking-[0.2em] text-slate-500">Evidence status</p>
              <div className="mt-2 space-y-1">
                <p>Image: {result.evidence.image.filename ?? "none"}</p>
                <p>Audio: {result.evidence.audio.status ?? "not provided"}</p>
                <p>EXIF GPS: {result.evidence.image.exif_gps_found ? "found" : "not found"}</p>
              </div>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
