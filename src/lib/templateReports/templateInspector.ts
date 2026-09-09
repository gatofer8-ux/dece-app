import crypto from "crypto";
import ExcelJS from "exceljs";
import PizZip from "pizzip";
import {
  TemplateFileType,
  TemplateInspectionResult,
  TemplateSheetInfo,
  TemplateColumnInfo,
  TemplateValidationRule,
} from "./types";

export function computeBufferHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getColumnLetter(colIndex: number): string {
  let letter = "";
  let temp = colIndex;
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

/**
 * Inspecciona un archivo .xlsx usando ExcelJS preservando todos sus metadatos.
 */
export async function inspectExcelTemplate(
  buffer: Buffer,
  fileName: string
): Promise<TemplateInspectionResult> {
  const fileHash = computeBufferHash(buffer);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets: TemplateSheetInfo[] = [];

  workbook.eachSheet((worksheet, sheetId) => {
    let detectedHeaderRow = 1;
    let maxColsFound = 0;

    // Buscar la fila con mayor densidad de texto en las primeras 10 filas
    const scanLimit = Math.min(worksheet.rowCount || 10, 15);
    for (let r = 1; r <= scanLimit; r++) {
      const row = worksheet.getRow(r);
      let nonEmptyCells = 0;
      row.eachCell({ includeEmpty: false }, (cell) => {
        const val = String(cell.value || "").trim();
        if (val.length > 0) nonEmptyCells++;
      });
      if (nonEmptyCells > maxColsFound) {
        maxColsFound = nonEmptyCells;
        detectedHeaderRow = r;
      }
    }

    const headerRow = worksheet.getRow(detectedHeaderRow);
    const sampleRow = worksheet.getRow(detectedHeaderRow + 1);

    const columns: TemplateColumnInfo[] = [];
    const maxCol = Math.max(headerRow.cellCount || 0, maxColsFound, 1);

    for (let c = 1; c <= maxCol; c++) {
      const headerCell = headerRow.getCell(c);
      const sampleCell = sampleRow.getCell(c);

      let headerText = "";
      if (typeof headerCell.value === "object" && headerCell.value !== null) {
        // En caso de rich text o fórmula
        if ("richText" in headerCell.value && Array.isArray((headerCell.value as any).richText)) {
          headerText = (headerCell.value as any).richText.map((t: any) => t.text || "").join("");
        } else if ("result" in headerCell.value) {
          headerText = String((headerCell.value as any).result || "");
        } else {
          headerText = String(headerCell.text || "");
        }
      } else {
        headerText = String(headerCell.value || headerCell.text || "").trim();
      }

      if (!headerText && c > maxColsFound) {
        // Ignorar columnas vacías al final
        continue;
      }

      const letter = getColumnLetter(c);
      const fallbackHeader = headerText || `Columna ${letter}`;

      // Inspeccionar validaciones de datos (ej. listas desplegables)
      let validation: TemplateValidationRule | undefined = undefined;
      const dataVal = sampleCell.dataValidation || headerCell.dataValidation;
      if (dataVal) {
        let options: string[] = [];
        if (dataVal.type === "list" && Array.isArray(dataVal.formulae) && dataVal.formulae[0]) {
          const formulaStr = String(dataVal.formulae[0]);
          // Fórmulas de lista pueden venir como '"OP1,OP2,OP3"' o 'Sheet1!$A$1:$A$5'
          if (formulaStr.startsWith('"') && formulaStr.endsWith('"')) {
            options = formulaStr.slice(1, -1).split(",").map((s) => s.trim());
          }
        }
        validation = {
          type: dataVal.type,
          allowBlank: dataVal.allowBlank,
          options: options.length ? options : undefined,
          formulae: dataVal.formulae ? dataVal.formulae.map(String) : undefined,
          prompt: dataVal.prompt,
          error: dataVal.error,
        };
      }

      // Detectar fórmulas
      const hasFormula = Boolean(sampleCell.formula);
      const formula = sampleCell.formula ? String(sampleCell.formula) : undefined;

      // Celdas combinadas
      const isMerged = Boolean(sampleCell.isMerged || headerCell.isMerged);

      // Bloqueo
      const isLocked = sampleCell.protection?.locked !== false;

      columns.push({
        index: c,
        letter,
        header: fallbackHeader,
        sampleValue: sampleCell.value ? String(sampleCell.value) : undefined,
        hasFormula,
        formula,
        isMerged,
        isLocked,
        validation,
      });
    }

    const isProtected = Boolean((worksheet as any).isProtected);
    // ExcelJS expone si tiene contraseña
    const hasPasswordProtection = Boolean((worksheet as any).protect?.password || (worksheet as any).password);

    sheets.push({
      id: sheetId,
      name: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: columns.length,
      headerRowIndex: detectedHeaderRow,
      dataStartRowIndex: detectedHeaderRow + 1,
      columns,
      isProtected,
      hasPasswordProtection,
    });
  });

  // Sugerir la hoja con más columnas o la primera
  let suggestedSheetIndex = 0;
  let maxCols = 0;
  sheets.forEach((sh, idx) => {
    if (sh.columns.length > maxCols) {
      maxCols = sh.columns.length;
      suggestedSheetIndex = idx;
    }
  });

  return {
    fileHash,
    fileName,
    fileType: fileName.toLowerCase().endsWith(".xls") ? "XLS" : "XLSX",
    sheets,
    suggestedSheetIndex,
  };
}

/**
 * Inspecciona una plantilla Word (.docx) detectando marcadores y tablas.
 */
export async function inspectDocxTemplate(
  buffer: Buffer,
  fileName: string
): Promise<TemplateInspectionResult> {
  const fileHash = computeBufferHash(buffer);
  const zip = new PizZip(buffer);

  const placeholders = new Set<string>();
  let tablesCount = 0;

  // Leer document.xml
  const docXml = zip.file("word/document.xml")?.asText() || "";

  // 1. Detectar marcadores tipo {campo} o {{campo}}
  const regex = /\{+([a-zA-Z0-9_.-]+)\}+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(docXml)) !== null) {
    if (match[1]) {
      placeholders.add(match[1].trim());
    }
  }

  // 2. Contar tablas
  const tableMatches = docXml.match(/<w:tbl[ >]/g);
  if (tableMatches) {
    tablesCount = tableMatches.length;
  }

  // Estructurar como "hoja" única para mantener interfaz uniforme
  const columns: TemplateColumnInfo[] = Array.from(placeholders).map((ph, idx) => ({
    index: idx + 1,
    letter: getColumnLetter(idx + 1),
    header: ph,
    hasFormula: false,
    isMerged: false,
    isLocked: false,
  }));

  const sheet: TemplateSheetInfo = {
    id: 1,
    name: "Documento Word",
    rowCount: 1,
    columnCount: columns.length,
    headerRowIndex: 1,
    dataStartRowIndex: 2,
    columns,
    isProtected: false,
    hasPasswordProtection: false,
  };

  return {
    fileHash,
    fileName,
    fileType: "DOCX",
    sheets: [sheet],
    suggestedSheetIndex: 0,
    docxPlaceholders: Array.from(placeholders),
    docxTablesCount: tablesCount,
  };
}

/**
 * Inspecciona un archivo (.xlsx, .xls o .docx) reconociendo su tipo.
 */
export async function inspectTemplate(
  buffer: Buffer,
  fileName: string
): Promise<TemplateInspectionResult> {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "docx") {
    return inspectDocxTemplate(buffer, fileName);
  }
  return inspectExcelTemplate(buffer, fileName);
}
