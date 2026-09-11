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
  sheetName: string;
  createdCases: number;
  createdStudents: number;
  linkedStudents: number;
  rows: CaseImportRowResult[];
  skipped: CaseImportSkippedRow[];
}

export function normalizeStr(s: any): string {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Mapea textos comunes, siglas y variaciones de redacción que usan los DECE en sus matrices
 * hacia las 11 tipologías oficiales de riesgo del sistema.
 */
export function mapTypologyToRiskType(
  rawText: string | null | undefined,
  sectionContext?: string | null
): {
  riskType: RiskType;
  riskTypeOther?: string;
} {
  const combined = `${rawText || ""} ${sectionContext || ""}`.trim();
  if (!combined) {
    return { riskType: "OTRO", riskTypeOther: "Sin tipología especificada en la matriz" };
  }

  const s = normalizeStr(combined);
  const rawClean = (rawText || "").trim();

  // 1. Violencia sexual (incluye acrónimos oficiales DECE: AS = Acoso/Abuso Sexual, VS = Violencia Sexual)
  const isSexualAbbr = /^(vs|as|v\.s|a\.s)\b/i.test(rawClean);
  if (
    isSexualAbbr ||
    s.includes("sexual") ||
    s.includes("abuso sexual") ||
    s.includes("acoso sexual") ||
    s.includes("tocamiento") ||
    s.includes("violacion") ||
    s.includes("estupro")
  ) {
    return { riskType: "VIOLENCIA_SEXUAL" };
  }

  // 2. Salud mental / Conducta suicida / Autolesiones / Cutting / Inestabilidad emocional
  if (
    s.includes("cutting") ||
    s.includes("autolesi") ||
    s.includes("suicid") ||
    s.includes("autolitico") ||
    s.includes("depresi") ||
    s.includes("ansiedad") ||
    s.includes("inestabilidad emocional") ||
    s.includes("afectacion emocional") ||
    s.includes("crisis emocional") ||
    s.includes("salud mental") ||
    s.includes("trastorno") ||
    s.includes("afectiv")
  ) {
    return { riskType: "SALUD_MENTAL" };
  }

  // 3. Consumo de sustancias / SPA / Alcohol
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

  // 4. Embarazo / Maternidad / Paternidad adolescente
  if (
    s.includes("embarazo") ||
    s.includes("maternidad") ||
    s.includes("paternidad") ||
    s.includes("madre adolescente") ||
    s.includes("padre adolescente") ||
    s.includes("gestaci")
  ) {
    return { riskType: "EMBARAZO_ADOLESCENTE" };
  }

  // 5. Violencia intrafamiliar / negligencia en el hogar / maltrato
  if (
    s.includes("intrafamiliar") ||
    s.includes("violencia fisica en el hogar") ||
    s.includes("maltrato infantil") ||
    s.includes("violencia en casa") ||
    s.includes("maltrato fisico") ||
    s.includes("maltrato psicologico") ||
    s.includes("negligencia intrafamiliar") ||
    s.includes("negligencia familiar") ||
    s.includes("agresion familiar")
  ) {
    return { riskType: "VIOLENCIA_INTRAFAMILIAR" };
  }

  // 6. Violencia escolar / bullying / violencia institucional / violencia digital / pares
  if (
    s.includes("bullying") ||
    s.includes("acoso escolar") ||
    s.includes("ciberacoso") ||
    s.includes("cyberbullying") ||
    s.includes("violencia entre pares") ||
    s.includes("violencia institucional") ||
    s.includes("violencia digital") ||
    s.includes("agresion entre companeros") ||
    s.includes("violencia escolar")
  ) {
    return { riskType: "VIOLENCIA_ESCOLAR_BULLYING" };
  }

  // 7. Dificultad de aprendizaje / NEE / Adaptaciones / Rezago
  if (
    s.includes("aprendizaje") ||
    s.includes("nee") ||
    s.includes("discapacidad") ||
    s.includes("adaptacion curricular") ||
    s.includes("ajustes razonables") ||
    s.includes("aprestamiento") ||
    s.includes("rezago") ||
    s.includes("bajo rendimiento") ||
    s.includes("dislexia") ||
    s.includes("tdah") ||
    s.includes("intelectual")
  ) {
    return { riskType: "DIFICULTAD_APRENDIZAJE" };
  }

  // 8. Vulneración de derechos / PPL (padres privados de libertad) / Trabajo infantil / Extorsión
  if (
    s.includes("privad") ||
    s.includes("ppl") ||
    s.includes("extorsion") ||
    s.includes("amenaza") ||
    s.includes("vulneracion") ||
    s.includes("trabajo infantil") ||
    s.includes("negligencia") ||
    s.includes("mendicidad") ||
    s.includes("abandono")
  ) {
    return { riskType: "VULNERACION_DERECHOS" };
  }

  // 9. Conflicto familiar
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

  // 10. Conectividad / Deserción
  if (
    s.includes("conectividad") ||
    s.includes("acceso educativo") ||
    s.includes("desercion") ||
    s.includes("abandono escolar") ||
    s.includes("movilidad humana") ||
    s.includes("refugi")
  ) {
    return { riskType: "CONECTIVIDAD_ACCESO_EDUCATIVO" };
  }

  // 11. Otro
  return { riskType: "OTRO", riskTypeOther: rawClean || combined };
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
  extraCols?: { col: number; header: string }[];
}

export interface DetectedHeaderResult {
  headerRowIndex: number;
  colMap: ColumnIndexMap;
  score: number;
}

/**
 * Escanea inteligentemente las primeras filas de la hoja para identificar cuál fila
 * contiene los encabezados reales de la matriz y descarta los banners de título o membretes.
 */
export function detectHeaderRow(sheet: ExcelJS.Worksheet): DetectedHeaderResult {
  let bestRow = -1;
  let maxScore = -1;
  let bestMap: ColumnIndexMap = { nameCol: 0, extraCols: [] };

  const maxScanRows = Math.min(sheet.rowCount, 15);
  for (let r = 1; r <= maxScanRows; r++) {
    const row = sheet.getRow(r);

    // Descartar filas tipo banner donde todas las celdas tienen el mismo texto repetido
    const distinctVals = new Set<string>();
    row.eachCell({ includeEmpty: false }, (cell) => {
      const t = normalizeStr(cell.value);
      if (t) distinctVals.add(t);
    });
    if (distinctVals.size < 3) continue;

    let score = 0;
    const map: ColumnIndexMap = { nameCol: 0, extraCols: [] };

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = normalizeStr(cell.value);
      if (!text) return;

      // Estudiante / Nombres
      if (
        (text === "estudiante" ||
          text.includes("estudiante") ||
          text.includes("apellidos") ||
          text.includes("alumno") ||
          text === "nombres") &&
        !text.includes("vulnerab") &&
        !text.includes("tutor") &&
        !text.includes("representante") &&
        !text.includes("padre") &&
        !text.includes("madre")
      ) {
        map.nameCol = colNumber;
        score += 35;
      }
      // Cédula / Documento / Identificación
      else if (
        text.includes("cedula") ||
        text.includes("identificacion") ||
        text.includes("documento") ||
        text === "c.i." ||
        text === "dni" ||
        text === "ci" ||
        text.includes("nui")
      ) {
        map.docCol = colNumber;
        score += 25;
      }
      // Curso / Año / Grado
      else if (
        text === "ano" ||
        text === "curso" ||
        text === "grado" ||
        text.includes("curso") ||
        text.includes("grado")
      ) {
        map.courseCol = colNumber;
        score += 20;
      }
      // Paralelo
      else if (text.includes("paralelo") || text.includes("seccion")) {
        map.parallelCol = colNumber;
        score += 15;
      }
      // Tipología / Vulnerabilidad / Problemática
      else if (
        text.includes("vulnerab") ||
        text.includes("tipologia") ||
        text.includes("problematica") ||
        text.includes("riesgo") ||
        text === "motivo"
      ) {
        map.typologyCol = colNumber;
        score += 25;
      }
      // Observaciones / Antecedentes / Descripción
      else if (
        text.includes("observacion") ||
        text.includes("descripcion") ||
        text.includes("detalle") ||
        text.includes("antecedente")
      ) {
        if (!map.descriptionCol) {
          map.descriptionCol = colNumber;
          score += 15;
        }
      }
      // Tutor / Representante
      else if (text.includes("tutor") || text.includes("representante")) {
        map.representativeCol = colNumber;
        score += 10;
      }
      // Teléfono / Contacto
      else if (text.includes("telefono") || text.includes("celular") || text.includes("contacto")) {
        map.phoneCol = colNumber;
        score += 8;
      }
      // Prioridad
      else if (text.includes("prioridad") || text.includes("urgencia")) {
        map.priorityCol = colNumber;
        score += 8;
      }
      // Fecha
      else if (text.includes("fecha") || text.includes("deteccion")) {
        map.dateCol = colNumber;
        score += 8;
      }
      // Columnas extras enriquecedoras (código redevi, ubicación física, ajustes curriculares)
      else if (
        text.includes("redevi") ||
        text.includes("ubicacion") ||
        text.includes("ajustes razonables") ||
        text.includes("dece responsable")
      ) {
        map.extraCols?.push({ col: colNumber, header: String(cell.value || "").trim() });
      }
    });

    if (map.nameCol > 0 && score > maxScore) {
      maxScore = score;
      bestRow = r;
      bestMap = map;
    }
  }

  if (bestRow === -1) {
    return {
      headerRowIndex: 1,
      colMap: resolveColumnIndices(sheet.getRow(1)),
      score: 0,
    };
  }

  return {
    headerRowIndex: bestRow,
    colMap: bestMap,
    score: maxScore,
  };
}

export function resolveColumnIndices(headerRow: ExcelJS.Row): ColumnIndexMap {
  const map: ColumnIndexMap = { nameCol: 1, extraCols: [] };
  headerRow.eachCell((cell, colNumber) => {
    const text = normalizeStr(cell.value);
    if (!text) return;
    if (
      (text.includes("nombre") || text.includes("estudiante") || text.includes("alumno") || text.includes("apellidos")) &&
      !text.includes("vulnerab") && !text.includes("tutor") && !text.includes("representante")
    ) {
      map.nameCol = colNumber;
    } else if (text.includes("cedula") || text.includes("documento") || text.includes("identificacion")) {
      map.docCol = colNumber;
    } else if (text.includes("curso") || text.includes("grado") || text === "ano") {
      map.courseCol = colNumber;
    } else if (text.includes("paralelo") || text.includes("seccion")) {
      map.parallelCol = colNumber;
    } else if (text.includes("tipologia") || text.includes("vulnerabilidad") || text.includes("problematica")) {
      map.typologyCol = colNumber;
    } else if (text.includes("observacion") || text.includes("descripcion") || text.includes("detalle")) {
      map.descriptionCol = colNumber;
    } else if (text.includes("representante") || text.includes("tutor")) {
      map.representativeCol = colNumber;
    } else if (text.includes("telefono") || text.includes("celular")) {
      map.phoneCol = colNumber;
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

const KNOWN_SECTIONS = [
  "VIOLENCIA SEXUAL",
  "OTROS TIPOS DE VIOLENCIA",
  "EMBARAZO ADOLESCENTE",
  "MATERNIDAD",
  "PATERNIDAD",
  "HIJOS PPL",
  "SALUD MENTAL",
  "CONSUMO DE SUSTANCIAS",
  "DISCAPACIDAD",
  "VULNERABILIDAD",
  "DATOS INSTITUCIONALES",
  "APRESTAMIENTO ESCOLAR",
  "DIFICULTAD DE APRENDIZAJE",
  "ESTUDIANTES VULNERABLES",
];

export interface ImportCasesOptions {
  institutionId: string;
  userId: string;
  sheetName?: string;
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
  if (!workbook.worksheets || workbook.worksheets.length === 0) {
    throw new Error("El archivo no contiene ninguna hoja de cálculo.");
  }

  // 1. Selección inteligente de la hoja más relevante
  let selectedSheet: ExcelJS.Worksheet | null = null;
  let detectedHeader: DetectedHeaderResult | null = null;

  if (opts.sheetName) {
    const ws = workbook.getWorksheet(opts.sheetName);
    if (ws) {
      selectedSheet = ws;
      detectedHeader = detectHeaderRow(ws);
    }
  }

  if (!selectedSheet) {
    let bestEffectiveScore = -1;
    for (const ws of workbook.worksheets) {
      // Ignorar hojas de retirados salvo que sea la única
      if (/retirad/i.test(ws.name) && workbook.worksheets.length > 1) continue;

      const det = detectHeaderRow(ws);
      const effectiveScore = det.score * 1000 + ws.rowCount;
      if (det.score > 0 && effectiveScore > bestEffectiveScore) {
        bestEffectiveScore = effectiveScore;
        selectedSheet = ws;
        detectedHeader = det;
      }
    }
  }

  if (!selectedSheet || !detectedHeader || !detectedHeader.colMap.nameCol) {
    selectedSheet = workbook.worksheets[0];
    detectedHeader = detectHeaderRow(selectedSheet);
  }

  const sheet = selectedSheet;
  const { headerRowIndex, colMap } = detectedHeader;

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

  const studentsByDoc = new Map<string, (typeof existingStudents)[0]>();
  const studentsByName = new Map<string, (typeof existingStudents)[0]>();

  for (const st of existingStudents) {
    if (st.document_id) {
      studentsByDoc.set(st.document_id, st);
    }
    const cleanName = normalizeStr(st.full_name);
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
  let currentSection = "";

  // Transacción atómica en la base de datos
  const runTransaction = db.transaction(() => {
    for (let r = headerRowIndex + 1; r <= lastRow; r++) {
      const row = sheet.getRow(r);
      if (!row.hasValues) continue;

      // 1. Comprobar si la fila es un divisor de sección o categoría
      const distinctVals = new Set<string>();
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = normalizeStr(cell.value);
        if (v) distinctVals.add(v);
      });

      const c1Norm = normalizeStr(row.getCell(1).value);
      const nameCellVal = cellText(row, colMap.nameCol);
      const nameNorm = normalizeStr(nameCellVal);

      // Si las celdas se repiten o coinciden con nombres de sección estándar
      const isKnownSection = KNOWN_SECTIONS.some((sec) => nameNorm.includes(normalizeStr(sec)));
      const isMergedBanner = distinctVals.size <= 3 && (c1Norm === nameNorm || !c1Norm) && nameNorm.length > 3;

      if (isKnownSection || isMergedBanner) {
        const rawTitle = nameCellVal || cellText(row, 1);
        if (rawTitle && rawTitle.trim().length > 3) {
          currentSection = rawTitle.trim();
        }
        continue; // NO crear estudiante ni caso a partir de la fila de título de categoría
      }

      // 2. Validación de estudiante legítimo
      const rawName = cellText(row, colMap.nameCol);
      if (!rawName) continue;

      const trimmedName = rawName.trim();

      // Descartar si es un número, un encabezado repetido, o carece de letras
      if (
        trimmedName.length < 3 ||
        /^\d+$/.test(trimmedName) ||
        !/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,}/.test(trimmedName) ||
        /^(n°|no\.|num|ano|curso|estudiante|nombres|alumno|apellidos)$/i.test(normalizeStr(trimmedName))
      ) {
        continue;
      }

      // 3. Extracción y normalización de campos
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
      const { riskType, riskTypeOther } = mapTypologyToRiskType(rawTypology, currentSection);

      // Ensamblar descripción integrando notas institucionales adicionales
      const baseDescription = cellText(row, colMap.descriptionCol) || "";
      const extraNotesParts: string[] = [];

      if (colMap.extraCols && colMap.extraCols.length > 0) {
        for (const ec of colMap.extraCols) {
          const val = cellText(row, ec.col);
          if (val && val.trim().length > 0) {
            extraNotesParts.push(`${ec.header}: ${val.trim()}`);
          }
        }
      }

      let finalDescription = baseDescription.trim();
      if (extraNotesParts.length > 0) {
        finalDescription = finalDescription
          ? `${finalDescription}\n\n[Datos de Matriz]: ${extraNotesParts.join(" | ")}`
          : extraNotesParts.join(" | ");
      }

      if (!finalDescription) {
        finalDescription = `Estudiante registrado en seguimiento continuo DECE procedente de la matriz institucional consolidada (${sheet.name}). Tipología identificada: ${rawTypology || currentSection || riskType}.`;
      }

      const rawDate = cellText(row, colMap.dateCol);
      const detectionDate =
        rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate)
          ? rawDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10);

      const rawPriority = cellText(row, colMap.priorityCol)?.toUpperCase();
      let priority: CasePriority = defaultPriority;
      if (rawPriority === "ALTA" || rawPriority === "MEDIA" || rawPriority === "BAJA") {
        priority = rawPriority as CasePriority;
      } else if (riskType === "VIOLENCIA_SEXUAL" || riskType === "SALUD_MENTAL") {
        priority = "ALTA";
      }

      // 4. Identificar o crear estudiante
      let studentId: string;
      let isNewStudent = false;

      let matchedStudent = documentId ? studentsByDoc.get(documentId) : undefined;
      if (!matchedStudent) {
        matchedStudent = studentsByName.get(normalizeStr(trimmedName));
      }

      if (matchedStudent) {
        studentId = matchedStudent.id;
        linkedStudentsCount++;
      } else {
        studentId = randomUUID();
        insertStudentStmt.run({
          id: studentId,
          institution_id: opts.institutionId,
          full_name: trimmedName,
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
          full_name: trimmedName,
          document_id: documentId,
          course: cleanCourse,
          parallel,
        };
        if (documentId) studentsByDoc.set(documentId, newStRecord);
        studentsByName.set(normalizeStr(trimmedName), newStRecord);

        isNewStudent = true;
        createdStudentsCount++;
      }

      // 5. Generar código de caso único
      const caseCode = nextCaseCode(opts.institutionId, studentId);
      const caseId = randomUUID();

      // 6. Crear expediente del caso
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
        detection_source: `Matriz consolidada de vulnerabilidad (${sheet.name})`,
        description: finalDescription,
      });

      // 7. Registrar acción inicial en la bitácora
      insertActionStmt.run(
        randomUUID(),
        caseId,
        opts.userId,
        `Caso aperturado mediante importación masiva de la matriz de vulnerabilidad y seguimiento continuo institucional (${sheet.name}).`
      );

      createdCasesCount++;

      rows.push({
        row: r,
        studentName: trimmedName,
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
    sheetName: sheet.name,
    createdCases: createdCasesCount,
    createdStudents: createdStudentsCount,
    linkedStudents: linkedStudentsCount,
    rows,
    skipped,
  };
}
