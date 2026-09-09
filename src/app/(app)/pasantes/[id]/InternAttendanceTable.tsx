"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  manualRecordAttendanceAction,
  updateAttendanceAction,
  deleteAttendanceAction,
} from "@/app/pasantes/actions";
import type { InternAttendanceRow } from "@/lib/types";

interface Props {
  internId: string;
  internName: string;
  attendances: InternAttendanceRow[];
}

export default function InternAttendanceTable({
  internId,
  internName,
  attendances,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estado para modal de Nuevo Registro Manual
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [manualCheckIn, setManualCheckIn] = useState("08:00");
  const [manualCheckOut, setManualCheckOut] = useState("12:00");
  const [manualNotes, setManualNotes] = useState("");

  // Estado para modal de Edición de Horario / Asistencia
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] =
    useState<InternAttendanceRow | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Abrir modal de edición
  const handleOpenEdit = (att: InternAttendanceRow) => {
    setEditingAttendance(att);
    setEditDate(att.date);
    setEditCheckIn(att.check_in_time);
    setEditCheckOut(att.check_out_time || "");
    setEditNotes(att.activity_notes || "");
    setErrorMessage(null);
    setEditModalOpen(true);
  };

  // Guardar nuevo registro manual
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate || !manualCheckIn) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await manualRecordAttendanceAction({
        internId,
        date: manualDate,
        checkInTime: manualCheckIn,
        checkOutTime: manualCheckOut || undefined,
        activityNotes: manualNotes || "Registro manual por tutor DECE",
      });

      if (res.success) {
        setAddModalOpen(false);
        setManualNotes("");
        router.refresh();
      } else {
        setErrorMessage(res.error || "Error al registrar asistencia manual.");
      }
    });
  };

  // Guardar edición de horario
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance || !editDate || !editCheckIn) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await updateAttendanceAction({
        attendanceId: editingAttendance.id,
        internId,
        date: editDate,
        checkInTime: editCheckIn,
        checkOutTime: editCheckOut || undefined,
        activityNotes: editNotes || undefined,
      });

      if (res.success) {
        setEditModalOpen(false);
        setEditingAttendance(null);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Error al actualizar asistencia.");
      }
    });
  };

  // Eliminar asistencia
  const handleDelete = (attId: string) => {
    if (
      confirm(
        "¿Estás seguro de eliminar este registro de asistencia? Las horas acumuladas se recalcularán automáticamente."
      )
    ) {
      startTransition(async () => {
        await deleteAttendanceAction(attId, internId);
        router.refresh();
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* CABECERA */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>📅</span> Historial de Asistencias ({attendances.length}{" "}
            registros)
          </h2>
          <p className="text-[11px] text-slate-500">
            Control de asistencia presencial, geolocalización GPS capturada y horas cumplidas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setAddModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>➕</span> Registrar Asistencia Manual
          </button>

          <Link
            href={`/pasantes/${internId}/imprimir-hoja`}
            target="_blank"
            className="px-3 py-1.5 text-xs bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>🖨️</span> Imprimir Registro Oficial
          </Link>
        </div>
      </div>

      {/* MENSAJE DE ERROR GLOBAL */}
      {errorMessage && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* TABLA */}
      {attendances.length === 0 ? (
        <div className="p-10 text-center text-slate-400 text-xs">
          Este pasante aún no cuenta con registros de asistencia. Pulsa &quot;Registrar Asistencia Manual&quot; o pídele que escanee el código QR institucional.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3 text-center">Hora Entrada</th>
                <th className="p-3 text-center">Hora Salida</th>
                <th className="p-3 text-center">Horas Jornada</th>
                <th className="p-3">📍 Geolocalización GPS</th>
                <th className="p-3">Actividades Desarrolladas</th>
                <th className="p-3 text-center">Medio</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {attendances.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                    {att.date}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-slate-800">
                    {att.check_in_time}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-slate-800">
                    {att.check_out_time || (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-sans text-[11px] font-bold">
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

                  {/* GEOLOCALIZACIÓN GPS */}
                  <td className="p-3">
                    {att.distance_meters != null ? (
                      <div className="flex flex-col gap-1 min-w-[130px]">
                        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          A {att.distance_meters}m del DECE
                        </span>
                        {att.latitude != null && att.longitude != null && (
                          <div className="flex items-center gap-2 text-[10px]">
                            <a
                              href={`https://www.google.com/maps?q=${att.latitude},${att.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-700 hover:text-brand-900 underline font-semibold flex items-center gap-1"
                              title={`Coordenadas satelitales: ${att.latitude}, ${att.longitude}`}
                            >
                              🗺️ Ver en Google Maps
                            </a>
                          </div>
                        )}
                      </div>
                    ) : att.registered_via === "MANUAL_DECE" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                        ✏️ Registro Manual
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Sin GPS</span>
                    )}
                  </td>

                  <td className="p-3 text-slate-600 max-w-xs">
                    {att.activity_notes || (
                      <span className="text-slate-300 italic">Sin observaciones</span>
                    )}
                  </td>

                  <td className="p-3 text-center text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    {att.registered_via === "QR_MOBILE" ||
                    att.registered_via === "QR_MOBILE_BOUND" ? (
                      <span className="text-indigo-600 font-bold flex items-center justify-center gap-1">
                        <span>📱</span> QR Celular
                      </span>
                    ) : (
                      <span className="text-slate-500">✏️ Manual DECE</span>
                    )}
                  </td>

                  <td className="p-3 text-center whitespace-nowrap">
                    {att.status === "COMPLETADO" ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                        CUMPLIDO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                        EN CURSO
                      </span>
                    )}
                  </td>

                  {/* BOTONES DE ACCIÓN: EDITAR HORARIO Y ELIMINAR */}
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(att)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] transition-colors"
                        title="Editar Horario o Asistencia"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(att.id)}
                        className="px-1.5 py-1 text-red-500 hover:text-red-700 font-bold text-xs"
                        title="Eliminar registro"
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

      {/* ===================================================================== */}
      {/* MODAL: REGISTRAR ASISTENCIA MANUAL                                   */}
      {/* ===================================================================== */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">
                  Registrar Asistencia Manual
                </h3>
                <p className="text-xs text-slate-500">{internName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha de Asistencia *
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hora Entrada (HH:MM) *
                  </label>
                  <input
                    type="time"
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hora Salida (Opcional)
                  </label>
                  <input
                    type="time"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Actividades / Funciones desempeñadas
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ej. Apoyo en archivo de expedientes y acompañamiento a talleres..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Guardar Asistencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDITAR HORARIO DE ASISTENCIA EXISTENTE                        */}
      {/* ===================================================================== */}
      {editModalOpen && editingAttendance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">
                  ✏️ Editar Horario de Asistencia
                </h3>
                <p className="text-xs text-slate-500">
                  Ajusta manualmente la hora de entrada o salida para corregir el registro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hora Entrada (HH:MM) *
                  </label>
                  <input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hora Salida (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Actividades / Observaciones
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? "Actualizando..." : "Actualizar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
