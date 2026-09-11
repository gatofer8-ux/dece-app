/**
 * Informe mensual de actividades DECE requeridas por la ENEIS
 * ("INFORME DE ACTIVIDADES Nº ..."): 4 actividades fijas, textuales, exigidas
 * por la estrategia, cada una con su actividad ejecutada, fecha, número de
 * beneficiados y un registro fotográfico (una sola foto por ítem). Puro, sin
 * base de datos.
 */

export const ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS = [
  "Una (1) sesión mensual de acompañamiento a docentes en la implementación de Educación Integral en Sexualidad, enfatizando las especificidades por grupo etario, para fomentar buenas prácticas educativas.",
  "Una (1) estrategia participativa vinculada en Educación Integral en Sexualidad enfocados al desarrollo de factores protectores en el ámbito educativo con el personal docente.",
  "Una (1) acción informativa y de sensibilización mensual sobre temas relacionados a la Educación Integral en Sexualidad que apoyen el pleno ejercicio de los derechos humanos y la formación de hábitos de vida saludable en el estudiantado.",
  "Una (1) espacio trimestral de asesoramiento a familias sobre la corresponsabilidad en la Educación Integral en Sexualidad y factores protectores enfatizando las especificidades por grupo etario.",
] as const;

export interface EneisInformeDeceActividad {
  ejecutada: string;
  fecha: string;
  beneficiarios: string;
  foto: string | null;
}

function safeArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function parseEneisInformeDeceActividades(raw: string | null | undefined): EneisInformeDeceActividad[] {
  const arr = safeArray<Partial<EneisInformeDeceActividad>>(raw);
  return ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS.map((_, i) => ({
    ejecutada: arr[i]?.ejecutada || "",
    fecha: arr[i]?.fecha || "",
    beneficiarios: arr[i]?.beneficiarios || "",
    foto: arr[i]?.foto || null,
  }));
}

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

/** "2026-03" -> "MARZO - 2026" */
export function formatPeriodoDece(periodo: string | null | undefined): string {
  const m = (periodo || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return periodo || "";
  const mes = MESES[Number(m[2]) - 1] || m[2];
  return `${mes} - ${m[1]}`;
}
