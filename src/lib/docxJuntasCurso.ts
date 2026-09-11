import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { db } from "./db";
import type {
  CourseBoardReportRow,
  CourseBoardReportCaseItem,
  InstitutionRow,
  UserRow,
} from "./types";
import { TRIMESTER_LABELS } from "./types";
import {
  DEFAULT_CONCLUSIONES,
  DEFAULT_RECOMENDACIONES,
} from "./juntasCursoConstants";
import { currentSchoolYearText } from "./schoolYearText";

export interface JuntasCursoDocxData {
  nombre_institucion: string;
  fecha_informe: string;
  numero_informe: string;
  estandar: string;
  dece_nombre: string;
  dece_telefono: string;
  dece_email: string;
  dece_cargo: string;
  autoridad_nombre: string;
  autoridad_telefono: string;
  autoridad_email: string;
  autoridad_cargo: string;
  tutor_nombre: string;
  tutor_telefono: string;
  tutor_email: string;
  tema_informe: string;
  anio_lectivo: string;
  casos: Array<{
    curso: string;
    cedula: string;
    estudiante: string;
    situacion: string;
  }>;
  conclusiones: string;
  recomendaciones: string;
  revisado_nombre: string;
  revisado_cargo: string;
}

export function formatCourseBoardReportTemplateData(
  report: CourseBoardReportRow,
  institution?: InstitutionRow | null
): JuntasCursoDocxData {
  const institutionName = institution?.name || "UNIDAD EDUCATIVA";
  const trimesterLabel = TRIMESTER_LABELS[report.trimester] || report.trimester;

  // Formato de fecha DD/MM/YYYY
  let formattedDate = "29/10/2025";
  if (report.report_date) {
    const parts = report.report_date.split("-");
    if (parts.length === 3) {
      formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  // Buscar autoridad institucional
  let authName = "Dr. César Moscoso";
  let authPhone = "0992578731";
  let authEmail = "rectorado@educacion.gob.ec";
  let authRole = "RECTOR (E)";

  if (report.institution_id) {
    const authUser = db
      .prepare(
        `SELECT name, phone, email FROM users 
         WHERE institution_id = ? AND role = 'AUTORIDAD' AND active = 1 
         ORDER BY created_at ASC LIMIT 1`
      )
      .get(report.institution_id) as { name: string; phone?: string; email?: string } | undefined;

    if (authUser) {
      authName = authUser.name;
      if (authUser.phone) authPhone = authUser.phone;
      if (authUser.email) authEmail = authUser.email;
    }
  }

  // Parsear casos
  let rawCases: CourseBoardReportCaseItem[] = [];
  try {
    rawCases = JSON.parse(report.cases_json || "[]");
  } catch {}

  const casosData: Array<{
    curso: string;
    cedula: string;
    estudiante: string;
    situacion: string;
  }> = [];

  const courseParallel = `${report.course} ${report.parallel || "A"}`.trim();

  for (const c of rawCases) {
    // Buscar cédula si falta
    let cedula = (c as any).student_cedula || (c as any).cedula || "";
    if (!cedula && (c.student_id || c.student_name)) {
      try {
        let sRow: { document_id?: string; id_num?: string } | undefined;
        if (c.student_id) {
          sRow = db
            .prepare("SELECT document_id, id_num FROM students WHERE id = ?")
            .get(c.student_id) as any;
        } else if (c.student_name) {
          sRow = db
            .prepare(
              `SELECT document_id, id_num FROM students 
               WHERE institution_id = ? AND (full_name = ? OR (last_names || ' ' || first_names) = ?) 
               LIMIT 1`
            )
            .get(report.institution_id, c.student_name.trim(), c.student_name.trim()) as any;
        }
        if (sRow) {
          cedula = sRow.document_id || sRow.id_num || "";
        }
      } catch {}
    }
    if (!cedula) cedula = "S/N";

    // Construir bloque completo de situación técnica
    const situationParts: string[] = [];
    if (c.problematic && c.problematic.trim()) {
      situationParts.push(`Situación / Problemática:\n${c.problematic.trim()}`);
    }
    if (c.actions_taken && c.actions_taken.trim()) {
      situationParts.push(`Acciones Realizadas:\n${c.actions_taken.trim()}`);
    }

    const rec = c.recommendations || {};
    const recLines: string[] = [];
    if (rec.coordination && rec.coordination.trim()) recLines.push(rec.coordination.trim());
    if (rec.academic && rec.academic.trim()) recLines.push(rec.academic.trim());
    if (rec.climate && rec.climate.trim()) recLines.push(rec.climate.trim());
    if (rec.protocols && rec.protocols.trim()) recLines.push(rec.protocols.trim());

    if (recLines.length > 0) {
      situationParts.push(`Recomendaciones para Junta y Docente Tutor:\n${recLines.join("\n")}`);
    }

    casosData.push({
      curso: courseParallel,
      cedula,
      estudiante: (c.student_name || "ESTUDIANTE").trim().toUpperCase(),
      situacion: situationParts.join("\n\n") || "En seguimiento y atención psicosocial por DECE.",
    });
  }

  // Si no hay casos registrados, incluir fila informativa formal
  if (casosData.length === 0) {
    casosData.push({
      curso: courseParallel,
      cedula: "S/N",
      estudiante: "No se registran casos de vulnerabilidad en el período",
      situacion:
        report.general_actions ||
        `Durante el presente período escolar no se reportaron situaciones de vulnerabilidad o riesgo psicosocial en ${courseParallel}. Se mantuvieron acciones de prevención, observación activa y articulación con el docente tutor.`,
    });
  }

  const tema = `INFORME GENERAL PARA JUNTAS DE GRADO O CURSO DEL ${trimesterLabel.toUpperCase()} DE LA ${institutionName.toUpperCase()}, AÑO LECTIVO ${report.school_year_text || currentSchoolYearText()} DEL ${report.course.toUpperCase()} PARALELO ${(report.parallel || "A").toUpperCase()} - JORNADA ${(report.jornada || "MATUTINA").toUpperCase()}.`;

  const coordRole = report.user_role_label?.includes("Coord")
    ? report.user_role_label
    : "COORDINADORA DECE INSTITUCIONAL";

  return {
    nombre_institucion: institutionName,
    fecha_informe: formattedDate,
    numero_informe: report.report_code || "INF-001-JC-1T",
    estandar: "E.D1.C2.DE3.",
    dece_nombre: report.user_name || "Profesional DECE",
    dece_telefono: report.user_contact || "0982311838",
    dece_email: report.user_email || "dece@institucion.edu.ec",
    dece_cargo: report.user_role_label || "ANALISTA DECE",
    autoridad_nombre: authName,
    autoridad_telefono: authPhone,
    autoridad_email: authEmail,
    autoridad_cargo: authRole,
    tutor_nombre: report.tutor_name || "Docente Tutor",
    tutor_telefono: report.tutor_contact || "0998877665",
    tutor_email: report.tutor_email || "tutor@institucion.edu.ec",
    tema_informe: tema,
    anio_lectivo: report.school_year_text || currentSchoolYearText(),
    casos: casosData,
    conclusiones: report.conclusiones || DEFAULT_CONCLUSIONES(trimesterLabel),
    recomendaciones: report.recomendaciones || DEFAULT_RECOMENDACIONES,
    revisado_nombre: report.user_name || "Profesional DECE",
    revisado_cargo: coordRole,
  };
}

/**
 * Genera el archivo .docx oficial para Informe de Junta de Curso a partir de la PLANTILLA CANÓNICA.
 * Cumple con la REGLA DE ORO: Preserva estilos, encabezados institucionales, fuentes y tablas del original.
 */
export async function generateCourseBoardReportDocx(opts: {
  report: CourseBoardReportRow;
  institution?: InstitutionRow | null;
}): Promise<Buffer> {
  const templatePath = path.join(
    process.cwd(),
    "templates",
    "INFORME_JUNTAS_CURSO_TEMPLATE.docx"
  );

  if (!fs.existsSync(templatePath)) {
    const buildScript = path.join(process.cwd(), "scripts", "buildJuntaCursoTemplate.js");
    if (fs.existsSync(buildScript)) {
      const { buildJuntaCursoTemplate } = require(buildScript);
      buildJuntaCursoTemplate();
    } else {
      throw new Error(`No se encontró la plantilla canónica en ${templatePath}`);
    }
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = new PizZip(templateBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    nullGetter: () => "",
  });

  const data = formatCourseBoardReportTemplateData(opts.report, opts.institution);
  doc.render(data);

  return doc.getZip().generate({ type: "nodebuffer" });
}
