export interface ExtractedField {
  value: string;
  confidence: number;
  isHandwritten: boolean;
  needsVerification: boolean;
}

export interface ExtractedCorresponsibilityData {
  city: ExtractedField;
  act_date: ExtractedField;
  act_time: ExtractedField;
  student_name: ExtractedField;
  student_grade: ExtractedField;
  student_parallel: ExtractedField;
  jornada: ExtractedField;
  representative_name: ExtractedField;
  representative_id_num: ExtractedField;
  representative_relationship: ExtractedField;
  representative_phone: ExtractedField;
  representative_address: ExtractedField;
  detected_difficulty: ExtractedField;
  conflict_type: ExtractedField;
  commitments_representative: ExtractedField;
  commitments_dece: ExtractedField;
  commitments_student: ExtractedField;
  observations: ExtractedField;
}

export interface ExtractedAlertNotificationData {
  student_name: ExtractedField;
  student_id_num: ExtractedField;
  student_birth_date: ExtractedField;
  student_age: ExtractedField;
  student_grade: ExtractedField;
  student_parallel: ExtractedField;
  jornada: ExtractedField;
  docente_tutor: ExtractedField;
  representative_name: ExtractedField;
  representative_phone: ExtractedField;
  representative_address: ExtractedField;
  
  // 12 Casillas de Alerta
  alerta_inestabilidad_emocional: boolean;
  alerta_hijo_ppl: boolean;
  alerta_trabajo_infantil: boolean;
  alerta_riesgo_psicosocial: boolean;
  alerta_movilidad_humana: boolean;
  alerta_conflictos_intrafamiliares: boolean;
  alerta_autolesiones_ideacion: boolean;
  alerta_hostigamiento_academico: boolean;
  alerta_embarazo_maternidad_paternidad: boolean;
  alerta_posible_dependencia_sustancias: boolean;
  alerta_vulneracion_derechos: boolean;
  alerta_otros: boolean;
  especificar_alerta: ExtractedField;

  lugar_fecha_hechos: ExtractedField;
  intervencion_pregunta_1: ExtractedField;
  intervencion_pregunta_2: ExtractedField;
  intervencion_pregunta_3: ExtractedField;
  intervencion_pregunta_4: ExtractedField;
  intervencion_pregunta_5: ExtractedField;

  notificador_nombre: ExtractedField;
  notificador_cargo: ExtractedField;
  notificador_contacto: ExtractedField;
  fecha_entrega_dece: ExtractedField;
}

// Helpers de extracción
function createField(val: string, baseConfidence = 85, isHandwritten = false): ExtractedField {
  const clean = val ? val.trim() : "";
  const needsVerification = isHandwritten || baseConfidence < 75 || clean.length === 0;
  return {
    value: clean,
    confidence: clean.length > 0 ? baseConfidence : 0,
    isHandwritten,
    needsVerification,
  };
}

const MONTHS_MAP: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

/**
 * Normaliza fechas comunes en español a formato ISO YYYY-MM-DD
 */
export function normalizeDate(raw: string): string {
  if (!raw) return "";

  // 1. Formato DD/MM/YYYY o DD-MM-YYYY
  const numMatch = raw.match(/\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})\b/);
  if (numMatch) {
    const day = numMatch[1].padStart(2, "0");
    const month = numMatch[2].padStart(2, "0");
    const year = numMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 2. Formato textual: "15 de octubre de 2024"
  const textMatch = raw.match(/(\d{1,2})\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)\s+(?:del?|de)\s+(\d{4})/i);
  if (textMatch) {
    const day = textMatch[1].padStart(2, "0");
    const monthName = textMatch[2].toLowerCase();
    const month = MONTHS_MAP[monthName] || "01";
    const year = textMatch[3];
    return `${year}-${month}-${day}`;
  }

  return raw;
}

/**
 * Busca una cédula ecuatoriana de 10 dígitos
 */
export function extractEcuadorianId(text: string): string {
  const matches = text.match(/\b\d{10}\b/g);
  return matches ? matches[0] : "";
}

/**
 * Busca un teléfono ecuatoriano (ej. 0991234567 o 032123456)
 */
export function extractPhone(text: string): string {
  const cell = text.match(/\b09\d{8}\b/);
  if (cell) return cell[0];
  const conv = text.match(/\b0[2-7]\d{7}\b/);
  if (conv) return conv[0];
  return "";
}

/**
 * Busca un valor ubicado después de una etiqueta de encabezado
 */
function extractAfterLabel(text: string, labelPattern: RegExp, maxChars = 150): string {
  const match = text.match(labelPattern);
  if (!match || match.index === undefined) return "";
  const start = match.index + match[0].length;
  const snippet = text.slice(start, start + maxChars);
  // Corta en el salto de línea o en una etiqueta posterior con dos puntos
  const lineEnd = snippet.search(/[\n\r]|(?:\s+[A-ZÁÉÍÓÚa-záéíóú]{3,25}:)/);
  const result = lineEnd !== -1 ? snippet.slice(0, lineEnd) : snippet;
  return result.replace(/^[:\s\-_.]+/, "").trim();
}

/**
 * Extractor específico para Acta de Compromiso y Corresponsabilidad
 */
export function extractCorresponsibilityData(
  fullText: string,
  studentContext?: { full_name?: string; course?: string; parallel?: string; representative?: string; rep_phone?: string }
): ExtractedCorresponsibilityData {
  // Cédula
  const cedula = extractEcuadorianId(fullText);

  // Teléfono
  const phone = extractPhone(fullText) || studentContext?.rep_phone || "";

  // Fecha
  const dateRaw = normalizeDate(fullText) || new Date().toISOString().split("T")[0];

  // Ciudad
  let city = "Ambato";
  if (/quito/i.test(fullText)) city = "Quito";
  else if (/guayaquil/i.test(fullText)) city = "Guayaquil";
  else if (/cuenca/i.test(fullText)) city = "Cuenca";
  else if (/pelileo/i.test(fullText)) city = "Pelileo";
  else if (/baños/i.test(fullText)) city = "Baños";

  // Hora
  const timeMatch = fullText.match(/\b(\d{1,2}:\d{2})\b/);
  const actTime = timeMatch ? timeMatch[1] : "10:00";

  // Estudiante
  let studentName = extractAfterLabel(fullText, /(?:estudiante|nombres y apellidos del estudiante|estudiante:)/i);
  if (!studentName && studentContext?.full_name) {
    studentName = studentContext.full_name;
  }

  // Grado / Curso
  let grade = extractAfterLabel(fullText, /(?:grado|curso|año de educación|nivel:)/i);
  if (!grade && studentContext?.course) {
    grade = studentContext.course;
  }

  // Paralelo
  let parallel = "";
  const parMatch = fullText.match(/(?:paralelo|paralelo:)\s*([A-Za-z])/i);
  if (parMatch) parallel = parMatch[1].toUpperCase();
  else if (studentContext?.parallel) parallel = studentContext.parallel;

  // Jornada
  let jornada = "MATUTINA";
  if (/vespertina/i.test(fullText)) jornada = "VESPERTINA";

  // Representante
  let repName = extractAfterLabel(fullText, /(?:representante|nombre del representante|sr\(a\)|padre\/madre:)/i);
  if (!repName && studentContext?.representative) {
    repName = studentContext.representative;
  }

  // Parentesco
  let relationship = "Madre";
  if (/\bpadre\b/i.test(fullText)) relationship = "Padre";
  else if (/\btutor\b/i.test(fullText)) relationship = "Tutor Legal";
  else if (/\babuel[ao]\b/i.test(fullText)) relationship = "Abuela/Abuelo";
  else if (/\btí[ao]\b/i.test(fullText)) relationship = "Tía/Tío";

  // Dirección
  const address = extractAfterLabel(fullText, /(?:dirección|domicilio|residencia:)/i);

  // Dificultad / Hecho
  const difficulty = extractAfterLabel(
    fullText,
    /(?:dificultad detectada|motivo|situación detectada|hechos:)/i,
    300
  ) || "Incumplimiento o dificultad conductual/académica registrada en el expediente institucional.";

  // Compromisos
  const commitmentsRep = extractAfterLabel(
    fullText,
    /(?:compromisos del representante|el representante se compromete a:)/i,
    300
  ) || "Acompañar y supervisar las actividades escolares y formativas del estudiante en el hogar.";

  const commitmentsDece = extractAfterLabel(
    fullText,
    /(?:compromisos del dece|el profesional dece se compromete a:)/i,
    300
  ) || "Realizar seguimiento psicosocial continuo y coordinar con el cuerpo docente institucional.";

  const commitmentsStudent = extractAfterLabel(
    fullText,
    /(?:compromisos del estudiante|el estudiante se compromete a:)/i,
    250
  ) || "Cumplir con las normas de convivencia escolar y las tareas encomendadas.";

  return {
    city: createField(city, 90),
    act_date: createField(dateRaw, dateRaw ? 85 : 0),
    act_time: createField(actTime, actTime ? 80 : 0),
    student_name: createField(studentName, studentName ? 85 : 40, false),
    student_grade: createField(grade, grade ? 85 : 40),
    student_parallel: createField(parallel, parallel ? 90 : 40),
    jornada: createField(jornada, 90),
    representative_name: createField(repName, repName ? 85 : 40, false),
    representative_id_num: createField(cedula, cedula ? 90 : 30, false),
    representative_relationship: createField(relationship, 85),
    representative_phone: createField(phone, phone ? 90 : 30),
    representative_address: createField(address, address ? 75 : 30),
    detected_difficulty: createField(difficulty, 75, true),
    conflict_type: createField("OTRO", 80),
    commitments_representative: createField(commitmentsRep, 75, true),
    commitments_dece: createField(commitmentsDece, 80),
    commitments_student: createField(commitmentsStudent, 75, true),
    observations: createField("", 50),
  };
}

/**
 * Extractor específico para Ficha de Notificación de Alerta
 */
export function extractAlertNotificationData(
  fullText: string,
  studentContext?: { full_name?: string; course?: string; parallel?: string; representative?: string; rep_phone?: string }
): ExtractedAlertNotificationData {
  const norm = fullText.toUpperCase();

  const cedula = extractEcuadorianId(fullText);
  const phone = extractPhone(fullText) || studentContext?.rep_phone || "";
  const dateRaw = normalizeDate(fullText) || new Date().toISOString().split("T")[0];

  let studentName = extractAfterLabel(fullText, /(?:estudiante|nombres y apellidos del estudiante|estudiante:)/i);
  if (!studentName && studentContext?.full_name) {
    studentName = studentContext.full_name;
  }

  let grade = extractAfterLabel(fullText, /(?:grado|curso|año de educación|nivel:)/i);
  if (!grade && studentContext?.course) {
    grade = studentContext.course;
  }

  let parallel = "";
  const parMatch = fullText.match(/(?:paralelo|paralelo:)\s*([A-Za-z])/i);
  if (parMatch) parallel = parMatch[1].toUpperCase();
  else if (studentContext?.parallel) parallel = studentContext.parallel;

  let repName = extractAfterLabel(fullText, /(?:representante|nombre del representante|representante legal:)/i);
  if (!repName && studentContext?.representative) {
    repName = studentContext.representative;
  }

  const tutor = extractAfterLabel(fullText, /(?:docente tutor|tutor del curso|tutor:)/i);
  const address = extractAfterLabel(fullText, /(?:dirección|domicilio|residencia:)/i);

  // Detección de casillas marcadas (12 aspectos)
  const isChecked = (keyword: string) => {
    // Si la palabra clave está presente con indicación de marca
    const pattern = new RegExp(`(?:\\[[Xx✓]\\]|[Xx✓]\\s*\\)?|☑)\\s*.*${keyword}`, "i");
    return pattern.test(fullText) || norm.includes(keyword.toUpperCase());
  };

  const hasInestabilidad = isChecked("INESTABILIDAD EMOCIONAL") || isChecked("CAMBIOS DRÁSTICOS DE CONDUCTA");
  const hasPpl = isChecked("HIJO DE PERSONA PRIVADA") || isChecked("PPL");
  const hasTrabajo = isChecked("TRABAJO INFANTIL") || isChecked("MENDICIDAD");
  const hasRiesgo = isChecked("RIESGO PSICOSOCIAL");
  const hasMovilidad = isChecked("MOVILIDAD HUMANA") || isChecked("REFUGIADO");
  const hasConflictos = isChecked("CONFLICTOS INTRAFAMILIARES") || isChecked("VIOLENCIA INTRAFAMILIAR");
  const hasAutolesiones = isChecked("AUTOLESIONES") || isChecked("IDEACIÓN SUICIDA") || isChecked("IDEACION SUICIDA");
  const hasHostigamiento = isChecked("HOSTIGAMIENTO ACADÉMICO") || isChecked("ACOSO ESCOLAR") || isChecked("BULLYING");
  const hasEmbarazo = isChecked("EMBARAZO") || isChecked("MATERNIDAD") || isChecked("PATERNIDAD");
  const hasSustancias = isChecked("CONSUMO DE SUSTANCIAS") || isChecked("DEPENDENCIA DE SUSTANCIAS") || isChecked("ALCOHOL");
  const hasVulneracion = isChecked("VULNERACIÓN DE DERECHOS") || isChecked("NEGLIGENCIA");
  const hasOtros = isChecked("OTROS") || isChecked("OTRA SITUACIÓN");

  const antecedente = extractAfterLabel(fullText, /(?:hechos y antecedentes|hechos|descripción de la alerta:)/i, 400);

  // 5 Preguntas técnicas
  const p1 = extractAfterLabel(fullText, /(?:acciones pedagógicas|qué acciones pedagógicas|pregunta 1:)/i, 250);
  const p2 = extractAfterLabel(fullText, /(?:estrategias de diálogo|diálogo con el estudiante|pregunta 2:)/i, 250);
  const p3 = extractAfterLabel(fullText, /(?:contacto con la familia|diálogo con la familia|pregunta 3:)/i, 250);
  const p4 = extractAfterLabel(fullText, /(?:acuerdos establecidos|compromisos previos|pregunta 4:)/i, 250);
  const p5 = extractAfterLabel(fullText, /(?:sugerencias o recomendaciones|apoyo solicitado|pregunta 5:)/i, 250);

  const notificador = extractAfterLabel(fullText, /(?:notificado por|docente que notifica|notificador:)/i) || tutor || "Docente Tutor";

  return {
    student_name: createField(studentName, studentName ? 85 : 40, false),
    student_id_num: createField(cedula, cedula ? 90 : 30),
    student_birth_date: createField("", 40),
    student_age: createField("", 40),
    student_grade: createField(grade, grade ? 85 : 40),
    student_parallel: createField(parallel, parallel ? 90 : 40),
    jornada: createField(/vespertina/i.test(fullText) ? "VESPERTINA" : "MATUTINA", 90),
    docente_tutor: createField(tutor, tutor ? 80 : 40, false),
    representative_name: createField(repName, repName ? 85 : 40, false),
    representative_phone: createField(phone, phone ? 90 : 30),
    representative_address: createField(address, address ? 75 : 30),

    alerta_inestabilidad_emocional: hasInestabilidad,
    alerta_hijo_ppl: hasPpl,
    alerta_trabajo_infantil: hasTrabajo,
    alerta_riesgo_psicosocial: hasRiesgo,
    alerta_movilidad_humana: hasMovilidad,
    alerta_conflictos_intrafamiliares: hasConflictos,
    alerta_autolesiones_ideacion: hasAutolesiones,
    alerta_hostigamiento_academico: hasHostigamiento,
    alerta_embarazo_maternidad_paternidad: hasEmbarazo,
    alerta_posible_dependencia_sustancias: hasSustancias,
    alerta_vulneracion_derechos: hasVulneracion,
    alerta_otros: hasOtros,
    especificar_alerta: createField("", 50),

    lugar_fecha_hechos: createField(antecedente, antecedente ? 75 : 40, true),
    intervencion_pregunta_1: createField(p1, p1 ? 75 : 30, true),
    intervencion_pregunta_2: createField(p2, p2 ? 75 : 30, true),
    intervencion_pregunta_3: createField(p3, p3 ? 75 : 30, true),
    intervencion_pregunta_4: createField(p4, p4 ? 75 : 30, true),
    intervencion_pregunta_5: createField(p5, p5 ? 75 : 30, true),

    notificador_nombre: createField(notificador, notificador ? 80 : 40, false),
    notificador_cargo: createField("Docente Tutor", 85),
    notificador_contacto: createField(phone, phone ? 85 : 40),
    fecha_entrega_dece: createField(dateRaw, 85),
  };
}
