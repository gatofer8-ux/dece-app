import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import {
  getInternById,
  getInternAttendances,
  generateQrDataUrl,
} from "@/lib/pasantes";
import type { InstitutionRow } from "@/lib/types";
import DeleteInternButton from "./DeleteInternButton";
import DeviceSecurityButtons from "./DeviceSecurityButtons";
import InternAttendanceTable from "./InternAttendanceTable";

export default async function InternDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    redirect("/login");
  }

  const institutionId = session.user.institution_id;
  const intern = getInternById(params.id, institutionId);
  if (!intern) {
    notFound();
  }

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const attendances = getInternAttendances(intern.id, institutionId);

  const hostUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://dece-app-production.up.railway.app";

  const personalQrUrl = await generateQrDataUrl(
    `${hostUrl}/pasantes/marcar?token=${intern.qr_token}`
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/pasantes"
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              ← Volver al listado
            </Link>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-extrabold text-slate-900">
              {intern.full_name}
            </h1>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                intern.status === "ACTIVO"
                  ? "bg-emerald-100 text-emerald-800"
                  : intern.status === "CULMINADO"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {intern.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {intern.type} · {intern.university_or_origin}
            {intern.career_or_specialty ? ` · ${intern.career_or_specialty}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/pasantes/${intern.id}/imprimir-hoja`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors shadow-xs"
          >
            <span>📄</span> Certificado / Hoja de Horas
          </Link>
          <Link
            href={`/pasantes/${intern.id}/editar`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors shadow-xs"
          >
            <span>✏️</span> Editar Datos
          </Link>
          <DeleteInternButton internId={intern.id} internName={intern.full_name} />
        </div>
      </div>

      {/* FILA DE 2 COLUMNAS: CREDENCIAL QR Y RESUMEN DE PROGRESO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COLUMNA 1: CREDENCIAL QR PERSONAL */}
        <div
          id="credencial"
          className="bg-gradient-to-b from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

          <div className="text-[10px] font-extrabold tracking-widest text-indigo-300 uppercase mb-1">
            CREDENCIAL DE ACCESO MÓVIL
          </div>
          <div className="text-sm font-bold text-white mb-4">
            {institution?.name || "UNIDAD EDUCATIVA"}
          </div>

          <div className="bg-white p-3.5 rounded-2xl shadow-lg inline-block">
            {personalQrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={personalQrUrl}
                alt={`QR ${intern.full_name}`}
                className="w-44 h-44 rounded-xl"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                Generando QR...
              </div>
            )}
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-black text-white">{intern.full_name}</h3>
            <p className="text-xs text-indigo-200 font-mono">C.I.: {intern.document_id}</p>
            <p className="text-[11px] text-slate-300 mt-1">
              Escanea desde la cámara de tu celular para registrar Entrada y Salida
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 w-full text-[10px] text-slate-400 flex flex-col gap-1">
            <span className="text-white font-medium">
              ⏰ Horario: <span className="text-indigo-200">{intern.schedule_details || intern.schedule_type || "Matutina"}</span>
            </span>
            <span>Tutor: {intern.tutor_name || "Equipo DECE"}</span>
          </div>
        </div>

        {/* COLUMNA 2 Y 3: DETALLES, HORAS Y TUTORÍA */}
        <div className="md:col-span-2 space-y-4">
          {/* TARJETA DE HORAS Y AVANCE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Control de Horas de Prácticas
              </h2>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                {intern.progress_percentage}% Completado
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Requeridas
                </div>
                <div className="text-xl font-black text-slate-800 mt-0.5">
                  {intern.required_hours} hrs
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">
                  Cumplidas
                </div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">
                  {intern.completed_hours} hrs
                </div>
              </div>

              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <div className="text-[10px] font-bold text-indigo-700 uppercase">
                  Restantes
                </div>
                <div className="text-xl font-black text-indigo-900 mt-0.5">
                  {Math.max(0, Math.round((intern.required_hours - intern.completed_hours) * 10) / 10)} hrs
                </div>
              </div>
            </div>

            {/* Barra de progreso */}
            <div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, intern.progress_percentage)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs border-t border-slate-100 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px]">Fecha Inicio:</span>
                <span className="font-semibold text-slate-800">{intern.start_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Fecha Fin:</span>
                <span className="font-semibold text-slate-800">{intern.end_date || "En curso"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Días Asistidos:</span>
                <span className="font-semibold text-slate-800">{attendances.length} días</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tutor Asignado:</span>
                <span className="font-semibold text-slate-800">{intern.tutor_name || "Sin tutor"}</span>
              </div>
            </div>
          </div>

          {/* DATOS DE CONTACTO Y NOTAS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Información de Contacto y Observaciones
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 pt-1">
              <div>
                <span className="text-slate-400 text-[11px]">Celular: </span>
                <span className="font-medium font-mono">{intern.phone || "No registrado"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Email: </span>
                <span className="font-medium">{intern.email || "No registrado"}</span>
              </div>
            </div>
            {intern.notes && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                <span className="font-bold text-slate-700 block mb-0.5">Funciones / Notas:</span>
                {intern.notes}
              </div>
            )}
          </div>

          {/* DISPOSITIVO MÓVIL AUTORIZADO (ANTI-SUPLANTACIÓN) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛡️</span> Dispositivo Móvil Autorizado (Anti-Suplantación)
              </h3>
              {intern.device_id ? (
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                  Celular Vinculado
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                  Sin vincular
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              {intern.device_id ? (
                <>
                  <p>
                    <span className="font-semibold text-slate-800">Modelo Registrado:</span> {intern.device_name || "Dispositivo Móvil"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Fecha de vinculación:</span> {intern.device_linked_at || "Registrado"}
                  </p>
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 leading-relaxed">
                    ✓ <strong>Seguridad activa:</strong> Solo este teléfono celular tiene autorización para registrar asistencias para {intern.full_name}. Todo intento desde otro celular es bloqueado automáticamente.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  El pasante aún no ha vinculado su teléfono celular. Al escanear por primera vez el código QR del DECE, su celular quedará registrado como su dispositivo exclusivo con un PIN de 4 dígitos.
                </p>
              )}
            </div>

            <DeviceSecurityButtons
              internId={intern.id}
              internName={intern.full_name}
              hasDevice={Boolean(intern.device_id)}
              hasPin={Boolean(intern.pin_code)}
            />
          </div>
        </div>
      </div>

      {/* TABLA DE HISTORIAL DE ASISTENCIAS (CON GPS Y EDICIÓN MANUAL) */}
      <InternAttendanceTable
        internId={intern.id}
        internName={intern.full_name}
        attendances={attendances}
      />
    </div>
  );
}
