import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getInternById, getInternAttendances } from "@/lib/pasantes";
import type { InstitutionRow } from "@/lib/types";
import PrintButton from "@/components/PrintButton";

export default async function PrintInternSheetPage({
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

  const totalMinutes = attendances.reduce(
    (acc, cur) => acc + (cur.total_minutes || 0),
    0
  );
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-4 sm:p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
      {/* BARRA DE ACCIONES WEB */}
      <div className="no-print mb-6 p-4 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
        <Link
          href={`/pasantes/${intern.id}`}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          ← Volver al Pasante
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {/* MEMBRETE OFICIAL */}
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
        {institution?.seal_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={institution.seal_image}
            alt="Membrete institucional"
            className="h-16 mx-auto mb-2 object-contain"
          />
        )}
        <h1 className="text-base font-extrabold uppercase tracking-wide">
          {institution?.name || "UNIDAD EDUCATIVA"}
        </h1>
        <p className="text-xs font-semibold text-slate-700 uppercase">
          DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)
        </p>
        {institution?.district && (
          <p className="text-[11px] text-slate-600">
            Distrito Educativo: {institution.district}
          </p>
        )}
      </div>

      {/* TÍTULO DEL DOCUMENTO */}
      <div className="text-center my-4">
        <h2 className="text-sm font-black uppercase tracking-wider underline">
          REGISTRO Y CERTIFICACIÓN OFICIAL DE ASISTENCIA Y HORAS CUMPLIDAS
        </h2>
        <p className="text-xs font-semibold text-slate-600 mt-0.5 uppercase">
          PRÁCTICAS PREPROFESIONALES / VINCULACIÓN CON LA COMUNIDAD / VOLUNTARIADO
        </p>
      </div>

      {/* DATOS DEL PASANTE */}
      <div className="border border-slate-300 rounded-lg p-3 text-xs mb-4 grid grid-cols-2 gap-2 bg-slate-50/50">
        <div>
          <span className="font-bold text-slate-700">Nombres y Apellidos: </span>
          <span className="font-semibold text-slate-900">{intern.full_name}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Cédula de Identidad: </span>
          <span className="font-mono text-slate-900">{intern.document_id}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Institución de Origen: </span>
          <span className="text-slate-900">{intern.university_or_origin}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Carrera / Especialidad: </span>
          <span className="text-slate-900">
            {intern.career_or_specialty || "No especificada"}
          </span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Tutor DECE Asignado: </span>
          <span className="text-slate-900">
            {intern.tutor_name || "Equipo DECE"}
          </span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Jornada / Horario: </span>
          <span className="text-slate-900 font-semibold">{intern.schedule_details || intern.schedule_type || "Matutina"}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Período de Prácticas: </span>
          <span className="text-slate-900">
            Desde {intern.start_date} hasta {intern.end_date || "Presente"}
          </span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Total Horas Requeridas: </span>
          <span className="font-bold text-slate-900">
            {intern.required_hours} Horas
          </span>
        </div>
      </div>

      {/* TABLA DE ASISTENCIAS DÍA A DÍA */}
      <div className="mb-4">
        <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
          <thead className="bg-slate-100 font-bold uppercase text-slate-800">
            <tr>
              <th className="border border-slate-300 p-1.5 text-center w-8">N°</th>
              <th className="border border-slate-300 p-1.5 text-center w-24">Fecha</th>
              <th className="border border-slate-300 p-1.5 text-center w-20">Entrada</th>
              <th className="border border-slate-300 p-1.5 text-center w-20">Salida</th>
              <th className="border border-slate-300 p-1.5 text-center w-16">Horas</th>
              <th className="border border-slate-300 p-1.5">Actividades Desarrolladas</th>
              <th className="border border-slate-300 p-1.5 text-center w-16">Firma</th>
            </tr>
          </thead>
          <tbody>
            {attendances.map((att, idx) => (
              <tr key={att.id}>
                <td className="border border-slate-300 p-1 text-center font-bold">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 p-1 text-center font-medium">
                  {att.date}
                </td>
                <td className="border border-slate-300 p-1 text-center font-mono font-semibold">
                  {att.check_in_time}
                </td>
                <td className="border border-slate-300 p-1 text-center font-mono font-semibold">
                  {att.check_out_time || "--:--"}
                </td>
                <td className="border border-slate-300 p-1 text-center font-bold">
                  {att.total_hours ? `${att.total_hours}h` : "--"}
                </td>
                <td className="border border-slate-300 p-1 text-slate-700">
                  {att.activity_notes || "Cumplimiento de actividades asignadas en DECE"}
                </td>
                <td className="border border-slate-300 p-1 text-center text-slate-300 font-mono text-[9px]">
                  {att.registered_via === "QR_MOBILE" ? "✓ QR" : "✓"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-900">
              <td colSpan={4} className="border border-slate-300 p-2 text-right uppercase">
                Total de Horas Cumplidas y Certificadas:
              </td>
              <td className="border border-slate-300 p-2 text-center text-xs font-black">
                {totalHours} hrs
              </td>
              <td colSpan={2} className="border border-slate-300 p-2 text-xs">
                Equivalente a {Math.floor(totalMinutes / 60)} horas con {totalMinutes % 60} minutos
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* RESUMEN Y CERTIFICACIÓN */}
      <div className="text-xs leading-relaxed text-justify text-slate-800 mb-8">
        <p>
          El Departamento de Consejería Estudiantil (DECE) de la{" "}
          <span className="font-bold">{institution?.name || "UNIDAD EDUCATIVA"}</span>{" "}
          certifica que el/la señor(a){" "}
          <span className="font-bold uppercase">{intern.full_name}</span>, con cédula de
          identidad N° <span className="font-bold">{intern.document_id}</span>, perteneciente
          a la <span className="font-bold">{intern.university_or_origin}</span>, ha cumplido
          satisfactoriamente un total de{" "}
          <span className="font-bold underline">{totalHours} horas cronológicas</span> de
          asistencia presencial, participando activamente en las tareas encomendadas bajo el
          Modelo de Gestión DECE.
        </p>
      </div>

      {/* BLOQUE DE FIRMAS DE RESPONSABILIDAD */}
      <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs break-inside-avoid">
        <div>
          <div className="border-t border-slate-800 pt-2 font-bold uppercase">
            {intern.full_name}
          </div>
          <div className="text-[11px] text-slate-600">
            {intern.type} / Practicante
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            C.I. {intern.document_id}
          </div>
        </div>

        <div>
          <div className="border-t border-slate-800 pt-2 font-bold uppercase">
            {intern.tutor_name || "Tutor Institucional DECE"}
          </div>
          <div className="text-[11px] text-slate-600">
            Tutor/a DECE Responsable
          </div>
          <div className="text-[10px] text-slate-500">
            {institution?.name || "Unidad Educativa"}
          </div>
        </div>

        <div>
          <div className="border-t border-slate-800 pt-2 font-bold uppercase">
            Coordinación DECE / Rectorado
          </div>
          <div className="text-[11px] text-slate-600">
            Visto Bueno Institucional
          </div>
          <div className="text-[10px] text-slate-500">
            Sello Oficial
          </div>
        </div>
      </div>
    </div>
  );
}
