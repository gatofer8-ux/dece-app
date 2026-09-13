"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { LeafletEvent } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Corrige la ruta de los íconos por defecto de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const QUITO: [number, number] = [-0.180653, -78.467834];

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  latName = "latitude",
  lngName = "longitude",
  defaultLat,
  defaultLng,
  required = false,
}: {
  latName?: string;
  lngName?: string;
  defaultLat?: number | null;
  defaultLng?: number | null;
  required?: boolean;
}) {
  const [position, setPosition] = useState<[number, number] | null>(
    defaultLat != null && defaultLng != null ? [defaultLat, defaultLng] : null
  );
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useMyLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicación actual.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setError("No se pudo obtener tu ubicación. Revisa los permisos de ubicación del navegador.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Ubicación en el mapa {required && <span className="text-rose-500">*</span>}
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50"
        >
          {locating ? "Obteniendo ubicación..." : "📍 Usar mi ubicación actual"}
        </button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="w-full h-64 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
        <MapContainer
          center={position || QUITO}
          zoom={position ? 16 : 12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPick onPick={(lat, lng) => setPosition([lat, lng])} />
          {position && (
            <Marker
              position={position}
              draggable
              eventHandlers={{
                dragend: (e: LeafletEvent) => {
                  const marker = e.target as L.Marker;
                  const latLng = marker.getLatLng();
                  setPosition([latLng.lat, latLng.lng]);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-slate-500">
        Toca el mapa para marcar el lugar, arrastra el marcador para ajustarlo, o usa el botón de ubicación actual.
      </p>
      {required && !position && (
        <p className="text-xs text-rose-600">⚠️ Debes marcar un punto en el mapa antes de guardar.</p>
      )}

      <input type="hidden" name={latName} value={position ? position[0] : ""} />
      <input type="hidden" name={lngName} value={position ? position[1] : ""} />
    </div>
  );
}
