// Reporte para Juntas de Grado/Curso con el formato E.D1.C2.DE3 (Ministerio de Educación). El archivo se
// arma sobre `templates/REPORTE_JUNTAS_DE3_BASE.docx`, copia del formato oficial (membrete, estilos, pie
// con número de página y tablas) sin datos personales; aquí solo se reemplazan los marcadores @@...@@ y
// se generan las filas de la nómina de estudiantes.
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import type { CourseBoardReportCaseItem, CourseBoardReportRow, InstitutionRow, Trimester } from "./types";

const TEMPLATE = () => path.join(process.cwd(), "templates", "REPORTE_JUNTAS_DE3_BASE.docx");

export const DE3_FORMAT = "REPORTE_DE3";

const TRIMESTER_UPPER: Record<Trimester, string> = {
  "1T": "PRIMER TRIMESTRE",
  "2T": "SEGUNDO TRIMESTRE",
  "3T": "TERCER TRIMESTRE",
};

export function xmlEscape(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 2026-11-09 -> 09/11/2026; si no es fecha ISO se devuelve tal cual. */
export function formatDateDmy(iso: string | null | undefined): string {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "";
}

/** Texto en una sola corrida respetando saltos de línea con <w:br/>. */
function textToRunContent(text: string): string {
  const lines = (text || "").replace(/\r/g, "").split("\n");
  return lines.map((l, i) => `${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${xmlEscape(l)}</w:t>`).join("");
}

/** Reemplaza el marcador que está dentro de un <w:t> conservando el formato de esa corrida. */
function fillInline(xml: string, marker: string, value: string): string {
  const re = new RegExp(`<w:t(?: [^>]*)?>([^<]*)${marker}([^<]*)<\\/w:t>`, "g");
  return xml.replace(re, (_m, before: string, after: string) =>
    textToRunContent(`${before.replace(/&amp;/g, "&")}${value}${after.replace(/&amp;/g, "&")}`)
  );
}

/** Reemplaza el párrafo que contiene el marcador por un párrafo por línea, con el mismo formato. */
function fillParagraphs(xml: string, marker: string, value: string): string {
  const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const target = paras.find((p) => p.includes(marker));
  if (!target) return xml;
  const lines = (value || "").replace(/\r/g, "").split("\n");
  const out = lines
    .map((line) => target.replace(new RegExp(`<w:t(?: [^>]*)?>${marker}<\\/w:t>`), `<w:t xml:space="preserve">${xmlEscape(line)}</w:t>`))
    .join("");
  return xml.replace(target, out);
}

/* ---------------- Nómina de estudiantes ---------------- */

const SZ = '<w:sz w:val="20"/><w:szCs w:val="20"/>';

function cellXml(text: string, kind: "center" | "both" | "list", boldCs = false): string {
  const rPr = `<w:rPr>${boldCs ? "<w:bCs/>" : ""}${SZ}</w:rPr>`;
  const pPr =
    kind === "list"
      ? `<w:pPr><w:pStyle w:val="Prrafodelista"/><w:ind w:left="360"/><w:jc w:val="both"/>${rPr}</w:pPr>`
      : `<w:pPr><w:jc w:val="${kind}"/>${rPr}</w:pPr>`;
  // Cada línea es un párrafo, como en el formato original (viñetas "-Detección", "-Derivación"...).
  const lines = (text || "").replace(/\r/g, "").split("\n").filter((l, i, a) => l.trim() || a.length === 1);
  const paras = (lines.length ? lines : [""])
    .map((l) => `<w:p>${pPr}${l ? `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(l)}</w:t></w:r>` : ""}</w:p>`)
    .join("");
  return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${paras}</w:tc>`;
}

/** Asesoramiento a docentes: el campo propio o, en informes antiguos, las recomendaciones guardadas. */
export function teacherAdviceOf(c: CourseBoardReportCaseItem): string {
  if (c.teacher_advice?.trim()) return c.teacher_advice.trim();
  const r = c.recommendations || {};
  return [r.coordination, r.academic, r.climate, r.protocols, r.general]
    .map((x) => (x || "").trim())
    .filter(Boolean)
    .join("\n");
}

export function buildCaseRows(cases: CourseBoardReportCaseItem[]): string {
  const list = cases.length ? cases : [null];
  return list
    .map((c, i) => {
      const n = c ? String(i + 1).padStart(2, "0") : "";
      return (
        `<w:tr><w:trPr><w:trHeight w:val="2273"/></w:trPr>` +
        cellXml(n, "center") +
        cellXml(c?.student_name || "", "center", true) +
        cellXml(c?.problematic || "", "center") +
        cellXml(c?.actions_taken || "", "both") +
        cellXml(c ? teacherAdviceOf(c) : "", "list") +
        cellXml(c?.observations || "", "list") +
        `</w:tr>`
      );
    })
    .join("");
}

/** Mantiene la tabla de firmas en una sola página: "conservar con el siguiente" en todas sus filas menos la última. */
export function keepSignatureTableTogether(doc: string): string {
  const tables = doc.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  const sig = tables[tables.length - 1];
  if (!sig || !sig.includes("DESARROLLO DEL DOCUMENTO")) return doc;
  const rows = sig.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
  let out = sig;
  for (const row of rows.slice(0, -1)) {
    out = out.replace(row, row.replace(/<w:pPr>(?!<w:keepNext\/>)/g, "<w:pPr><w:keepNext/>"));
  }
  return doc.replace(sig, out);
}

/* ---------------- Documento ---------------- */

function parseCases(json: string | null | undefined): CourseBoardReportCaseItem[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function generateReporteJuntaDE3Docx(report: CourseBoardReportRow, _institution?: InstitutionRow | null): Buffer {
  const zip = new PizZip(fs.readFileSync(TEMPLATE()));
  let doc = zip.file("word/document.xml")!.asText();
  if (!doc.includes("@@FILAS@@")) throw new Error("La plantilla del reporte de juntas de curso no es válida.");

  const trimester = TRIMESTER_UPPER[report.trimester] || "";
  const jornada = (report.jornada || "").toUpperCase();

  doc = doc.replace("@@FILAS@@", () => buildCaseRows(parseCases(report.cases_json)));
  doc = fillParagraphs(doc, "@@ACTIVIDADES@@", report.general_actions || "");

  const inline: [string, string][] = [
    ["@@TRIMESTRE@@", trimester],
    ["@@TRIMESTRE_MIN@@", trimester.toLowerCase()],
    ["@@ANIO@@", report.school_year_text || ""],
    ["@@CURSO@@", report.course || ""],
    ["@@PARALELO@@", report.parallel || ""],
    ["@@JORNADA@@", jornada],
    ["@@TUTOR@@", report.tutor_name || ""],
    ["@@OBSERVACIONES@@", report.observaciones_generales || ""],
    ["@@DECE_NOMBRE@@", report.user_name || ""],
    ["@@DECE_CARGO@@", (report.user_role_label || "ANALISTA DECE").toUpperCase()],
    ["@@FECHA@@", formatDateDmy(report.report_date)],
    ["@@TUTOR_FIRMA@@", report.tutor_name || ""],
    ["@@VICERRECTOR@@", report.vicerrector_name || ""],
    ["@@JORNADA_FIRMA@@", jornada],
  ];
  for (const [marker, value] of inline) doc = fillInline(doc, marker, value);

  doc = keepSignatureTableTogether(doc);
  zip.file("word/document.xml", doc);
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
