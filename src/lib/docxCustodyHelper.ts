import {
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  BorderStyle,
  WidthType,
} from "docx";

export interface DocxSignerInfo {
  signer_id?: string;
  name?: string;
  role?: string;
  tipo?: "digital" | "fisica" | string;
  firma_data_url?: string;
  observacion?: string;
  observacion_firma?: string;
  date?: string;
}

/**
 * Parsea con seguridad el JSON de firmas duales.
 */
export function parseDocxSignatures(signaturesJson?: string | null): DocxSignerInfo[] {
  if (!signaturesJson) return [];
  try {
    const parsed = JSON.parse(signaturesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Genera párrafos estilizados para la celda de firma en un documento Word,
 * reflejando con exactitud si fue firmado digitalmente (con imagen y sello de registro),
 * si cuenta con firma manuscrita y sello en papel, o si es una línea en blanco.
 */
export function createDocxSignatureParagraphs(opts: {
  signer?: DocxSignerInfo | null;
  name?: string;
  role?: string;
  dateText?: string;
  signatureType?: string | null;
  font?: string;
  nameColor?: string;
}): Paragraph[] {
  const font = opts.font || "Calibri";
  const name = opts.name || opts.signer?.name || "";
  const role = opts.role || opts.signer?.role || "";
  const sig = opts.signer;
  const isDigital = sig?.tipo === "digital" || opts.signatureType === "DIGITAL";
  const isFisica = sig?.tipo === "fisica" || opts.signatureType === "FISICA";

  const paragraphs: Paragraph[] = [];

  // 1. Nombre
  if (name) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 20 },
        children: [
          new TextRun({
            text: name,
            bold: true,
            font,
            size: 18,
            color: opts.nameColor || "1F2937",
          }),
        ],
      })
    );
  }

  // 2. Cargo o Rol
  if (role) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: role,
            font,
            size: 15,
            color: "4B5563",
          }),
        ],
      })
    );
  }

  // 3. Trazo gráfico / Indicativo de firma
  if (isDigital) {
    let imgAdded = false;
    if (sig?.firma_data_url && sig.firma_data_url.startsWith("data:image/")) {
      try {
        const base64Data = sig.firma_data_url.replace(/^data:image\/\w+;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, "base64");
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: 120, height: 42 },
                type: "png",
              }),
            ],
          })
        );
        imgAdded = true;
      } catch {
        imgAdded = false;
      }
    }

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: imgAdded ? 20 : 80, after: 40 },
        children: [
          new TextRun({
            text: "[FIRMADO DIGITALMENTE — REGISTRO ELECTRÓNICO]",
            bold: true,
            font,
            size: 13,
            color: "047857", // emerald-700
          }),
        ],
      })
    );
  } else if (isFisica) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 20 },
        children: [
          new TextRun({
            text: "___________________________",
            font,
            size: 16,
            color: "6B7280",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 40 },
        children: [
          new TextRun({
            text: "[DOCUMENTO CON FIRMA MANUSCRITA Y SELLO FÍSICO]",
            bold: true,
            font,
            size: 13,
            color: "B45309", // amber-700
          }),
        ],
      })
    );
  } else {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 20 },
        children: [
          new TextRun({
            text: "___________________________",
            font,
            size: 16,
            color: "6B7280",
          }),
        ],
      })
    );
  }

  // 4. Fecha de emisión o legalización
  if (opts.dateText) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 40 },
        children: [
          new TextRun({
            text: `Fecha: ${opts.dateText}`,
            font,
            size: 13,
            color: "6B7280",
          }),
        ],
      })
    );
  }

  return paragraphs;
}

/**
 * Genera un recuadro formal de Custodia de Archivo Físico Institucional
 * para anexar al final de las exportaciones Word (.docx).
 */
export function createDocxCustodyCalloutTable(opts: {
  physicalFileRef?: string | null;
  physicalEvidenceUrl?: string | null;
  widthDxa?: number;
  font?: string;
}): Table | null {
  if (!opts.physicalFileRef && !opts.physicalEvidenceUrl) {
    return null;
  }

  const font = opts.font || "Calibri";
  const width = opts.widthDxa || 9500;
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D97706" }; // amber-600
  const borders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };

  const fileRef = opts.physicalFileRef?.trim() || "Carpeta Institucional de Archivo DECE";
  const hasEvidence = Boolean(opts.physicalEvidenceUrl?.trim());

  return new Table({
    width: { size: width, type: WidthType.DXA },
    borders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "FFFBEB" }, // amber-50
            margins: { top: 90, bottom: 90, left: 140, right: 140 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: "📁 CUSTODIA DE ARCHIVO INSTITUCIONAL (AUDITORÍA DISTRITAL)",
                    bold: true,
                    font,
                    size: 16,
                    color: "92400E", // amber-800
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 30 },
                children: [
                  new TextRun({
                    text: "Ubicación en Archivo Físico: ",
                    bold: true,
                    font,
                    size: 15,
                    color: "78350F",
                  }),
                  new TextRun({
                    text: fileRef,
                    font,
                    size: 15,
                    color: "1F2937",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: hasEvidence
                      ? "Constancia: El documento reposa en la carpeta física especificada y cuenta con respaldo digitalizado con sellos en la plataforma institucional."
                      : "Constancia: El documento reposa bajo custodia del archivo físico del DECE conforme a las directrices de auditoría del Ministerio de Educación.",
                    italics: true,
                    font,
                    size: 13,
                    color: "4B5563",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
