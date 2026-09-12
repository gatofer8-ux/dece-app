import { db } from "@/lib/db";

export type CustodyStatus = "DIGITAL" | "FISICO" | "PENDIENTE";

export interface CaseCustodyDocumentItem {
  id: string;
  moduleKey: string;
  moduleName: string;
  docTitle: string;
  date: string;
  viewUrl: string;
  editUrl?: string;
  printUrl?: string;
  signatureType?: string | null;
  physicalFileRef?: string | null;
  physicalEvidenceUrl?: string | null;
  status: CustodyStatus;
}

export function resolveCustodyStatus(item: {
  physical_file_ref?: string | null;
  physical_evidence_url?: string | null;
  signature_type?: string | null;
}): CustodyStatus {
  const hasEvidence = Boolean(item.physical_evidence_url && item.physical_evidence_url.trim());
  const hasRef = Boolean(item.physical_file_ref && item.physical_file_ref.trim());
  const isDigital = item.signature_type === "DIGITAL";

  if (hasEvidence || (hasRef && isDigital)) {
    return "DIGITAL";
  }
  if (hasRef) {
    return "FISICO";
  }
  return "PENDIENTE";
}

export interface InstitutionModuleCustodySummary {
  moduleKey: string;
  moduleName: string;
  totalDocs: number;
  digitalCount: number;
  physicalOnlyCount: number;
  pendingCount: number;
  complianceRate: number; // % (digital + physicalOnly) / total
  digitalRate: number; // % digital / total
}

export interface InstitutionCustodyAuditReport {
  totalDocs: number;
  archivedDocs: number; // digital + physicalOnly
  digitalDocs: number;
  physicalOnlyDocs: number;
  pendingDocs: number;
  globalComplianceRate: number; // %
  globalDigitalRate: number; // %
  modules: InstitutionModuleCustodySummary[];
}

interface TableStats {
  total: number;
  digital: number;
  physicalOnly: number;
  pending: number;
}

function queryCustodyStats(sql: string, params: any[]): TableStats {
  try {
    const row = db.prepare(sql).get(...params) as any;
    const total = Number(row?.total || 0);
    const digital = Number(row?.digital || 0);
    const physicalOnly = Number(row?.physical_only || 0);
    const pending = Number(row?.pending || Math.max(0, total - (digital + physicalOnly)));
    return { total, digital, physicalOnly, pending };
  } catch (err) {
    console.error("[CustodyAudit] Query error:", err);
    return { total: 0, digital: 0, physicalOnly: 0, pending: 0 };
  }
}

function buildCaseJoinSql(tableName: string) {
  return `
    SELECT
      COUNT(*) as total,
      SUM(CASE 
        WHEN (t.physical_evidence_url IS NOT NULL AND TRIM(t.physical_evidence_url) != '') 
             OR ((t.physical_file_ref IS NOT NULL AND TRIM(t.physical_file_ref) != '') AND t.signature_type = 'DIGITAL') 
        THEN 1 ELSE 0 
      END) as digital,
      SUM(CASE 
        WHEN (t.physical_file_ref IS NOT NULL AND TRIM(t.physical_file_ref) != '') 
             AND (t.physical_evidence_url IS NULL OR TRIM(t.physical_evidence_url) = '')
             AND (t.signature_type IS NULL OR t.signature_type != 'DIGITAL')
        THEN 1 ELSE 0 
      END) as physical_only,
      SUM(CASE 
        WHEN (t.physical_file_ref IS NULL OR TRIM(t.physical_file_ref) = '') 
             AND (t.physical_evidence_url IS NULL OR TRIM(t.physical_evidence_url) = '')
        THEN 1 ELSE 0 
      END) as pending
    FROM ${tableName} t
    INNER JOIN case_files cf ON t.case_file_id = cf.id
    WHERE cf.institution_id = ?
  `;
}

function buildDirectInstSql(tableName: string) {
  return `
    SELECT
      COUNT(*) as total,
      SUM(CASE 
        WHEN (physical_evidence_url IS NOT NULL AND TRIM(physical_evidence_url) != '') 
             OR ((physical_file_ref IS NOT NULL AND TRIM(physical_file_ref) != '') AND signature_type = 'DIGITAL') 
        THEN 1 ELSE 0 
      END) as digital,
      SUM(CASE 
        WHEN (physical_file_ref IS NOT NULL AND TRIM(physical_file_ref) != '') 
             AND (physical_evidence_url IS NULL OR TRIM(physical_evidence_url) = '')
             AND (signature_type IS NULL OR signature_type != 'DIGITAL')
        THEN 1 ELSE 0 
      END) as physical_only,
      SUM(CASE 
        WHEN (physical_file_ref IS NULL OR TRIM(physical_file_ref) = '') 
             AND (physical_evidence_url IS NULL OR TRIM(physical_evidence_url) = '')
        THEN 1 ELSE 0 
      END) as pending
    FROM ${tableName}
    WHERE institution_id = ?
  `;
}

export function getInstitutionCustodyAudit(institutionId: string): InstitutionCustodyAuditReport {
  // 1. Expedientes y Casos de Estudiantes (Documentos vinculados a case_files)
  const caseTables = [
    "case_interviews",
    "case_observation_sheets",
    "case_care_plans",
    "case_restitution_plans",
    "violence_reports",
    "socialization_acts",
    "authority_advisory_acts",
    "situational_reports",
    "bimonthly_reports",
    "case_closure_reports",
    "case_corresponsibility_acts",
    "referrals",
    "restorative_circle_consents",
    "case_accompaniment_reports",
  ];

  let caseTotal = 0;
  let caseDigital = 0;
  let casePhysicalOnly = 0;
  let casePending = 0;

  for (const table of caseTables) {
    const stats = queryCustodyStats(buildCaseJoinSql(table), [institutionId]);
    caseTotal += stats.total;
    caseDigital += stats.digital;
    casePhysicalOnly += stats.physicalOnly;
    casePending += stats.pending;
  }

  // 2. Plan Operativo Anual (POAT / action_plans)
  const poatStats = queryCustodyStats(buildDirectInstSql("action_plans"), [institutionId]);

  // 3. Plan Estratégico Bianual (strategic_plans_bianual)
  const bianualStats = queryCustodyStats(buildDirectInstSql("strategic_plans_bianual"), [institutionId]);

  // 4. Informes Anuales de Gestión (annual_management_reports)
  const annualStats = queryCustodyStats(buildDirectInstSql("annual_management_reports"), [institutionId]);

  // 5. ENEIS (eneis_actas + eneis_informes_dece)
  const eneisActasStats = queryCustodyStats(buildDirectInstSql("eneis_actas"), [institutionId]);
  const eneisInformesStats = queryCustodyStats(buildDirectInstSql("eneis_informes_dece"), [institutionId]);
  const eneisCombinedStats = {
    total: eneisActasStats.total + eneisInformesStats.total,
    digital: eneisActasStats.digital + eneisInformesStats.digital,
    physicalOnly: eneisActasStats.physicalOnly + eneisInformesStats.physicalOnly,
    pending: eneisActasStats.pending + eneisInformesStats.pending,
  };

  // 6. Actividades y Talleres (activity_reports)
  const activityStats = queryCustodyStats(buildDirectInstSql("activity_reports"), [institutionId]);

  function calcRate(num: number, denom: number): number {
    return denom > 0 ? Math.round((num / denom) * 100) : 100;
  }

  const moduleItems: { key: string; name: string; stats: TableStats }[] = [
    { key: "casos", name: "Expedientes de Casos (Actas, Informes, Entrevistas)", stats: { total: caseTotal, digital: caseDigital, physicalOnly: casePhysicalOnly, pending: casePending } },
    { key: "poat", name: "Planes de Acción (POAT Anual)", stats: poatStats },
    { key: "bianual", name: "Planes Estratégicos Bianuales", stats: bianualStats },
    { key: "informe_anual", name: "Informes Anuales de Gestión DECE", stats: annualStats },
    { key: "eneis", name: "Comisión y Rendición ENEIS (Actas e Informes)", stats: eneisCombinedStats },
    { key: "actividades", name: "Informes de Actividades y Talleres", stats: activityStats },
  ];

  const modules: InstitutionModuleCustodySummary[] = moduleItems.map((m) => {
    const total = m.stats.total;
    const archived = m.stats.digital + m.stats.physicalOnly;
    return {
      moduleKey: m.key,
      moduleName: m.name,
      totalDocs: total,
      digitalCount: m.stats.digital,
      physicalOnlyCount: m.stats.physicalOnly,
      pendingCount: m.stats.pending,
      complianceRate: calcRate(archived, total),
      digitalRate: calcRate(m.stats.digital, total),
    };
  });

  const totalDocs = modules.reduce((acc, m) => acc + m.totalDocs, 0);
  const digitalDocs = modules.reduce((acc, m) => acc + m.digitalCount, 0);
  const physicalOnlyDocs = modules.reduce((acc, m) => acc + m.physicalOnlyCount, 0);
  const archivedDocs = digitalDocs + physicalOnlyDocs;
  const pendingDocs = modules.reduce((acc, m) => acc + m.pendingCount, 0);

  return {
    totalDocs,
    archivedDocs,
    digitalDocs,
    physicalOnlyDocs,
    pendingDocs,
    globalComplianceRate: calcRate(archivedDocs, totalDocs),
    globalDigitalRate: calcRate(digitalDocs, totalDocs),
    modules,
  };
}

export interface CaseCustodySummaryItem {
  caseId: string;
  total: number;
  digital: number;
  physicalOnly: number;
  pending: number;
  complianceRate: number;
  primaryFileRef?: string | null;
}

/**
 * Consulta de alto rendimiento para obtener el estado de custodia física
 * de una lista de casos para tablas y vistas consolidadas.
 */
export function getCasesCustodyMap(caseIds: string[]): Map<string, CaseCustodySummaryItem> {
  const map = new Map<string, CaseCustodySummaryItem>();
  if (!caseIds || caseIds.length === 0) return map;

  for (const id of caseIds) {
    map.set(id, {
      caseId: id,
      total: 0,
      digital: 0,
      physicalOnly: 0,
      pending: 0,
      complianceRate: 100,
      primaryFileRef: null,
    });
  }

  const placeholders = caseIds.map(() => "?").join(",");
  const caseTables = [
    "case_interviews",
    "case_observation_sheets",
    "case_care_plans",
    "case_restitution_plans",
    "violence_reports",
    "socialization_acts",
    "authority_advisory_acts",
    "situational_reports",
    "bimonthly_reports",
    "case_closure_reports",
    "case_corresponsibility_acts",
    "referrals",
    "restorative_circle_consents",
    "case_accompaniment_reports",
    "dece_esquelas",
  ];

  for (const tbl of caseTables) {
    try {
      const rows = db
        .prepare(
          `SELECT
            case_file_id,
            COUNT(*) as total,
            MAX(CASE WHEN physical_file_ref IS NOT NULL AND TRIM(physical_file_ref) != '' THEN physical_file_ref ELSE NULL END) as sample_ref,
            SUM(CASE 
              WHEN (physical_evidence_url IS NOT NULL AND TRIM(physical_evidence_url) != '') 
                   OR ((physical_file_ref IS NOT NULL AND TRIM(physical_file_ref) != '') AND signature_type = 'DIGITAL') 
              THEN 1 ELSE 0 
            END) as digital,
            SUM(CASE 
              WHEN (physical_file_ref IS NOT NULL AND TRIM(physical_file_ref) != '') 
                   AND (physical_evidence_url IS NULL OR TRIM(physical_evidence_url) = '')
                   AND (signature_type IS NULL OR signature_type != 'DIGITAL')
              THEN 1 ELSE 0 
            END) as physical_only,
            SUM(CASE 
              WHEN (physical_file_ref IS NULL OR TRIM(physical_file_ref) = '') 
                   AND (physical_evidence_url IS NULL OR TRIM(physical_evidence_url) = '')
              THEN 1 ELSE 0 
            END) as pending
          FROM ${tbl}
          WHERE case_file_id IN (${placeholders})
          GROUP BY case_file_id`
        )
        .all(...caseIds) as any[];

      for (const r of rows) {
        const item = map.get(r.case_file_id);
        if (item) {
          item.total += Number(r.total || 0);
          item.digital += Number(r.digital || 0);
          item.physicalOnly += Number(r.physical_only || 0);
          item.pending += Number(r.pending || 0);
          if (!item.primaryFileRef && r.sample_ref) {
            item.primaryFileRef = r.sample_ref;
          }
        }
      }
    } catch {
      // Ignorar si alguna tabla opcional no está presente
    }
  }

  for (const item of map.values()) {
    const archived = item.digital + item.physicalOnly;
    item.complianceRate = item.total > 0 ? Math.round((archived / item.total) * 100) : 100;
  }

  return map;
}