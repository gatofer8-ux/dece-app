import PizZip from "pizzip";
import { AlignmentType, Paragraph, TextRun } from "docx";
import { getDocumentStandards, type DocumentKind, type DocumentStandardLine } from "./documentStandards";

/**
 * Párrafos con la codificación de Estándares de Calidad DECE para los
 * documentos Word: "E.D3.C1.DE12." en negrita + enunciado, en letra chica y
 * justificado, igual que el membrete impreso (DocumentHeader).
 */
export function createStandardsParagraphs(
  source: DocumentKind | DocumentStandardLine[],
  opts: { font?: string; size?: number; afterLast?: number } = {}
): Paragraph[] {
  const lines = typeof source === "string" ? getDocumentStandards(source) : source;
  const font = opts.font ?? "Arial";
  const size = opts.size ?? 14; // 7pt, en medios puntos
  return lines.map(
    (s, i) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: i === lines.length - 1 ? (opts.afterLast ?? 0) : 0 },
        children: [
          new TextRun({ text: `${s.code} `, bold: true, font, size }),
          new TextRun({ text: s.text, font, size }),
        ],
      })
  );
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Inyecta la codificación de Estándares de Calidad al inicio del cuerpo de un
 * .docx ya generado (justo debajo del membrete). Sirve para cualquier
 * generador sin tocar su estructura interna. Es idempotente: si el documento
 * ya trae el primer código, lo devuelve intacto.
 */
export function injectStandardsIntoDocx(
  buffer: Buffer,
  source: DocumentKind | DocumentStandardLine[],
  opts: { font?: string; size?: number; afterLast?: number } = {}
): Buffer {
  const lines = typeof source === "string" ? getDocumentStandards(source) : source;
  if (lines.length === 0) return buffer;

  const zip = new PizZip(buffer);
  const file = zip.file("word/document.xml");
  if (!file) return buffer;
  const xml = file.asText();
  if (xml.includes(`${lines[0].code} `)) return buffer;
  const body = /<w:body[^>]*>/.exec(xml);
  if (!body) return buffer;

  const font = xmlEscape(opts.font ?? "Arial");
  const size = opts.size ?? 14;
  const rpr = (bold: boolean) =>
    `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${bold ? "<w:b/><w:bCs/>" : ""}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  const paragraphs = lines
    .map((s, i) => {
      const after = i === lines.length - 1 ? (opts.afterLast ?? 60) : 0;
      return (
        `<w:p><w:pPr><w:spacing w:before="0" w:after="${after}"/><w:jc w:val="both"/></w:pPr>` +
        `<w:r>${rpr(true)}<w:t xml:space="preserve">${xmlEscape(s.code)} </w:t></w:r>` +
        `<w:r>${rpr(false)}<w:t xml:space="preserve">${xmlEscape(s.text)}</w:t></w:r></w:p>`
      );
    })
    .join("");

  const at = body.index + body[0].length;
  zip.file("word/document.xml", xml.slice(0, at) + paragraphs + xml.slice(at));
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
