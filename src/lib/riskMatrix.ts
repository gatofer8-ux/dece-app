// Catálogo y helpers para la Matriz de Riesgos Psicosociales (MATRIZ RPS-EIS),
// el reporte mensual oficial que la institución envía a distrito/zona.
// Estructura de 43 columnas verificada celda por celda contra una plantilla
// real (openpyxl, solo encabezados — nunca se copiaron datos de estudiantes).

export const YES_NO_OPTIONS = [
  { value: "SI", label: "Sí" },
  { value: "NO", label: "No" },
];

// Grupos de columnas, en el orden exacto de la plantilla oficial (fila 2 = título
// de grupo con celdas combinadas, fila 3 = encabezado de cada columna).
export const RISK_MATRIX_COLUMN_GROUPS: Array<{ title: string; span: number }> = [
  { title: "DATOS DE UBICACIÓN", span: 4 },
  { title: "DATOS DE DETECCIÓN", span: 4 },
  { title: "DATOS DE LA PRESUNTA VÍCTIMA O PERSONA EN RIESGO PSICOSOCIAL", span: 11 },
  { title: "Contacto Representante legal", span: 2 },
  { title: "DATOS PRESUNTA PERSONA AGRESORA (SOLO VIOLENCIAS)", span: 5 },
  { title: "ABORDAJE DEL CASO", span: 5 },
  { title: "ACOMPAÑAMIENTO PSICOSOCIAL", span: 5 },
  { title: "DENUNCIA", span: 5 },
  { title: "SEGUIMIENTO Y REPARACIÓN", span: 1 },
  { title: "OBSERVACIONES Y/O NUDOS CRÍTICOS", span: 1 },
];

export const RISK_MATRIX_COLUMNS: string[] = [
  "COORDINACIÓN ZONAL",
  "CÓDIGO DISTRITO",
  "CÓDIGO AMIE",
  "NOMBRE INSTITUCIÓN EDUCATIVA",
  "TIPO DE CASO",
  "FECHA DE CONOCIMIENTO (dd/mm/aaaa)",
  "NOMBRES Y APELLIDOS DE QUIEN REGISTRA",
  "CARGO DE QUIEN REGISTRA",
  "NÚMERO DE DOCUMENTO DE IDENTIDAD",
  "NOMBRES Y APELLIDOS",
  "GRADO O CURSO",
  "EDAD",
  "GÉNERO",
  "ETNIA",
  "NACIONALIDAD",
  "TIENE DISCAPACIDAD\n(SI/NO)",
  "TIPO DE DISCAPACIDAD",
  "DIVERSIDAD DE GÉNERO U ORIENTACIÓN SEXUAL",
  "OTRAS CONDICIONES RELEVANTES\n(ESPECIFIQUE)",
  "NOMBRES Y APELLIDOS ",
  "NÚMERO DE TELÉFONO",
  "NÚMERO DE DOCUMENTO DE IDENTIDAD",
  "NOMBRES Y APELLIDOS",
  "EDAD",
  "GÉNERO",
  "RELACIÓN ENTRE LA VÍCTIMA CON LA PRESUNTA PERSONA AGRESORA",
  "FECHA DE LEVANTAMIENTO DE LA FICHA DE HECHO DE VIOLENCIA Y OTROS RIESGOS PSICOSOCIALES (dd/mm/aaaa)",
  "NÚMERO DE TRÁMITE PRESENTADO AL DISTRITO",
  "FECHA DE INGRESO DE CASO EN DISTRITO (dd/mm/aaaa)",
  "INSTITUCIÓN QUE EMITE MEDIDAS DE PROTECCIÓN",
  "DESCRIPCIÓN DE LAS MEDIDAS DE PROTECCIÓN",
  "¿CUENTA CON PLAN DE ACOMPAÑAMIENTO Y RESTITUCIÓN DE DERECHOS O PLAN DE ATENCIÓN Y SEGUIMIENTO PSICOSOCIAL?",
  "PEDAGÓGICO",
  "LEGAL",
  "SALUD \n(PSICOLÓGICO Y MÉDICO)",
  "COMUNITARIO ",
  "EXISTE DENUNCIA EN FISCALÍA (SOLO EN PRESUNTOS DELITOS)",
  "FECHA DE DENUNCIA EN FISCALÍA (dd/mm/aaaa)",
  "NRO. DENUNCIA EN FISCALÍA",
  "EXISTE DENUNCIA EN JCPDNA\n(SOLO EN PRESUNTAS VULNERACIONES)",
  "FECHA DE DENUNCIA EN JCPDNA (dd/mm/aaaa)",
  "ESTADO ACTUAL DEL CASO ",
  "OBSERVACIONES Y/O NUDOS CRÍTICOS",
];

export function computeAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function currentReportMonth(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const names = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return m >= 1 && m <= 12 ? `${names[m - 1]} ${y}` : ym;
}

export function parseJsonArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// La matriz agrupa el acompañamiento en 4 columnas fijas (Pedagógico / Legal /
// Salud / Comunitario), mientras que el Plan de Acompañamiento y Restitución
// maneja 8 categorías más específicas (ACCOMPANIMENT_ACTION_CATEGORIES en
// restitutionPlan.ts) — este mapa las agrupa para poder marcar ☑ cada columna
// automáticamente a partir de las acciones ya registradas en el plan.
export const ACCOMPANIMENT_CATEGORY_TO_MATRIX_COLUMN: Record<string, "PEDAGOGICO" | "LEGAL" | "SALUD" | "COMUNITARIO"> = {
  LEGAL: "LEGAL",
  PSICOLOGICO_VICTIMA: "SALUD",
  PSICOLOGICO_FAMILIA: "SALUD",
  MEDICO_VICTIMA: "SALUD",
  MEDICO_FAMILIA: "SALUD",
  PEDAGOGICO_VICTIMA: "PEDAGOGICO",
  PSICOLOGICO_COMUNIDAD: "COMUNITARIO",
  PREVENTIVAS_COMUNIDAD: "COMUNITARIO",
};

// Las instancias legales del Plan de Acompañamiento (legal_instances) ya
// distinguen Fiscalía de Junta Cantonal — se usan para derivar automáticamente
// las columnas de DENUNCIA de la matriz cuando existe un plan.
export const LEGAL_INSTANCE_TO_MATRIX = {
  FISCALIA: "FISCALIA",
  JUNTA_CANTONAL: "JCPDNA",
} as const;
