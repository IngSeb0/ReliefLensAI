"use client";

import type { ComponentType } from "react";
import { useMapEvents } from "react-leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { SEVERITY_STYLES } from "@/lib/demo";
import type { DemoIncident } from "@/lib/types";

interface CriticalMapProps {
  incidents: DemoIncident[];
  activeIncidentId?: string | null;
  onIncidentSelect?: (incidentId: string) => void;
  selectionMode?: boolean;
  draftLocation?: { lat: number; lng: number } | null;
  onLocationPick?: (location: { lat: number; lng: number }) => void;
}

const DEFAULT_CENTER: [number, number] = [33.7528, -117.872];
const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [DEFAULT_CENTER[0] - 0.08, DEFAULT_CENTER[1] - 0.08],
  [DEFAULT_CENTER[0] + 0.08, DEFAULT_CENTER[1] + 0.08],
];
const UnsafeMapContainer = MapContainer as unknown as ComponentType<Record<string, unknown>>;
const UnsafeTileLayer = TileLayer as unknown as ComponentType<Record<string, unknown>>;
const UnsafeCircleMarker = CircleMarker as unknown as ComponentType<Record<string, unknown>>;
const UnsafePopup = Popup as unknown as ComponentType<Record<string, unknown>>;

interface MapClickEvent {
  latlng: {
    lat: number;
    lng: number;
  };
}

function MapClickHandler({
  selectionMode,
  onLocationPick,
}: {
  selectionMode?: boolean;
  onLocationPick?: (location: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(event: MapClickEvent) {
      if (!selectionMode || !onLocationPick) {
        return;
      }
      onLocationPick({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });
  return null;
}

export function CriticalMap({
  incidents,
  activeIncidentId,
  onIncidentSelect,
  selectionMode,
  draftLocation,
  onLocationPick,
}: CriticalMapProps) {
  const mappedPoints = incidents
    .filter((incident) => incident.location.lat !== null && incident.location.lng !== null)
    .map((incident) => [incident.location.lat as number, incident.location.lng as number] as [number, number]);
  const bounds = mappedPoints.length > 0 ? mappedPoints : DEFAULT_BOUNDS;

  return (
    <div className="h-[430px] overflow-hidden rounded-[1.6rem] border border-white/10">
      <UnsafeMapContainer bounds={bounds} scrollWheelZoom className="h-full w-full">
        <UnsafeTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler selectionMode={selectionMode} onLocationPick={onLocationPick} />

        {incidents.map((incident) => {
          if (incident.location.lat === null || incident.location.lng === null) {
            return null;
          }

          const palette = SEVERITY_STYLES[incident.severity];
          const isActive = incident.incident_id === activeIncidentId;

          return (
            <UnsafeCircleMarker
              key={incident.incident_id}
              center={[incident.location.lat, incident.location.lng]}
              radius={isActive ? 14 : 10}
              pathOptions={{
                color: palette.stroke,
                fillColor: palette.fill,
                fillOpacity: isActive ? 0.95 : 0.8,
                weight: isActive ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onIncidentSelect?.(incident.incident_id),
              }}
            >
              <UnsafePopup>
                <div className="w-64 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Incident</p>
                      <h3 className="mt-1 text-sm font-semibold text-white">{incident.title}</h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white">
                      {incident.priority}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-slate-300">{incident.summary}</p>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <p>
                      <span className="text-slate-500">Severity:</span> {incident.severity}
                    </p>
                    <p>
                      <span className="text-slate-500">Location:</span> {incident.location.label}
                    </p>
                    <p>
                      <span className="text-slate-500">Resources:</span> {incident.recommended_resources.join(", ")}
                    </p>
                  </div>
                </div>
              </UnsafePopup>
            </UnsafeCircleMarker>
          );
        })}

        {draftLocation ? (
          <UnsafeCircleMarker
            center={[draftLocation.lat, draftLocation.lng]}
            radius={11}
            pathOptions={{
              color: "#38bdf8",
              fillColor: "#7dd3fc",
              fillOpacity: 0.95,
              weight: 3,
              dashArray: "4 4",
            }}
          >
            <UnsafePopup>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Selected review point</p>
                <p className="text-xs text-slate-300">
                  {draftLocation.lat.toFixed(4)}, {draftLocation.lng.toFixed(4)}
                </p>
              </div>
            </UnsafePopup>
          </UnsafeCircleMarker>
        ) : null}
      </UnsafeMapContainer>
    </div>
  );
}
