import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import type { CaseFileRow, StudentRow, CaseCorresponsibilityActRow } from "@/lib/types";
import PrintButton from "@/components/PrintButton";

export default async function ImprimirActaCorresponsabilidadPage({
  params,
}: {
  params: { id: string; actId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const act = db
    .prepare("SELECT * FROM case_corresponsibility_acts WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.actId, caseFile.id, institutionId) as CaseCorresponsibilityActRow | undefined;
  if (!act) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow | undefined;

  const previewUrl = `/api/casos/${caseFile.id}/corresponsabilidad/${act.id}/preview?t=${encodeURIComponent(act.updated_at || act.created_at)}`;
  const wordUrl = `/api/casos/${caseFile.id}/corresponsabilidad/${act.id}/export-word`;
  const pdfUrl = `/api/casos/${caseFile.id}/corresponsabilidad/${act.id}/export-pdf`;

  return (
    <div className="max-w-4xl mx-auto bg-white my-4 print:my-0 print:max-w-none">
      {/* CSS para impresión profesional A4 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `,
        }}
      />

      {/* Barra de control en pantalla */}
      <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 border-b border-slate-200 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={`/casos/${caseFile.id}/corresponsabilidad/${act.id}`}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            ← Volver a vista oficial
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href={`/casos/${caseFile.id}/corresponsabilidad/${act.id}/editar`}
            className="text-xs font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-1"
          >
            ✏️ Editar Acta
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={wordUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
          >
            📥 Descargar Word (.docx)
          </a>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
          >
            📄 PDF
          </a>
          <PrintButton hideWordButton={true} className="p-0 bg-transparent border-none" />
        </div>
      </div>

      {/* Vista de Impresión Idéntica al Documento Oficial */}
      <div className="p-4 sm:p-6 print:p-0 flex justify-center bg-slate-100 print:bg-white min-h-screen">
        <div className="bg-white shadow-xl print:shadow-none border border-slate-200 print:border-none w-full max-w-[210mm]">
          <img
            src={previewUrl}
            alt="Acta Oficial de Corresponsabilidad"
            className="w-full h-auto block select-none"
          />
        </div>
      </div>
    </div>
  );
}
