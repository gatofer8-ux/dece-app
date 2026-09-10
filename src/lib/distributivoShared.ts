/**
 * Helpers del distributivo que NO dependen de node, de la base de datos ni de
 * `next/headers`. Seguro para importar tanto desde el servidor como desde
 * componentes cliente ("use client").
 *
 * `src/lib/distributivo.ts` (que sí toca la base de datos) reexporta todo esto
 * para no romper los imports existentes del lado servidor.
 */
import type { UserCoverage } from "./types";

export interface CourseParallelDetail {
  parallel: string;
  jornada: string;
  student_count: number;
  tutor_name?: string | null;
}

export interface CourseSummaryItem {
  course: string;
  totalStudents: number;
  parallels: string[];
  jornadas: string[];
  parallelDetails: CourseParallelDetail[];
}

/**
 * Normaliza una cadena de curso a una clave canónica para comparaciones robustas:
 * minúsculas, sin tildes, sin puntos ni "°"/"º", sin texto entre paréntesis o corchetes,
 * niveles educativos unificados (egb, bgu), ordinales en palabras/sufijos convertidos a números,
 * y espacios colapsados.
 */
export function normalizeCourseKey(name: string | null | undefined): string {
  if (!name) return "";
  let s = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "");
  s = s.replace(/[.°º,_\-\/]/g, " ");
  s = s.replace(/\beducacion\s+general\s+basica\b/g, "egb")
       .replace(/\bbachillerato\s+general\s+unificado\b/g, "bgu")
       .replace(/\bbachillerato\b/g, "bgu")
       .replace(/\bbasica\b/g, "egb");
  s = s.replace(/\binicial\s+ii\b/g, "inicial 2").replace(/\binicial\s+i\b/g, "inicial 1");
  s = s.replace(/\bdecimo\b/g, "10").replace(/\b10mo\b/g, "10").replace(/\b10ma\b/g, "10")
       .replace(/\bnoveno\b/g, "9").replace(/\b9no\b/g, "9").replace(/\b9na\b/g, "9").replace(/\b9vo\b/g, "9").replace(/\b9va\b/g, "9")
       .replace(/\boctavo\b/g, "8").replace(/\b8vo\b/g, "8").replace(/\b8va\b/g, "8")
       .replace(/\bseptimo\b/g, "7").replace(/\b7mo\b/g, "7").replace(/\b7ma\b/g, "7")
       .replace(/\bsexto\b/g, "6").replace(/\b6to\b/g, "6").replace(/\b6ta\b/g, "6")
       .replace(/\bquinto\b/g, "5").replace(/\b5to\b/g, "5").replace(/\b5ta\b/g, "5")
       .replace(/\bcuarto\b/g, "4").replace(/\b4to\b/g, "4").replace(/\b4ta\b/g, "4")
       .replace(/\btercero\b/g, "3").replace(/\btercer\b/g, "3").replace(/\b3ero\b/g, "3").replace(/\b3era\b/g, "3").replace(/\b3ro\b/g, "3").replace(/\b3ra\b/g, "3")
       .replace(/\bsegundo\b/g, "2").replace(/\b2do\b/g, "2").replace(/\b2da\b/g, "2")
       .replace(/\bprimero\b/g, "1").replace(/\bprimer\b/g, "1").replace(/\b1ero\b/g, "1").replace(/\b1era\b/g, "1").replace(/\b1ro\b/g, "1").replace(/\b1ra\b/g, "1")
       .replace(/\bpreparatoria\b/g, "1 egb")
       .replace(/\biii\b/g, "3")
       .replace(/\bii\b/g, "2")
       .replace(/\bi\s+(bgu|egb)\b/g, "1 $1");
  s = s.replace(/\bde\b/g, "").replace(/\bdel\b/g, "").replace(/\bano\b/g, "").replace(/\banos\b/g, "").replace(/\bgrado\b/g, "").replace(/\bcurso\b/g, "").replace(/\bnivel\b/g, "");
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Genera una clave canónica para identificar de forma unívoca un paralelo específico de un curso y jornada.
 * Formato: "3.° EGB::A::MATUTINA"
 */
export function makeParallelKey(course: string, parallel: string, jornada?: string): string {
  const cClean = course.replace(/\s*\((Matutina|Vespertina|Nocturna)\)$/i, "").trim();
  const pClean = (parallel || "A").trim().toUpperCase();
  const jClean = (jornada || "MATUTINA").trim().toUpperCase();
  return `${cClean}::${pClean}::${jClean}`;
}

/**
 * Parsea una clave canónica de paralelo generada por makeParallelKey.
 */
export function parseParallelKey(key: string): { course: string; parallel: string; jornada: string } | null {
  if (!key || typeof key !== "string" || !key.includes("::")) return null;
  const parts = key.split("::");
  if (parts.length >= 3) {
    return {
      course: parts[0].trim(),
      parallel: parts[1].trim().toUpperCase(),
      jornada: parts[2].trim().toUpperCase(),
    };
  }
  if (parts.length === 2) {
    return {
      course: parts[0].trim(),
      parallel: parts[1].trim().toUpperCase(),
      jornada: "MATUTINA",
    };
  }
  return null;
}

/**
 * Construye dinámicamente el filtro SQL WHERE para respetar estrictamente la cobertura de un analista:
 * cursos específicos, paralelos asignados y jornadas correspondientes.
 */
export function buildCoverageSqlFilter(
  coverage: UserCoverage,
  tableAlias = ""
): { sql: string; params: any[] } {
  const prefix = tableAlias ? `${tableAlias}.` : "";

  if (coverage.isAllInstitutional) {
    return { sql: "1=1", params: [] };
  }

  const clauses: string[] = [];
  const params: any[] = [];

  // Parsear claves de paralelos específicos si existen
  const parsedParallelKeys: Array<{ course: string; parallel: string; jornada?: string }> = [];
  for (const p of coverage.parallels || []) {
    const parsed = parseParallelKey(p);
    if (parsed) {
      parsedParallelKeys.push(parsed);
    }
  }

  // Agrupar por curso
  const courseSpecificKeys = new Map<string, Array<{ parallel: string; jornada?: string }>>();
  for (const item of parsedParallelKeys) {
    const normC = normalizeCourseKey(item.course);
    const list = courseSpecificKeys.get(normC) || [];
    list.push({ parallel: item.parallel, jornada: item.jornada });
    courseSpecificKeys.set(normC, list);
  }

  const processedNormCourses = new Set<string>();

  // Helper para generar condición de jornada
  const makeJornadaCond = (jVal: string | null) => {
    if (!jVal) return null;
    const jUpper = jVal.toUpperCase().trim();
    if (jUpper === "VESPERTINA" || jUpper === "NOCTURNA") {
      return { cond: `${prefix}jornada = ? COLLATE NOCASE`, param: jUpper };
    }
    // Para MATUTINA, permitir también NULL (por registros antiguos o predeterminados)
    return { cond: `(${prefix}jornada = ? COLLATE NOCASE OR ${prefix}jornada IS NULL)`, param: "MATUTINA" };
  };

  // Recorrer cursos asignados
  for (const c of coverage.courses || []) {
    const shiftMatch = c.match(/^(.*?)\s*\((Matutina|Vespertina|Nocturna)\)$/i);
    const cleanCourse = shiftMatch ? shiftMatch[1].trim() : c.trim();
    const explicitShift = shiftMatch ? shiftMatch[2].toUpperCase() : null;
    const normC = normalizeCourseKey(cleanCourse);

    processedNormCourses.add(normC);

    const specificParallels = courseSpecificKeys.get(normC);

    if (specificParallels && specificParallels.length > 0) {
      for (const sp of specificParallels) {
        const jVal = sp.jornada || explicitShift || (coverage.jornadas.length === 1 && coverage.jornadas[0] !== "COMPLETA" && coverage.jornadas[0] !== "TODAS" ? coverage.jornadas[0] : null);
        const jFilter = makeJornadaCond(jVal);

        if (jFilter) {
          clauses.push(`(${prefix}course = ? COLLATE NOCASE AND ${prefix}parallel = ? COLLATE NOCASE AND ${jFilter.cond})`);
          params.push(cleanCourse, sp.parallel, jFilter.param);
        } else {
          clauses.push(`(${prefix}course = ? COLLATE NOCASE AND ${prefix}parallel = ? COLLATE NOCASE)`);
          params.push(cleanCourse, sp.parallel);
        }
      }
    } else {
      // Si no hay restricción de paralelos para este curso, aplica para todos sus paralelos
      const jVal = explicitShift || (coverage.jornadas.length === 1 && coverage.jornadas[0] !== "COMPLETA" && coverage.jornadas[0] !== "TODAS" ? coverage.jornadas[0] : null);
      const jFilter = makeJornadaCond(jVal);

      if (jFilter) {
        clauses.push(`(${prefix}course = ? COLLATE NOCASE AND ${jFilter.cond})`);
        params.push(cleanCourse, jFilter.param);
      } else {
        clauses.push(`(${prefix}course = ? COLLATE NOCASE)`);
        params.push(cleanCourse);
      }
    }
  }

  // Cursos que solo vinieron en las claves de paralelos
  for (const [normC, pList] of courseSpecificKeys.entries()) {
    if (!processedNormCourses.has(normC)) {
      for (const sp of pList) {
        // Buscar nombre de curso original en el item
        const origItem = parsedParallelKeys.find(k => normalizeCourseKey(k.course) === normC);
        const cName = origItem?.course || normC;
        const jVal = sp.jornada || (coverage.jornadas.length === 1 && coverage.jornadas[0] !== "COMPLETA" && coverage.jornadas[0] !== "TODAS" ? coverage.jornadas[0] : null);
        const jFilter = makeJornadaCond(jVal);

        if (jFilter) {
          clauses.push(`(${prefix}course = ? COLLATE NOCASE AND ${prefix}parallel = ? COLLATE NOCASE AND ${jFilter.cond})`);
          params.push(cName, sp.parallel, jFilter.param);
        } else {
          clauses.push(`(${prefix}course = ? COLLATE NOCASE AND ${prefix}parallel = ? COLLATE NOCASE)`);
          params.push(cName, sp.parallel);
        }
      }
    }
  }

  if (clauses.length === 0) {
    return { sql: "1=0", params: [] };
  }

  return {
    sql: `(${clauses.join(" OR ")})`,
    params,
  };
}
