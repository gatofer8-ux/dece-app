import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, formatDate, formatDateTime } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CASE_PRIORITY_LABELS,
  RISK_TYPE_LABELS,
  ACTION_AXIS_LABELS,
  REFERRAL_STATUS_LABELS,
  APPOINTMENT_STATUS_LABELS,
  CHECKLIST_CATEGORY_LABELS,
  INTERVENTION_TYPE_LABELS,
  type StudentRow,
  type CaseFileRow,
  type CaseActionRow,
  type InterventionPlanRow,
  type ReferralRow,
  type AppointmentRow,
  type UserRow,
  type ChecklistCategory,
  type CaseChecklistItemRow,
  type CaseChecklistReviewRow,
  type CaseInterviewRow,
  type CaseObservationSheetRow,
  type CaseCarePlanRow,
  type CaseRestitutionPlanRow,
  type CaseCallLogRow,
  type CaseCareFollowupRow,
  type CaseAdvisoryLogRow,
  type ViolenceReportRow,
  type SocializationActRow,
  type AuthorityAdvisoryActRow,
  type SituationalReportRow,
  type RiskMatrixEntryRow,
  type AttachmentRow,
  type BimonthlyReportRow,
  type CaseCorresponsibilityActRow,
  type CaseAlertNotificationRow,
  type CaseClosureReportRow,
  type RestorativeCircleConsentRow,
  type DeceEsquelaRow,
  CLOSURE_TYPE_LABELS,
} from "@/lib/types";
import { getCaseInactivityInfo } from "@/lib/caseAlerts";
import { listEsquelasByCase, deleteEsquela } from "@/lib/esquelas";
import { deleteCircleConsentAction } from "@/lib/restorativeCircleConsent";
import AttachmentsSection from "./AttachmentsSection";
import {
  addCaseAction,
  updateCaseStatus,
  createInterventionPlan,
  updatePlanStatus,
  ensureChecklist,
  saveChecklist,
  uploadChecklistItemAttachment,
  unlinkChecklistItemAttachment,
  createCallLog,
  createCareFollowup,
  createAdvisoryLog,
  upsertRiskMatrixEntry,
  deleteCaseAction,
  deleteInterventionPlan,
  deleteInterview,
  deleteObservationSheet,
  deleteCarePlan,
  deleteRestitutionPlan,
  deleteCallLog,
  deleteCareFollowup,
  deleteAdvisoryLog,
  deleteViolenceReport,
  deleteSocializationAct,
  deleteAuthorityAdvisoryAct,
  deleteSituationalReport,
  deleteCorresponsibilityAct,
  deleteAlertNotification,
  deleteRiskMatrixEntry,
  deleteBimonthlyReport,
  deleteCaseClosureReport,
} from "../actions";
import { createReferral, updateReferralStatus, deleteReferral } from "../../derivaciones/actions";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import DeleteButton from "@/components/DeleteButton";
import { suggestChecklistCategory, checklistRoleKey } from "@/lib/checklists";
import { SUBNIVEL_LABELS, RISK_LEVEL_LABELS } from "@/lib/observationSheet";
import { careFollowupTypeLabel } from "@/lib/carePlan";
import { currentReportMonth, monthLabel, YES_NO_OPTIONS } from "@/lib/riskMatrix";

const STATUS_COLOR: Record<string, string> = {
  ABIERTO: "amber",
  EN_SEGUIMIENTO: "blue",
  DERIVADO: "purple",
  CERRADO: "green",
};
const PRIORITY_COLOR: Record<string, string> = { ALTA: "red", MEDIA: "amber", BAJA: "slate" };

export default async function CasoDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { checklist_guardado?: string; checklist_error?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const actions = db
    .prepare("SELECT * FROM case_actions WHERE case_file_id = ? ORDER BY date DESC, created_at DESC")
    .all(caseFile.id) as CaseActionRow[];
  const plans = db
    .prepare("SELECT * FROM intervention_plans WHERE case_file_id = ? ORDER BY created_at DESC")
    .all(caseFile.id) as InterventionPlanRow[];
  const referrals = db
    .prepare("SELECT * FROM referrals WHERE case_file_id = ? ORDER BY created_at DESC")
    .all(caseFile.id) as ReferralRow[];
  const appointments = db
    .prepare("SELECT * FROM appointments WHERE case_file_id = ? ORDER BY date DESC")
    .all(caseFile.id) as AppointmentRow[];
  const checklistItems = db
    .prepare("SELECT * FROM case_checklist_items WHERE case_file_id = ? ORDER BY item_order ASC")
    .all(caseFile.id) as CaseChecklistItemRow[];
  let checklistAttachmentsById = new Map<string, { id: string; filename: string; checklist_item_id: string }>();
  try {
    checklistAttachmentsById = new Map(
      (
        db
          .prepare(
            "SELECT id, filename, checklist_item_id FROM attachments WHERE case_file_id = ? AND checklist_item_id IS NOT NULL"
          )
          .all(caseFile.id) as { id: string; filename: string; checklist_item_id: string }[]
      ).map((a) => [a.checklist_item_id, a])
    );
  } catch {
    // columna checklist_item_id aún inexistente (base sin migrar) — sin respaldos
  }
  const checklistReviews = db
    .prepare("SELECT * FROM case_checklist_reviews WHERE case_file_id = ?")
    .all(caseFile.id) as CaseChecklistReviewRow[];
  // Un caso puede tener más de un checklist activo (por ejemplo, violencia
  // sexual Y atención psicosocial a la vez) — se agrupan por categoría para
  // mostrar un bloque independiente por cada uno.
  const checklistsByCategory = new Map<ChecklistCategory, CaseChecklistItemRow[]>();
  for (const item of checklistItems) {
    const cat = item.category as ChecklistCategory;
    if (!checklistsByCategory.has(cat)) checklistsByCategory.set(cat, []);
    checklistsByCategory.get(cat)!.push(item);
  }
  const availableChecklistCategories = (Object.keys(CHECKLIST_CATEGORY_LABELS) as ChecklistCategory[]).filter(
    (c) => !checklistsByCategory.has(c)
  );
  const interviews = db
    .prepare("SELECT * FROM case_interviews WHERE case_file_id = ? ORDER BY created_at DESC")
    .all(caseFile.id) as CaseInterviewRow[];
  const observationSheets = db
    .prepare("SELECT * FROM case_observation_sheets WHERE case_file_id = ? ORDER BY observation_date DESC, created_at DESC")
    .all(caseFile.id) as CaseObservationSheetRow[];
  const carePlans = db
    .prepare("SELECT * FROM case_care_plans WHERE case_file_id = ? ORDER BY plan_date DESC, created_at DESC")
    .all(caseFile.id) as CaseCarePlanRow[];
  const restitutionPlans = db
    .prepare("SELECT * FROM case_restitution_plans WHERE case_file_id = ? ORDER BY elaboration_date DESC, created_at DESC")
    .all(caseFile.id) as CaseRestitutionPlanRow[];
  const callLogs = db
    .prepare("SELECT * FROM case_call_logs WHERE case_file_id = ? ORDER BY call_date DESC, created_at DESC")
    .all(caseFile.id) as CaseCallLogRow[];
  const careFollowups = db
    .prepare("SELECT * FROM case_care_followups WHERE case_file_id = ? ORDER BY session_date DESC, created_at DESC")
    .all(caseFile.id) as CaseCareFollowupRow[];
  const advisoryLogs = db
    .prepare("SELECT * FROM case_advisory_logs WHERE case_file_id = ? ORDER BY log_date DESC, created_at DESC")
    .all(caseFile.id) as CaseAdvisoryLogRow[];
  const attachments = db
    .prepare("SELECT * FROM attachments WHERE case_file_id = ? ORDER BY uploaded_at DESC")
    .all(caseFile.id) as AttachmentRow[];
  const violenceReports = db
    .prepare("SELECT * FROM violence_reports WHERE case_file_id = ? ORDER BY report_date DESC, created_at DESC")
    .all(caseFile.id) as ViolenceReportRow[];
  let accompanimentReports: { id: string; report_number: string | null; report_date: string }[] = [];
  try {
    accompanimentReports = db
      .prepare("SELECT id, report_number, report_date FROM case_accompaniment_reports WHERE case_file_id = ? ORDER BY created_at DESC")
      .all(caseFile.id) as typeof accompanimentReports;
  } catch {
    /* tabla aún no migrada */
  }
  const isViolenceCase = ["VIOLENCIA_INTRAFAMILIAR", "VIOLENCIA_ESCOLAR_BULLYING", "VIOLENCIA_SEXUAL", "VULNERACION_DERECHOS"].includes(
    caseFile.risk_type
  );
  const socializationActs = db
    .prepare("SELECT * FROM socialization_acts WHERE case_file_id = ? ORDER BY act_date DESC, created_at DESC")
    .all(caseFile.id) as SocializationActRow[];
  const authorityAdvisoryActs = db
    .prepare("SELECT * FROM authority_advisory_acts WHERE case_file_id = ? ORDER BY act_date DESC, created_at DESC")
    .all(caseFile.id) as AuthorityAdvisoryActRow[];
  const situationalReports = db
    .prepare("SELECT * FROM situational_reports WHERE case_file_id = ? ORDER BY report_date DESC, created_at DESC")
    .all(caseFile.id) as SituationalReportRow[];
  const corresponsibilityActs = db
    .prepare("SELECT * FROM case_corresponsibility_acts WHERE case_file_id = ? ORDER BY act_date DESC, created_at DESC")
    .all(caseFile.id) as CaseCorresponsibilityActRow[];
  const alertNotifications = db
    .prepare("SELECT * FROM case_alert_notifications WHERE case_file_id = ? ORDER BY fecha_entrega_dece DESC, created_at DESC")
    .all(caseFile.id) as CaseAlertNotificationRow[];
  const bimonthlyReports = db
    .prepare("SELECT * FROM bimonthly_reports WHERE case_file_id = ? ORDER BY created_at DESC")
    .all(caseFile.id) as BimonthlyReportRow[];
  const closureReports = db
    .prepare("SELECT * FROM case_closure_reports WHERE case_file_id = ? ORDER BY created_at DESC")
    .all(caseFile.id) as CaseClosureReportRow[];
  const circleConsents = db
    .prepare("SELECT * FROM restorative_circle_consents WHERE case_file_id = ? ORDER BY consent_date DESC, created_at DESC")
    .all(caseFile.id) as RestorativeCircleConsentRow[];
  const riskMatrixEntries = db
    .prepare("SELECT * FROM case_risk_matrix_entries WHERE case_file_id = ? ORDER BY report_month DESC, created_at DESC")
    .all(caseFile.id) as RiskMatrixEntryRow[];
  const authors = db.prepare("SELECT * FROM users WHERE institution_id = ?").all(institutionId) as UserRow[];
  const authorMap = new Map(authors.map((u) => [u.id, u.name]));

  const boundAddAction = addCaseAction.bind(null, caseFile.id);
  const boundUpdateStatus = updateCaseStatus.bind(null, caseFile.id);
  const boundCreatePlan = createInterventionPlan.bind(null, caseFile.id);
  const boundCreateReferral = createReferral.bind(null, caseFile.id);
  const boundCreateCallLog = createCallLog.bind(null, caseFile.id);
  const boundCreateCareFollowup = createCareFollowup.bind(null, caseFile.id);
  const boundCreateAdvisoryLog = createAdvisoryLog.bind(null, caseFile.id);
  const boundUpsertRiskMatrixEntry = upsertRiskMatrixEntry.bind(null, caseFile.id);
  const boundEnsureChecklist = ensureChecklist.bind(null, caseFile.id);
  const boundSaveChecklist = saveChecklist.bind(null, caseFile.id);

  const incompleteChecklistItems = checklistItems.filter((item) => item.status !== "SI");
  const completedChecklistItemsCount = checklistItems.filter((item) => item.status === "SI").length;
  const hasChecklist = checklistItems.length > 0;
  const isChecklistIncomplete = hasChecklist && incompleteChecklistItems.length > 0;

  let caseEsquelas: DeceEsquelaRow[] = [];
  try {
    caseEsquelas = listEsquelasByCase(caseFile.id, institutionId);
  } catch {
    // Si la tabla no existe aún
  }

  let inactivityInfo = {
    daysWithoutConversation: 0,
    lastConversationDate: "",
    lastConversationType: "",
    isAlert: false,
    isUrgent: false,
  };
  try {
    inactivityInfo = getCaseInactivityInfo(caseFile.id, institutionId);
  } catch (err) {
    console.error("[casos] Error consultando inactividad:", err);
  }

  return (
    <div>
      {!hasChecklist && caseFile.status !== "CERRADO" && (
        <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-amber-500 text-lg">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-amber-900">Checklist de expediente no asignado</h3>
              <p className="text-xs text-amber-700 mt-1">
                Este caso aún no tiene creado su checklist de control de documentos. 
                <a href="#checklist" className="font-semibold underline ml-1 text-amber-900 hover:text-amber-950">
                  Crear checklist según el tipo de riesgo &darr;
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {isChecklistIncomplete && (
        <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-rose-500 text-lg">📋</div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-rose-900">
                  Alerta: Documentación pendiente en el expediente ({incompleteChecklistItems.length} de {checklistItems.length} ítems por completar)
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  Se han registrado como completados {completedChecklistItemsCount} de {checklistItems.length} documentos obligatorios.
                </p>

                <details className="mt-2 text-xs text-rose-800 cursor-pointer">
                  <summary className="font-medium underline hover:text-rose-950">
                    Ver los {incompleteChecklistItems.length} documentos que faltan
                  </summary>
                  <ul className="mt-2 space-y-1 list-disc list-inside bg-white/70 p-3 rounded border border-rose-200">
                    {incompleteChecklistItems.map((it) => (
                      <li key={it.id} className="text-slate-700">
                        <span className="font-semibold text-slate-900">#{it.item_order}:</span> {it.item_text}
                        {it.status === "NO" && (
                          <span className="ml-1 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">Marcado como NO</span>
                        )}
                        {!it.status && (
                          <span className="ml-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">Sin revisar</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
            <a
              href="#checklist"
              className="text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 px-3 py-1.5 rounded transition-colors whitespace-nowrap ml-4"
            >
              Completar Checklist &darr;
            </a>
          </div>
        </div>
      )}

      {inactivityInfo.isAlert && (
        <div
          className={`mb-4 p-4 rounded-xl border shadow-sm ${
            inactivityInfo.isUrgent
              ? "bg-rose-50 border-rose-300 text-rose-950"
              : "bg-amber-50 border-amber-300 text-amber-950"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <h3 className="font-bold text-sm">
                  Alerta Preventiva de Seguimiento: {inactivityInfo.daysWithoutConversation} días sin diálogo con estudiante o representante
                </h3>
                <p className="text-xs mt-1 leading-relaxed">
                  Último contacto registrado: <strong className="font-semibold">{inactivityInfo.lastConversationType}</strong> ({formatDate(inactivityInfo.lastConversationDate)}).
                  Para evitar que el expediente quede en el olvido, emita una esquela de citación o registre una entrevista.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/casos/${caseFile.id}/esquelas/nueva`}
                className="btn-primary text-xs font-bold px-3 py-1.5 flex items-center gap-1 bg-amber-700 hover:bg-amber-800 text-white"
              >
                <span>📨</span> Emitir Esquela
              </Link>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title={caseFile.code}
        description={
          <>
            <Link href={`/estudiantes/${student.id}`} className="text-brand-700 hover:underline font-medium">
              {student.full_name}
            </Link>{" "}
            · {student.course} {student.parallel || ""}
            {caseFile.legacy_code ? (
              <>
                {" "}
                · <span className="text-slate-400">código anterior: {caseFile.legacy_code}</span>
              </>
            ) : null}
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={PRIORITY_COLOR[caseFile.priority]}>{CASE_PRIORITY_LABELS[caseFile.priority]}</Badge>
            <Badge color={STATUS_COLOR[caseFile.status]}>{CASE_STATUS_LABELS[caseFile.status]}</Badge>
            <Link
              href={`/casos/${caseFile.id}/carga-inteligente`}
              className="btn-secondary text-xs flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-semibold"
              title="Cargar y digitalizar documento físico mediante OCR local (Acta, Ficha de Alerta)"
            >
              <span>📷</span> Carga Inteligente (OCR)
            </Link>
            <a
              href={`/api/casos/${caseFile.id}/export-word`}
              className="btn-secondary text-xs flex items-center gap-1.5 hover:bg-blue-50 hover:text-blue-700"
              title="Descargar expediente completo en Microsoft Word"
            >
              <span>📄</span> Descargar Word (.docx)
            </a>
            <Link href={`/casos/${caseFile.id}/imprimir`} className="btn-secondary text-xs">
              🖨️ Imprimir ficha
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Ficha */}
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Ficha del caso</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <dt className="text-xs text-slate-400 uppercase">Tipo de riesgo</dt>
                <dd>{RISK_TYPE_LABELS[caseFile.risk_type]}{caseFile.risk_type_other ? ` — ${caseFile.risk_type_other}` : ""}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">Eje de acción</dt>
                <dd>{ACTION_AXIS_LABELS[caseFile.action_axis]}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">Fecha de detección</dt>
                <dd>{formatDate(caseFile.detection_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400 uppercase">Fuente de detección</dt>
                <dd>{caseFile.detection_source || "—"}</dd>
              </div>
            </dl>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-400 uppercase mb-1">Descripción (confidencial)</div>
              <p className="text-sm whitespace-pre-wrap">{caseFile.description}</p>
            </div>
            {caseFile.closed_at && (
              <div className="mt-3 text-xs text-slate-500">
                Cerrado el {formatDate(caseFile.closed_at)}{caseFile.closure_reason ? ` — ${caseFile.closure_reason}` : ""}
              </div>
            )}
          </section>

          {/* Bitácora */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Bitácora de acciones</h2>
              <Link href={`/casos/${caseFile.id}/seguimiento/imprimir`} className="text-xs text-brand-700 hover:underline">
                🖨️ Ficha de seguimiento
              </Link>
            </div>
            <form action={boundAddAction} className="space-y-3 mb-5 border-b border-slate-100 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select name="type" className="select" defaultValue="Entrevista">
                  <option>Entrevista</option>
                  <option>Visita domiciliaria</option>
                  <option>Llamada telefónica</option>
                  <option>Coordinación interinstitucional</option>
                  <option>Seguimiento académico</option>
                  <option>Comunicación con representante</option>
                  <option>Acta de compromiso y corresponsabilidad</option>
                  <option>Otro</option>
                </select>
                <select name="intervention_type" className="select" defaultValue="">
                  <option value="">Tipo de intervención (opcional)</option>
                  {Object.entries(INTERVENTION_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
                <input name="observations" placeholder="Observaciones (opcional)" className="input" />
              </div>
              <div className="flex items-center justify-end">
                <AIAssistButton targetId={`case-action-description-${caseFile.id}`} caseId={caseFile.id} fieldLabel="Descripción de la acción en bitácora" /><VoiceDictationButton targetId={`case-action-description-${caseFile.id}`} />
              </div>
              <textarea id={`case-action-description-${caseFile.id}`} name="description" required rows={2} placeholder="Describe la acción realizada..." className="textarea" />
              <div className="flex justify-end">
                <button type="submit" className="btn-primary">+ Registrar acción</button>
              </div>
            </form>
            <ol className="space-y-4">
              {actions.map((a) => (
                <li key={a.id} className="text-sm border-l-2 border-brand-200 pl-3">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-600">
                      {a.type}{a.intervention_type ? ` — ${INTERVENTION_TYPE_LABELS[a.intervention_type] || a.intervention_type}` : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{formatDateTime(a.date)} · {authorMap.get(a.author_id) || "—"}</span>
                      <DeleteButton
                        onDelete={async () => {
                          "use server";
                          await deleteCaseAction(a.id, caseFile.id);
                        }}
                        confirmMessage="¿Borrar esta acción de la bitácora? Esta acción no se puede deshacer."
                      />
                    </div>
                  </div>
                  <p className="text-slate-700 mt-1 whitespace-pre-wrap">{a.description}</p>
                  {a.observations && <p className="text-slate-400 text-xs mt-1">Obs: {a.observations}</p>}
                </li>
              ))}
              {actions.length === 0 && <p className="text-sm text-slate-400">Sin acciones registradas.</p>}
            </ol>
          </section>

          {/* Entrevistas semiestructuradas */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Entrevistas semiestructuradas</h2>
              <Link href={`/casos/${caseFile.id}/entrevistas/nueva`} className="text-xs text-brand-700 hover:underline">
                + Nueva entrevista
              </Link>
            </div>
            <div className="space-y-2">
              {interviews.map((iv) => (
                <div key={iv.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{iv.interviewee_full_name || "Sin nombre registrado"}</div>
                    <div className="text-xs text-slate-400">{formatDate(iv.application_date || iv.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/casos/${caseFile.id}/entrevistas/${iv.id}/export-word`}
                      className="text-xs text-blue-700 hover:underline whitespace-nowrap font-medium"
                    >
                      📄 Word
                    </a>
                    <Link href={`/casos/${caseFile.id}/entrevistas/${iv.id}/editar`} className="text-xs text-slate-600 hover:underline whitespace-nowrap">
                      ✏️ Editar
                    </Link>
                    <Link href={`/casos/${caseFile.id}/entrevistas/${iv.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      🖨️ Imprimir
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteInterview(iv.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar esta entrevista? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {interviews.length === 0 && <p className="text-sm text-slate-400">Sin entrevistas registradas.</p>}
            </div>
          </section>

          {/* Fichas de observación psicosocial */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Fichas de observación psicosocial</h2>
              <Link href={`/casos/${caseFile.id}/observacion/nueva`} className="text-xs text-brand-700 hover:underline">
                + Nueva ficha
              </Link>
            </div>
            <div className="space-y-2">
              {observationSheets.map((s) => (
                <div key={s.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">
                      {SUBNIVEL_LABELS[s.subnivel]} · <span className="text-xs">{RISK_LEVEL_LABELS[s.risk_level]}</span>
                    </div>
                    <div className="text-xs text-slate-400">{formatDate(s.observation_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/casos/${caseFile.id}/observacion/${s.id}/export-word`}
                      className="text-xs text-blue-700 hover:underline whitespace-nowrap font-medium"
                    >
                      📄 Word
                    </a>
                    <Link href={`/casos/${caseFile.id}/observacion/${s.id}/editar`} className="text-xs text-amber-700 hover:underline whitespace-nowrap font-medium">
                      ✏️ Editar
                    </Link>
                    <Link href={`/casos/${caseFile.id}/observacion/${s.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      🖨️ Imprimir
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteObservationSheet(s.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar esta ficha de observación? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {observationSheets.length === 0 && <p className="text-sm text-slate-400">Sin fichas de observación registradas.</p>}
            </div>
          </section>

          {/* Planes de atención psicosocial */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Planes de atención psicosocial</h2>
              <Link href={`/casos/${caseFile.id}/atencion/nueva`} className="text-xs text-brand-700 hover:underline">
                + Nuevo plan
              </Link>
            </div>
            <div className="space-y-2">
              {carePlans.map((p) => (
                <div key={p.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">Plan de atención — {formatDate(p.plan_date)}</div>
                    <div className="text-xs text-slate-400 truncate max-w-md">{p.diagnosis_summary}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/casos/${caseFile.id}/atencion/${p.id}/export-word`}
                      className="text-xs text-blue-700 hover:underline whitespace-nowrap font-medium"
                    >
                      📄 Word
                    </a>
                    <Link href={`/casos/${caseFile.id}/atencion/${p.id}/editar`} className="text-xs text-slate-600 hover:underline whitespace-nowrap">
                      ✏️ Editar
                    </Link>
                    <Link href={`/casos/${caseFile.id}/atencion/${p.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      🖨️ Imprimir
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteCarePlan(p.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar este plan de atención psicosocial? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {carePlans.length === 0 && <p className="text-sm text-slate-400">Sin planes de atención registrados.</p>}
            </div>
          </section>


          {/* Planes de acompañamiento y restitución */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Planes de acompañamiento y restitución</h2>
              <Link href={`/casos/${caseFile.id}/restitucion/nueva`} className="text-xs text-brand-700 hover:underline">
                + Nuevo plan
              </Link>
            </div>
            <div className="space-y-2">
              {restitutionPlans.map((p) => (
                <div key={p.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">Plan de acompañamiento — {formatDate(p.elaboration_date)}</div>
                    <div className="text-xs text-slate-400">{p.school_year || ""}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/casos/${caseFile.id}/restitucion/${p.id}/export-word`}
                      className="text-xs text-blue-700 hover:underline whitespace-nowrap font-medium flex items-center gap-0.5"
                    >
                      📥 Word (.docx)
                    </a>
                    <Link href={`/casos/${caseFile.id}/restitucion/${p.id}/editar`} className="text-xs text-slate-600 hover:underline whitespace-nowrap">
                      ✏️ Editar
                    </Link>
                    <Link href={`/casos/${caseFile.id}/restitucion/${p.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      🖨️ Imprimir / PDF
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteRestitutionPlan(p.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar este plan de acompañamiento y restitución? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {restitutionPlans.length === 0 && <p className="text-sm text-slate-400">Sin planes de acompañamiento registrados.</p>}
            </div>
          </section>

          {/* Informes de reporte del hecho de violencia */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Reportes de hecho de violencia</h2>
              <Link href={`/casos/${caseFile.id}/hecho-violencia/nueva`} className="text-xs text-brand-700 hover:underline">
                + Nuevo reporte
              </Link>
            </div>
            <div className="space-y-2">
              {violenceReports.map((r) => (
                <div key={r.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {r.report_number || "Sin codificar"}
                      </span>
                      <span className="text-xs text-slate-500">• {formatDate(r.report_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/casos/${caseFile.id}/hecho-violencia/${r.id}/export-word`}
                      className="text-xs text-blue-700 hover:underline whitespace-nowrap font-medium"
                    >
                      📄 Word
                    </a>
                    <Link href={`/casos/${caseFile.id}/hecho-violencia/${r.id}/editar`} className="text-xs text-slate-600 hover:underline whitespace-nowrap">
                      ✏️ Editar
                    </Link>
                    <Link href={`/casos/${caseFile.id}/hecho-violencia/${r.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      🖨️ Imprimir
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteViolenceReport(r.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar este reporte de hecho de violencia? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {violenceReports.length === 0 && <p className="text-sm text-slate-400">Sin reportes registrados.</p>}
            </div>
          </section>

          {/* Informe técnico de acompañamiento a víctimas de violencia */}
          {isViolenceCase && (
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Informe técnico de acompañamiento a víctimas de violencia</h2>
                <Link href={`/casos/${caseFile.id}/acompanamiento-tecnico/nueva`} className="text-xs text-brand-700 hover:underline">
                  + Nuevo informe
                </Link>
              </div>
              <div className="space-y-2">
                {accompanimentReports.map((r) => (
                  <div key={r.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {r.report_number || "Sin codificar"}
                      </span>
                      <span className="text-xs text-slate-500">• {formatDate(r.report_date)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={`/api/casos/${caseFile.id}/acompanamiento-tecnico/${r.id}/export-word`} className="text-xs text-blue-700 hover:underline font-medium">📄 Word</a>
                      <Link href={`/casos/${caseFile.id}/acompanamiento-tecnico/${r.id}/editar`} className="text-xs text-slate-600 hover:underline">✏️ Editar</Link>
                      <Link href={`/casos/${caseFile.id}/acompanamiento-tecnico/${r.id}/imprimir`} className="text-xs text-brand-700 hover:underline">🖨️ Imprimir</Link>
                    </div>
                  </div>
                ))}
                {accompanimentReports.length === 0 && <p className="text-sm text-slate-400">Sin informe técnico de acompañamiento registrado.</p>}
              </div>
            </section>
          )}

          {/* Actas de socialización de vulnerabilidad */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Actas de socialización de vulnerabilidad</h2>
              <Link href={`/casos/${caseFile.id}/socializacion/nueva`} className="text-xs text-brand-700 hover:underline">
                + Nueva acta
              </Link>
            </div>
            <div className="space-y-2">
              {socializationActs.map((a) => (
                <div key={a.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{a.vulnerability_type}</div>
                    <div className="text-xs text-slate-400">{formatDate(a.act_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/casos/${caseFile.id}/socializacion/${a.id}/export-word`}
                      className="text-xs text-blue-700 hover:underline whitespace-nowrap font-medium"
                    >
                      📄 Word
                    </a>
                    <Link href={`/casos/${caseFile.id}/socializacion/${a.id}/editar`} className="text-xs text-slate-600 hover:underline whitespace-nowrap">
                      ✏️ Editar
                    </Link>
                    <Link href={`/casos/${caseFile.id}/socializacion/${a.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      🖨️ Imprimir
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteSocializationAct(a.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar esta acta de socialización? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {socializationActs.length === 0 && <p className="text-sm text-slate-400">Sin actas registradas.</p>}
            </div>
          </section>

          {/* Actas de asesoramiento a la máxima autoridad */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Asesoramiento a la máxima autoridad</h2>
              <Link href={`/casos/${caseFile.id}/asesoramiento-autoridad/nueva`} className="text-xs text-brand-700 hover:underline">
                + Nueva acta
              </Link>
            </div>
            <div className="space-y-2">
              {authorityAdvisoryActs.map((a) => (
                <div key={a.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{a.issuing_entity || "Acta de asesoramiento"}</div>
                    <div className="text-xs text-slate-400">{formatDate(a.act_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/casos/${caseFile.id}/asesoramiento-autoridad/${a.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      🖨️ Imprimir
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteAuthorityAdvisoryAct(a.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar esta acta de asesoramiento a la máxima autoridad? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {authorityAdvisoryActs.length === 0 && <p className="text-sm text-slate-400">Sin actas registradas.</p>}
            </div>
          </section>

          {/* Actas de compromiso y corresponsabilidad con representantes legales */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>🤝</span> Actas de compromiso y corresponsabilidad (Representantes Legales)
                </h2>
                <p className="text-xs text-slate-400">
                  Acuerdos oficiales de corresponsabilidad parental y educativa (LOEI Art. 13 / CONNA Art. 39).
                </p>
              </div>
              <Link href={`/casos/${caseFile.id}/corresponsabilidad/nueva`} className="text-xs text-brand-700 hover:underline font-medium">
                + Nueva acta de corresponsabilidad
              </Link>
            </div>
            <div className="space-y-2">
              {corresponsibilityActs.map((a) => (
                <div key={a.id} className="text-sm border-b border-slate-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/casos/${caseFile.id}/corresponsabilidad/${a.id}`}
                      className="font-semibold text-slate-900 hover:text-brand-700 truncate max-w-md block transition-colors"
                    >
                      {a.representative_name} ({a.representative_relationship || "Representante"}) — {(a.agreements_and_commitments || a.detected_difficulty || "").slice(0, 65)}...
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDate(a.act_date)} {a.act_time ? `(${a.act_time} H)` : ""} · {a.city || "Ambato"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/casos/${caseFile.id}/corresponsabilidad/${a.id}`}
                      className="text-xs text-indigo-700 hover:underline whitespace-nowrap font-semibold"
                    >
                      👁️ Ver Acta
                    </Link>
                    <a
                      href={`/api/casos/${caseFile.id}/corresponsabilidad/${a.id}/export-word`}
                      download
                      className="text-xs text-blue-700 hover:underline whitespace-nowrap font-medium"
                    >
                      📥 Word
                    </a>
                    <a
                      href={`/api/casos/${caseFile.id}/corresponsabilidad/${a.id}/export-pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 hover:underline whitespace-nowrap font-medium"
                    >
                      📄 PDF
                    </a>
                    <Link href={`/casos/${caseFile.id}/corresponsabilidad/${a.id}/editar`} className="text-xs text-amber-700 hover:underline whitespace-nowrap font-medium">
                      ✏️ Editar
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteCorresponsibilityAct(a.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar esta acta de corresponsabilidad? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {corresponsibilityActs.length === 0 && (
                <p className="text-sm text-slate-400">Sin actas de corresponsabilidad registradas.</p>
              )}
            </div>
          </section>

          {/* Esquelas de Citación */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>📨</span> Esquelas de citación (Representantes / Estudiantes)
                </h2>
                <p className="text-xs text-slate-400">
                  Convocatorias oficiales con talón desprendible y acuse de recibido para el expediente.
                </p>
              </div>
              <Link href={`/casos/${caseFile.id}/esquelas/nueva`} className="text-xs text-brand-700 hover:underline font-medium">
                + Nueva esquela de citación
              </Link>
            </div>
            <div className="space-y-2">
              {caseEsquelas.map((e) => (
                <div key={e.id} className="text-sm border-b border-slate-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {e.citation_number}
                      </span>
                      <span className="font-semibold text-slate-900 text-xs">
                        {e.representative_name}
                      </span>
                      {e.urgency_level === "URGENTE" && (
                        <span className="text-[10px] text-red-600 font-bold">⚠️ Urgente</span>
                      )}
                      {e.talon_returned ? (
                        <Badge color="green">✂️ Talón devuelto</Badge>
                      ) : (
                        <Badge color="amber">Talón pendiente</Badge>
                      )}
                      {e.talon_attended === 1 && <Badge color="green">Asistió</Badge>}
                      {e.talon_attended === 2 && <Badge color="amber">Justificó</Badge>}
                      {e.talon_attended === 3 && <Badge color="rose">No asistió</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Cita: <strong className="text-slate-700">{formatDate(e.citation_date)}</strong> a las <strong className="text-slate-700">{e.citation_time}</strong> · Motivo: {(e.citation_reason || "").slice(0, 50)}...
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/esquelas/${e.id}`}
                      className="text-xs text-indigo-700 hover:underline whitespace-nowrap font-semibold"
                    >
                      👁️ Gestionar
                    </Link>
                    <Link
                      href={`/esquelas/${e.id}/imprimir`}
                      className="text-xs text-brand-700 hover:underline whitespace-nowrap font-medium"
                    >
                      🖨️ Imprimir
                    </Link>
                    <Link
                      href={`/esquelas/${e.id}/editar`}
                      className="text-xs text-amber-700 hover:underline whitespace-nowrap font-medium"
                    >
                      ✏️ Editar
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        deleteEsquela(e.id, institutionId);
                      }}
                      confirmMessage="¿Borrar esta esquela de citación? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {caseEsquelas.length === 0 && (
                <p className="text-sm text-slate-400">Sin esquelas de citación registradas en este expediente.</p>
              )}
            </div>
          </section>

          {/* Fichas de Notificación de Alerta DECE */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>⚠️</span> Fichas de Notificación de Alerta (Detección Institucional)
                </h2>
                <p className="text-xs text-slate-400">
                  Formato canónico oficial de detección, derivación y alerta temprana (Agency FB).
                </p>
              </div>
              <Link href={`/casos/${caseFile.id}/alertas/nueva`} className="text-xs text-brand-700 hover:underline font-medium">
                + Nueva ficha de alerta
              </Link>
            </div>
            <div className="space-y-2">
              {alertNotifications.map((al) => (
                <div key={al.id} className="text-sm border-b border-slate-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/casos/${caseFile.id}/alertas/${al.id}`}
                      className="font-semibold text-slate-900 hover:text-brand-700 truncate max-w-md block transition-colors"
                    >
                      {al.student_name} — {al.especificar_alerta || al.intervencion_pregunta_1 || "Alerta DECE"}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Entrega: {formatDate(al.fecha_entrega_dece)} · Notificado por: {al.notificador_nombre} ({al.notificador_cargo})
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/casos/${caseFile.id}/alertas/${al.id}`}
                      className="text-xs text-indigo-700 hover:underline whitespace-nowrap font-semibold"
                    >
                      👁️ Ver Ficha
                    </Link>
                    <a
                      href={`/api/casos/${caseFile.id}/alertas/${al.id}/export-word`}
                      download
                      className="text-xs text-blue-700 hover:underline whitespace-nowrap font-medium"
                    >
                      📥 Word
                    </a>
                    <a
                      href={`/api/casos/${caseFile.id}/alertas/${al.id}/export-pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 hover:underline whitespace-nowrap font-medium"
                    >
                      📄 PDF
                    </a>
                    <Link href={`/casos/${caseFile.id}/alertas/${al.id}/editar`} className="text-xs text-amber-700 hover:underline whitespace-nowrap font-medium">
                      ✏️ Editar
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteAlertNotification(al.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar esta ficha de notificación de alerta? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {alertNotifications.length === 0 && (
                <p className="text-sm text-slate-400">Sin fichas de notificación de alerta registradas.</p>
              )}
            </div>
          </section>

          {/* Informes técnicos situacionales */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Informes técnicos situacionales</h2>
              <Link href={`/casos/${caseFile.id}/informe-situacional/nueva`} className="text-xs text-brand-700 hover:underline">
                + Nuevo informe
              </Link>
            </div>
            <div className="space-y-2">
              {situationalReports.map((r) => (
                <div key={r.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {r.report_number || "Sin codificar"}
                      </span>
                      <span className="text-xs text-slate-500">• {formatDate(r.report_date)}</span>
                    </div>
                    <div className="font-medium truncate max-w-md text-slate-700">{r.tema || r.situation_type}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/casos/${caseFile.id}/informe-situacional/${r.id}/editar`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                      [Editar]
                    </Link>
                    <Link href={`/casos/${caseFile.id}/informe-situacional/${r.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      🖨 Imprimir
                    </Link>
                    <a href={`/api/casos/${caseFile.id}/informe-situacional/${r.id}/export-word`} className="text-xs text-green-600 hover:underline whitespace-nowrap">
                      📥 Word
                    </a>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteSituationalReport(r.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar este informe técnico situacional? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {situationalReports.length === 0 && <p className="text-sm text-slate-400">Sin informes registrados.</p>}
            </div>
          </section>

          {/* Informes Bimensuales de Acompañamiento (Casos de Violencia Sexual) */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>📅</span> Informes Bimensuales de Acompañamiento (Violencia Sexual)
                </h2>
                <p className="text-xs text-slate-400">
                  Seguimiento bimensual al plan de acompañamiento institucional con los 8 procesos normativos.
                </p>
              </div>
              <Link href={`/casos/${caseFile.id}/informe-bimensual/nueva`} className="text-xs text-brand-700 hover:underline font-medium">
                + Nuevo informe bimensual
              </Link>
            </div>
            <div className="space-y-2">
              {bimonthlyReports.map((r) => (
                <div key={r.id} className="text-sm border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {r.report_number || "Sin codificar"}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        Bimestre: {r.period_months} ({r.school_year_text})
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Víctima: {r.victim_initials} • Registrado el {formatDate(r.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/casos/${caseFile.id}/informe-bimensual/${r.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                      🖨️ Imprimir
                    </Link>
                    <a href={`/api/casos/${caseFile.id}/informe-bimensual/${r.id}/export-word`} className="text-xs text-green-600 hover:underline whitespace-nowrap">
                      📥 Word
                    </a>
                    <Link href={`/casos/${caseFile.id}/informe-bimensual/${r.id}/editar`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                      ✏️ Editar
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteBimonthlyReport(r.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar este informe bimensual de acompañamiento? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {bimonthlyReports.length === 0 && (
                <p className="text-sm text-slate-400">Sin informes bimensuales registrados para este caso.</p>
              )}
            </div>
          </section>

          {/* Informes Técnicos de Cierre de Caso (Finalización Año Lectivo / Traslado / Graduación) */}
          <section className="card p-5 border-l-4 border-l-blue-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🎓</span> Informes Técnicos de Cierre de Caso (Violencia Sexual)
                </h2>
                <p className="text-xs text-slate-500">
                  Cierre por culminación del año lectivo, graduación o traslado. Consolida y muestra todos los seguimientos bimensuales ejecutados durante el año.
                </p>
              </div>
              <Link
                href={`/casos/${caseFile.id}/informe-cierre/nuevo`}
                className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5 font-semibold shrink-0"
              >
                <span>+ Nuevo informe de cierre</span>
              </Link>
            </div>
            <div className="space-y-3">
              {closureReports.map((r) => (
                <div
                  key={r.id}
                  className="text-sm border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        {r.report_number}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {CLOSURE_TYPE_LABELS[r.closure_type] || r.closure_type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 font-medium line-clamp-1">
                      {r.topic}
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                      <span>Año Lectivo: <strong>{r.school_year_text}</strong></span>
                      <span>•</span>
                      <span>Fecha: <strong>{r.report_date}</strong></span>
                      <span>•</span>
                      <span>Elaborado por: {r.elaborated_by_name || r.dece_name}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      href={`/casos/${caseFile.id}/informe-cierre/${r.id}/imprimir`}
                      className="text-xs font-semibold text-brand-700 hover:text-brand-900 border border-brand-200 bg-white px-2.5 py-1.5 rounded-lg hover:bg-slate-50 shadow-xs flex items-center gap-1 whitespace-nowrap transition"
                    >
                      <span>🖨️ Ver / Imprimir</span>
                    </Link>
                    <a
                      href={`/api/casos/${caseFile.id}/informe-cierre/${r.id}/export-word`}
                      download
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 bg-white px-2.5 py-1.5 rounded-lg hover:bg-blue-50 shadow-xs flex items-center gap-1 whitespace-nowrap transition"
                    >
                      <span>📄 Word (.docx)</span>
                    </a>
                    <Link
                      href={`/casos/${caseFile.id}/informe-cierre/${r.id}/editar`}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg hover:bg-slate-50 shadow-xs flex items-center gap-1 whitespace-nowrap transition"
                    >
                      <span>✏️ Editar</span>
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteCaseClosureReport(r.id, caseFile.id);
                      }}
                      confirmMessage="¿Borrar este informe técnico de cierre de caso? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {closureReports.length === 0 && (
                <div className="text-center py-5 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">
                    No se han registrado informes técnicos de cierre para este caso.
                  </p>
                  <Link
                    href={`/casos/${caseFile.id}/informe-cierre/nuevo`}
                    className="text-xs font-semibold text-blue-700 hover:underline mt-1.5 inline-block"
                  >
                    Crear informe de cierre (culminación de año lectivo, graduación o traslado) →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Consentimientos para Círculos Restaurativos */}
          <section className="card p-5 border-l-4 border-l-purple-600">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span>⭕</span> Consentimientos para Círculos Restaurativos
                </h2>
                <p className="text-xs text-slate-500">
                  Consentimiento informado para la atención psicosocial y procesos de justicia / prácticas restaurativas.
                </p>
              </div>
              <Link
                href={`/casos/${caseFile.id}/circulos-restaurativos/nuevo`}
                className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5 font-semibold shrink-0"
              >
                <span>+ Nuevo consentimiento</span>
              </Link>
            </div>
            <div className="space-y-3">
              {circleConsents.map((c) => (
                <div
                  key={c.id}
                  className="text-sm border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {c.student_name || "Formato de aula"}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        {c.course_parallel}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {c.shift}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Fecha: <span className="font-medium">{formatDate(c.consent_date)}</span> · Resp. DECE: {c.dece_name}
                      {c.representative_name && <span> · Repr: {c.representative_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Link
                      href={`/circulos-restaurativos/${c.id}/imprimir`}
                      className="text-xs font-semibold text-brand-700 hover:text-brand-900 border border-brand-200 bg-brand-50 px-2.5 py-1.5 rounded-lg hover:bg-brand-100 shadow-xs flex items-center gap-1 whitespace-nowrap transition"
                    >
                      <span>🖨️ Ver / Imprimir</span>
                    </Link>
                    <a
                      href={`/api/circulos-restaurativos/${c.id}/export-word`}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 shadow-xs flex items-center gap-1 whitespace-nowrap transition"
                    >
                      <span>📄 Word (.docx)</span>
                    </a>
                    <Link
                      href={`/circulos-restaurativos/${c.id}/editar`}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg hover:bg-slate-50 shadow-xs flex items-center gap-1 whitespace-nowrap transition"
                    >
                      <span>✏️ Editar</span>
                    </Link>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteCircleConsentAction(c.id);
                      }}
                      confirmMessage="¿Estás seguro de que deseas eliminar este consentimiento de círculo restaurativo? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {circleConsents.length === 0 && (
                <div className="text-center py-5 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">
                    No se han registrado consentimientos de círculos restaurativos para este caso.
                  </p>
                  <Link
                    href={`/casos/${caseFile.id}/circulos-restaurativos/nuevo`}
                    className="text-xs font-semibold text-purple-700 hover:underline mt-1.5 inline-block"
                  >
                    Emitir consentimiento de círculo restaurativo para este estudiante →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Matriz de Riesgos Psicosociales */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Matriz de Riesgos Psicosociales</h2>
              <Link href="/reportes/matriz-riesgos" className="text-xs text-brand-700 hover:underline">
                Ir al reporte mensual →
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Marca este caso para el reporte mensual a distrito/zona. Los datos del/la estudiante, representante,
              persona agresora y acciones de acompañamiento se toman automáticamente de sus fichas — aquí solo se
              completa lo que falta.
            </p>
            <details className="mb-3">
              <summary className="text-xs text-brand-700 hover:underline cursor-pointer">+ Incluir/actualizar en la matriz</summary>
              <form action={boundUpsertRiskMatrixEntry} className="space-y-2 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Mes de reporte</label>
                    <input type="month" name="report_month" defaultValue={currentReportMonth()} className="input text-xs !py-1.5" required />
                  </div>
                  <div>
                    <label className="label text-xs">Fecha de conocimiento</label>
                    <input type="date" name="knowledge_date" defaultValue={caseFile.detection_date?.slice(0, 10)} className="input text-xs !py-1.5" />
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Tipo de caso</label>
                  <input
                    name="case_type"
                    required
                    defaultValue={RISK_TYPE_LABELS[caseFile.risk_type as keyof typeof RISK_TYPE_LABELS]}
                    className="input text-xs !py-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input name="registered_by_name" placeholder="Nombres y apellidos de quien registra" defaultValue={session.user.name || ""} className="input text-xs !py-1.5" />
                  <input name="registered_by_role" placeholder="Cargo (ej. DECE Institucional)" defaultValue="DECE Institucional" className="input text-xs !py-1.5" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input name="student_ethnicity" placeholder="Etnia" className="input text-xs !py-1.5" />
                  <input name="student_nationality" placeholder="Nacionalidad" className="input text-xs !py-1.5" />
                  <select name="student_has_disability" defaultValue="" className="select text-xs !py-1.5">
                    <option value="" disabled>¿Discapacidad?</option>
                    {YES_NO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <input name="student_disability_type" placeholder="Tipo de discapacidad (si aplica)" className="input text-xs !py-1.5" />
                <div className="grid grid-cols-2 gap-2">
                  <input name="student_gender_diversity" placeholder="Diversidad de género / orientación sexual" className="input text-xs !py-1.5" />
                  <input name="student_other_conditions" placeholder="Otras condiciones relevantes" className="input text-xs !py-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">N° trámite en distrito</label>
                    <input name="district_case_number" className="input text-xs !py-1.5" />
                  </div>
                  <div>
                    <label className="label text-xs">Fecha de ingreso en distrito</label>
                    <input type="date" name="district_intake_date" className="input text-xs !py-1.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input name="protection_measures_institution" placeholder="Institución que emite medidas de protección" className="input text-xs !py-1.5" />
                  <input name="protection_measures_description" placeholder="Descripción de las medidas (si no hay Plan de Acompañamiento)" className="input text-xs !py-1.5" />
                </div>
                <input name="has_accompaniment_plan" placeholder="¿Cuenta con plan de acompañamiento/atención? (se detecta automático si ya existe)" className="input text-xs !py-1.5" />
                <div className="grid grid-cols-2 gap-2">
                  <select name="fiscalia_complaint" defaultValue="" className="select text-xs !py-1.5">
                    <option value="" disabled>¿Denuncia en Fiscalía? (si no hay Plan)</option>
                    {YES_NO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select name="jcpdna_complaint" defaultValue="" className="select text-xs !py-1.5">
                    <option value="" disabled>¿Denuncia en JCPDNA? (si no hay Plan)</option>
                    {YES_NO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <input name="case_current_status" placeholder="Estado actual del caso" className="input text-xs !py-1.5" />
                <div className="flex items-center justify-end mb-1"><AIAssistButton targetId={`matrix-obs-${caseFile.id}`} caseId={caseFile.id} fieldLabel="Observaciones en matriz de riesgo" /></div><textarea id={`matrix-obs-${caseFile.id}`} name="observations" rows={2} placeholder="Observaciones y/o nudos críticos" className="textarea text-xs" />
                <button type="submit" className="btn-secondary text-xs w-full">Guardar entrada de la matriz</button>
              </form>
            </details>
            <div className="space-y-2">
              {riskMatrixEntries.map((e) => (
                <div key={e.id} className="text-xs border-b border-slate-100 pb-2 flex justify-between items-start">
                  <div>
                    <span className="font-medium">{monthLabel(e.report_month)}</span>
                    <span className="text-slate-400"> — {e.case_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 whitespace-nowrap">{e.case_current_status || ""}</span>
                    <DeleteButton
                      onDelete={async () => {
                        "use server";
                        await deleteRiskMatrixEntry(e.id, caseFile.id);
                      }}
                      confirmMessage="¿Quitar este caso de la Matriz de Riesgos de este mes? Esta acción no se puede deshacer."
                    />
                  </div>
                </div>
              ))}
              {riskMatrixEntries.length === 0 && <p className="text-sm text-slate-400">Este caso aún no está incluido en la matriz.</p>}
            </div>
          </section>

          {/* Checklist del expediente */}
          <section id="checklist" className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Checklist del expediente</h2>

            {searchParams?.checklist_guardado === "1" && (
              <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                ✓ Checklist guardado correctamente.
              </p>
            )}

            {searchParams?.checklist_error && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                ⚠️ {searchParams.checklist_error}
              </p>
            )}

            {checklistItems.length === 0 && (
              <p className="text-sm text-slate-500 mb-3">Este caso todavía no tiene ningún checklist de expediente.</p>
            )}

            <div className="space-y-6">
              {Array.from(checklistsByCategory.entries()).map(([category, items]) => (
                <div key={category} className={availableChecklistCategories.length > 0 ? "border-b border-slate-100 pb-5" : ""}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase">{CHECKLIST_CATEGORY_LABELS[category]}</p>
                    <Link
                      href={`/casos/${caseFile.id}/checklist/imprimir?categoria=${category}`}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      🖨️ Imprimir
                    </Link>
                  </div>
                  <form action={boundSaveChecklist} className="space-y-4">
                    <div className="overflow-x-auto -mx-1">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-200">
                            <th className="py-1 px-1 w-8">N°</th>
                            <th className="py-1 px-1">Ítem</th>
                            <th className="py-1 px-1 w-28 text-center">Sí / No</th>
                            <th className="py-1 px-1 w-40">Observaciones</th>
                            <th className="py-1 px-1 w-40">Respaldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it) => {
                            const respaldo = checklistAttachmentsById.get(it.id);
                            return (
                            <tr key={it.id} className="border-b border-slate-100 align-top">
                              <td className="py-2 px-1 text-slate-400">{it.item_order}</td>
                              <td className="py-2 px-1">{it.item_text}</td>
                              <td className="py-2 px-1">
                                <div className="flex justify-center gap-3">
                                  <label className="flex items-center gap-1">
                                    <input type="radio" name={`status_${it.id}`} value="SI" defaultChecked={it.status === "SI"} /> Sí
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input type="radio" name={`status_${it.id}`} value="NO" defaultChecked={it.status === "NO"} /> No
                                  </label>
                                </div>
                              </td>
                              <td className="py-2 px-1">
                                <input name={`obs_${it.id}`} defaultValue={it.observations || ""} className="input !py-1 text-xs" />
                              </td>
                              <td className="py-2 px-1 text-[11px] text-slate-500">
                                {respaldo ? (
                                  <a href={`/api/attachments/${respaldo.id}`} target="_blank" className="text-brand-700 hover:underline">
                                    📎 adjunto
                                  </a>
                                ) : (
                                  <span className="text-slate-300">— sin respaldo —</span>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Revisado y seguimiento por</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {checklistReviews.map((r) => {
                          const key = checklistRoleKey(r.role_label);
                          return (
                            <div key={r.role_label} className="space-y-1">
                              <label className="label text-xs">{r.role_label}</label>
                              <input name={`rev_name_${key}`} defaultValue={r.full_name || ""} placeholder="Nombre" className="input !py-1 text-xs" />
                              <input type="date" name={`rev_date_${key}`} defaultValue={r.signed_date || ""} className="input !py-1 text-xs" />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="btn-primary">Guardar checklist</button>
                    </div>
                  </form>

                  {/* Respaldos documentales por ítem — formularios independientes
                      (no anidados) para que el archivo se envíe correctamente. */}
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Respaldos documentales del expediente</h3>
                    <p className="text-xs text-slate-400 mb-3">
                      Sube el documento de cada requisito (oficio + acuse de recibo, actas, informes…). Al adjuntarlo, el ítem queda en «SÍ».
                      Formatos: PDF, imagen, Word o Excel — máx. 15 MB.
                    </p>
                    <ul className="space-y-2">
                      {items.map((it) => {
                        const respaldo = checklistAttachmentsById.get(it.id);
                        return (
                          <li key={it.id} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs border-b border-slate-100 pb-2">
                            <span className="flex-1 text-slate-700">
                              <span className="text-slate-400 mr-1">{it.item_order}.</span>
                              {it.item_text}
                            </span>
                            {respaldo ? (
                              <div className="flex items-center gap-3 shrink-0">
                                <a href={`/api/attachments/${respaldo.id}`} target="_blank" className="text-brand-700 hover:underline max-w-[12rem] truncate" title={respaldo.filename}>
                                  📎 {respaldo.filename}
                                </a>
                                <form action={unlinkChecklistItemAttachment.bind(null, caseFile.id, it.id)}>
                                  <button type="submit" className="text-red-600 hover:underline">quitar</button>
                                </form>
                              </div>
                            ) : (
                              <form
                                action={uploadChecklistItemAttachment.bind(null, caseFile.id, it.id)}
                                encType="multipart/form-data"
                                className="flex items-center gap-2 shrink-0"
                              >
                                <input
                                  type="file"
                                  name="respaldo_file"
                                  required
                                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                  className="text-[11px] w-44 file:mr-1 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-0.5 file:text-[10px]"
                                />
                                <button type="submit" className="text-[11px] font-semibold text-brand-700 hover:underline">adjuntar</button>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {availableChecklistCategories.length > 0 && (
              <form action={boundEnsureChecklist} className="space-y-3 mt-2 pt-2">
                <p className="text-sm text-slate-500">
                  {checklistItems.length > 0
                    ? "¿Este caso también necesita otro tipo de checklist? Elige cuál agregar:"
                    : "Aún no se ha creado el checklist de expediente de este caso. Elige la categoría según el tipo de caso (se sugiere una según el tipo de riesgo registrado, pero puedes cambiarla):"}
                </p>
                <select name="category" defaultValue={suggestChecklistCategory(caseFile.risk_type)} className="select">
                  {availableChecklistCategories.map((k) => (
                    <option key={k} value={k}>{CHECKLIST_CATEGORY_LABELS[k]}</option>
                  ))}
                </select>
                <button type="submit" className="btn-secondary">
                  {checklistItems.length > 0 ? "Agregar checklist" : "Crear checklist"}
                </button>
              </form>
            )}
          </section>


          {/* Derivaciones */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Derivaciones</h2>
              <Link href={`/casos/${caseFile.id}/derivaciones/nueva`} className="text-xs text-brand-700 hover:underline">
                + Ficha de derivación oficial
              </Link>
            </div>
            <form action={boundCreateReferral} className="space-y-3 mb-5 border-b border-slate-100 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select name="scope" className="select">
                  <option value="INTERNA">Interna (dentro de la institución)</option>
                  <option value="EXTERNA">Externa (otra institución/entidad)</option>
                </select>
                <input name="institution" required placeholder="Institución/entidad (MIES, Fiscalía, Centro de salud...)" className="input" />
              </div>
              <div className="flex items-center justify-end">
                <AIAssistButton targetId={`referral-reason-${caseFile.id}`} caseId={caseFile.id} fieldLabel="Motivo de la derivación" /><VoiceDictationButton targetId={`referral-reason-${caseFile.id}`} />
              </div>
              <textarea id={`referral-reason-${caseFile.id}`} name="reason" required rows={2} placeholder="Motivo de la derivación..." className="textarea" />
              <button type="submit" className="btn-secondary">+ Registrar derivación</button>
            </form>
            <div className="space-y-3">
              {referrals.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{r.institution}</span>{" "}
                      <span className="text-xs text-slate-400">({r.scope === "INTERNA" ? "Interna" : "Externa"})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={r.status === "CERRADA" ? "green" : r.status === "PENDIENTE" ? "amber" : "blue"}>
                        {REFERRAL_STATUS_LABELS[r.status]}
                      </Badge>
                      <Link
                        href={`/casos/${caseFile.id}/derivaciones/${r.id}/editar`}
                        className="text-xs text-slate-700 hover:underline whitespace-nowrap"
                      >
                        ✏️ Editar
                      </Link>
                      <a
                        href={`/api/casos/${caseFile.id}/derivaciones/${r.id}/export-word`}
                        className="text-xs text-blue-700 hover:underline whitespace-nowrap font-medium"
                      >
                        📄 Word
                      </a>
                      <Link href={`/casos/${caseFile.id}/derivaciones/${r.id}/imprimir`} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
                        🖨️ Imprimir
                      </Link>
                      <DeleteButton
                        onDelete={async () => {
                          "use server";
                          await deleteReferral(r.id, caseFile.id);
                        }}
                        confirmMessage="¿Borrar esta derivación? Esta acción no se puede deshacer."
                      />
                    </div>
                  </div>
                  <p className="text-slate-600 mt-1">{r.reason}</p>
                  <div className="text-xs text-slate-400 mt-1">
                    {formatDate(r.referral_date)}
                  </div>
                  {r.response_notes && <p className="text-xs text-slate-500 mt-1">Respuesta: {r.response_notes}</p>}
                  {r.status !== "CERRADA" && (
                    <form action={async (fd: FormData) => { "use server"; await updateReferralStatus(r.id, caseFile.id, fd); }} className="mt-2 flex flex-wrap gap-2 items-center">
                      <select name="status" defaultValue={r.status} className="select text-xs !py-1 max-w-[140px]">
                        {Object.entries(REFERRAL_STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <input name="response_notes" placeholder="Notas de respuesta" className="input text-xs !py-1 max-w-xs" />
                      <button className="btn-secondary text-xs !py-1">Actualizar</button>
                    </form>
                  )}
                </div>
              ))}
              {referrals.length === 0 && <p className="text-sm text-slate-400">Sin derivaciones registradas.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Estado */}
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Estado del caso</h2>
            <form action={boundUpdateStatus} className="space-y-3">
              <select name="status" defaultValue={caseFile.status} className="select">
                {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <div className="flex items-center justify-end mb-1"><AIAssistButton targetId={`closure-reason-${caseFile.id}`} caseId={caseFile.id} fieldLabel="Motivo de cierre del caso" /></div><textarea id={`closure-reason-${caseFile.id}`} name="closure_reason" rows={2} placeholder="Motivo de cierre (si aplica)..." className="textarea" />
              <button type="submit" className="btn-primary w-full">Actualizar estado</button>
            </form>
          </section>

          <AttachmentsSection caseId={caseFile.id} attachments={attachments} />

          {/* Citas */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Citas del caso</h2>
              <Link href={`/citas/nueva?caso=${caseFile.id}&estudiante=${student.id}`} className="text-xs text-brand-700 hover:underline">
                + Agendar
              </Link>
            </div>
            <div className="space-y-2">
              {appointments.map((a) => (
                <div key={a.id} className="text-sm border-b border-slate-100 pb-2">
                  <div className="flex justify-between">
                    <span>{formatDate(a.date)} {a.start_time}</span>
                    <Badge>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                  </div>
                  <div className="text-slate-500 text-xs">{a.title}</div>
                </div>
              ))}
              {appointments.length === 0 && <p className="text-sm text-slate-400">Sin citas registradas.</p>}
            </div>
          </section>

          {/* Llamadas telefónicas y seguimiento */}
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">📞 Llamadas y seguimiento</h2>
            <details className="mb-3">
              <summary className="text-xs text-brand-700 hover:underline cursor-pointer">+ Registrar llamada</summary>
              <form action={boundCreateCallLog} className="space-y-2 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <input name="contact_name" placeholder="Nombre del contacto" className="input text-xs !py-1.5" />
                  <input name="contact_relation" placeholder="Relación (madre, docente...)" className="input text-xs !py-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input name="phone_number" placeholder="N° teléfono" className="input text-xs !py-1.5" />
                  <input type="date" name="call_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input text-xs !py-1.5" />
                </div>
                <textarea id={`call-reason-${caseFile.id}`} name="reason" required rows={2} placeholder="Motivo de la llamada..." className="textarea text-xs" />
                <div className="flex items-center justify-end mb-1"><AIAssistButton targetId={`call-result-${caseFile.id}`} caseId={caseFile.id} fieldLabel="Resultado / acuerdo de la llamada" /></div><textarea id={`call-result-${caseFile.id}`} name="result" rows={2} placeholder="Resultado / acuerdo..." className="textarea text-xs" />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" name="follow_up_needed" className="rounded" />
                    Requiere seguimiento
                  </label>
                  <input type="date" name="follow_up_date" className="input text-xs !py-1 max-w-[140px]" />
                </div>
                <button type="submit" className="btn-secondary text-xs w-full">Guardar llamada</button>
              </form>
            </details>
            <div className="space-y-2">
              {callLogs.map((c) => (
                <div key={c.id} className="text-xs border-b border-slate-100 pb-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{c.contact_name || "Contacto s/n"}{c.contact_relation ? ` (${c.contact_relation})` : ""}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 whitespace-nowrap">{formatDate(c.call_date)}</span>
                      <DeleteButton
                        onDelete={async () => {
                          "use server";
                          await deleteCallLog(c.id, caseFile.id);
                        }}
                        confirmMessage="¿Borrar este registro de llamada? Esta acción no se puede deshacer."
                      />
                    </div>
                  </div>
                  <p className="text-slate-600">{c.reason}</p>
                  {c.follow_up_needed === 1 && (
                    <Badge color="amber">Seguimiento{c.follow_up_date ? ` — ${formatDate(c.follow_up_date)}` : ""}</Badge>
                  )}
                </div>
              ))}
              {callLogs.length === 0 && <p className="text-sm text-slate-400">Sin llamadas registradas.</p>}
            </div>
          </section>

          {/* Registro de asesoría a docentes tutores */}
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">👩‍🏫 Asesoría a docentes tutores</h2>
            <details className="mb-3">
              <summary className="text-xs text-brand-700 hover:underline cursor-pointer">+ Registrar asesoría</summary>
              <form action={boundCreateAdvisoryLog} className="space-y-2 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <input name="tutor_name" required placeholder="Docente tutor/a" className="input text-xs !py-1.5" />
                  <select name="jornada" defaultValue="" className="select text-xs !py-1.5">
                    <option value="" disabled>Jornada...</option>
                    <option value="MATUTINA">Matutina</option>
                    <option value="VESPERTINA">Vespertina</option>
                    <option value="NOCTURNA">Nocturna</option>
                  </select>
                </div>
                <input type="date" name="log_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input text-xs !py-1.5" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Dificultad detectada *</span>
                  <AIAssistButton
                    targetId={`advisory-difficulty-${caseFile.id}`}
                    caseId={caseFile.id}
                    fieldLabel="Dificultad detectada en la asesoría a un docente tutor"
                  />
                </div>
                <textarea id={`advisory-difficulty-${caseFile.id}`} name="difficulty_detected" required rows={2} placeholder="Dificultad detectada..." className="textarea text-xs" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Asesoría / recomendaciones *</span>
                  <AIAssistButton
                    targetId={`advisory-advice-${caseFile.id}`}
                    caseId={caseFile.id}
                    fieldLabel="Asesoría y recomendaciones brindadas a un docente tutor"
                  />
                </div>
                <textarea id={`advisory-advice-${caseFile.id}`} name="advice_given" required rows={2} placeholder="Asesoría / recomendaciones..." className="textarea text-xs" />
                <button type="submit" className="btn-secondary text-xs w-full">Guardar asesoría</button>
              </form>
            </details>
            <div className="space-y-2">
              {advisoryLogs.map((a) => (
                <div key={a.id} className="text-xs border-b border-slate-100 pb-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{a.tutor_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 whitespace-nowrap">{formatDate(a.log_date)}</span>
                      <DeleteButton
                        onDelete={async () => {
                          "use server";
                          await deleteAdvisoryLog(a.id, caseFile.id);
                        }}
                        confirmMessage="¿Borrar este registro de asesoría? Esta acción no se puede deshacer."
                      />
                    </div>
                  </div>
                  <p className="text-slate-600">{a.difficulty_detected}</p>
                </div>
              ))}
              {advisoryLogs.length === 0 && <p className="text-sm text-slate-400">Sin asesorías registradas.</p>}
            </div>
          </section>

          <section className="card p-5 text-xs text-slate-400">
            Código: {caseFile.code}<br />
            Abierto por: {authorMap.get(caseFile.opened_by_id) || "—"}<br />
            Responsable: {caseFile.assigned_to_id ? authorMap.get(caseFile.assigned_to_id) : "—"}<br />
            Creado: {formatDateTime(caseFile.created_at)}<br />
            Última actualización: {formatDateTime(caseFile.updated_at)}
          </section>
        </div>
      </div>
    </div>
  );
}
