import type { ChecklistCategory } from "./types";

/**
 * Catálogos de ítems de checklist de expediente, transcritos de los formatos
 * oficiales:
 *  - CHECK LIST CASOS VIOLENCIA SEXUAL 2023
 *  - CHECK LIST VIOLENCIA TODO TIPO NO SEXUAL 2023
 *  - CHECK LIST CASOS ATENCIÓN PSICOSOCIAL 2023
 */
export const CHECKLIST_CATALOGS: Record<ChecklistCategory, string[]> = {
  VIOLENCIA_SEXUAL: [
    "Ficha individual de la/el estudiante — datos informativos (copias de cédulas, estudiante y representante)",
    "Ficha de notificación de alerta (dependiendo el caso)",
    "Ficha de observación (dependiendo el caso)",
    "Ficha de consentimiento informado",
    "Entrevista — Ficha de Reporte de Hecho de violencia",
    "Oficio de derivación del caso a la autoridad institucional",
    "Oficio de la autoridad institucional de la denuncia derivada a instancias externas: Distrito Educativo y otros",
    "Denuncia en Fiscalía",
    "Denuncia a la Junta Cantonal de Protección de Derechos",
    "Ficha de derivación (MSP, DINAPEN, UDAI) (de acuerdo al modelo DECE)",
    "Informe técnico de acompañamiento a la víctima",
    "Documentos de socialización de caso a docentes de curso (actas de reunión, circular, informes, oficios)",
    "Acciones preventivas (formatos propios de la actividad, registros de asistencia/fotográfico); especificar en observaciones",
    "Plan de acompañamiento y restitución — Ficha de seguimiento al plan (formato emitido), bimensual",
    "Otros documentos que respalden la intervención/seguimiento (resoluciones JDRC, Fiscalía, JCPD, certificados/informes de atención psicológica, registro individual de atención al padre de familia, notificación al usuario, entre otros)",
    "Informe psicopedagógico (si requiere el caso)",
    "Informe técnico de avance del caso anual / Informe de cierre del caso / Informe de traslado",
    "Ayuda memoria actualizada (si requiere el caso)",
  ],
  VIOLENCIA_NO_SEXUAL: [
    "Ficha de datos informativos de la/el estudiante (de acuerdo al Modelo DECE)",
    "Ficha de reporte del hecho de violencia",
    "Informe técnico de hecho de violencia (cuando es requerido)",
    "Oficio a la autoridad institucional notificando el caso",
    "Oficio de la autoridad institucional de la denuncia derivada a instancias externas (Fiscalía, Distrito, Junta Cantonal u otras, si es requerido)",
    "Informe técnico de acompañamiento a víctimas de violencia",
    "Ficha de derivación del caso a instancias internas (DIE, DPA, Inspección, UDAI, DDE, otro)",
    "Ficha de derivación interinstitucional del caso a instancias externas (UEP, MSP, MIES, MMDH, otro)",
    "Plan de Atención Psicosocial y seguimiento (Modelo DECE), con las respectivas evidencias",
    "Acciones preventivas (formatos propios de la actividad, registros de asistencia/fotográfico); especificar en observaciones",
    "Otros documentos que respalden la intervención/seguimiento (resoluciones JDRC, Fiscalía, Junta Cantonal, certificados de atención psicológica u otros)",
  ],
  ATENCION_PSICOSOCIAL: [
    "Ficha de datos informativos del estudiante",
    "Ficha de notificación de alerta",
    "Consentimiento informado de atención psicosocial (autorización de representantes)",
    "Ficha de observación: resultado análisis situacional (en caso de requerir)",
    "Entrevista de atención psicosocial (estudiante/representante legal/docente)",
    "Plan de Atención Psicosocial y seguimiento",
    "Ficha de derivación para atención externa",
    "Informe técnico del caso (de ser requerido)",
    "Otros documentos que respalden la intervención y/o seguimiento del caso",
  ],
};

export const CHECKLIST_REVIEW_ROLES = ["Analista DECE", "Coordinador/a DECE", "DECE Distrital"];

/** Convierte un nombre de rol a una clave segura para usar en inputs de formulario. */
export function checklistRoleKey(role: string): string {
  return role.replace(/[^a-zA-Z]/g, "");
}

/** Sugiere la categoría de checklist más apropiada según el tipo de riesgo del caso. */
export function suggestChecklistCategory(riskType: string): ChecklistCategory {
  if (riskType === "VIOLENCIA_SEXUAL") return "VIOLENCIA_SEXUAL";
  if (["VIOLENCIA_INTRAFAMILIAR", "VIOLENCIA_ESCOLAR_BULLYING", "VULNERACION_DERECHOS"].includes(riskType)) {
    return "VIOLENCIA_NO_SEXUAL";
  }
  return "ATENCION_PSICOSOCIAL";
}
