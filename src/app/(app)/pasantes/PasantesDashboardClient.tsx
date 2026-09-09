"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteInternAction,
  manualRecordAttendanceAction,
  deleteAttendanceAction,
  saveGeofenceSettingsAction,
  regenerateDailyCodeAction,
} from "@/app/pasantes/actions";
import type {
  InternWithStats,
  InternAttendanceRow,
  InternStatus,
  InternType,
} from "@/lib/types";

interface Props {
  interns: InternWithStats[];
  todayAttendances: (InternAttendanceRow & {
    intern_name: string;
    intern_type: InternType;
    university: string;
    career: string | null;
  })[];
  institutionId: string;
  institutionName: string;
  institutionDistrict?: string;
  institutionLat?: number | null;
  institutionLon?: number | null;
  institutionRadius?: number;
  institutionRequireGeo?: number;
  dailyAttendanceCode?: string;
  generalQrUrl: string;
  hostUrl: string;
  deceUsers: { id: string; name: string; role: string }[];
}

export default function PasantesDashboardClient({
  interns,
  todayAttendances,
  institutionId,
  institutionName,
  institutionDistrict,
  institutionLat,
  institutionLon,
  institutionRadius = 250,
  institutionRequireGeo = 1,
  dailyAttendanceCode = "",
  generalQrUrl,
  hostUrl,
  deceUsers,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "HOY" | "DIRECTORIO" | "CARTEL_QR" | "HISTORIAL"
  >("HOY");

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [typeFilter, setTypeFilter] = useState<string>("TODOS");

  // Modal de registro manual de asistencia
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualInternId, setManualInternId] = useState("");
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [manualCheckIn, setManualCheckIn] = useState("08:00");
  const [manualCheckOut, setManualCheckOut] = useState("12:00");
  const [manualNotes, setManualNotes] = useState("");

  const [isPending, startTransition] = useTransition();

  // Configuración de Geofencing y Seguridad Presencial
  const [geoLat, setGeoLat] = useState<string>(
    institutionLat != null ? String(institutionLat) : ""
  );
  const [geoLon, setGeoLon] = useState<string>(
    institutionLon != null ? String(institutionLon) : ""
  );
  const [geoRadius, setGeoRadius] = useState<number>(institutionRadius || 250);
  const [requireGeo, setRequireGeo] = useState<boolean>(
    institutionRequireGeo === 1 || institutionRequireGeo == null
  );
  const [currentDailyCode, setCurrentDailyCode] = useState<string>(
    dailyAttendanceCode || ""
  );
  const [geoFeedback, setGeoFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);
  const [savingGeo, setSavingGeo] = useState<boolean>(false);
  const [regeneratingCode, setRegeneratingCode] = useState<boolean>(false);

  // Capturar coordenadas actuales del navegador del DECE con 1 clic
  const handleDetectCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoFeedback({
        type: "error",
        message: "Tu navegador no soporta geolocalización GPS.",
      });
      return;
    }

    setDetectingGps(true);
    setGeoFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        setGeoLat(lat);
        setGeoLon(lon);
        setDetectingGps(false);
        setGeoFeedback({
          type: "success",
          message: `📍 Ubicación detectada (${lat}, ${lon}). Pulsa "Guardar Parámetros de Seguridad" para aplicar.`,
        });
      },
      (err) => {
        console.warn("GPS error:", err);
        setDetectingGps(false);
        setGeoFeedback({
          type: "error",
          message:
            "No se pudo obtener la ubicación. Asegúrate de dar permisos de GPS al navegador.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  // Guardar configuración de geofencing
  const handleSaveGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeoFeedback(null);
    setSavingGeo(true);

    const latNum = geoLat.trim() ? Number(geoLat.trim()) : null;
    const lonNum = geoLon.trim() ? Number(geoLon.trim()) : null;

    if (latNum !== null && isNaN(latNum)) {
      setGeoFeedback({ type: "error", message: "Latitud inválida." });
      setSavingGeo(false);
      return;
    }
    if (lonNum !== null && isNaN(lonNum)) {
      setGeoFeedback({ type: "error", message: "Longitud inválida." });
      setSavingGeo(false);
      return;
    }

    const res = await saveGeofenceSettingsAction({
      latitude: latNum,
      longitude: lonNum,
      radiusMeters: geoRadius,
      requireGeo,
      dailyCode: currentDailyCode,
    });

    setSavingGeo(false);
    if (res.success) {
      setGeoFeedback({
        type: "success",
        message: "✅ ¡Parámetros de seguridad presencial y geofencing guardados exitosamente!",
      });
      router.refresh();
    } else {
      setGeoFeedback({
        type: "error",
        message: res.error || "Error al guardar configuración.",
      });
    }
  };

  // Regenerar código rotativo diario
  const handleRegenerateDailyCode = async () => {
    setRegeneratingCode(true);
    setGeoFeedback(null);
    const res = await regenerateDailyCodeAction();
    setRegeneratingCode(false);
    if (res.success && res.code) {
      setCurrentDailyCode(res.code);
      setGeoFeedback({
        type: "success",
        message: `🔄 Nuevo código diario generado: #${res.code}`,
      });
      router.refresh();
    } else {
      setGeoFeedback({
        type: "error",
        message: res.error || "Error al regenerar código.",
      });
    }
  };

  // Estadísticas del día
  const activeNowCount = todayAttendances.filter((a) => a.status === "EN_CURSO").length;
  const completedTodayCount = todayAttendances.filter(
    (a) => a.status === "COMPLETADO"
  ).length;

  // Filtrado de pasantes
  const filteredInterns = interns.filter((i) => {
    const matchesSearch =
      i.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.document_id.includes(searchTerm) ||
      i.university_or_origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.career_or_specialty &&
        i.career_or_specialty.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "TODOS" || i.status === statusFilter;
    const matchesType = typeFilter === "TODOS" || i.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Guardar asistencia manual
  const handleSaveManualAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInternId || !manualDate || !manualCheckIn) return;

    startTransition(async () => {
      const res = await manualRecordAttendanceAction({
        internId: manualInternId,
        date: manualDate,
        checkInTime: manualCheckIn + ":00",
        checkOutTime: manualCheckOut ? manualCheckOut + ":00" : undefined,
        activityNotes: manualNotes,
      });

      if (res.success) {
        setManualModalOpen(false);
        setManualNotes("");
        router.refresh();
      } else {
        alert(res.error || "Error al registrar asistencia.");
      }
    });
  };

  // Eliminar pasante
  const handleDeleteIntern = (id: string, name: string) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar a ${name}? Se borrarán también todas sus asistencias registradas.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteInternAction(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "No se pudo eliminar.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ENCABEZADO PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤝</span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Pasantes y Voluntarios DECE
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de asistencia mediante código QR, registro de horas y seguimiento institucional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/pasantes/cartel-qr/imprimir"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors shadow-xs"
          >
            <span>📱</span> Imprimir Cartel QR DECE
          </Link>
          <button
            type="button"
            onClick={() => {
              setManualInternId(interns[0]?.id || "");
              setManualModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors shadow-xs"
          >
            <span>✏️</span> Marcaje Manual
          </button>
          <Link
            href="/pasantes/nuevo"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <span>+</span> Nuevo Pasante / Voluntario
          </Link>
        </div>
      </div>

      {/* TARJETAS RESUMEN DE HOY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pasantes Activos
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {interns.filter((i) => i.status === "ACTIVO").length}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
            👥
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              En la Institución Hoy
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-2">
              {activeNowCount}
              {activeNowCount > 0 && (
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            🟢
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Jornadas Concluidas Hoy
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {completedTodayCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold">
            🏁
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Horas Registradas
            </div>
            <div className="text-2xl font-black text-indigo-900 mt-1">
              {interns.reduce((acc, i) => acc + (i.completed_hours || 0), 0)} hrs
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
            ⏱️
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab("HOY")}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "HOY"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>🟢</span>
          <span>En Vivo Hoy ({todayAttendances.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("DIRECTORIO")}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "DIRECTORIO"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>📋</span>
          <span>Directorio de Pasantes ({interns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CARTEL_QR")}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "CARTEL_QR"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>📱</span>
          <span>Punto de Marcaje QR</span>
        </button>
      </div>

      {/* CONTENIDO TAB 1: EN VIVO HOY */}
      {activeTab === "HOY" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Asistencias registradas hoy ({todayAttendances.length})
            </h2>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
            >
              🔄 Actualizar
            </button>
          </div>

          {todayAttendances.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-sm font-semibold text-slate-700">
                Aún no se registran entradas el día de hoy.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Los pasantes registrarán su ingreso escaneando el código QR desde su celular.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="p-3">Pasante / Voluntario</th>
                    <th className="p-3">Universidad / Carrera</th>
                    <th className="p-3 text-center">Entrada</th>
                    <th className="p-3 text-center">Salida</th>
                    <th className="p-3 text-center">Tiempo Hoy</th>
                    <th className="p-3">📍 Ubicación GPS</th>
                    <th className="p-3">Actividades / Novedades</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {todayAttendances.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-semibold text-slate-900">
                        <Link
                          href={`/pasantes/${att.intern_id}`}
                          className="hover:text-brand-600 underline"
                        >
                          {att.intern_name}
                        </Link>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {att.intern_type}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">
                        <div>{att.university}</div>
                        {att.career && (
                          <div className="text-[10px] text-slate-400">{att.career}</div>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">
                        {att.check_in_time}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">
                        {att.check_out_time || (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-sans text-[11px]">
                            En curso
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">
                        {att.total_minutes ? (
                          `${Math.floor(att.total_minutes / 60)}h ${
                            att.total_minutes % 60
                          }m`
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>
                      <td className="p-3">
                        {att.distance_meters != null ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              A {att.distance_meters}m del DECE
                            </span>
                            {att.latitude != null && att.longitude != null && (
                              <a
                                href={`https://www.google.com/maps?q=${att.latitude},${att.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-brand-600 hover:text-brand-800 underline font-medium flex items-center gap-0.5"
                                title={`Coordenadas: ${att.latitude}, ${att.longitude}`}
                              >
                                🗺️ Ver en Maps
                              </a>
                            )}
                          </div>
                        ) : att.registered_via === "MANUAL_DECE" ? (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                            ✏️ Manual DECE
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Sin GPS
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        {att.activity_notes || (
                          <span className="text-slate-300 italic">Sin notas</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {att.status === "EN_CURSO" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            PRESENTE
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            COMPLETADO
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("¿Eliminar este registro de asistencia?")) {
                              deleteAttendanceAction(att.id, att.intern_id).then(
                                () => router.refresh()
                              );
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-bold"
                          title="Eliminar asistencia"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO TAB 2: DIRECTORIO DE PASANTES */}
      {activeTab === "DIRECTORIO" && (
        <div className="space-y-4">
          {/* FILTROS Y BÚSQUEDA */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, cédula o universidad..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs p-2 border border-slate-300 rounded-lg text-slate-700"
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="PASANTE">Solo Pasantes</option>
                <option value="VOLUNTARIO">Solo Voluntarios</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs p-2 border border-slate-300 rounded-lg text-slate-700"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="CULMINADO">Culminados</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </div>
          </div>

          {/* LISTADO DE PASANTES */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredInterns.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">
                No se encontraron pasantes o voluntarios con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase">
                    <tr>
                      <th className="p-3">Nombre y Cédula</th>
                      <th className="p-3">Universidad / Carrera</th>
                      <th className="p-3">Tutor DECE Asignado</th>
                      <th className="p-3 text-center">Horas Requeridas</th>
                      <th className="p-3">Progreso de Horas</th>
                      <th className="p-3 text-center">Estado Hoy</th>
                      <th className="p-3 text-center">Celular Vinculado</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredInterns.map((intern) => (
                      <tr key={intern.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-semibold text-slate-900">
                          <Link
                            href={`/pasantes/${intern.id}`}
                            className="text-brand-700 hover:text-brand-900 font-bold"
                          >
                            {intern.full_name}
                          </Link>
                          <div className="text-[11px] text-slate-500 font-normal flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>C.I.: {intern.document_id}</span>
                            <span>·</span>
                            <span className="font-semibold text-indigo-600">
                              {intern.type}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100">
                              ⏰ {intern.schedule_details || intern.schedule_type || "Matutina"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">
                          <div className="font-medium text-slate-800">
                            {intern.university_or_origin}
                          </div>
                          {intern.career_or_specialty && (
                            <div className="text-[11px] text-slate-500">
                              {intern.career_or_specialty}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          {intern.tutor_name || (
                            <span className="text-slate-400 italic">Sin tutor asignado</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {intern.required_hours} hrs
                        </td>
                        <td className="p-3 min-w-[150px]">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                            <span>{intern.completed_hours || 0} hrs</span>
                            <span>{intern.progress_percentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${Math.min(100, intern.progress_percentage)}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {intern.active_today ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              PRESENTE
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Ausente hoy</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {intern.device_id ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px] border border-emerald-200"
                              title={`Vinculado: ${intern.device_name || "Móvil"}`}
                            >
                              <span>📱</span> {intern.device_name || "Vinculado"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 font-medium rounded-full text-[10px] border border-amber-200">
                              <span>⚠️</span> Pendiente
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/pasantes/${intern.id}`}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                              title="Ver ficha"
                            >
                              Ver
                            </Link>
                            <Link
                              href={`/pasantes/${intern.id}/editar`}
                              className="text-slate-600 hover:text-slate-800 font-semibold"
                              title="Editar"
                            >
                              Editar
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteIntern(intern.id, intern.full_name)
                              }
                              className="text-red-500 hover:text-red-700 font-semibold"
                              title="Eliminar"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 3: CARTEL DE MARCAJE QR INSTITUCIONAL Y BLINDAJE ANTIFOTO */}
      {activeTab === "CARTEL_QR" && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* COLUMNA 1: CARTEL QR IMPRESO Y MODO PANTALLA */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 text-2xl mb-1">
                📱
              </div>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                Punto de Marcaje QR del DECE
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Coloca este código QR en la recepción o puerta del DECE. Al escanearlo con su celular, cada pasante registrado marca su entrada y salida.
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
                {generalQrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={generalQrUrl}
                    alt="QR Cartel DECE"
                    className="w-52 h-52 mx-auto rounded-xl shadow-xs"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
                    Generando QR...
                  </div>
                )}
                <div className="text-[11px] font-mono text-slate-600 mt-2 break-all max-w-xs mx-auto">
                  {hostUrl}/pasantes/marcar?inst={institutionId}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                <Link
                  href="/pasantes/cartel-qr/imprimir"
                  target="_blank"
                  className="px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span>🖨️</span> Imprimir Cartel A4
                </Link>
                <Link
                  href={`/pasantes/pantalla-qr?inst=${institutionId}`}
                  target="_blank"
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>🖥️</span> Abrir Modo Pantalla (45s)
                </Link>
              </div>
            </div>

            {/* COLUMNA 2: BLINDAJE PRESENCIAL ANTI-FOTOS (GEOFENCING GPS) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                  🛡️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Blindaje Presencial Anti-Fotos (GPS)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Impide que marquen desde casa o escaneando fotos enviadas por WhatsApp.
                  </p>
                </div>
              </div>

              {/* ESTADO ACTUAL */}
              {geoLat && geoLon ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div>
                      <span className="font-bold">Geofencing Activo: </span>
                      Radio de {geoRadius} metros alrededor del DECE.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                  <span className="text-base shrink-0">⚠️</span>
                  <div>
                    <span className="font-bold">Ubicación no configurada: </span>
                    Establece las coordenadas del DECE para activar la protección anti-fotos por GPS.
                  </div>
                </div>
              )}

              {/* MENSAJE DE FEEDBACK */}
              {geoFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    geoFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {geoFeedback.message}
                </div>
              )}

              {/* BOTÓN 1-CLIC AUTO-DETECCIÓN GPS */}
              <button
                type="button"
                onClick={handleDetectCurrentLocation}
                disabled={detectingGps}
                className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {detectingGps ? (
                  <>
                    <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Detectando coordenadas GPS del DECE...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">📍</span>
                    <span>Establecer Mi Ubicación Actual como Punto DECE</span>
                  </>
                )}
              </button>

              {/* FORMULARIO DE CONFIGURACIÓN GPS */}
              <form onSubmit={handleSaveGeofence} className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Latitud GPS
                    </label>
                    <input
                      type="text"
                      value={geoLat}
                      onChange={(e) => setGeoLat(e.target.value)}
                      placeholder="Ej: -1.248590"
                      className="w-full text-xs p-2.5 font-mono border border-slate-300 rounded-lg text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Longitud GPS
                    </label>
                    <input
                      type="text"
                      value={geoLon}
                      onChange={(e) => setGeoLon(e.target.value)}
                      placeholder="Ej: -78.625340"
                      className="w-full text-xs p-2.5 font-mono border border-slate-300 rounded-lg text-slate-800 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Radio permitido alrededor del DECE
                  </label>
                  <select
                    value={geoRadius}
                    onChange={(e) => setGeoRadius(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
                  >
                    <option value={100}>100 metros (Solo bloque de la oficina DECE)</option>
                    <option value={200}>200 metros (Edificio y patio central)</option>
                    <option value={250}>250 metros (Campus institucional estándar)</option>
                    <option value={350}>350 metros (Campus institucional completo)</option>
                    <option value={500}>500 metros (Área extendida de la institución)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="requireGeoCheck"
                    checked={requireGeo}
                    onChange={(e) => setRequireGeo(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label
                    htmlFor="requireGeoCheck"
                    className="text-xs text-slate-700 font-medium cursor-pointer"
                  >
                    Exigir verificación GPS obligatoria al marcar asistencia
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={savingGeo}
                  className="w-full py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  {savingGeo ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Guardar Parámetros de Seguridad</span>
                    </>
                  )}
                </button>
              </form>

              {/* CÓDIGO ROTATIVO DEL DÍA */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-700">
                    Código de Presencia Diario:
                  </div>
                  <div className="text-xs text-slate-500">
                    Cambia cada día a medianoche
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-900 text-emerald-400 font-mono font-black text-sm rounded-lg border border-slate-800 shadow-inner">
                    #{currentDailyCode || "482"}
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateDailyCode}
                    disabled={regeneratingCode}
                    title="Regenerar código hoy"
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO MANUAL DE ASISTENCIA */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Registro Manual de Asistencia
              </h3>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualAttendance} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pasante / Voluntario *
                </label>
                <select
                  required
                  value={manualInternId}
                  onChange={(e) => setManualInternId(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="">-- Seleccionar Pasante --</option>
                  {interns
                    .filter((i) => i.status === "ACTIVO")
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.full_name} ({i.university_or_origin})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora Entrada *
                  </label>
                  <input
                    type="time"
                    required
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora Salida (Opcional)
                  </label>
                  <input
                    type="time"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Actividades realizadas / Observación:
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ej: Registro justificado por comisión externa o falla en celular..."
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {isPending ? "Guardando..." : "Registrar Asistencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
