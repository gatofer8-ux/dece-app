export interface StudentCourseInput {
  course?: string | null;
  parallel?: string | null;
  education_level?: string | null;
  bachillerato_specialty?: string | null;
  jornada?: string | null;
}

/**
 * Formatea el curso completo de un estudiante para reportes e impresiones oficiales.
 * En particular, para estudiantes de Bachillerato, despliega el año completo,
 * la especialidad ministerial (ej. "Técnico en Informática", "en Ciencias", "Contabilidad"),
 * el paralelo entre comillas oficiales y la jornada.
 *
 * Ejemplos:
 * - "3.° de Bachillerato Técnico en Informática “A” — Matutina"
 * - "3.° de Bachillerato en Ciencias “B” — Vespertina"
 * - "2.° de Bachillerato General Unificado “C”"
 * - "10.° de EGB “A” — Matutina"
 */
export function formatStudentCourseFull(
  student?: StudentCourseInput | null,
  opts?: { includeJornada?: boolean }
): string {
  if (!student) return "";
  const includeJornada = opts?.includeJornada ?? true;

  const rawCourse = (student.course || "").trim();
  const rawParallel = (student.parallel || "").trim();
  const rawSpecialty = (student.bachillerato_specialty || "").trim();
  const rawJornada = (student.jornada || "").trim();
  const level = (student.education_level || "").toUpperCase();

  const isBachillerato =
    level === "BACHILLERATO" ||
    !!rawSpecialty ||
    /bachillerato|bgu/i.test(rawCourse) ||
    /^(?:1|2|3)(?:ro|do|er|ero|°)?s*(?:año|ano)?s*(?:bachillerato|bgu)/i.test(rawCourse) ||
    (/^(?:1|2|3)(?:ro|do|er|ero|°)?$/i.test(rawCourse) && level === "BACHILLERATO");

  let baseCourse = rawCourse;

  if (isBachillerato) {
    // Extraer número de año (1, 2 o 3)
    let yearNum = "1";
    if (/(?:^|)(?:3|3ro|3er|3ero|tercer|tercero|3°)(?:|$)/i.test(rawCourse)) {
      yearNum = "3";
    } else if (/(?:^|)(?:2|2do|segundo|2°)(?:|$)/i.test(rawCourse)) {
      yearNum = "2";
    } else if (/(?:^|)(?:1|1ro|1er|1ero|primer|primero|1°)(?:|$)/i.test(rawCourse)) {
      yearNum = "1";
    }

    let formattedSpecialty = "";
    if (rawSpecialty) {
      const lowerSpec = rawSpecialty.toLowerCase();
      if (lowerSpec.startsWith("técnico") || lowerSpec.startsWith("tecnico")) {
        formattedSpecialty = ` ${rawSpecialty}`;
      } else if (lowerSpec === "ciencias") {
        formattedSpecialty = " en Ciencias";
      } else if (lowerSpec === "informática" || lowerSpec === "informatica") {
        formattedSpecialty = " Técnico en Informática";
      } else if (lowerSpec === "contabilidad") {
        formattedSpecialty = " Técnico en Contabilidad";
      } else if (/^(general|unificado|bgu|general unificado)$/i.test(lowerSpec)) {
        formattedSpecialty = " General Unificado";
      } else if (lowerSpec.startsWith("en ")) {
        formattedSpecialty = ` ${rawSpecialty}`;
      } else if (/t[eé]cnic/i.test(lowerSpec)) {
        // La figura profesional ya contiene "Técnico" (p.ej. "Soporte Técnico
        // de Equipos Informáticos"): se evita el doble "Técnico en Técnico".
        formattedSpecialty = ` Técnico, figura profesional “${rawSpecialty}”`;
      } else {
        formattedSpecialty = ` Técnico en ${rawSpecialty}`;
      }
    } else {
      if (/ciencias/i.test(rawCourse)) {
        formattedSpecialty = " en Ciencias";
      } else if (/inform[aá]tica/i.test(rawCourse)) {
        formattedSpecialty = " Técnico en Informática";
      } else if (/contabilidad/i.test(rawCourse)) {
        formattedSpecialty = " Técnico en Contabilidad";
      } else if (/t[eé]cnico/i.test(rawCourse)) {
        formattedSpecialty = " Técnico";
      } else {
        formattedSpecialty = " General Unificado";
      }
    }

    baseCourse = `${yearNum}.° de Bachillerato${formattedSpecialty}`;
  } else if (/^(?:10|9|8|7|6|5|4|3|2|1)(?:mo|no|vo|to|ro|do|er|ero|°)?s*(?:egb|b[aá]sica)?/i.test(rawCourse)) {
    // EGB
    const m = rawCourse.match(/^(10|9|8|7|6|5|4|3|2|1)/);
    if (m) {
      const num = m[1];
      if (num === "1") {
        baseCourse = "1.° EGB / Preparatoria";
      } else {
        baseCourse = `${num}.° de EGB`;
      }
    }
  }

  // Si no se reconoció un patrón específico pero existe rawCourse, usar rawCourse
  if (!baseCourse) {
    baseCourse = rawCourse || "No especificado";
  }

  const parts = [baseCourse];
  if (rawParallel) {
    parts.push(`“${rawParallel}”`);
  }
  if (rawJornada && includeJornada) {
    parts.push(`— ${rawJornada}`);
  }

  return parts.join(" ");
}

/**
 * Etiqueta de grado/curso para campos de formulario y contexto de la IA:
 * incluye SIEMPRE el nivel (Bachillerato + especialidad, EGB) y el paralelo,
 * sin la jornada (que suele ser un campo aparte).
 */
export function studentGradeLabel(student?: StudentCourseInput | null): string {
  return formatStudentCourseFull(student, { includeJornada: false });
}

/**
 * Solo el grado/curso con su nivel (Bachillerato + especialidad, EGB), SIN
 * paralelo ni jornada — para formatos que tienen celdas separadas de paralelo.
 */
export function studentGradeOnly(student?: StudentCourseInput | null): string {
  return formatStudentCourseFull({ ...(student || {}), parallel: null, jornada: null }, { includeJornada: false });
}
