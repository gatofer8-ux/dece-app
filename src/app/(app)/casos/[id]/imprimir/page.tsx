import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate, formatDateTime } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CASE_PRIORITY_LABELS,
  RISK_TYPE_LABELS,
  ACTION_AXIS_LABELS,
  REFERRAL_STATUS_LABELS,
  type StudentRow,
  type CaseFileRow,
  type CaseActionRow,
  type InterventionPlanRow,
  type ReferralRow,
  type UserRow,
  type InstitutionRow,
} from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

export default async function ImprimirCasoPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const actions = db.prepare("SELECT * FROM case_actions WHERE case_file_id = ? ORDER BY date ASC").all(caseFile.id) as CaseActionRow[];
  const plans = db.prepare("SELECT * FROM intervention_plans WHERE case_file_id = ? ORDER BY created_at ASC").all(caseFile.id) as InterventionPlanRow[];
  const referrals = db.prepare("SELECT * FROM referrals WHERE case_file_id = ? ORDER BY created_at ASC").all(caseFile.id) as ReferralRow[];
  const users = db.prepare("SELECT * FROM users WHERE institution_id = ?").all(institutionId) as UserRow[];
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <PrintButton />
      <div id="printable-content" className="p-8 print:p-0 text-sm">
        <DocumentHeader
          title={`EXPEDIENTE DE ATENCIÓN PSICOSOCIAL — CASO N° ${caseFile.code}`}
          subtitle="Departamento de Consejería Estudiantil (DECE) · Ecuador"
          institutionName={institution?.name}
          sealImage={institution?.seal_image}
        />

        <section className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6">
          <div><strong>Código de caso:</strong> {caseFile.code}</div>
          <div><strong>Estado:</strong> {CASE_STATUS_LABELS[caseFile.status]}</div>
          <div><strong>Estudiante:</strong> {student.full_name}</div>
          <div><strong>Curso:</strong> {student.course} {student.parallel || ""}</div>
          <div><strong>Cédula:</strong> {student.document_id || "—"}</div>
          <div><strong>Fecha de nacimiento:</strong> {formatDate(student.birth_date)}</div>
          <div><strong>Representante:</strong> {student.representative || "—"}</div>
          <div><strong>Contacto:</strong> {student.rep_phone || "—"}</div>
        </section>

        <section className="mb-6">
          <h2 className="font-bold uppercase text-xs tracking-wide bg-[#2F5496] text-white px-2.5 py-1 mb-3 rounded-xs">Datos del caso</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <div><strong>Tipo de riesgo:</strong> {RISK_TYPE_LABELS[caseFile.risk_type]}{caseFile.risk_type_other ? ` (${caseFile.risk_type_other})` : ""}</div>
            <div><strong>Prioridad:</strong> {CASE_PRIORITY_LABELS[caseFile.priority]}</div>
            <div><strong>Eje de acción:</strong> {ACTION_AXIS_LABELS[caseFile.action_axis]}</div>
            <div><strong>Detección:</strong> {formatDate(caseFile.detection_date)} ({caseFile.detection_source})</div>
          </div>
          <div className="mt-3">
            <strong>Descripción de la situación:</strong>
            <p className="text-slate-700 mt-1 whitespace-pre-wrap">{caseFile.description}</p>
          </div>
        </section>

        {actions.length > 0 && (
          <section className="mb-6">
            <h2 className="font-bold uppercase text-xs tracking-wide bg-[#2F5496] text-white px-2.5 py-1 mb-3 rounded-xs">Bitácora de acciones</h2>
            <div className="space-y-2">
              {actions.map((a) => (
                <div key={a.id} className="border-b border-slate-100 pb-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{formatDate(a.date)} — {a.type}</span>
                    <span>{userMap.get(a.author_id) || "—"}</span>
                  </div>
                  <p className="mt-0.5">{a.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {plans.length > 0 && (
          <section className="mb-6">
            <h2 className="font-bold uppercase text-xs tracking-wide bg-[#2F5496] text-white px-2.5 py-1 mb-3 rounded-xs">Planes de acompañamiento</h2>
            <div className="space-y-2">
              {plans.map((p) => (
                <div key={p.id} className="border-b border-slate-100 pb-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{p.objective}</span>
                    <span className="text-slate-500">{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{p.actions}</p>
                  <div className="text-xs text-slate-400 mt-1">
                    {formatDate(p.start_date)} — {p.end_date ? formatDate(p.end_date) : "sin fecha límite"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {referrals.length > 0 && (
          <section className="mb-6">
            <h2 className="font-bold uppercase text-xs tracking-wide bg-[#2F5496] text-white px-2.5 py-1 mb-3 rounded-xs">Derivaciones</h2>
            <div className="space-y-2">
              {referrals.map((r) => (
                <div key={r.id} className="border-b border-slate-100 pb-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{r.institution} ({r.scope})</span>
                    <span className="text-slate-500">{REFERRAL_STATUS_LABELS[r.status]} — {formatDate(r.referral_date)}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{r.reason}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 pt-8 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-t border-slate-400 pt-2 font-medium">Profesional DECE</div>
            <div className="text-slate-400">Firma y sello</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-2 font-medium">Autoridad Institucional</div>
            <div className="text-slate-400">Firma y sello</div>
          </div>
        </div>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
