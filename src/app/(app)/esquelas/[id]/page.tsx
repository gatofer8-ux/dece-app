import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { getEsquelaById } from "@/lib/esquelas";
import { db } from "@/lib/db";
import { PageHeader, Badge, formatDate } from "@/components/ui";
import TalonStatusForm from "./TalonStatusForm";
import DeleteEsquelaButton from "./DeleteEsquelaButton";
import WhatsAppNotificationButton from "@/components/WhatsAppNotificationButton";

export default async function EsquelaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const esquela = getEsquelaById(params.id, institutionId);
  if (!esquela) notFound();

  const student = db
    .prepare("SELECT rep_phone FROM students WHERE id = ?")
    .get(esquela.student_id) as { rep_phone?: string } | undefined;

  const institution = db
    .prepare("SELECT name FROM institutions WHERE id = ?")
    .get(institutionId) as { name?: string } | undefined;

  const attendedBadge = () => {
    switch (esquela.talon_attended) {
      case 1:
        return <Badge color="green">✅ Asistió</Badge>;
      case 2:
        return <Badge color="amber">⚠️ Justificó</Badge>;
      case 3:
        return <Badge color="rose">❌ No asistió</Badge>;
      default:
        return <Badge color="slate">⏳ Cita pendiente</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={esquela.case_file_id ? `/casos/${esquela.case_file_id}` : "/esquelas"}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            ← {esquela.case_file_id ? "Volver al caso" : "Volver a esquelas"}
          </Link>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {esquela.citation_number}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppNotificationButton
            phoneNumber={esquela.representative_phone || student?.rep_phone}
            recipientName={esquela.representative_name}
            studentName={esquela.student_name}
            citationNumber={esquela.citation_number}
            date={formatDate(esquela.citation_date)}
            time={esquela.citation_time}
            reason={esquela.citation_reason}
            institutionName={institution?.name}
          />

          <Link
            href={`/esquelas/${esquela.id}/editar`}
            className="btn-secondary text-xs flex items-center gap-1 font-medium"
          >
            ✏️ Editar
          </Link>

          <Link
            href={`/esquelas/${esquela.id}/imprimir`}
            className="btn-primary text-xs flex items-center gap-1.5 font-semibold bg-brand-700 hover:bg-brand-800"
          >
            <span>🖨️</span> Imprimir Convocatoria y Talón
          </Link>

          <DeleteEsquelaButton
            id={esquela.id}
            caseFileId={esquela.case_file_id}
            citationNumber={esquela.citation_number}
          />
        </div>
      </div>

      <PageHeader
        title={esquela.citation_number}
        description={`Convocatoria a ${esquela.representative_name} por el estudiante ${esquela.student_name}.`}
        action={
          <div className="flex items-center gap-2">
            {esquela.urgency_level === "URGENTE" && (
              <Badge color="rose">⚠️ Urgente</Badge>
            )}
            {esquela.talon_returned ? (
              <Badge color="green">Talón devuelto</Badge>
            ) : (
              <Badge color="amber">Talón pendiente</Badge>
            )}
            {attendedBadge()}
          </div>
        }
      />

      {/* Resumen de la Citación */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
          <span>Detalles de la Convocatoria</span>
          <span className="text-xs font-normal text-slate-500">
            Emitida el {formatDate(esquela.created_at)}
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-semibold">Estudiante</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{esquela.student_name}</div>
            <div className="text-slate-500 font-mono">
              {esquela.student_id_number || "Sin cédula"}
            </div>
            <div className="text-slate-600 font-medium">
              {esquela.course} {esquela.parallel ? `"${esquela.parallel}"` : ""} · {esquela.jornada || "Matutina"}
            </div>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold">Representante Legal</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{esquela.representative_name}</div>
            <div className="text-slate-500 font-mono">
              {esquela.representative_id_number ? `CI: ${esquela.representative_id_number}` : ""}
            </div>
            <div className="text-slate-600 font-medium">
              📞 {esquela.representative_phone || "Sin teléfono registrado"}
            </div>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-semibold">Cita Programada</span>
            <div className="font-bold text-brand-900 text-sm mt-0.5">
              📅 {formatDate(esquela.citation_date)}
            </div>
            <div className="font-bold text-brand-700 text-sm">
              ⏰ {esquela.citation_time}
            </div>
            <div className="text-slate-600">
              📍 {esquela.citation_place || "Oficina del DECE"}
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <span className="font-bold text-slate-700 uppercase">Motivo de la Convocatoria:</span>
          <p className="mt-1 text-slate-800 whitespace-pre-wrap font-medium leading-relaxed">
            {esquela.citation_reason}
          </p>
        </div>

        {esquela.observations && (
          <div className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded border border-amber-200">
            <span className="font-semibold text-amber-900">Observaciones adicionales: </span>
            {esquela.observations}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex flex-wrap justify-between text-xs text-slate-500">
          <div>
            Profesional convocante: <span className="font-semibold text-slate-700">{esquela.professional_name}</span> ({esquela.professional_role})
          </div>
          <div>
            Año lectivo: <span className="font-semibold text-slate-700">{esquela.school_year_code}</span>
          </div>
        </div>
      </div>

      {/* Formulario Interactivo de Talón y Asistencia */}
      <TalonStatusForm esquela={esquela} />
    </div>
  );
}
