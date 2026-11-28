export const DEFAULT_ANTECEDENTES = (trimesterLabel: string, schoolYearText: string) =>
  `En Concordancia al ACUERDO Nro. MINEDUC-MINEDUC-2024-00066-A sobre la JUNTA DE DOCENTES DE GRADO O CURSO Art. 15.- Junta de DocENTES DE GRADO O CURSO.- Es el organismo institucional encargado de analizar, dentro y fuera de las horas pedagógicas, el desempeño educativo estudiantil; propondrá estrategias educativas a ser aplicadas a los/as estudiantes, ya sea de forma individual o colectiva, para alcanzar los objetivos de aprendizaje de los grados o cursos correspondientes a los niveles y subniveles educativos. Este organismo estará presidido por el/la docente tutor/a del grado o curso, que será el/la docente designado/a por la máxima autoridad de la institución educativa al inicio de cada año lectivo, a fin de acompañar al grupo de estudiantes y cumplir con las funciones establecidas en la normativa vigente. Art. 16.- Conformación de la Junta de Docentes de Grado o Curso.- Estará conformada por: 1. Docente tutor/a del grado o curso correspondiente, que asumirá las funciones de presidente/a; 2. Totalidad de docentes de un mismo grado o curso; y, 3. Un/a (1) representante del Departamento de Consejería Estudiantil de la institución educativa, en caso de existir. El/la secretario/a, será elegido/a de entre los miembros de la Junta de Docentes de Grado o Curso.\n\nSe levanta el presente informe de atención y seguimiento psicosocial del ${trimesterLabel} año lectivo ${schoolYearText}.`;

export const DEFAULT_OBJETIVO =
  "Informar sobre las acciones de atención, acompañamiento y seguimiento psicosocial a estudiantes en situación de vulnerabilidad o riesgo psicosocial abordados dentro del Departamento de Consejería Estudiantil.";

export const DEFAULT_GENERAL_ACTIONS =
  "Activación de rutas y protocolos. Abordaje a estudiantes y articulación con docentes y autoridades para la garantía de derechos y permanencia educativa.";

export const DEFAULT_CONCLUSIONES = (trimesterLabel: string) =>
  `- Los estudiantes según las problemáticas detectadas han recibido el respectivo seguimiento, o asesoramiento según el requerimiento.\n- Los docentes miembros de la Junta de Curso tienen conocimiento de los casos de vulnerabilidad y de atención psicosocial gestionados por el Departamento de Consejería Estudiantil, durante el ${trimesterLabel.toLowerCase()}.`;

export const DEFAULT_RECOMENDACIONES =
  `- Se recomienda a los docentes remitir al DECE los casos mediante fichas de notificación con la finalidad de evidenciar los procesos.\n- Se recomienda que los docentes tutores mantengan comunicación constante, pertinente y eficiente con los representantes legales según lo determina el Reglamento LOEI.\n- Comunicar al Profesional DECE los casos de posible vulneración de derechos para activar las rutas y protocolos adecuados para precautelar el interés superior del niño.\n- Agendar las citas con padres de familia con previa anticipación a la Profesional DECE para mantener una buena planificación de atención.`;

/** Texto sugerido para "3.- Observaciones" del formato E.D1.C2.DE3 según las fichas de alerta registradas. */
export function alertsObservation(count: number, schoolYear: string): string {
  if (count <= 0) {
    return `En el año lectivo ${schoolYear}, a la fecha, no existieron casos reportados por los docentes a través de la ficha de notificación de alerta.`;
  }
  return `En el año lectivo ${schoolYear}, a la fecha, existieron ${count} caso${count === 1 ? "" : "s"} reportado${count === 1 ? "" : "s"} por los docentes a través de la ficha de notificación de alerta.`;
}

/** Fecha local YYYY-MM-DD (toISOString usa UTC y en la noche de Ecuador ya da el día siguiente). */
export function localIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Resumen de acciones del caso ("• Tipo: descripción" por línea) a viñetas cortas "-Tipo", como en el
 * formato E.D1.C2.DE3. Se omiten las descripciones, que pueden traer nombres de familiares.
 */
export function actionTypesSummary(actions: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of (actions || "").split("\n")) {
    const line = raw.replace(/^\s*[•\-*]\s*/, "").trim();
    if (!line) continue;
    const type = (line.includes(":") ? line.slice(0, line.indexOf(":")) : line).trim();
    const key = type.toLowerCase();
    if (!type || seen.has(key)) continue;
    seen.add(key);
    out.push(`-${type}`);
  }
  return out.join("\n");
}
