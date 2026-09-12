/**
 * Catálogo y utilidades puras del módulo de Oficios institucionales del DECE.
 *
 * IMPORTANTE: este archivo es CLIENT-SAFE. No debe importar `db`, `crypto` ni
 * ningún módulo de servidor, porque `OficioForm.tsx` ("use client") lo importa.
 *
 * Un oficio es la correspondencia formal saliente del DECE dirigida a la máxima
 * autoridad institucional o a una entidad externa. NO es un documento único:
 * se emite para circunstancias muy distintas (reportar una situación de riesgo,
 * pedir autorización para una actividad de prevención, coordinar con un
 * organismo externo, notificar algo). Cada circunstancia tiene su propio
 * párrafo de encuadre (`body_intro`) por defecto.
 */

import type { OficioType, OficioRow } from "./types";

export interface OficioTypeOption {
  value: OficioType;
  label: string;
  /** Cuándo se usa este tipo de oficio (se muestra como ayuda en el formulario). */
  description: string;
  icon: string;
}

export const OFICIO_TYPE_OPTIONS: OficioTypeOption[] = [
  {
    value: "INFORME_RIESGO_VIOLENCIA",
    label: "Informe de situación de riesgo psicosocial o violencia",
    description:
      "Para poner en conocimiento de la máxima autoridad una presunta situación de violencia o un riesgo psicosocial y solicitar la activación de rutas y protocolos. Incluye la cita del Art. 63.4 (Debida Diligencia).",
    icon: "🚨",
  },
  {
    value: "SOLICITUD_APROBACION_ACTIVIDAD",
    label: "Solicitud de autorización de una actividad",
    description:
      "Para solicitar a la rectora/rector la autorización de un taller, charla, campaña o cualquier actividad de promoción y prevención del DECE.",
    icon: "✅",
  },
  {
    value: "COORDINACION_ORGANISMO_EXTERNO",
    label: "Coordinación con un organismo externo",
    description:
      "Para articular una actividad, derivación o intervención conjunta con una entidad externa (MSP, Junta Cantonal de Protección de Derechos, DINAPEN, ONG, otra institución pública).",
    icon: "🤝",
  },
  {
    value: "NOTIFICACION_INFORMATIVA",
    label: "Notificación informativa",
    description:
      "Para informar a la máxima autoridad sobre una situación, decisión o proceso del DECE, sin solicitar necesariamente una acción.",
    icon: "📣",
  },
  {
    value: "OTRO",
    label: "Otro (redacción libre)",
    description:
      "Oficio completamente libre, sin párrafo de encuadre precargado. Se redacta íntegramente según la necesidad.",
    icon: "📝",
  },
];

export const OFICIO_TYPE_LABELS: Record<OficioType, string> = {
  INFORME_RIESGO_VIOLENCIA: "Informe de situación de riesgo psicosocial o violencia",
  SOLICITUD_APROBACION_ACTIVIDAD: "Solicitud de autorización de una actividad",
  COORDINACION_ORGANISMO_EXTERNO: "Coordinación con un organismo externo",
  NOTIFICACION_INFORMATIVA: "Notificación informativa",
  OTRO: "Otro (redacción libre)",
};

/** Párrafo del Art. 63.4 "Debida Diligencia" tal como se cita en el modelo institucional. */
export const DEBIDA_DILIGENCIA_TEXT =
  "Reciba un cordial saludo deseándole éxitos en sus funciones. En cumplimiento con el Art. 63.4.- Debida Diligencia.- Es obligación de todas las personas integrantes de la comunidad educativa que lleguen a tener conocimiento de un acto de vulneración de derechos contra las y los estudiantes u otra persona de la comunidad educativa, el denunciarlo a las autoridades competentes, en el plazo máximo de cuarenta y ocho horas. Las autoridades educativas tienen la obligación de iniciar los procesos de investigación cuando conozcan cualquier acto de vulneración de derechos o infracción administrativa contra las personas integrantes de la comunidad educativa, considerando principalmente el interés superior del niño, casos de violencia escolar, acoso escolar o discriminación. La inmediatez será proporcionalmente aplicada a la gravedad del bien jurídico protegido considerando principalmente en casos de violencia sexual, acoso escolar o discriminación.";

/**
 * Párrafo de encuadre legal/contextual por defecto de cada tipo de oficio.
 * El usuario puede editarlo íntegramente; es solo un punto de partida correcto.
 */
export const OFICIO_BODY_INTRO_TEMPLATES: Record<OficioType, string> = {
  INFORME_RIESGO_VIOLENCIA: DEBIDA_DILIGENCIA_TEXT,

  SOLICITUD_APROBACION_ACTIVIDAD:
    "Reciba un cordial saludo deseándole éxitos en sus funciones. En el marco de las funciones de promoción y prevención que corresponden al Departamento de Consejería Estudiantil, conforme al Modelo de Gestión del DECE y al Acuerdo Ministerial MINEDUC-2020-00044-A, y con el propósito de fortalecer la convivencia armónica y el desarrollo integral de las y los estudiantes de esta institución educativa, me permito poner en su conocimiento la siguiente planificación y solicitar su autorización.",

  COORDINACION_ORGANISMO_EXTERNO:
    "Reciba un cordial saludo deseándole éxitos en sus funciones. En el marco del trabajo articulado del Departamento de Consejería Estudiantil con la red interinstitucional de protección integral de derechos, y con el fin de optimizar los servicios de atención, prevención y acompañamiento dirigidos a la comunidad educativa, me permito dirigirme a su autoridad para coordinar lo que a continuación se detalla.",

  NOTIFICACION_INFORMATIVA:
    "Reciba un cordial saludo deseándole éxitos en sus funciones. En cumplimiento de las funciones del Departamento de Consejería Estudiantil y con el fin de mantener informada a la máxima autoridad institucional sobre los procesos que se desarrollan en el departamento, me permito poner en su conocimiento lo siguiente.",

  OTRO: "",
};

/** Roles de destinatario más frecuentes en la correspondencia del DECE. */
export const OFICIO_ADDRESSEE_ROLE_OPTIONS: string[] = [
  "RECTORA",
  "RECTOR",
  "VICERRECTORA",
  "VICERRECTOR",
  "DIRECTORA DISTRITAL",
  "DIRECTOR DISTRITAL",
  "PRESIDENTA DE LA JUNTA CANTONAL DE PROTECCIÓN DE DERECHOS",
  "PRESIDENTE DE LA JUNTA CANTONAL DE PROTECCIÓN DE DERECHOS",
  "COORDINADORA ZONAL",
  "COORDINADOR ZONAL",
];

export const OFICIO_DEFAULT_CLOSING_NOTE =
  "Particular que comunico para los fines pertinentes.";

export function isOficioType(value: unknown): value is OficioType {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(OFICIO_TYPE_LABELS, value)
  );
}

/** Normaliza cualquier valor entrante al tipo de oficio soportado (fallback: OTRO). */
export function normalizeOficioType(value: unknown): OficioType {
  return isOficioType(value) ? value : "OTRO";
}

export function getOficioTypeLabel(value: unknown): string {
  return OFICIO_TYPE_LABELS[normalizeOficioType(value)];
}

export function getOficioTypeOption(value: unknown): OficioTypeOption {
  const type = normalizeOficioType(value);
  return (
    OFICIO_TYPE_OPTIONS.find((o) => o.value === type) ||
    OFICIO_TYPE_OPTIONS[OFICIO_TYPE_OPTIONS.length - 1]
  );
}

/** El párrafo de encuadre por defecto del tipo indicado. */
export function getDefaultBodyIntro(value: unknown): string {
  return OFICIO_BODY_INTRO_TEMPLATES[normalizeOficioType(value)];
}

/** Solo el tipo de riesgo/violencia cita el Art. 63.4 de Debida Diligencia. */
export function requiresDebidaDiligencia(value: unknown): boolean {
  return normalizeOficioType(value) === "INFORME_RIESGO_VIOLENCIA";
}

/** El ASUNTO de un oficio siempre se imprime en mayúsculas, colapsando espacios. */
export function formatAsunto(asunto: string | null | undefined): string {
  return (asunto || "").replace(/\s+/g, " ").trim().toUpperCase();
}

export interface ParsedOficioSignature {
  tipo?: "digital" | "fisica";
  firma_data_url?: string;
  referencia_fisica?: string;
  fecha_firma?: string;
  observacion_firma?: string;
  respaldo_archivo_url?: string;
  respaldo_nombre?: string;
  signer_id?: string;
  signer_name?: string;
  role?: string;
}

/**
 * Lee `signatures_json` tolerando los dos formatos que existen en la app:
 * un arreglo de firmas o un objeto mapeado por rol (`{ dece: {...} }`).
 */
export function parseOficioSignatures(json: string | null | undefined): ParsedOficioSignature[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => s && typeof s === "object") as ParsedOficioSignature[];
    }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>)
        .filter(([, v]) => v && typeof v === "object")
        .map(([k, v]) => ({ signer_id: k, ...(v as ParsedOficioSignature) }));
    }
  } catch {
    // JSON corrupto: se trata como sin firmas en lugar de romper el documento.
  }
  return [];
}

/** La firma del profesional DECE que emite el oficio (único firmante). */
export function getOficioSignerSignature(
  json: string | null | undefined
): ParsedOficioSignature | null {
  const list = parseOficioSignatures(json);
  if (list.length === 0) return null;
  return list.find((s) => s.signer_id === "dece" || s.signer_id === "signer") || list[0];
}

export interface OficioStats {
  total: number;
  byType: Record<OficioType, number>;
  linkedToCase: number;
  signed: number;
}

/** Conteos para las tarjetas de resumen del listado. */
export function calculateOficioStats(rows: Pick<OficioRow, "oficio_type" | "case_file_id" | "signature_type">[]): OficioStats {
  const byType = OFICIO_TYPE_OPTIONS.reduce(
    (acc, o) => ({ ...acc, [o.value]: 0 }),
    {} as Record<OficioType, number>
  );

  let linkedToCase = 0;
  let signed = 0;

  for (const row of rows) {
    const type = normalizeOficioType(row.oficio_type);
    byType[type] = (byType[type] || 0) + 1;
    if (row.case_file_id) linkedToCase++;
    if (row.signature_type === "digital" || row.signature_type === "fisica") signed++;
  }

  return { total: rows.length, byType, linkedToCase, signed };
}

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Línea de ciudad y fecha del encabezado, con el formato exacto del modelo:
 * "Ambato, 02 de julio de 2026".
 */
export function formatOficioCityDate(city: string | null | undefined, isoDate: string | null | undefined): string {
  const cityText = (city || "").trim() || "Ambato";
  const raw = (isoDate || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return `${cityText}, ${raw}`.trim().replace(/,\s*$/, "");
  const [, year, month, day] = match;
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = MONTHS_ES[monthIdx] || month;
  return `${cityText}, ${day} de ${monthName} de ${year}`;
}

/** Descripción corta para la bitácora del caso (`case_actions.description`). */
export function buildOficioBitacoraDescription(oficioNumber: string, asunto: string): string {
  const cleanAsunto = (asunto || "").replace(/\s+/g, " ").trim();
  const base = `Oficio N° ${oficioNumber} emitido: ${cleanAsunto}`;
  return base.length > 160 ? `${base.slice(0, 157)}...` : base;
}

/** Extracto corto del cuerpo para `case_actions.observations`. */
export function buildOficioBitacoraObservations(bodyContent: string): string {
  const clean = (bodyContent || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > 220 ? `${clean.slice(0, 217)}...` : clean;
}
