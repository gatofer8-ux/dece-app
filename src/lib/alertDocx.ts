import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import type { CaseAlertNotificationRow } from "./types";

export interface AlertDocxData {
  nombre_estudiante: string;
  cedula_estudiante: string;
  fecha_nacimiento_estudiante: string;
  edad_estudiante: string;
  nombre_representante: string;
  direccion_domiciliaria: string;
  telefono_representante: string;
  grado_curso: string;
  paralelo: string;
  jornada_m: string;
  jornada_v: string;
  docente_tutor: string;

  alerta_inestabilidad_emocional: string;
  alerta_hijo_ppl: string;
  alerta_trabajo_infantil: string;
  alerta_riesgo_psicosocial: string;
  alerta_movilidad_humana: string;
  alerta_conflictos_intrafamiliares: string;
  alerta_autolesiones_ideacion: string;
  alerta_hostigamiento_academico: string;
  alerta_embarazo_maternidad_paternidad: string;
  alerta_posible_dependencia_sustancias: string;
  alerta_vulneracion_derechos: string;
  alerta_otros: string;
  especificar_alerta: string;

  lugar_fecha_hechos: string;

  intervencion_pregunta_1: string;
  intervencion_pregunta_2: string;
  intervencion_pregunta_3: string;
  intervencion_pregunta_4: string;
  intervencion_pregunta_5: string;

  notificador_nombre: string;
  notificador_cargo: string;
  notificador_contacto: string;
  fecha_entrega_dece: string;
}

export function formatAlertTemplateData(alert: Partial<CaseAlertNotificationRow>): AlertDocxData {
  const isMatutina = (alert.jornada || "MATUTINA").toUpperCase().includes("MAT");
  const isVespertina = (alert.jornada || "").toUpperCase().includes("VESP");

  return {
    nombre_estudiante: (alert.student_name || "").toUpperCase().trim() || "________________________",
    cedula_estudiante: (alert.student_id_num || "").trim() || "__________",
    fecha_nacimiento_estudiante: (alert.student_birth_date || "").trim() || "__________",
    edad_estudiante: (alert.student_age || "").trim() || "_____",
    nombre_representante: (alert.representative_name || "").toUpperCase().trim() || "________________________",
    direccion_domiciliaria: (alert.representative_address || "").trim() || "________________________",
    telefono_representante: (alert.representative_phone || "").trim() || "__________",
    grado_curso: (alert.student_grade || "").trim() || "__________",
    paralelo: (alert.student_parallel || "").trim() || "___",
    jornada_m: isMatutina ? "X" : " ",
    jornada_v: isVespertina ? "X" : " ",
    docente_tutor: (alert.docente_tutor || "").trim() || "________________________",

    alerta_inestabilidad_emocional: alert.alerta_inestabilidad_emocional ? "X" : " ",
    alerta_hijo_ppl: alert.alerta_hijo_ppl ? "X" : " ",
    alerta_trabajo_infantil: alert.alerta_trabajo_infantil ? "X" : " ",
    alerta_riesgo_psicosocial: alert.alerta_riesgo_psicosocial ? "X" : " ",
    alerta_movilidad_humana: alert.alerta_movilidad_humana ? "X" : " ",
    alerta_conflictos_intrafamiliares: alert.alerta_conflictos_intrafamiliares ? "X" : " ",
    alerta_autolesiones_ideacion: alert.alerta_autolesiones_ideacion ? "X" : " ",
    alerta_hostigamiento_academico: alert.alerta_hostigamiento_academico ? "X" : " ",
    alerta_embarazo_maternidad_paternidad: alert.alerta_embarazo_maternidad_paternidad ? "X" : " ",
    alerta_posible_dependencia_sustancias: alert.alerta_posible_dependencia_sustancias ? "X" : " ",
    alerta_vulneracion_derechos: alert.alerta_vulneracion_derechos ? "X" : " ",
    alerta_otros: alert.alerta_otros ? "X" : " ",
    especificar_alerta: (alert.especificar_alerta || "").trim() || "Ninguna",

    lugar_fecha_hechos: (alert.lugar_fecha_hechos || "").trim() || "No especificado",

    intervencion_pregunta_1: (alert.intervencion_pregunta_1 || "").trim() || "La estudiante requiere atención psicosocial del DECE.",
    intervencion_pregunta_2: (alert.intervencion_pregunta_2 || "").trim() || "No especificadas.",
    intervencion_pregunta_3: (alert.intervencion_pregunta_3 || "").trim() || "No especificadas.",
    intervencion_pregunta_4: (alert.intervencion_pregunta_4 || "").trim() || "Se realizaron observaciones iniciales.",
    intervencion_pregunta_5: (alert.intervencion_pregunta_5 || "").trim() || "Se remite informe y ficha al departamento DECE.",

    notificador_nombre: (alert.notificador_nombre || "").trim() || "________________________",
    notificador_cargo: (alert.notificador_cargo || "Analista DECE").trim(),
    notificador_contacto: (alert.notificador_contacto || "").trim() || "__________",
    fecha_entrega_dece: (alert.fecha_entrega_dece || "").trim() || new Date().toISOString().split("T")[0],
  };
}

export async function generateAlertDocxBuffer(
  alert: Partial<CaseAlertNotificationRow>
): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "templates", "NOTIFICACION_DE_ALERTA_TEMPLATE.docx");

  if (!fs.existsSync(templatePath)) {
    const buildScript = path.join(process.cwd(), "scripts", "buildAlertTemplate.js");
    if (fs.existsSync(buildScript)) {
      const { buildAlertTemplate } = require(buildScript);
      buildAlertTemplate();
    }
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const zip = new PizZip(templateBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  const data = formatAlertTemplateData(alert);
  doc.render(data);

  return doc.getZip().generate({ type: "nodebuffer" });
}
