import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { CaseCorresponsibilityActRow, StudentRow } from "./types";

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

export interface CorresponsibilityDocxData {
  dia: string;
  mes: string;
  anio_2_digitos: string;
  hora: string;
  nombre_representante_legal: string;
  cedula_representante_legal: string;
  nombre_estudiante: string;
  curso: string;
  jornada_m: string;
  jornada_v: string;
  dificultad_detectada: string;
  acuerdos_y_compromisos: string;
  telefono_representante_legal: string;
}

export function formatCorresponsibilityTemplateData(
  act: Partial<CaseCorresponsibilityActRow>,
  student: Partial<StudentRow>
): CorresponsibilityDocxData {
  let dateObj = new Date();
  if (act.act_date) {
    const parts = act.act_date.split("-");
    if (parts.length === 3) {
      dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }

  const dia = String(dateObj.getDate()).padStart(2, "0");
  const mes = MONTH_NAMES[dateObj.getMonth()] || "septiembre";
  const fullYear = String(dateObj.getFullYear());
  const anio_2_digitos = fullYear.length >= 2 ? fullYear.slice(-2) : fullYear;

  const hora = (act.act_time || "09:00").trim();

  const isMatutina = (act.jornada || student.jornada || "MATUTINA").toUpperCase().includes("MAT");
  const isVespertina = (act.jornada || student.jornada || "").toUpperCase().includes("VESP");

  const repName = (act.representative_name || student.representative || "").toUpperCase().trim() || "________________________";
  const repId = (act.representative_id_num || student.representative_document_id || "").trim() || "__________";
  const repPhone = (act.representative_phone || student.rep_phone || "").trim() || "__________";

  const studentName = (act.student_name || student.full_name || "").toUpperCase().trim() || "________________________";

  const gradeStr = (act.student_grade || student.course || "").toUpperCase().trim();
  const parallelStr = (act.student_parallel || student.parallel || "").toUpperCase().trim();
  let cursoFull = gradeStr;
  if (parallelStr && !cursoFull.includes(parallelStr)) {
    cursoFull = `${cursoFull} PARALELO ${parallelStr}`.trim();
  }
  if (!cursoFull) cursoFull = "________________________";

  const dificultad = (act.detected_difficulty || "").trim() || "No se especificó la dificultad detectada.";

  const compromisos = (
    act.agreements_and_commitments ||
    act.commitments_representative ||
    ""
  ).trim() || "No se especificaron acuerdos y compromisos.";

  return {
    dia,
    mes,
    anio_2_digitos,
    hora,
    nombre_representante_legal: repName,
    cedula_representante_legal: repId,
    nombre_estudiante: studentName,
    curso: cursoFull,
    jornada_m: isMatutina ? "X" : " ",
    jornada_v: isVespertina ? "X" : " ",
    dificultad_detectada: dificultad,
    acuerdos_y_compromisos: compromisos,
    telefono_representante_legal: repPhone,
  };
}

export async function generateCorresponsibilityDocxBuffer(
  act: Partial<CaseCorresponsibilityActRow>,
  student: Partial<StudentRow>
): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "templates", "ACTA_CORRESPONSABILIDAD_TEMPLATE.docx");
  
  if (!fs.existsSync(templatePath)) {
    // Si la plantilla procesada no existe aún, generarla sobre la marcha
    const buildScript = path.join(process.cwd(), "scripts", "buildCorresponsibilityTemplate.js");
    if (fs.existsSync(buildScript)) {
      require(buildScript);
    }
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = new PizZip(templateBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  const data = formatCorresponsibilityTemplateData(act, student);
  doc.render(data);

  return doc.getZip().generate({ type: "nodebuffer" });
}
