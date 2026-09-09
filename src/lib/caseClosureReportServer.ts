import { db } from "@/lib/db";
import type {
  CaseFileRow,
  BimonthlyReportRow,
} from "@/lib/types";
import { parseProcessesData } from "./bimonthlyReport";
import type { BimonthlyConsolidatedItem } from "./caseClosureReport";

/**
 * Obtiene todos los informes bimensuales del caso para el consolidado anual
 */
export function getCaseBimonthlyReports(
  caseFileId: string
): BimonthlyConsolidatedItem[] {
  try {
    const rows = db
      .prepare(
        `SELECT * FROM bimonthly_reports 
         WHERE case_file_id = ? 
         ORDER BY created_at ASC`
      )
      .all(caseFileId) as BimonthlyReportRow[];

    return rows.map((r) => ({
      id: r.id,
      period_months: r.period_months,
      school_year_text: r.school_year_text,
      created_at: r.created_at,
      processes: parseProcessesData(r.processes_data),
    }));
  } catch (err) {
    console.error("[getCaseBimonthlyReports] error:", err);
    return [];
  }
}

/**
 * Recopila las fechas y acciones de atención psicosocial del caso
 */
export function getCasePsychosocialActionsSummary(caseFileId: string): string {
  try {
    const caseFile = db
      .prepare(`SELECT * FROM case_files WHERE id = ?`)
      .get(caseFileId) as CaseFileRow | undefined;

    if (!caseFile) return "";

    const lines: string[] = [];

    // Detección
    const detDate = caseFile.detection_date
      ? caseFile.detection_date.split("T")[0]
      : caseFile.created_at
      ? caseFile.created_at.split("T")[0]
      : "Fecha inicial";
    lines.push(
      `• Detección: ${detDate}.- Registro inicial del hecho y apertura de expediente confidencial bajo código ${caseFile.code}.`
    );

    // Intervención Familiar e Institucional desde case_actions
    try {
      const actions = db
        .prepare(`SELECT * FROM case_actions WHERE case_file_id = ? ORDER BY date ASC`)
        .all(caseFileId) as any[];

      const famAction = actions.find(
        (a) =>
          a.intervention_type === "FAMILIAR" ||
          (a.description && a.description.toLowerCase().includes("familiar"))
      );
      if (famAction) {
        lines.push(
          `• Intervención Familiar: ${
            famAction.date ? famAction.date.split("T")[0] : detDate
          }.- ${famAction.description || "Abordaje y contención socioemocional a la familia."}`
        );
      } else {
        lines.push(
          `• Intervención Familiar: ${detDate}.- Abordaje socioemocional inicial y asesoramiento a la familia.`
        );
      }

      const instAction = actions.find(
        (a) =>
          a.intervention_type === "INSTITUCIONAL" ||
          (a.description && a.description.toLowerCase().includes("institucional"))
      );
      if (instAction) {
        lines.push(
          `• Intervención Institucional: ${
            instAction.date ? instAction.date.split("T")[0] : detDate
          }.- ${
            instAction.description ||
            "Activación de medidas de protección institucional."
          }`
        );
      } else {
        lines.push(
          `• Intervención Institucional: ${detDate}.- Activación de medidas inmediatas de protección y salvaguarda en el entorno escolar.`
        );
      }
    } catch {
      lines.push(
        `• Intervención Familiar: ${detDate}.- Abordaje socioemocional inicial y asesoramiento a la familia.`
      );
      lines.push(
        `• Intervención Institucional: ${detDate}.- Activación de medidas inmediatas de protección y salvaguarda en el entorno escolar.`
      );
    }

    // Seguimiento
    try {
      const bmCount = db
        .prepare(
          `SELECT count(*) as count FROM bimonthly_reports WHERE case_file_id = ?`
        )
        .get(caseFileId) as { count: number };

      if (bmCount && bmCount.count > 0) {
        lines.push(
          `• Seguimiento: Acompañamiento integral, observación áulica y monitoreo socioemocional continuo registrado en los ${bmCount.count} seguimientos bimensuales durante el año lectivo.`
        );
      } else {
        lines.push(
          `• Seguimiento: Acompañamiento socioemocional periódico, observación áulica y coordinación con docentes tutores durante el año lectivo.`
        );
      }
    } catch {
      lines.push(
        `• Seguimiento: Acompañamiento socioemocional periódico y monitoreo durante el año escolar.`
      );
    }

    // Derivación (tabla 'referrals')
    try {
      const referrals = db
        .prepare(`SELECT * FROM referrals WHERE case_file_id = ? ORDER BY referral_date ASC`)
        .all(caseFileId) as any[];

      if (referrals.length > 0) {
        const refTargets = referrals
          .map(
            (r) =>
              `${r.institution || "Entidad externa"} (${
                r.referral_date ? r.referral_date.split("T")[0] : ""
              })`
          )
          .join(", ");
        lines.push(
          `• Derivación: Notificación oficial y derivación a entidades externas de protección: ${refTargets}.`
        );
      } else {
        lines.push(
          `• Derivación: ${detDate}.- Activación de rutas y protocolos institucionales frente a presunta vulneración de derechos.`
        );
      }
    } catch {
      lines.push(
        `• Derivación: ${detDate}.- Activación de rutas y protocolos institucionales frente a presunta vulneración de derechos.`
      );
    }

    // Reparación (tabla 'case_restitution_plans')
    try {
      const restitutions = db
        .prepare(
          `SELECT * FROM case_restitution_plans WHERE case_file_id = ? ORDER BY elaboration_date ASC`
        )
        .all(caseFileId) as any[];

      if (restitutions.length > 0) {
        const restDate = restitutions[0].elaboration_date
          ? restitutions[0].elaboration_date.split("T")[0]
          : detDate;
        lines.push(
          `• Reparación: ${restDate}.- Elaboración e implementación del Plan de Acompañamiento y Restitución de Derechos.`
        );
      } else {
        lines.push(
          `• Reparación: Implementación de medidas de protección institucional, contención socioemocional y garantía de no revictimización.`
        );
      }
    } catch {
      lines.push(
        `• Reparación: Implementación de medidas de protección institucional, contención socioemocional y garantía de no revictimización.`
      );
    }

    return lines.join("\n\n");
  } catch (err) {
    console.error("[getCasePsychosocialActionsSummary] error:", err);
    return "• Detección: Apertura de expediente confidencial.\n\n• Intervención Familiar: Abordaje socioemocional y contención a la familia.\n\n• Intervención Institucional: Activación de medidas inmediatas de protección.\n\n• Seguimiento: Acompañamiento y monitoreo continuo.\n\n• Derivación: Activación de rutas conforme a la normativa legal.\n\n• Reparación: Garantía de permanencia educativa y no revictimización.";
  }
}
