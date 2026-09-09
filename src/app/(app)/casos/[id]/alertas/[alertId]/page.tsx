import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import type { CaseFileRow, StudentRow, CaseAlertNotificationRow, UserRow } from "@/lib/types";
import { formatDate, formatDateTime } from "@/components/ui";
import AlertNotificationViewerClient from "./AlertNotificationViewerClient";

export default async function VerAlertaPage({
  params,
}: {
  params: { id: string; alertId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const alert = db
    .prepare("SELECT * FROM case_alert_notifications WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.alertId, caseFile.id, institutionId) as CaseAlertNotificationRow | undefined;
  if (!alert) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow | undefined;

  let createdByName = "Personal DECE";
  if (alert.created_by) {
    const u = db.prepare("SELECT name FROM users WHERE id = ?").get(alert.created_by) as UserRow | undefined;
    if (u) createdByName = u.name;
  }

  const previewBaseUrl = `/api/casos/${caseFile.id}/alertas/${alert.id}/preview`;
  const wordUrl = `/api/casos/${caseFile.id}/alertas/${alert.id}/export-word`;
  const pdfUrl = `/api/casos/${caseFile.id}/alertas/${alert.id}/export-pdf`;
  const editUrl = `/casos/${caseFile.id}/alertas/${alert.id}/editar`;
  const printUrl = `/casos/${caseFile.id}/alertas/${alert.id}/imprimir`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Migas de pan */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href={`/casos/${caseFile.id}`} className="hover:text-brand-700 flex items-center gap-1">
          ← Expediente #{caseFile.code}
        </Link>
        <span>/</span>
        <span className="text-slate-700">Ficha de Notificación de Alerta</span>
      </div>

      {/* Visor interactivo y botonera oficial */}
      <AlertNotificationViewerClient
        caseId={caseFile.id}
        alertId={alert.id}
        previewBaseUrl={previewBaseUrl}
        pdfUrl={pdfUrl}
        wordUrl={wordUrl}
        editUrl={editUrl}
        printUrl={printUrl}
        studentName={student?.full_name || alert.student_name}
      />

      {/* Tarjeta de Trazabilidad y Metadatos Institucionales */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div>
            <strong>Notificado por:</strong> {alert.notificador_nombre} ({alert.notificador_cargo})
            {alert.notificador_contacto && ` · Telf: ${alert.notificador_contacto}`}
          </div>
          <div>
            <strong>Fecha de entrega al DECE:</strong> {alert.fecha_entrega_dece}
          </div>
        </div>
        <div className="text-slate-400 sm:text-right space-y-0.5">
          <div>Registrado por: {createdByName}</div>
          <div>Fecha registro: {formatDateTime(alert.created_at)}</div>
        </div>
      </div>
    </div>
  );
}
