"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const customIcon = (color: string) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

type Point = {
  id: string;
  lat: number;
  lng: number;
  type: "visit" | "network" | "risk";
  title: string;
  description?: string;
  color: string;
};

export default function ExtramuralMap({
  points,
  center = [-0.180653, -78.467834], // Default to Quito
}: {
  points: Point[];
  center?: [number, number];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-[600px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />;

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 z-0 relative">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((pt) => (
          <Marker key={`${pt.type}-${pt.id}`} position={[pt.lat, pt.lng]} icon={customIcon(pt.color)}>
            <Popup>
              <div className="text-sm">
                <strong className="block mb-1">{pt.title}</strong>
                {pt.description && <p className="text-slate-600 m-0">{pt.description}</p>}
                <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-700">
                  {pt.type === "visit" ? "Visita Domiciliaria" : pt.type === "network" ? "Red de Apoyo" : "Riesgo Comunitario"}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
