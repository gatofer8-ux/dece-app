import { randomUUID } from "crypto";
import ExcelJS from "exceljs";
import { db } from "./db";
import { nextCaseCode } from "./codes";
import { normalizeDocumentId, detectDocumentType, type DocumentType } from "./documentId";
import type { RiskType, CaseStatus, CasePriority, ActionAxis } from "./types";

export interface CaseImportRowResult {
  row: number;
  studentName: string;
  documentId: string | null;
  course: string;
  parallel: string | null;
  caseCode?: string;
  caseId?: string;
  riskTypeLabel: string;
  status: string;
  isNewStudent: boolean;
  notes?: string;
}

export interface CaseImportSkippedRow {
  row: number;
  name: string;
  reason: string;
}

export interface CaseImportSummary {
  createdCases: number;
  createdStudents: number;
  linkedStudents: number;
  rows: CaseImportRowResult[];
  skipped: CaseImportSkippedRow[];
}

/**
 * Mapea textos comunes o variaciones de redacción que usan los DECE en sus matrices
 * hacia las 11 tipologías oficiales de riesgo del sistema.
 */
export function mapTypologyToRiskType(rawText: string | null | undefined): {
  riskType: RiskType;
  riskTypeOther?: string;
} {
  if (!rawText || !rawText.trim()) {
    return { riskType: "OTRO", riskTypeOther: "Sin tipología especificada en la matriz" };
  }

  const s = rawText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // 1. Violencia intrafamiliar
  if (
    s.includes("intrafamiliar") ||
    s.includes("violencia fisica en el hogar") ||
    s.includes("maltrato infantil") ||
    s.includes("violencia en casa") ||
    s.includes("maltrato fisico") ||
    s.includes("maltrato psicologico") ||
    s.includes("agresion familiar")
  ) {
    return { riskType: "VIOLENCIA_INTRAFAMILIAR" };
  }

  // 2. Violencia escolar / bullying / pares
  if (
    s.includes("bullying") ||
    s.includes("acoso escolar") ||
    s.includes("ciberacoso") ||
    s.includes("cyberbullying") ||
    s.includes("violencia entre pares") ||
    s.includes("agresion entre companeros") ||
    s.includes("violencia escolar")
  ) {
    return { riskType: "VIOLENCIA_ESCOLAR_BULLYING" };
  }

  // 3. Violencia sexual
  if (
    s.includes("sexual") ||
    s.includes("abuso sexual") ||
    s.includes("acoso sexual") ||
    s.includes("tocamiento") ||
    s.includes("violacion") ||
    s.includes("estupro")
  ) {
    return { riskType: "VIOLENCIA_SEXUAL" };
  }

  // 4. Consumo de sustancias / SPA
  if (
    s.includes("sustancia") ||
    s.includes("droga") ||
    s.includes("alcohol") ||
    s.includes("spa") ||
    s.includes("estupefaciente") ||
    s.includes("tabaco") ||
    s.includes("vape")
  ) {
    return { riskType: "CONSUMO_SUSTANCIAS" };
  }

  // 5. Salud mental / Conducta suicida / Autolesiones
  if (
    s.includes("salud mental") ||
    s.includes("suicid") ||
    s.includes("autolesi") ||
    s.includes("cutting") ||
    s.includes("depresi") ||
    s.includes("ansiedad") ||
    s.includes("crisis emocional") ||
    s.includes("autolitico") ||
    s.includes("trastorno") ||
    s.includes("afectiv")
  ) {
    return { riskType: "SALUD_MENTAL" };
  }

  // 6. Embarazo adolescente
  if (s.includes("embarazo") || s.includes("gestaci") || s.includes("maternidad temprana") || s.includes("paternidad temprana")) {
    return { riskType: "EMBARAZO_ADOLESCENTE" };
  }

  // 7. Dificultad de aprendizaje / NEE
  if (
    s.includes("aprendizaje") ||
    s.includes("nee") ||
    s.includes("discapacidad") ||
    s.includes("adaptacion curricular") ||
    s.includes("rezago") ||
    s.includes("bajo rendimiento") ||
    s.includes("dislexia") ||
    s.includes("tdah") ||
    s.includes("intelectual")
  ) {
    return { riskType: "DIFICULTAD_APRENDIZAJE" };
  }

  // 8. Conflicto familiar / Disfunción
  if (
    s.includes("conflicto familiar") ||
    s.includes("separacion") ||
    s.includes("divorcio") ||
    s.includes("patria potestad") ||
    s.includes("custodia") ||
    s.includes("pension alimenticia") ||
    s.includes("disfuncion familiar")
  ) {
    return { riskType: "CONFLICTO_FAMILIAR" };
  }

  // 9. Conectividad / Acceso / Deserción / Movilidad
  if (
    s.includes("conectividad") ||
    s.includes("acceso educativo") ||
    s.includes("desercion") ||
    s.includes("abandono escolar") ||
    s.includes("movilidad humana") ||
    s.includes("migracion") ||
    s.includes("inestabilidad economica") ||
    s.includes("ausentismo")
  ) {
    return { riskType: "CONECTIVIDAD_ACCESO_EDUCATIVO" };
  }

  // 10. Vulneración de derechos / Trabajo infantil / Negligencia
  if (
    s.includes("vulneracion") ||
    s.includes("derecho") ||
    s.includes("trabajo infantil") ||
    s.includes("negligencia") ||
    s.includes("mendicidad") ||
    s.includes("abandono")
  ) {
    return { riskType: "VULNERACION_DERECHOS" };
  }

  // 11. Otro
  return { riskType: "OTRO", riskTypeOther: rawText.trim() };
}

export interface ColumnIndexMap {
  nameCol: number;
  docCol?: number;
  courseCol?: number;
  parallelCol?: number;
  typologyCol?: number;
  descriptionCol?: number;
  representativeCol?: number;
  phoneCol?: number;
  dateCol?: number;
  priorityCol?: number;
}

/**
 * Resuelve las posiciones de columnas de forma inteligente buscando sinónimos
 * en la fila de cabeceras de la matriz.
 */
export function resolveColumnIndices(headerRow: ExcelJS.Row): ColumnIndexMap {
  const map: ColumnIndexMap = {
    nameCol: 1, // por defecto columna 1
  };

  headerRow.eachCell((cell, colNumber) => {
    const text = String(cell.value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    if (!text) return;

    // Nombre
    if (
      text.includes("nombre") ||
      text.includes("estudiante") ||
      text.includes("alumno") ||
      text.includes("apellidos")
    ) {
      if (!map.nameCol || text.includes("completo") || text.includes("estudiante")) {
        map.nameCol = colNumber;
      }
    }
    // Cédula / Documento
    else if (
      text.includes("cedula") ||
      text.includes("documento") ||
      text.includes("identificacion") ||
      text.includes("nui")
    ) {
      map.docCol = colNumber;
    }
    // Curso / Grado
    else if (text.includes("curso") || text.includes("grado") || text.includes("nivel")) {
      map.courseCol = colNumber;
    }
    // Paralelo
    else if (text.includes("paralelo") || text.includes("seccion")) {
      map.parallelCol = colNumber;
    }
    // Tipología / Vulnerabilidad / Problemática
    else if (
      text.includes("tipologia") ||
      text.includes("vulnerabilidad") ||
      text.includes("problematica") ||
      text.includes("riesgo") ||
      text.includes("motivo") ||
      text.includes("situacion")
    ) {
      map.typologyCol = colNumber;
    }
    // Descripción / Observaciones / Antecedentes
    else if (
      text.includes("observacion") ||
      text.includes("descripcion") ||
      text.includes("detalle") ||
      text.includes("antecedente") ||
      text.includes("acciones")
    ) {
      map.descriptionCol = colNumber;
    }
    // Representante
    else if (text.includes("representante") || text.includes("padre") || text.includes("madre") || text.includes("tutor")) {
      map.representativeCol = colNumber;
    }
    // Teléfono
    else if (text.includes("telefono") || text.includes("celular") || text.includes("contacto")) {
      map.phoneCol = colNumber;
    }
    // Fecha
    else if (text.includes("fecha") || text.includes("deteccion") || text.includes("apertura")) {
      map.dateCol = colNumber;
    }
    // Prioridad
    else if (text.includes("prioridad") || text.includes("urgencia")) {
      map.priorityCol = colNumber;
    }
  });

  return map;
}

function cellText(row: ExcelJS.Row, col?: number): string | null {
  if (!col) return null;
  const cell = row.getCell(col);
  let v = cell.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "object" && v !== null && "result" in (v as any)) {
    v = (v as any).result;
  }
  if (typeof v === "object" && v !== null && "text" in (v as any)) {
    v = (v as any).text;
  }
  const s = String(v).trim();
  return s.length ? s : null;
}

export interface ImportCasesOptions {
  institutionId: string;
  userId: string;
  defaultStatus?: CaseStatus;
  defaultPriority?: CasePriority;
  defaultAxis?: ActionAxis;
}

/**
 * Lee y procesa un libro de Excel (.xlsx) para importar masivamente la matriz
 * de casos de vulnerabilidad, emparejando o creando estudiantes y abriendo expedientes.
 */
export async function processCaseMatrixWorkbook(
  workbook: ExcelJS.Workbook,
  opts: ImportCasesOptions
): Promise<CaseImportSummary> {
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("El archivo no contiene ninguna hoja de cálculo con datos.");
  }

  const headerRow = sheet.getRow(1);
  const colMap = resolveColumnIndices(headerRow);

  const defaultStatus: CaseStatus = opts.defaultStatus || "EN_SEGUIMIENTO";
  const defaultPriority: CasePriority = opts.defaultPriority || "MEDIA";
  const defaultAxis: ActionAxis = opts.defaultAxis || "SEGUIMIENTO";

  const rows: CaseImportRowResult[] = [];
  const skipped: CaseImportSkippedRow[] = [];

  let createdCasesCount = 0;
  let createdStudentsCount = 0;
  let linkedStudentsCount = 0;

  // Consultar estudiantes ya existentes de la institución para mapeo rápido
  const existingStudents = db
    .prepare(
      "SELECT id, full_name, document_id, course, parallel FROM students WHERE institution_id = ?"
    )
    .all(opts.institutionId) as {
    id: string;
    full_name: string;
    document_id: string | null;
    course: string;
    parallel: string | null;
  }[];

  const studentsByDoc = new Map<string, typeof existingStudents[0]>();
  const studentsByName = new Map<string, typeof existingStudents[0]>();

  for (const st of existingStudents) {
    if (st.document_id) {
      studentsByDoc.set(st.document_id, st);
    }
    const cleanName = st.full_name.toLowerCase().trim();
    studentsByName.set(cleanName, st);
  }

  const insertStudentStmt = db.prepare(`
    INSERT INTO students (id, institution_id, full_name, document_type, document_id, course, parallel, representative, rep_phone, active)
    VALUES (@id, @institution_id, @full_name, @document_type, @document_id, @course, @parallel, @representative, @rep_phone, 1)
  `);

  const insertCaseStmt = db.prepare(`
    INSERT INTO case_files (
      id, institution_id, code, student_id, opened_by_id, assigned_to_id, status, priority,
      action_axis, risk_type, risk_type_other, detection_date, detection_source, description, confidential
    ) VALUES (
      @id, @institution_id, @code, @student_id, @opened_by_id, @assigned_to_id, @status, @priority,
      @action_axis, @risk_type, @risk_type_other, @detection_date, @detection_source, @description, 1
    )
  `);

  const insertActionStmt = db.prepare(`
    INSERT INTO case_actions (id, case_file_id, author_id, date, type, description)
    VALUES (?, ?, ?, datetime('now'), 'Apertura de caso', ?)
  `);

  const lastRow = sheet.rowCount;

  // Transacción atómica en la base de datos
  const runTransaction = db.transaction(() => {
    for (let r = 2; r <= lastRow; r++) {
      const row = sheet.getRow(r);
      if (!row.hasValues) continue;

      const rawName = cellText(row, colMap.nameCol);
      if (!rawName) {
        skipped.push({ row: r, name: `Fila ${r}`, reason: "Nombre del estudiante no especificado." });
        continue;
      }

      const rawDoc = cellText(row, colMap.docCol);
      const documentId = rawDoc ? normalizeDocumentId(rawDoc) : null;
      const documentType: DocumentType = documentId ? detectDocumentType(documentId) : "CEDULA";

      const rawCourse = cellText(row, colMap.courseCol) || "No especificado";
      const cleanCourse = rawCourse.trim() || "No especificado";
      const rawParallel = cellText(row, colMap.parallelCol);
      const parallel = rawParallel ? rawParallel.trim().toUpperCase() : null;

      const rawRepresentative = cellText(row, colMap.representativeCol);
      const rawPhone = cellText(row, colMap.phoneCol);

      const rawTypology = cellText(row, colMap.typologyCol);
      const { riskType, riskTypeOther } = mapTypologyToRiskType(rawTypology);

      const rawDescription = cellText(row, colMap.descriptionCol) || "";
      const rawDate = cellText(row, colMap.dateCol);
      const detectionDate = rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : new Date().toISOString().slice(0, 10);

      const rawPriority = cellText(row, colMap.priorityCol)?.toUpperCase();
      let priority: CasePriority = defaultPriority;
      if (rawPriority === "ALTA" || rawPriority === "MEDIA" || rawPriority === "BAJA") {
        priority = rawPriority as CasePriority;
      } else if (riskType === "VIOLENCIA_SEXUAL" || riskType === "SALUD_MENTAL") {
        priority = "ALTA";
      }

      // 1. Identificar o crear estudiante
      let studentId: string;
      let isNewStudent = false;

      let matchedStudent = documentId ? studentsByDoc.get(documentId) : undefined;
      if (!matchedStudent) {
        matchedStudent = studentsByName.get(rawName.toLowerCase().trim());
      }

      if (matchedStudent) {
        studentId = matchedStudent.id;
        linkedStudentsCount++;
      } else {
        studentId = randomUUID();
        insertStudentStmt.run({
          id: studentId,
          institution_id: opts.institutionId,
          full_name: rawName.trim(),
          document_type: documentType,
          document_id: documentId,
          course: cleanCourse,
          parallel,
          representative: rawRepresentative?.trim() || null,
          rep_phone: rawPhone?.trim() || null,
        });

        // Registrar en memoria para evitar duplicados en el mismo archivo
        const newStRecord = {
          id: studentId,
          full_name: rawName.trim(),
          document_id: documentId,
          course: cleanCourse,
          parallel,
        };
        if (documentId) studentsByDoc.set(documentId, newStRecord);
        studentsByName.set(rawName.toLowerCase().trim(), newStRecord);

        isNewStudent = true;
        createdStudentsCount++;
      }

      // 2. Generar código de caso único
      const caseCode = nextCaseCode(opts.institutionId, studentId);
      const caseId = randomUUID();

      const finalDescription = rawDescription.trim()
        ? rawDescription.trim()
        : `Estudiante registrado en seguimiento continuo DECE procedente de la matriz institucional consolidada. Tipología identificada: ${rawTypology || riskType}.`;

      // 3. Crear expediente del caso
      insertCaseStmt.run({
        id: caseId,
        institution_id: opts.institutionId,
        code: caseCode,
        student_id: studentId,
        opened_by_id: opts.userId,
        assigned_to_id: opts.userId,
        status: defaultStatus,
        priority,
        action_axis: defaultAxis,
        risk_type: riskType,
        risk_type_other: riskTypeOther || null,
        detection_date: detectionDate,
        detection_source: "Matriz consolidada de vulnerabilidad / Años anteriores",
        description: finalDescription,
      });

      // 4. Registrar acción inicial en la bitácora
      insertActionStmt.run(
        randomUUID(),
        caseId,
        opts.userId,
        "Caso aperturado mediante importación masiva de la matriz de vulnerabilidad y seguimiento continuo institucional."
      );

      createdCasesCount++;

      rows.push({
        row: r,
        studentName: rawName.trim(),
        documentId,
        course: cleanCourse,
        parallel,
        caseCode,
        caseId,
        riskTypeLabel: riskTypeOther ? `${riskType} (${riskTypeOther})` : riskType,
        status: defaultStatus,
        isNewStudent,
      });
    }
  });

  runTransaction();

  return {
    createdCases: createdCasesCount,
    createdStudents: createdStudentsCount,
    linkedStudents: linkedStudentsCount,
    rows,
    skipped,
  };
}
