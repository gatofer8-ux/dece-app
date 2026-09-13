import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import dynamic from "next/dynamic";

const ExtramuralMap = dynamic(() => import("./components/ExtramuralMap"), {
  ssr: false,
});

export default async function ExtramuralMapPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  // Fetch points with coordinates
  const visits = db
    .prepare(
      `SELECT hv.id, hv.latitude, hv.longitude, hv.address, s.full_name
       FROM home_visits hv
       JOIN students s ON hv.student_id = s.id
       WHERE hv.institution_id = ? AND hv.latitude IS NOT NULL AND hv.longitude IS NOT NULL`
    )
    .all(institutionId) as any[];

  const networks = db
    .prepare(
      `SELECT id, latitude, longitude, name, type 
       FROM support_networks 
       WHERE institution_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL`
    )
    .all(institutionId) as any[];

  const risks = db
    .prepare(
      `SELECT id, latitude, longitude, title, risk_type, severity 
       FROM community_risks 
       WHERE institution_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL`
    )
    .all(institutionId) as any[];

  const points = [
    ...visits.map((v) => ({
      id: v.id,
      lat: v.latitude,
      lng: v.longitude,
      type: "visit" as const,
      title: `Visita: ${v.full_name}`,
      description: v.address,
      color: "blue",
    })),
    ...networks.map((n) => ({
      id: n.id,
      lat: n.latitude,
      lng: n.longitude,
      type: "network" as const,
      title: `Red: ${n.name}`,
      description: `Tipo: ${n.type}`,
      color: "green",
    })),
    ...risks.map((r) => ({
      id: r.id,
      lat: r.latitude,
      lng: r.longitude,
      type: "risk" as const,
      title: `Riesgo: ${r.title}`,
      description: `Tipo: ${r.risk_type} - Severidad: ${r.severity}`,
      color: r.severity === "ALTA" ? "red" : r.severity === "MEDIA" ? "orange" : "yellow",
    })),
  ];

  // Default to somewhere around Quito if no points, or average of points if exists
  let center: [number, number] = [-0.180653, -78.467834];
  if (points.length > 0) {
    const avgLat = points.reduce((acc, p) => acc + p.lat, 0) / points.length;
    const avgLng = points.reduce((acc, p) => acc + p.lng, 0) / points.length;
    center = [avgLat, avgLng];
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Mapa Extramural"
        description="Visualización geográfica de visitas domiciliarias, redes de apoyo y riesgos comunitarios."
      />
      <div className="mt-4 flex-1 min-h-[600px]">
        <ExtramuralMap points={points} center={center} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm max-w-2xl">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span>Visitas Domiciliarias ({visits.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span>Redes de Apoyo ({networks.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span>Riesgos Comunitarios ({risks.length})</span>
        </div>
      </div>
    </div>
  );
}
