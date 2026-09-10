import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate, formatDateTime } from "@/components/ui";
import { CHECKLIST_CATEGORY_LABELS } from "@/lib/types";
import type { CaseFileRow, StudentRow, CaseChecklistItemRow, CaseChecklistReviewRow, InstitutionRow, ChecklistCategory } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

const TITLES: Record<ChecklistCategory, string> = {
  VIOLENCIA_SEXUAL: "Check list expedientes de casos de presuntas víctimas de violencia sexual",
  VIOLENCIA_NO_SEXUAL: "Check list expedientes de bienestar estudiantil en casos de violencia (todo tipo — no sexual)",
  ATENCION_PSICOSOCIAL: "Check list expedientes para atención psicosocial",
};

export default async function ImprimirChecklistPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { categoria?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const allItems = db
    .prepare("SELECT * FROM case_checklist_items WHERE case_file_id = ? ORDER BY item_order ASC")
    .all(caseFile.id) as CaseChecklistItemRow[];
  if (allItems.length === 0) notFound();
  const category = (searchParams.categoria as ChecklistCategory) || (allItems[0].category as ChecklistCategory);
  const items = allItems.filter((it) => it.category === category);
  if (items.length === 0) notFound();

  const reviews = db
    .prepare("SELECT * FROM case_checklist_reviews WHERE case_file_id = ?")
    .all(caseFile.id) as CaseChecklistReviewRow[];
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const itemsWithRespaldo = new Set(
    (
      db
        .prepare("SELECT checklist_item_id FROM attachments WHERE case_file_id = ? AND checklist_item_id IS NOT NULL")
        .all(caseFile.id) as { checklist_item_id: string }[]
    ).map((a) => a.checklist_item_id)
  );

  return (
    <div className="max-w-4xl mx-auto bg-white">
      <PrintButton />
      <div id="printable-content" className="p-8 print:p-0 text-sm">
        <DocumentHeader
          title={TITLES[category]}
          subtitle="Departamento de Consejería Estudiantil (DECE)"
          institutionName={institution?.name}
          sealImage={institution?.seal_image}
        />

        <section className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-xs mt-4">
          <div><strong>Institución educativa:</strong> {institution.name}</div>
          <div><strong>Código AMIE:</strong> {institution.amie_code || "—"}</div>
          <div><strong>Nombres y apellidos del estudiante:</strong> {student.full_name}</div>
          <div><strong>Grado o curso/paralelo:</strong> {student.course} {student.parallel || ""}</div>
          <div><strong>Profesional DECE responsable:</strong> {caseFile.assigned_to_id ? "" : "—"}</div>
          <div><strong>Fecha de revisión del expediente:</strong> {formatDate(new Date().toISOString())}</div>
        </section>

        <table className="w-full border-collapse border border-slate-400 text-xs mb-6">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 p-1 w-8">N°</th>
              <th className="border border-slate-400 p-1">Documento / requisito</th>
              <th className="border border-slate-400 p-1 w-12 text-center">SI</th>
              <th className="border border-slate-400 p-1 w-12 text-center">NO</th>
              <th className="border border-slate-400 p-1 w-16 text-center">No aplica</th>
              <th className="border border-slate-400 p-1">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-slate-400 p-1 text-center">{idx + 1}</td>
                <td className="border border-slate-400 p-1">{item.item_text}</td>
                <td className="border border-slate-400 p-1 text-center">{item.status === "SI" ? "✓" : ""}</td>
                <td className="border border-slate-400 p-1 text-center">{item.status === "NO" ? "✓" : ""}</td>
                <td className="border border-slate-400 p-1 text-center">{!item.status ? "—" : ""}</td>
                <td className="border border-slate-400 p-1">
                  {item.observations || ""}
                  {itemsWithRespaldo.has(item.id) ? (
                    <span className="font-semibold"> {item.observations ? "· " : ""}Respaldo documental adjunto en el expediente.</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="font-bold text-xs uppercase mb-2">Revisión del expediente</h2>
        <table className="w-full border-collapse border border-slate-400 text-xs mb-6">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 p-1">Rol</th>
              <th className="border border-slate-400 p-1">Nombres y apellidos completos</th>
              <th className="border border-slate-400 p-1">Firma</th>
              <th className="border border-slate-400 p-1">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.role_label}>
                <td className="border border-slate-400 p-1">{r.role_label}</td>
                <td className="border border-slate-400 p-1">{r.full_name || ""}</td>
                <td className="border border-slate-400 p-1"></td>
                <td className="border border-slate-400 p-1">{r.signed_date ? formatDate(r.signed_date) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
