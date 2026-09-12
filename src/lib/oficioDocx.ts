/**
 * Generador "calca fiel" del Oficio institucional del DECE en formato Word.
 *
 * Reproduce la secuencia exacta de párrafos del modelo institucional:
 *   1. Ciudad y fecha              ("Ambato, 02 de julio de 2026")
 *   2. "Oficio No. <número>"
 *   3. "ASUNTO: <asunto en mayúsculas>"
 *   4. Bloque del destinatario      (nombre / CARGO / INSTITUCIÓN / "Presente.")
 *   5. "De mi consideración."
 *   6. Párrafo de encuadre          (body_intro)
 *   7. Párrafo de contenido         (body_content)
 *   8. Nota de cierre               ("Particular que comunico para los fines pertinentes.")
 *   9. "Atentamente," + firma del profesional (digital o constancia de firma física)
 *  10. Talonario de recepción en blanco ("Recibido por (firma)" / "Nombre:" / "Fecha:" / "Hora:")
 *
 * El encabezado y el pie usan las MISMAS imágenes de membrete institucional que
 * el resto de los documentos del sistema (public/plan_acomp_header.png y
 * public/plan_acomp_footer.png), igual que restitutionDocxExport.ts.
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  ImageRun,
  Packer,
  AlignmentType,
  BorderStyle,
  WidthType,
} from "docx";
import path from "path";
import fs from "fs";
import { smartAlign } from "./wordJustify";
import {
  formatAsunto,
  formatOficioCityDate,
  getOficioSignerSignature,
  OFICIO_DEFAULT_CLOSING_NOTE,
} from "./oficios";
import type { OficioRow } from "./types";

const FONT_NAME = "Calibri";
const FONT_SIZE = 22; // 11pt: tamaño de carta oficial del modelo

function getImageBuffer(fileName: string): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {
    // Sin membrete: el documento se genera igual, solo sin la imagen.
  }
  return null;
}

/** Convierte un data URL base64 de firma digital en buffer para ImageRun. */
function dataUrlToBuffer(dataUrl?: string | null): Buffer | null {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return null;
  try {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

function textParagraph(
  text: string,
  opts: {
    bold?: boolean;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    before?: number;
    after?: number;
    size?: number;
  } = {}
): Paragraph {
  return new Paragraph({
    alignment: opts.alignment ?? AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        font: FONT_NAME,
        size: opts.size ?? FONT_SIZE,
      }),
    ],
    spacing: { before: opts.before ?? 0, after: opts.after ?? 0 },
  });
}

/** Cada salto de línea del texto libre se convierte en su propio párrafo justificado. */
function bodyParagraphs(text: string | null | undefined, after = 200): Paragraph[] {
  const clean = (text || "").trim();
  if (!clean) return [];
  return clean
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        new Paragraph({
          alignment: smartAlign(line),
          children: [new TextRun({ text: line, font: FONT_NAME, size: FONT_SIZE })],
          spacing: { after, line: 276 },
        })
    );
}

export interface OficioDocxInstitutionInfo {
  name?: string | null;
}

export async function generateOficioDocx(data: {
  oficio: OficioRow;
  institution?: OficioDocxInstitutionInfo | null;
  caseCode?: string | null;
  studentName?: string | null;
}): Promise<Buffer> {
  const { oficio, institution } = data;

  const headerImg = getImageBuffer("plan_acomp_header.png");
  const footerImg = getImageBuffer("plan_acomp_footer.png");

  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1000, right: -1000 },
        children: headerImg
          ? [
              new ImageRun({
                data: headerImg,
                transformation: { width: 595, height: 60 },
                type: "png",
              }),
            ]
          : [],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Ministerio de Educación\nDirección: Av. Amazonas N34-451 y Av. Atahualpa. Código postal: 170507 / Quito-Ecuador\nTeléfono: 593-2-396-1300 / www.educacion.gob.ec",
            size: 14,
            font: FONT_NAME,
            color: "64748B",
          }),
        ],
        spacing: { before: 0, after: 40 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1000, right: -1000 },
        children: footerImg
          ? [
              new ImageRun({
                data: footerImg,
                transformation: { width: 595, height: 35 },
                type: "png",
              }),
            ]
          : [],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });

  const children: (Paragraph | Table)[] = [];

  // 1. Ciudad y fecha
  children.push(
    textParagraph(formatOficioCityDate(oficio.city, oficio.oficio_date), { after: 200 })
  );

  // 2. Número de oficio
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Oficio No. ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
        new TextRun({ text: oficio.oficio_number || "", font: FONT_NAME, size: FONT_SIZE }),
      ],
      spacing: { after: 200 },
    })
  );

  // 3. Asunto (siempre en mayúsculas, como en el modelo)
  const asuntoText = formatAsunto(oficio.asunto);
  children.push(
    new Paragraph({
      alignment: smartAlign(`ASUNTO: ${asuntoText}`),
      children: [
        new TextRun({ text: "ASUNTO: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
        new TextRun({ text: asuntoText, bold: true, font: FONT_NAME, size: FONT_SIZE }),
      ],
      spacing: { after: 320, line: 276 },
    })
  );

  // 4. Bloque del destinatario
  if (oficio.addressee_name?.trim()) {
    children.push(textParagraph(oficio.addressee_name.trim(), { bold: true }));
  }
  if (oficio.addressee_role?.trim()) {
    children.push(textParagraph(oficio.addressee_role.trim().toUpperCase(), { bold: true }));
  }
  const addresseeInstitution =
    oficio.addressee_institution?.trim() || institution?.name?.trim() || "";
  if (addresseeInstitution) {
    children.push(textParagraph(addresseeInstitution.toUpperCase(), { bold: true }));
  }
  children.push(textParagraph("Presente.", { after: 320 }));

  // 5. Fórmula de cortesía
  children.push(textParagraph("De mi consideración.", { after: 240 }));

  // 6. Párrafo de encuadre legal / contextual
  children.push(...bodyParagraphs(oficio.body_intro, 240));

  // 7. Párrafo de contenido específico (petición o notificación)
  children.push(...bodyParagraphs(oficio.body_content, 240));

  // Referencia de custodia física, cuando se registró
  if (oficio.physical_file_ref?.trim()) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Respaldo físico institucional: el original de este oficio se encuentra custodiado en ${oficio.physical_file_ref.trim()}.`,
            font: FONT_NAME,
            size: 18,
            italics: true,
            color: "64748B",
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  // 8. Nota de cierre
  children.push(
    textParagraph(oficio.closing_note?.trim() || OFICIO_DEFAULT_CLOSING_NOTE, { after: 280 })
  );

  // 9. Despedida y firma del profesional que suscribe
  children.push(textParagraph("Atentamente,", { after: 160 }));

  const signerSignature = getOficioSignerSignature(oficio.signatures_json);
  const signatureImg = dataUrlToBuffer(signerSignature?.firma_data_url);

  if (signatureImg) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: signatureImg,
            transformation: { width: 170, height: 60 },
            type: "png",
          }),
        ],
        spacing: { after: 0 },
      })
    );
  } else if (signerSignature?.tipo === "fisica") {
    children.push(
      textParagraph("_______________________________", { after: 40 }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Firma manuscrita en documento físico${
              signerSignature.referencia_fisica
                ? ` — archivo: ${signerSignature.referencia_fisica}`
                : ""
            }`,
            font: FONT_NAME,
            size: 16,
            italics: true,
            color: "64748B",
          }),
        ],
        spacing: { after: 80 },
      })
    );
  } else {
    // Sin firma registrada: se deja el espacio reglamentario para firmar a mano.
    children.push(textParagraph(" ", { after: 400 }));
  }

  children.push(textParagraph(oficio.signer_name?.trim() || "", { bold: true }));
  children.push(
    textParagraph((oficio.signer_role?.trim() || "ANALISTA DECE").toUpperCase(), {
      after: 600,
    })
  );

  // 10. Talonario de recepción — SIEMPRE en blanco, se llena a mano al entregar.
  children.push(
    textParagraph("               Recibido por (firma):___________________________", {
      after: 160,
    }),
    textParagraph("Nombre: ____________________________", { after: 160 }),
    textParagraph("Fecha: __________________", { after: 160 }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Hora:____________", font: FONT_NAME, size: FONT_SIZE })],
      spacing: { after: 0 },
    })
  );

  // Anexo de auditoría: respaldo físico digitalizado (imagen), si se adjuntó
  const evidenceImg = dataUrlToBuffer(oficio.physical_evidence_url);
  if (evidenceImg) {
    const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "ANEXO: OFICIO FÍSICO FIRMADO Y SELLADO (DIGITALIZADO)",
            bold: true,
            font: FONT_NAME,
            size: 20,
          }),
        ],
        spacing: { after: 200 },
      }),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        borders: {
          top: cellBorder,
          bottom: cellBorder,
          left: cellBorder,
          right: cellBorder,
          insideHorizontal: cellBorder,
          insideVertical: cellBorder,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: evidenceImg,
                        transformation: { width: 540, height: 700 },
                        type: "png",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_NAME, size: FONT_SIZE },
          paragraph: { spacing: { line: 276, after: 0 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            // A4 vertical (retrato), igual que restitutionDocxExport.ts
            size: { width: 11906, height: 16838 },
            margin: { top: 1100, bottom: 1100, left: 1400, right: 1400 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
