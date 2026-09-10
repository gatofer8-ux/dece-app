import { db } from "./db";
import { RISK_TYPE_LABELS, type RiskType, type SchoolYearRow } from "./types";
import { getCourseGradeRank } from "./courseOrder";
import { listSchoolYears, getSchoolYearById, ensureDefaultSchoolYear } from "./schoolYear";

export type StatPeriodMode = "MES" | "TRIMESTRE" | "ANIO_LECTIVO" | "PERSONALIZADO";
export type StatUniverse = "CASOS" | "ESTUDIANTES";

export interface StatRowItem {
  key: string;
  label: string;
  female: number;
  male: number;
  other: number;
  total: number;
  percentage: number;
}

export interface StatisticalTable {
  id: string;
  title: string;
  dimension: string;
  description: string;
  rows: StatRowItem[];
  totalFemale: number;
  totalMale: number;
  totalOther: number;
  grandTotal: number;
}

export interface StatisticalReportData {
  institutionId: string;
  institutionName: string;
  periodMode: StatPeriodMode;
  universe: StatUniverse;
  periodLabel: string;
  startDate: string;
  endDate: string;
  selectedMonth: string;
  selectedTrimester: "1T" | "2T" | "3T";
  selectedSchoolYearId: string;
  schoolYearName: string;
  availableSchoolYears: Array<{ id: string; name: string; is_active: number }>;
  totalRecords: number;
  totalFemale: number;
  totalMale: number;
  totalOther: number;
  femalePct: number;
  malePct: number;
  otherPct: number;
  predominantCourse: string;
  predominantTypology: string;
  predominantAgeRange: string;
  tables: {
    byCourse: StatisticalTable;
    byTypology: StatisticalTable;
    byJornada: StatisticalTable;
    byAge: StatisticalTable;
    byGender: StatisticalTable;
    byEthnicity: StatisticalTable;
    byNationality: StatisticalTable;
  };
}

export interface StatQueryOptions {
  periodMode?: StatPeriodMode;
  universe?: StatUniverse;
  month?: string; // YYYY-MM
  trimester?: "1T" | "2T" | "3T";
  schoolYearId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

/**
 * Normaliza el género/sexo a 'F', 'M' o 'OTRO'.
 */
export function normalizeGender(raw: string | null | undefined): "F" | "M" | "OTRO" {
  if (!raw) return "OTRO";
  const s = raw.toUpperCase().trim();
  if (s === "F" || s === "FEMENINO" || s.startsWith("MUJ") || s === "FEMALE") return "F";
  if (s === "M" || s === "MASCULINO" || s.startsWith("HOMB") || s === "VARON" || s === "MALE") return "M";
  return "OTRO";
}

/**
 * Normaliza la jornada escolar.
 */
export function normalizeJornada(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "No especificada";
  const s = raw.toUpperCase().trim();
  if (s.includes("MATUTINA") || s.includes("MAÑANA")) return "Matutina";
  if (s.includes("VESPERTINA") || s.includes("TARDE")) return "Vespertina";
  if (s.includes("NOCTURNA") || s.includes("NOCHE")) return "Nocturna";
  return raw.trim();
}

/**
 * Normaliza la etnia según las categorías oficiales del Censo / MINEDUC.
 */
export function normalizeEthnicity(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "No registrada";
  const s = raw.toLowerCase().trim();
  if (s.includes("mestiz")) return "Mestizo/a";
  if (s.includes("afro") || s.includes("negro") || s.includes("mulat")) return "Afroecuatoriano/a";
  if (s.includes("indig") || s.includes("kichwa") || s.includes("shuar")) return "Indígena";
  if (s.includes("montub")) return "Montubio/a";
  if (s.includes("blanc")) return "Blanco/a";
  return raw.trim();
}

/**
 * Normaliza la nacionalidad.
 */
export function normalizeNationality(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Ecuatoriana";
  const s = raw.toLowerCase().trim();
  if (s.includes("ecua")) return "Ecuatoriana";
  if (s.includes("venez")) return "Venezolana";
  if (s.includes("colomb")) return "Colombiana";
  if (s.includes("peru")) return "Peruana";
  return raw.trim();
}

/**
 * Calcula la edad en años cumplidos a partir de la fecha de nacimiento.
 */
export function calculateAge(birthDate: string | null | undefined, referenceDate = new Date()): number | null {
  if (!birthDate) return null;
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (isNaN(birth.getTime())) return null;

  let age = referenceDate.getFullYear() - birth.getFullYear();
  const m = referenceDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age <= 100 ? age : null;
}

export const OFFICIAL_AGE_BRACKETS = [
  { key: "menor_6", label: "Menores de 6 años (Inicial / Prep.)", min: 0, max: 5 },
  { key: "6_8", label: "6 a 8 años (Básica Elemental)", min: 6, max: 8 },
  { key: "9_11", label: "9 a 11 años (Básica Media)", min: 9, max: 11 },
  { key: "12_14", label: "12 a 14 años (Básica Superior)", min: 12, max: 14 },
  { key: "15_17", label: "15 a 17 años (Bachillerato)", min: 15, max: 17 },
  { key: "18_mas", label: "18 años o más (Jóvenes / Adultos)", min: 18, max: 120 },
  { key: "no_registrada", label: "Edad no registrada", min: -1, max: -1 },
];

export function getAgeBracket(age: number | null): { key: string; label: string } {
  if (age === null) return { key: "no_registrada", label: "Edad no registrada" };
  for (const b of OFFICIAL_AGE_BRACKETS) {
    if (b.min !== -1 && age >= b.min && age <= b.max) {
      return { key: b.key, label: b.label };
    }
  }
  return { key: "no_registrada", label: "Edad no registrada" };
}

/**
 * Determina el rango de fechas [start, end] y etiqueta para un mes dado (YYYY-MM).
 */
export function getMonthDateRange(monthStr?: string): { start: string; end: string; label: string; monthStr: string } {
  let target = monthStr && /^\d{4}-\d{2}$/.test(monthStr) ? monthStr : "";
  if (!target) {
    const now = new Date();
    target = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const [y, m] = target.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const label = `${monthNames[m - 1]} ${y}`;

  return { start, end, label, monthStr: target };
}

/**
 * Calcula las fechas de inicio y fin para los 3 trimestres de un año lectivo.
 */
export function getTrimesterDateRange(
  schoolYear: SchoolYearRow,
  trimester: "1T" | "2T" | "3T" = "1T"
): { start: string; end: string; label: string } {
  const startYear = new Date(schoolYear.start_date);
  const endYear = new Date(schoolYear.end_date);
  const totalMs = Math.max(endYear.getTime() - startYear.getTime(), 1000 * 60 * 60 * 24 * 90);
  const thirdMs = Math.round(totalMs / 3);

  const t1End = new Date(startYear.getTime() + thirdMs);
  const t2Start = new Date(t1End.getTime() + 1000 * 60 * 60 * 24);
  const t2End = new Date(startYear.getTime() + thirdMs * 2);
  const t3Start = new Date(t2End.getTime() + 1000 * 60 * 60 * 24);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (trimester === "2T") {
    return {
      start: fmt(t2Start),
      end: fmt(t2End),
      label: `Segundo Trimestre (${fmt(t2Start)} al ${fmt(t2End)})`,
    };
  }
  if (trimester === "3T") {
    return {
      start: fmt(t3Start),
      end: schoolYear.end_date,
      label: `Tercer Trimestre (${fmt(t3Start)} al ${schoolYear.end_date})`,
    };
  }
  return {
    start: schoolYear.start_date,
    end: fmt(t1End),
    label: `Primer Trimestre (${schoolYear.start_date} al ${fmt(t1End)})`,
  };
}

/**
 * Genera una tabla estadística a partir de un mapa de frecuencias por sexo.
 */
function buildStatisticalTable(
  id: string,
  title: string,
  dimension: string,
  description: string,
  dataMap: Map<string, { label: string; female: number; male: number; other: number }>,
  sortFn?: (a: StatRowItem, b: StatRowItem) => number
): StatisticalTable {
  let totalFemale = 0;
  let totalMale = 0;
  let totalOther = 0;
  let grandTotal = 0;

  for (const item of dataMap.values()) {
    totalFemale += item.female;
    totalMale += item.male;
    totalOther += item.other;
    grandTotal += item.female + item.male + item.other;
  }

  const rows: StatRowItem[] = [];
  for (const [key, item] of dataMap.entries()) {
    const rowTotal = item.female + item.male + item.other;
    const percentage = grandTotal > 0 ? Math.round((rowTotal / grandTotal) * 1000) / 10 : 0;
    rows.push({
      key,
      label: item.label,
      female: item.female,
      male: item.male,
      other: item.other,
      total: rowTotal,
      percentage,
    });
  }

  if (sortFn) {
    rows.sort(sortFn);
  } else {
    rows.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }

  return {
    id,
    title,
    dimension,
    description,
    rows,
    totalFemale,
    totalMale,
    totalOther,
    grandTotal,
  };
}

/**
 * Función principal que genera el reporte estadístico completo.
 */
export function getStatisticalReport(
  institutionId: string,
  opts: StatQueryOptions = {}
): StatisticalReportData {
  const inst = db
    .prepare("SELECT name FROM institutions WHERE id = ?")
    .get(institutionId) as { name: string } | undefined;
  const institutionName = inst?.name || "Institución Educativa";

  const allYears = listSchoolYears(institutionId);
  const activeYear = ensureDefaultSchoolYear(institutionId) || allYears[0] || {
    id: "default-year",
    institution_id: institutionId,
    name: "Año Lectivo Vigente",
    regime: "SIERRA_AMAZONIA",
    start_date: `${new Date().getFullYear()}-09-01`,
    end_date: `${new Date().getFullYear() + 1}-06-30`,
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const periodMode = opts.periodMode || "MES";
  const universe = opts.universe || "CASOS";
  const selectedTrimester = opts.trimester || "1T";
  const selectedSchoolYearId = opts.schoolYearId || activeYear.id;
  const targetYear = allYears.find((y) => y.id === selectedSchoolYearId) || activeYear;

  let startDate = "";
  let endDate = "";
  let periodLabel = "";
  let selectedMonth = "";

  if (periodMode === "MES") {
    const mInfo = getMonthDateRange(opts.month);
    startDate = mInfo.start;
    endDate = mInfo.end;
    periodLabel = `Mes de ${mInfo.label}`;
    selectedMonth = mInfo.monthStr;
  } else if (periodMode === "TRIMESTRE") {
    const tInfo = getTrimesterDateRange(targetYear, selectedTrimester);
    startDate = tInfo.start;
    endDate = tInfo.end;
    periodLabel = `${tInfo.label} - ${targetYear.name}`;
    selectedMonth = mInfoOrNow(opts.month);
  } else if (periodMode === "ANIO_LECTIVO") {
    startDate = targetYear.start_date;
    endDate = targetYear.end_date;
    periodLabel = `Año Lectivo Completo: ${targetYear.name}`;
    selectedMonth = mInfoOrNow(opts.month);
  } else {
    // PERSONALIZADO
    startDate = opts.startDate || getMonthDateRange().start;
    endDate = opts.endDate || getMonthDateRange().end;
    periodLabel = `Período personalizado: ${startDate} al ${endDate}`;
    selectedMonth = mInfoOrNow(opts.month);
  }

  // 1. Extraer universo de datos
  // Si es CASOS: unimos case_files con students
  // Si es ESTUDIANTES: solo students activos
  type DataRecord = {
    id: string;
    student_id: string;
    course: string;
    parallel: string | null;
    jornada: string | null;
    gender: string | null;
    birth_date: string | null;
    ethnicity: string | null;
    nationality: string | null;
    risk_type: string | null;
    risk_type_other: string | null;
    detection_date: string | null;
  };

  let records: DataRecord[] = [];

  if (universe === "CASOS") {
    records = db
      .prepare(
        `SELECT 
           cf.id,
           cf.student_id,
           s.course,
           s.parallel,
           s.jornada,
           s.gender,
           s.birth_date,
           s.ethnicity,
           s.nationality,
           cf.risk_type,
           cf.risk_type_other,
           cf.detection_date
         FROM case_files cf
         INNER JOIN students s ON s.id = cf.student_id
         WHERE cf.institution_id = ?
           AND date(cf.detection_date) BETWEEN date(?) AND date(?)
         ORDER BY cf.detection_date DESC`
      )
      .all(institutionId, startDate, endDate) as DataRecord[];
  } else {
    // ESTUDIANTES
    records = db
      .prepare(
        `SELECT 
           s.id,
           s.id as student_id,
           s.course,
           s.parallel,
           s.jornada,
           s.gender,
           s.birth_date,
           s.ethnicity,
           s.nationality,
           NULL as risk_type,
           NULL as risk_type_other,
           s.created_at as detection_date
         FROM students s
         WHERE s.institution_id = ?
           AND s.active = 1
         ORDER BY s.course ASC, s.full_name ASC`
      )
      .all(institutionId) as DataRecord[];
  }

  // 2. Mapas para cada una de las 7 dimensiones
  const courseMap = new Map<string, { label: string; female: number; male: number; other: number }>();
  const typologyMap = new Map<string, { label: string; female: number; male: number; other: number }>();
  const jornadaMap = new Map<string, { label: string; female: number; male: number; other: number }>();
  const ageMap = new Map<string, { label: string; female: number; male: number; other: number }>();
  const genderMap = new Map<string, { label: string; female: number; male: number; other: number }>();
  const ethnicityMap = new Map<string, { label: string; female: number; male: number; other: number }>();
  const nationalityMap = new Map<string, { label: string; female: number; male: number; other: number }>();

  // Inicializar grupos de edad oficiales para que aparezcan en orden lógico
  for (const b of OFFICIAL_AGE_BRACKETS) {
    ageMap.set(b.key, { label: b.label, female: 0, male: 0, other: 0 });
  }

  // Inicializar jornadas comunes
  for (const j of ["Matutina", "Vespertina", "Nocturna"]) {
    jornadaMap.set(j, { label: j, female: 0, male: 0, other: 0 });
  }

  // Inicializar géneros
  genderMap.set("Femenino", { label: "Femenino (Mujeres)", female: 0, male: 0, other: 0 });
  genderMap.set("Masculino", { label: "Masculino (Hombres)", female: 0, male: 0, other: 0 });
  genderMap.set("Otro", { label: "Otro / No especificado", female: 0, male: 0, other: 0 });

  // Si el universo es CASOS, inicializar las tipologías de riesgo conocidas
  if (universe === "CASOS") {
    for (const [key, label] of Object.entries(RISK_TYPE_LABELS)) {
      typologyMap.set(key, { label, female: 0, male: 0, other: 0 });
    }
  }

  // Procesar cada registro
  const nowRef = new Date(endDate || new Date());

  for (const r of records) {
    const g = normalizeGender(r.gender);

    // Helper para acumular
    const addCount = (
      map: Map<string, { label: string; female: number; male: number; other: number }>,
      key: string,
      label: string
    ) => {
      let entry = map.get(key);
      if (!entry) {
        entry = { label, female: 0, male: 0, other: 0 };
        map.set(key, entry);
      }
      if (g === "F") entry.female += 1;
      else if (g === "M") entry.male += 1;
      else entry.other += 1;
    };

    // 1. Curso
    const cName = (r.course || "").trim() || "Sin curso asignado";
    addCount(courseMap, cName, cName);

    // 2. Tipología (solo para casos)
    if (universe === "CASOS") {
      const tKey = r.risk_type || "OTRO";
      const tLabel = RISK_TYPE_LABELS[tKey as RiskType] || r.risk_type_other || tKey;
      addCount(typologyMap, tKey, tLabel);
    }

    // 3. Jornada
    const jName = normalizeJornada(r.jornada);
    addCount(jornadaMap, jName, jName);

    // 4. Edad
    const age = calculateAge(r.birth_date, nowRef);
    const bracket = getAgeBracket(age);
    addCount(ageMap, bracket.key, bracket.label);

    // 5. Sexo
    if (g === "F") {
      const item = genderMap.get("Femenino")!;
      item.female += 1;
    } else if (g === "M") {
      const item = genderMap.get("Masculino")!;
      item.male += 1;
    } else {
      const item = genderMap.get("Otro")!;
      item.other += 1;
    }

    // 6. Etnia
    const eName = normalizeEthnicity(r.ethnicity);
    addCount(ethnicityMap, eName, eName);

    // 7. Nacionalidad
    const nName = normalizeNationality(r.nationality);
    addCount(nationalityMap, nName, nName);
  }

  // Construir las 7 tablas estadísticas
  const byCourse = buildStatisticalTable(
    "cuadro-cursos",
    "Cuadro 1: Distribución Estadística por Cursos y Grados",
    "Cursos",
    "Casos o estudiantes clasificados por nivel, curso y paralelo.",
    courseMap,
    (a, b) => getCourseGradeRank(a.label) - getCourseGradeRank(b.label) || a.label.localeCompare(b.label)
  );

  const byTypology = buildStatisticalTable(
    "cuadro-tipologias",
    "Cuadro 2: Distribución Estadística por Tipologías de Riesgo",
    "Tipologías",
    "Clasificación de problemáticas psicosociales y motivos de intervención DECE.",
    typologyMap,
    (a, b) => b.total - a.total
  );

  const byJornada = buildStatisticalTable(
    "cuadro-jornadas",
    "Cuadro 3: Distribución Estadística por Jornadas",
    "Jornadas",
    "Distribución en jornada matutina, vespertina o nocturna.",
    jornadaMap
  );

  const byAge = buildStatisticalTable(
    "cuadro-edades",
    "Cuadro 4: Distribución Estadística por Rangos de Edad",
    "Rangos de Edad",
    "Grupos etarios según subniveles y etapas de desarrollo psicopedagógico.",
    ageMap,
    (a, b) => {
      const idxA = OFFICIAL_AGE_BRACKETS.findIndex((x) => x.key === a.key);
      const idxB = OFFICIAL_AGE_BRACKETS.findIndex((x) => x.key === b.key);
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    }
  );

  const byGender = buildStatisticalTable(
    "cuadro-sexo",
    "Cuadro 5: Distribución Estadística por Sexo / Género",
    "Sexo",
    "Proporción de mujeres, hombres y no especificado.",
    genderMap
  );

  const byEthnicity = buildStatisticalTable(
    "cuadro-etnia",
    "Cuadro 6: Distribución Estadística por Autoidentificación Étnica",
    "Etnia",
    "Autoidentificación étnica conforme al censo y directrices de interculturalidad.",
    ethnicityMap
  );

  const byNationality = buildStatisticalTable(
    "cuadro-nacionalidad",
    "Cuadro 7: Distribución Estadística por Nacionalidad",
    "Nacionalidad",
    "Población atendida según país de origen o nacionalidad registrada.",
    nationalityMap
  );

  const totalRecords = records.length;
  const totalFemale = byGender.rows.find((r) => r.key === "Femenino")?.female || 0;
  const totalMale = byGender.rows.find((r) => r.key === "Masculino")?.male || 0;
  const totalOther = byGender.rows.find((r) => r.key === "Otro")?.other || 0;

  const femalePct = totalRecords > 0 ? Math.round((totalFemale / totalRecords) * 1000) / 10 : 0;
  const malePct = totalRecords > 0 ? Math.round((totalMale / totalRecords) * 1000) / 10 : 0;
  const otherPct = totalRecords > 0 ? Math.round((totalOther / totalRecords) * 1000) / 10 : 0;

  const predominantCourse = byCourse.rows[0]?.total > 0 ? `${byCourse.rows[0].label} (${byCourse.rows[0].total})` : "—";
  const predominantTypology = byTypology.rows[0]?.total > 0 ? `${byTypology.rows[0].label} (${byTypology.rows[0].total})` : "—";
  const predominantAgeRange = byAge.rows.find((r) => r.total > 0)?.label || "—";

  return {
    institutionId,
    institutionName,
    periodMode,
    universe,
    periodLabel,
    startDate,
    endDate,
    selectedMonth,
    selectedTrimester,
    selectedSchoolYearId: targetYear.id,
    schoolYearName: targetYear.name,
    availableSchoolYears: allYears.map((y) => ({ id: y.id, name: y.name, is_active: y.is_active })),
    totalRecords,
    totalFemale,
    totalMale,
    totalOther,
    femalePct,
    malePct,
    otherPct,
    predominantCourse,
    predominantTypology,
    predominantAgeRange,
    tables: {
      byCourse,
      byTypology,
      byJornada,
      byAge,
      byGender,
      byEthnicity,
      byNationality,
    },
  };
}

function mInfoOrNow(monthStr?: string): string {
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) return monthStr;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
