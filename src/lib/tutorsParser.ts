import ExcelJS from "exceljs";

export interface ParsedCourseQuota {
  education_level: string;
  course: string;
  parallel: string;
  jornada: string;
  bachillerato_specialty?: string | null;
  student_count: number;
  tutor_name?: string | null;
}

const FORBIDDEN_SHEETS = [
  "DIRECTOR",
  "DIRECTORES",
  "AREA",
  "AREAS",
  "SECRETAR",
  "SECRETARIOS",
  "COMISION",
  "COMISIONES",
  "AUTORIDAD",
  "AUTORIDADES",
  "CONSEJO",
  "CONSEJO EJECUTIVO",
  "HORARIO",
  "HORARIOS",
  "ASISTENCIA",
  "CARATULA",
  "RESUMEN",
];

const FORBIDDEN_SUBJECTS = [
  "MATEMATICA",
  "MATEMATICAS",
  "LENGUA",
  "LENGUA -L",
  "LENGUA LITERATURA",
  "LENGUA Y LITERATURA",
  "CCNN",
  "CIENCIAS NATURALES",
  "CCSS",
  "CIENCIAS SOCIALES",
  "ESTUDIOS SOCIALES",
  "INGLES",
  "ENGLISH",
  "ED FISICA",
  "ED. FISICA",
  "EDUCACION FISICA",
  "EDUCACIÓN FÍSICA",
  "ECA",
  "EDUCACION CULTURAL",
  "EDUCACIÓN CULTURAL",
  "FILOSOFIA",
  "HISTORIA",
  "QUIMICA",
  "BIOLOGIA",
  "FISICA",
  "EMPRENDIMIENTO",
  "DHI",
  "DESARROLLO HUMANO",
  "COORDINADOR",
  "SECRETARIO",
  "RECTOR",
  "VICERRECTOR",
  "INSPECTOR",
];

export function isAcademicSubjectOrNonCourse(raw: string): boolean {
  if (!raw) return true;
  const upper = raw.toUpperCase().trim();

  for (const s of FORBIDDEN_SUBJECTS) {
    if (upper === s || upper.startsWith(s + " ") || upper.endsWith(" " + s)) {
      const hasGradeMarker = /año|ano|egb|bgu|bachillerato|inicial|grado|curso|1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.|10\./i.test(upper);
      if (!hasGradeMarker) {
        return true;
      }
    }
  }
  return false;
}

export function normalizeCourseName(rawLevel: string | number): {
  course: string;
  level: string;
  specialty: string | null;
  defStudents: number;
} | null {
  if (!rawLevel) return null;
  const str = String(rawLevel).trim();
  const lower = str.toLowerCase();
  const upper = str.toUpperCase();

  // Si es una asignatura aislada (ej. "MATEMATICA", "LENGUA -L") o rol administrativo
  if (isAcademicSubjectOrNonCourse(str)) {
    return null;
  }

  // Inicial — "inicial ii" se revisa antes que "inicial i" porque la incluye como subcadena.
  if (lower.includes("4 año") || lower.includes("4 ano") || lower.includes("inicial 2") || lower.includes("inicial ii") || lower.includes("grupo 4")) {
    return { course: "Inicial II (4 años)", level: "INICIAL", specialty: null, defStudents: 25 };
  }
  if (lower.includes("3 año") || lower.includes("3 ano") || lower.includes("inicial 1") || lower.includes("inicial i") || lower.includes("grupo 3")) {
    return { course: "Inicial I (3 años)", level: "INICIAL", specialty: null, defStudents: 25 };
  }
  if (lower.includes("inicial")) {
    return { course: "Inicial", level: "INICIAL", specialty: null, defStudents: 25 };
  }

  // Básica Preparatoria / 1.° EGB
  if (
    lower.includes("1er año básica") ||
    lower.includes("1er ano basica") ||
    lower.includes("1er año basica") ||
    lower.includes("preparatoria") ||
    lower === "primero" ||
    lower === "1er año"
  ) {
    return { course: "1.° EGB / Preparatoria", level: "BASICA_PREPARATORIA", specialty: null, defStudents: 30 };
  }

  // Básica Elemental
  if (lower.includes("2do año básica") || lower.includes("2do ano basica") || lower === "segundo") {
    return { course: "2.° EGB", level: "BASICA_ELEMENTAL", specialty: null, defStudents: 32 };
  }
  if (lower.includes("3er año básica") || lower.includes("3er ano basica") || lower === "tercero") {
    return { course: "3.° EGB", level: "BASICA_ELEMENTAL", specialty: null, defStudents: 32 };
  }
  if (lower.includes("4to año básica") || lower.includes("4to ano basica") || lower === "cuarto") {
    return { course: "4.° EGB", level: "BASICA_ELEMENTAL", specialty: null, defStudents: 32 };
  }

  // Básica Media
  if (lower.includes("5to año básica") || lower.includes("5to ano basica") || lower === "quinto") {
    return { course: "5.° EGB", level: "BASICA_MEDIA", specialty: null, defStudents: 32 };
  }
  if (lower.includes("6to año básica") || lower.includes("6to ano basica") || lower === "sexto") {
    return { course: "6.° EGB", level: "BASICA_MEDIA", specialty: null, defStudents: 32 };
  }
  if (lower.includes("7mo año básica") || lower.includes("7mo ano basica") || lower === "séptimo" || lower === "septimo") {
    return { course: "7.° EGB", level: "BASICA_MEDIA", specialty: null, defStudents: 32 };
  }

  // Básica Superior
  if (lower.includes("8vo año básica") || lower.includes("8vo ano basica") || lower.includes("octavo")) {
    return { course: "8.° EGB", level: "BASICA_SUPERIOR", specialty: null, defStudents: 34 };
  }
  if (lower.includes("9no año básica") || lower.includes("9no ano basica") || lower.includes("noveno")) {
    return { course: "9.° EGB", level: "BASICA_SUPERIOR", specialty: null, defStudents: 34 };
  }
  if (
    lower.includes("10mo año básica") ||
    lower.includes("10mo ano basica") ||
    lower.includes("décimo") ||
    lower.includes("decimo")
  ) {
    return { course: "10.° EGB", level: "BASICA_SUPERIOR", specialty: null, defStudents: 34 };
  }

  // Bachillerato
  const is1st = lower.includes("1er") || lower.includes("1ro") || lower.includes("primer");
  const is2nd = lower.includes("2do") || lower.includes("segundo");
  const is3rd = lower.includes("3ro") || lower.includes("3er") || lower.includes("tercero");

  if (is1st || is2nd || is3rd || lower.includes("bachillerato") || lower.includes("bgu")) {
    let specialty: string | null = null;
    let specSuffix = "";
    if (upper.includes("SEG-INF") || lower.includes("seguridad informatica") || lower.includes("seguridad informática")) {
      specialty = "Seguridad Informática";
      specSuffix = " - Seguridad Informática";
    } else if (upper.includes("GES-FIN") || lower.includes("gestion financiera") || lower.includes("gestión financiera")) {
      specialty = "Gestión Financiera";
      specSuffix = " - Gestión Financiera";
    } else if (upper.includes("INF") || lower.includes("informática") || lower.includes("informatica")) {
      specialty = "Informática";
      specSuffix = " - Informática";
    } else if (upper.includes("CONT") || lower.includes("contabilidad")) {
      specialty = "Contabilidad";
      specSuffix = " - Contabilidad";
    } else if (lower.includes("ciencias") || lower.includes("bgu")) {
      specialty = "Ciencias";
      specSuffix = " en Ciencias";
    } else {
      specialty = "Ciencias";
      specSuffix = " en Ciencias";
    }

    if (is1st) return { course: `1.° Bachillerato${specSuffix}`, level: "BACHILLERATO", specialty, defStudents: 32 };
    if (is2nd) return { course: `2.° Bachillerato${specSuffix}`, level: "BACHILLERATO", specialty, defStudents: 32 };
    if (is3rd) return { course: `3.° Bachillerato${specSuffix}`, level: "BACHILLERATO", specialty, defStudents: 32 };
    return { course: `Bachillerato${specSuffix}`, level: "BACHILLERATO", specialty, defStudents: 32 };
  }

  // Si no coincide con ningún nivel educativo válido, descartar
  return null;
}

/**
 * Parsea un archivo Excel de Numérico y Tutores.
 * Filtra asignaturas ajenas (ej. Matemática, Lengua), descarta hojas administrativas,
 * desduplica cursos idénticos y calcula el numérico institucional exacto (~2900 estudiantes).
 */
export async function parseTutorsExcelBuffer(
  buffer: Buffer
): Promise<{ success: boolean; data: ParsedCourseQuota[]; message?: string }> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const results: ParsedCourseQuota[] = [];
    const seenMap = new Map<string, number>();

    for (const worksheet of workbook.worksheets) {
      if (!worksheet || worksheet.rowCount < 2) continue;

      const wsNameUpper = worksheet.name.toUpperCase().trim();
      // 1. Ignorar hojas no lectivas (Directores, Secretarios, Áreas, Horarios, etc.)
      if (FORBIDDEN_SHEETS.some((f) => wsNameUpper.includes(f))) {
        continue;
      }

      let sheetDefaultJornada = "MATUTINA";
      if (wsNameUpper.includes("VESPERTINA") || wsNameUpper.includes("VESP")) {
        sheetDefaultJornada = "VESPERTINA";
      } else if (wsNameUpper.includes("NOCTURNA") || wsNameUpper.includes("NOC")) {
        sheetDefaultJornada = "NOCTURNA";
      }

      // 2. Buscar fila de encabezados
      let headerRowIdx = -1;
      let colNivel = -1;
      let colParalelo = -1;
      let colJornada = -1;
      let colTutor = -1;
      let colStudents = -1;

      for (let r = 1; r <= Math.min(worksheet.rowCount, 10); r++) {
        const row = worksheet.getRow(r);
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          const raw = String(cell.value || "").trim().toUpperCase();
          if ((raw.includes("NIVEL") || raw.includes("CURSO") || raw.includes("GRADO")) && !raw.includes("AREA")) {
            colNivel = colNum;
          }
          if (raw.includes("PARALELO")) colParalelo = colNum;
          if (raw.includes("JORNADA")) colJornada = colNum;
          if (raw.includes("TUTOR") || raw.includes("DOCENTE")) colTutor = colNum;
          if (
            raw.includes("ESTUDIANTES") ||
            raw.includes("ALUMNOS") ||
            raw.includes("CANTIDAD") ||
            raw.includes("MATRICULA") ||
            raw.includes("NUMERICO") ||
            raw.includes("NUMÉRICO")
          ) {
            colStudents = colNum;
          }
        });

        if (colNivel !== -1 && colParalelo !== -1) {
          headerRowIdx = r;
          break;
        }
      }

      // Si la hoja no tiene encabezados válidos de Nivel y Paralelo, omitirla
      if (headerRowIdx === -1 || colNivel === -1 || colParalelo === -1) {
        continue;
      }

      let currentJornada = sheetDefaultJornada;

      for (let r = headerRowIdx + 1; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        const cellNivel = colNivel > 0 ? row.getCell(colNivel).value : null;
        const cellParalelo = colParalelo > 0 ? row.getCell(colParalelo).value : null;
        const cellJornada = colJornada > 0 ? row.getCell(colJornada).value : null;
        const cellTutor = colTutor > 0 ? row.getCell(colTutor).value : null;
        const cellStudents = colStudents > 0 ? row.getCell(colStudents).value : null;

        const rawNivelStr = cellNivel ? String(cellNivel).trim() : "";
        let rawParaleloStr = cellParalelo ? String(cellParalelo).trim().toUpperCase() : "";

        // Omitir cabeceras intermedias o filas vacías
        if (
          !rawNivelStr ||
          rawNivelStr.toUpperCase() === "NIVEL" ||
          rawNivelStr.toUpperCase() === "CURSO" ||
          rawParaleloStr === "PARALELO"
        ) {
          continue;
        }

        // Extraer letra de paralelo válida
        if (!/^[A-Z]$/.test(rawParaleloStr)) {
          const m = rawParaleloStr.match(/[A-Z]/);
          if (m) rawParaleloStr = m[0];
          else continue;
        }

        if (cellJornada) {
          const jText = String(cellJornada).trim().toUpperCase();
          if (jText.includes("VESP")) currentJornada = "VESPERTINA";
          else if (jText.includes("NOC")) currentJornada = "NOCTURNA";
          else if (jText.includes("MAT")) currentJornada = "MATUTINA";
        }

        // Normalizar curso y filtrar asignaturas que no son grados
        const norm = normalizeCourseName(rawNivelStr);
        if (!norm) {
          continue;
        }

        let studentCount = norm.defStudents;
        if (cellStudents !== null && cellStudents !== undefined) {
          const parsedNum = Number(cellStudents);
          if (!isNaN(parsedNum) && parsedNum > 0) {
            studentCount = parsedNum;
          }
        }

        const tutorStr = cellTutor ? String(cellTutor).trim() : null;

        // Desduplicar cursos idénticos por: curso + paralelo + jornada
        const dedupKey = `${norm.course.toLowerCase().trim()}|${rawParaleloStr}|${currentJornada}`;

        if (seenMap.has(dedupKey)) {
          const existingIdx = seenMap.get(dedupKey)!;
          if (!results[existingIdx].tutor_name && tutorStr) {
            results[existingIdx].tutor_name = tutorStr;
          }
          // No duplicamos ni inflamos el numérico
          continue;
        }

        seenMap.set(dedupKey, results.length);
        results.push({
          education_level: norm.level,
          course: norm.course,
          parallel: rawParaleloStr,
          jornada: currentJornada,
          bachillerato_specialty: norm.specialty,
          student_count: studentCount,
          tutor_name: tutorStr,
        });
      }
    }

    if (results.length === 0) {
      return {
        success: false,
        data: [],
        message: "No se encontraron cursos y paralelos válidos en el archivo Excel.",
      };
    }

    const totalEst = results.reduce((sum, r) => sum + r.student_count, 0);

    return {
      success: true,
      data: results,
      message: `✓ Se detectaron exitosamente ${results.length} cursos y paralelos únicos (${totalEst} estudiantes en total, sin asignaturas ajenas ni duplicados).`,
    };
  } catch (err: any) {
    console.error("[parseTutorsExcelBuffer error]", err);
    return { success: false, data: [], message: err?.message || "Error al procesar archivo Excel." };
  }
}
