// Entrevista a estudiantes con el formato institucional (membrete oficial del Ministerio, tabla de dos
// columnas, firmas). El archivo se arma sobre `templates/entrevista_estudiantes_base.docx`, que es una
// copia del documento de la institución (estilos, encabezado, pie e imágenes) sin datos personales:
// aquí solo se reemplazan los textos del encabezado, el logo y las filas de la tabla.
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import { pairQuestions, visibleStructure } from "./entrevistaPreguntas";
import { dataUriToBuffer, imageSize, type InterviewDocData } from "./entrevistaPreguntasDocx";

const TEMPLATE_PATH = () => path.join(process.cwd(), "templates", "entrevista_estudiantes_base.docx");

// Medidas exactas del documento original (twips).
const W = 8504;
const C1 = 4399;
const C2 = 4105;

// Caja del logo en el encabezado (EMU) y su posición original.
const LOGO_BOX = { w: 689610, h: 828675, x: 253365, y: -266700 };

const FONT =
  '<w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
const SIDE = (s: string) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
const BORDERS = `<w:tcBorders>${SIDE("top")}${SIDE("left")}${SIDE("bottom")}${SIDE("right")}</w:tcBorders>`;
const MARGINS =
  '<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="115" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="115" w:type="dxa"/></w:tcMar>';

export function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function run(text: string, bold = false): string {
  const rPr = `<w:rPr>${FONT}${bold ? "<w:b/><w:bCs/>" : ""}<w:color w:val="000000"/></w:rPr>`;
  // Los saltos de línea de las respuestas se respetan con <w:br/>.
  const lines = (text || "").replace(/\r/g, "").split("\n");
  return lines
    .map((line, i) => `<w:r>${rPr}${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`)
    .join("");
}

function para(runs: string, jc?: "both" | "center", markBold = false): string {
  const mark = markBold ? `<w:rPr>${FONT}<w:b/><w:bCs/><w:color w:val="000000"/></w:rPr>` : `<w:rPr>${FONT}</w:rPr>`;
  return `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>${jc ? `<w:jc w:val="${jc}"/>` : ""}${mark}</w:pPr>${runs}</w:p>`;
}

interface CellOpts {
  width: number;
  span?: number;
  fill?: string;
  vAlign?: "center" | "bottom";
  borders?: string; // por defecto, caja completa
}

function cell(content: string, o: CellOpts): string {
  const borders = o.borders === undefined ? BORDERS : o.borders;
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${o.width}" w:type="dxa"/>${o.span ? `<w:gridSpan w:val="${o.span}"/>` : ""}` +
    `${borders}${o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : ""}${MARGINS}` +
    `${o.vAlign ? `<w:vAlign w:val="${o.vAlign}"/>` : ""}</w:tcPr>${content}</w:tc>`
  );
}

const row = (height: number, cells: string) =>
  `<w:tr><w:trPr><w:trHeight w:val="${height}"/></w:trPr>${cells}</w:tr>`;

// Alturas MÍNIMAS del documento original: Word agranda cada fila según el texto que lleva.
const H_QUESTION_PAIR = 510;
/** Preguntas largas: el documento original les da un mínimo mayor (765 / 964). */
const pairHeight = (a: string, b: string) => {
  const longest = Math.max(a.length, b.length);
  return longest >= 190 ? 964 : longest >= 120 ? 765 : H_QUESTION_PAIR;
};
const H_QUESTION_FULL = 397;
const H_ANSWER_PAIR = 1000;
const H_ANSWER_FULL = 850;

export function buildInterviewTable(d: InterviewDocData): string {
  const vis = visibleStructure(d.structure);
  const rows: string[] = [];

  rows.push(
    row(
      283,
      cell(para(run(vis.title, true), "center", true), { width: W, span: 2, fill: "BDD7EE", vAlign: "center" })
    )
  );
  const labelRow = (label: string, value: string, vAlign: "center" | "bottom") =>
    row(283, cell(para(run(label, true) + run(value)), { width: W, span: 2, vAlign }));
  rows.push(labelRow("NOMBRES Y APELLIDOS: ", d.student, "center"));
  rows.push(labelRow("CURSO/PARALELO/ JORNADA: ", d.course, "center"));
  rows.push(labelRow("FECHA: ", d.date, "bottom"));

  for (const sec of vis.sections) {
    rows.push(row(283, cell(para(run(sec.title, true)), { width: W, span: 2, fill: "D9D9D9", vAlign: "center" })));

    for (const pair of pairQuestions(sec.questions)) {
      if (pair.length === 2) {
        const [a, b] = pair;
        rows.push(
          row(
            pairHeight(a.text, b.text),
            cell(para(run(a.text, true), "both"), { width: C1, vAlign: "center" }) +
              cell(para(run(b.text, true), "both"), { width: C2, vAlign: "center" })
          )
        );
        rows.push(
          row(
            H_ANSWER_PAIR,
            cell(para(run(d.answers[a.id] || ""), "both"), { width: C1 }) +
              cell(para(run(d.answers[b.id] || ""), "both"), { width: C2 })
          )
        );
      } else {
        const [a] = pair;
        rows.push(
          row(H_QUESTION_FULL, cell(para(run(a.text, true), "both"), { width: W, span: 2, vAlign: "bottom" }))
        );
        rows.push(row(H_ANSWER_FULL, cell(para(run(d.answers[a.id] || ""), "both"), { width: W, span: 2 })));
      }
    }
  }

  // Firmas: línea superior en la celda y nombres debajo, sin bordes.
  const TOP_ONLY = `<w:tcBorders>${SIDE("top")}</w:tcBorders>`;
  rows.push(
    row(
      1185,
      cell(para(run("_____________________________________", true), "both"), { width: C1, vAlign: "bottom", borders: TOP_ONLY }) +
        cell(para(run("__________________________________", true), "both"), { width: C2, vAlign: "bottom", borders: TOP_ONLY })
    )
  );
  rows.push(
    row(
      300,
      cell(para(run("Nombres y Apellidos del estudiante", true), "both"), { width: C1, vAlign: "bottom", borders: "" }) +
        cell(para(run(d.professional ? `${d.professional}` : "Profesional DECE", true), "both"), {
          width: C2,
          vAlign: "bottom",
          borders: "",
        })
    )
  );

  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblInd w:w="-25" w:type="dxa"/><w:tblLayout w:type="fixed"/>` +
    `<w:tblLook w:val="0400" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="${C1}"/><w:gridCol w:w="${C2}"/></w:tblGrid>${rows.join("")}</w:tbl>`
  );
}

/* ---------------- Encabezado ---------------- */

/** Quita el párrafo del encabezado que contiene el marcador (sin tocar el que lleva los dibujos). */
function removeParagraphWith(xml: string, marker: string): string {
  const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const target = paras.find((p) => p.includes(marker) && !p.includes("<w:drawing>"));
  return target ? xml.replace(target, "") : xml;
}

function removeSealRun(xml: string): string {
  const runs = xml.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || [];
  const seal = runs.find((r) => r.includes("<w:drawing>") && r.includes('r:embed="rId1"'));
  return seal ? xml.replace(seal, "") : xml;
}

function applyLogo(zip: PizZip, header: string, d: InterviewDocData): string {
  const img = d.letterhead.showLogo ? dataUriToBuffer(d.logoDataUri) : null;
  const size = img ? imageSize(img.buf, img.type) : null;
  if (!img || !size || !size.w || !size.h) {
    return removeSealRun(header);
  }

  // Ajusta el logo a la caja original conservando su proporción y lo centra en ella.
  const scale = Math.min(LOGO_BOX.w / size.w, LOGO_BOX.h / size.h);
  const w = Math.round(size.w * scale);
  const h = Math.round(size.h * scale);
  const x = LOGO_BOX.x + Math.round((LOGO_BOX.w - w) / 2);
  const y = LOGO_BOX.y + Math.round((LOGO_BOX.h - h) / 2);

  const ext = img.type; // png | jpg | gif
  const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
  zip.remove("word/media/logo.png");
  zip.file(`word/media/logo.${ext}`, img.buf);

  let rels = zip.file("word/_rels/header1.xml.rels")!.asText();
  rels = rels.replace(/Target="media\/logo\.[a-z]+"/, `Target="media/logo.${ext}"`);
  zip.file("word/_rels/header1.xml.rels", rels);

  let ct = zip.file("[Content_Types].xml")!.asText();
  if (!new RegExp(`Extension="${ext}"`, "i").test(ct)) {
    ct = ct.replace("<Default ", `<Default Extension="${ext}" ContentType="${mime}"/><Default `);
    zip.file("[Content_Types].xml", ct);
  }

  return header
    .replace(/cx="689610" cy="828675"/g, `cx="${w}" cy="${h}"`)
    .replace(/<wp:posOffset>253365<\/wp:posOffset>/, `<wp:posOffset>${x}</wp:posOffset>`)
    .replace(/<wp:posOffset>-266700<\/wp:posOffset>/, `<wp:posOffset>${y}</wp:posOffset>`);
}

export function generateMineducInterviewDocx(d: InterviewDocData): Buffer {
  const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH()));

  // Cuerpo
  const doc = zip.file("word/document.xml")!.asText();
  if (!doc.includes("@@TABLA@@")) throw new Error("La plantilla base de la entrevista no es válida.");
  zip.file("word/document.xml", doc.replace("@@TABLA@@", () => buildInterviewTable(d)));

  // Encabezado
  const lh = d.letterhead;
  let header = zip.file("word/header1.xml")!.asText();
  header = applyLogo(zip, header, d);
  if (!lh.motto.trim()) header = removeParagraphWith(header, "{{lema}}");
  if (!lh.department.trim()) header = removeParagraphWith(header, "{{departamento}}");
  if (!lh.showSchoolYear || !d.schoolYear) header = removeParagraphWith(header, "{{anio_lectivo}}");
  const values: Record<string, string> = {
    "{{institucion}}": lh.institutionName.toUpperCase(),
    "{{lema}}": lh.motto,
    "{{departamento}}": lh.department.toUpperCase(),
    "{{anio_lectivo}}": d.schoolYear,
  };
  for (const [marker, value] of Object.entries(values)) {
    header = header.split(marker).join(xmlEscape(value));
  }
  zip.file("word/header1.xml", header);

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
