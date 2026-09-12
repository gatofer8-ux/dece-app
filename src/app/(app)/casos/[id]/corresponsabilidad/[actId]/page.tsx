import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import type { CaseFileRow, StudentRow, InstitutionRow, CaseCorresponsibilityActRow, UserRow } from "@/lib/types";
import { formatDate, formatDateTime } from "@/components/ui";
import ActaViewerClient from "./ActaViewerClient";

export default async function VerActaCorresponsabilidadPage({
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
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow | undefined;

  // Obtener nombres de autores para la auditoría institucional
  let createdByName = act.created_by || "Personal DECE";
  let updatedByName = act.updated_by ? act.updated_by : null;

  if (act.created_by) {
    const u = db.prepare("SELECT name FROM users WHERE id = ?").get(act.created_by) as UserRow | undefined;
    if (u) createdByName = u.name;
  }
  if (act.updated_by) {
    const u = db.prepare("SELECT name FROM users WHERE id = ?").get(act.updated_by) as UserRow | undefined;
    if (u) updatedByName = u.name;
  }

  const previewUrl = `/api/casos/${caseFile.id}/corresponsabilidad/${act.id}/preview?t=${encodeURIComponent(act.updated_at || act.created_at)}`;
  const wordUrl = `/api/casos/${caseFile.id}/corresponsabilidad/${act.id}/export-word`;
  const pdfUrl = `/api/casos/${caseFile.id}/corresponsabilidad/${act.id}/export-pdf`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Barra superior de navegación y acciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href={`/casos/${caseFile.id}`} className="hover:text-brand-700 flex items-center gap-1">
              ← Expediente #{caseFile.code}
            </Link>
            <span>/</span>
            <span className="text-slate-700">Acta de Corresponsabilidad</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📜</span>
            <span>Acta de Corresponsabilidad con Representante Legal</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Estudiante: <span className="font-semibold text-slate-800">{student?.full_name || act.student_name}</span> &bull; Representante: <span className="font-semibold text-slate-800">{act.representative_name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/casos/${caseFile.id}/corresponsabilidad/${act.id}/editar`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-xs"
          >
            <span>✏️</span>
            <span>Editar Acta</span>
          </Link>
          <a
            href={wordUrl}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-xs"
          >
            <span>📥</span>
            <span>Descargar Word (.docx)</span>
          </a>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-xs"
          >
            <span>📄</span>
            <span>Descargar PDF</span>
          </a>
          <Link
            href={`/casos/${caseFile.id}/corresponsabilidad/${act.id}/imprimir`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-xs"
          >
            <span>🖨️</span>
            <span>Imprimir</span>
          </Link>
        </div>
      </div>

      {/* Tarjeta de Metadatos y Auditoría Institucional */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <span className="font-bold text-slate-700 block mb-0.5">Sede y Fecha:</span>
          <span>{act.city || "Ambato"}, {formatDate(act.act_date)} ({act.act_time || "09:00"} H)</span>
        </div>
        <div>
          <span className="font-bold text-slate-700 block mb-0.5">Profesional DECE:</span>
          <span className="truncate block">{act.dece_professional_name || "DECE"}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700 block mb-0.5">Creado por:</span>
          <span className="text-slate-800 font-medium block">{createdByName}</span>
          <span className="text-[11px] text-slate-500">{formatDateTime(act.created_at)}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700 block mb-0.5">Última Modificación:</span>
          {updatedByName ? (
            <>
              <span className="text-slate-800 font-medium block">{updatedByName}</span>
              <span className="text-[11px] text-slate-500">{formatDateTime(act.updated_at)}</span>
            </>
          ) : (
            <span className="text-slate-500 italic">Sin ediciones posteriores</span>
          )}
        </div>
      </div>

      {/* Tarjeta de Constancia de Firmas y Respaldo Físico DECE */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Constancia de Firmas y Respaldo Institucional
              </h3>
              <p className="text-xs text-slate-500">
                Respaldo de validez legal y auditoría distrital según normativa DECE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {act.signature_type === "DIGITAL" ? (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>✓</span> Firmado Digitalmente (En Pantalla)
              </span>
            ) : act.signature_type === "FISICA" ? (
              <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>📄</span> Respaldo Físico en Papel
              </span>
            ) : act.signature_type === "MIXTA" ? (
              <span className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>📑</span> Modalidad Mixta (Digital y Físico)
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>⏳</span> Firmas Pendientes de Registro
              </span>
            )}
          </div>
        </div>

        {(() => {
          let signaturesData: {
            rep?: any;
            dece?: any;
            tutor?: any;
          } = {};
          if (act.signatures_json) {
            try {
              const parsed = JSON.parse(act.signatures_json);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                signaturesData = parsed;
              } else if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (item?.roleKey) signaturesData[item.roleKey as "rep" | "dece" | "tutor"] = item;
                }
              }
            } catch {}
          }

          return (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Profesional DECE */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Profesional DECE</span>
                  <div className="font-semibold text-slate-800 text-xs">{act.dece_professional_name || "DECE Responsable"}</div>
                  {signaturesData.dece?.tipo === "digital" ? (
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">✓ Digital</span>
                      {signaturesData.dece.firma_data_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={signaturesData.dece.firma_data_url} alt="Firma" className="h-6 max-w-[70px] object-contain border border-slate-200 rounded px-1 bg-white" />
                      )}
                    </div>
                  ) : signaturesData.dece?.tipo === "fisica" ? (
                    <div className="pt-1 text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium inline-block">
                      📄 Física {signaturesData.dece.referencia_fisica ? `(${signaturesData.dece.referencia_fisica})` : ""}
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-slate-400 italic">Pendiente de firma</div>
                  )}
                </div>

                {/* Tutor o Autoridad */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Tutor / Autoridad</span>
                  <div className="font-semibold text-slate-800 text-xs">{act.tutor_authority_name || "Docente Tutor"}</div>
                  <div className="text-[11px] text-slate-500">{act.tutor_authority_role || "Tutor / Autoridad"}</div>
                  {signaturesData.tutor?.tipo === "digital" ? (
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">✓ Digital</span>
                      {signaturesData.tutor.firma_data_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={signaturesData.tutor.firma_data_url} alt="Firma" className="h-6 max-w-[70px] object-contain border border-slate-200 rounded px-1 bg-white" />
                      )}
                    </div>
                  ) : signaturesData.tutor?.tipo === "fisica" ? (
                    <div className="pt-1 text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium inline-block">
                      📄 Física {signaturesData.tutor.referencia_fisica ? `(${signaturesData.tutor.referencia_fisica})` : ""}
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-slate-400 italic">Pendiente de firma</div>
                  )}
                </div>

                {/* Representante Legal */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Representante Legal</span>
                  <div className="font-semibold text-slate-800 text-xs">{act.representative_name}</div>
                  <div className="text-[11px] text-slate-500">CI: {act.representative_id_num || "—"}</div>
                  {signaturesData.rep?.tipo === "digital" ? (
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">✓ Digital</span>
                      {signaturesData.rep.firma_data_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={signaturesData.rep.firma_data_url} alt="Firma" className="h-6 max-w-[70px] object-contain border border-slate-200 rounded px-1 bg-white" />
                      )}
                    </div>
                  ) : signaturesData.rep?.tipo === "fisica" ? (
                    <div className="pt-1 text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium inline-block">
                      📄 Física {signaturesData.rep.referencia_fisica ? `(${signaturesData.rep.referencia_fisica})` : ""}
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-slate-400 italic">Pendiente de firma</div>
                  )}
                </div>
              </div>

              {/* Respaldo en Archivo Físico y Documento Digitalizado */}
              {(act.physical_file_ref || act.physical_evidence_url) && (
                <div className="p-3.5 bg-amber-50/70 rounded-lg border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <span>📁</span> Ubicación en Archivo Físico Institucional:
                    </span>
                    <p className="text-amber-800 font-medium">{act.physical_file_ref || "Carpeta DECE Institucional"}</p>
                  </div>
                  {act.physical_evidence_url && (
                    <a
                      href={act.physical_evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-semibold text-xs transition-colors shadow-2xs shrink-0 self-start sm:self-center"
                    >
                      <span>📎</span> Ver Acta Física Digitalizada
                    </a>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Visor Oficial del Documento (Conmutación PNG/PDF y fallback automático) */}
      <ActaViewerClient
        previewUrl={previewUrl}
        pdfUrl={pdfUrl}
        wordUrl={wordUrl}
        editUrl={`/casos/${caseFile.id}/corresponsabilidad/${act.id}/editar`}
        title={`Acta de Corresponsabilidad - ${student?.full_name || act.student_name}`}
      />
    </div>
  );
}
