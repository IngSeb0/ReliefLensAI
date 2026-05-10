"use client";

import { useEffect } from "react";
import type { ComponentType } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

interface EmergencyLocationMapProps {
  selectedLocation: { lat: number; lng: number } | null;
  onLocationSelect: (location: { lat: number; lng: number }) => void;
}

const DEFAULT_CENTER: [number, number] = [33.7528, -117.872];
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

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (location: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(event: MapClickEvent) {
      onLocationSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });
  return null;
}

function MapViewportController({
  selectedLocation,
}: {
  selectedLocation: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }
    map.flyTo([selectedLocation.lat, selectedLocation.lng], 14, {
      animate: true,
      duration: 1.2,
    });
  }, [map, selectedLocation]);

  return null;
}

export function EmergencyLocationMap({ selectedLocation, onLocationSelect }: EmergencyLocationMapProps) {
  return (
    <div className="h-[320px] overflow-hidden rounded-[1.5rem] border border-white/10">
      <UnsafeMapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom className="h-full w-full">
        <UnsafeTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportController selectedLocation={selectedLocation} />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        {selectedLocation ? (
          <UnsafeCircleMarker
            center={[selectedLocation.lat, selectedLocation.lng]}
            radius={12}
            pathOptions={{ color: "#38bdf8", fillColor: "#7dd3fc", fillOpacity: 0.95, weight: 3 }}
          >
            <UnsafePopup>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Selected location from map</p>
                <p className="text-xs text-slate-300">
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </p>
              </div>
            </UnsafePopup>
          </UnsafeCircleMarker>
        ) : null}
      </UnsafeMapContainer>
    </div>
  );
}
