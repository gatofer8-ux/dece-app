/**
 * Lógica de ordenamiento jerárquico descendente para niveles y cursos educativos ecuatorianos.
 * Seguro para uso en componentes cliente y servidor (sin dependencias de node, db ni headers).
 */

/**
 * Calcula el rango jerárquico de un curso educativo para ordenar de forma descendente:
 * 3.° Bachillerato (Rank 130) -> 2.° Bachillerato (120) -> 1.° Bachillerato (110) ->
 * 10.° EGB (100) -> 9.° EGB (90) -> ... -> 1.° EGB (10) -> Inicial 2 (5) -> Inicial 1 (1).
 */
export function getCourseGradeRank(courseName: string): number {
  const name = courseName.toLowerCase().trim();

  // 1. Inicial (1 y 2) - prioridad antes de verificar dígitos genéricos
  if (name.includes("inicial 1") || name.includes("inicial i") || (name.includes("inicial") && name.includes("1"))) return 1;
  if (name.includes("inicial 2") || name.includes("inicial ii") || (name.includes("inicial") && name.includes("2"))) return 5;
  if (name.includes("inicial")) return 3;

  // 2. Preparatoria / 1.° EGB
  if (
    name.includes("preparatoria") ||
    ((name.includes("1.°") || name.includes("1°") || name.includes("primer")) &&
      (name.includes("egb") || name.includes("básica") || name.includes("basica")))
  ) {
    return 10;
  }

  // 3. Bachillerato (3.°, 2.°, 1.°)
  const isBach =
    name.includes("bachillerato") ||
    name.includes("bgu") ||
    name.includes("técnico") ||
    name.includes("tecnico") ||
    name.includes("ciencias");

  if (isBach) {
    if (name.includes("3") || name.includes("tercero")) return 130;
    if (name.includes("2") || name.includes("segundo")) return 120;
    if (name.includes("1") || name.includes("primero") || name.includes("primer")) return 110;
    return 105;
  }

  // 4. Básica Superior (10.°, 9.°, 8.°)
  if (name.includes("10") || name.includes("décimo") || name.includes("decimo")) return 100;
  if (name.includes("9") || name.includes("noveno")) return 90;
  if (name.includes("8") || name.includes("octavo")) return 80;

  // 5. Básica Media (7.°, 6.°, 5.°)
  if (name.includes("7") || name.includes("séptimo") || name.includes("septimo")) return 70;
  if (name.includes("6") || name.includes("sexto")) return 60;
  if (name.includes("5") || name.includes("quinto")) return 50;

  // 6. Básica Elemental (4.°, 3.°, 2.°)
  if (name.includes("4") || name.includes("cuarto")) return 40;
  if (name.includes("3") || name.includes("tercero")) return 30;
  if (name.includes("2") || name.includes("segundo")) return 20;
  if (name.includes("1") || name.includes("primero")) return 10;

  return 0;
}

/**
 * Función comparadora para ordenar cursos de forma descendente (desde 3.° Bachillerato hasta Inicial).
 */
export function compareCoursesDescending(courseA: string, courseB: string): number {
  const rA = getCourseGradeRank(courseA);
  const rB = getCourseGradeRank(courseB);
  if (rA !== rB) return rB - rA; // Nivel superior primero (3.° Bachillerato > Inicial)
  return courseA.localeCompare(courseB, "es", { numeric: true });
}

/**
 * Función comparadora para ordenar cursos de forma ascendente (desde Inicial hasta 3.° Bachillerato).
 */
export function compareCoursesAscending(courseA: string, courseB: string): number {
  const rA = getCourseGradeRank(courseA);
  const rB = getCourseGradeRank(courseB);
  if (rA !== rB) return rA - rB; // Inicial primero (Inicial < 3.° Bachillerato)
  return courseA.localeCompare(courseB, "es", { numeric: true });
}
