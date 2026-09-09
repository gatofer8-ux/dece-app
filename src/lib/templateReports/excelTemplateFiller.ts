import ExcelJS from "exceljs";
import {
  TemplateFieldMapping,
  ValidationWarning,
  TemplateSheetInfo,
} from "./types";

/**
 * Ajusta los números de fila en una fórmula de Excel para que apunten a la nueva fila.
 * Ej: "=A2+B2" en fila 3 -> "=A3+B3"
 */
function adjustFormulaRow(formula: string, oldRow: number, newRow: number): string {
  if (!formula || oldRow === newRow) return formula;
  const rowDiff = newRow - oldRow;
  // Expresión regular que encuentra letras de columna seguidas del número de fila (ej. A2, BC15, sin signo $)
  return formula.replace(/([A-Z]+)(\d+)/g, (match, col, rowNum) => {
    const r = parseInt(rowNum, 10);
    if (r === oldRow) {
      return `${col}${r + rowDiff}`;
    }
    return match;
  });
}

/**
 * Llena una plantilla Excel in-situ respetando el 100% de los estilos,
 * fórmulas, validaciones de listas desplegables y protecciones originales.
 */
export async function fillExcelTemplate(opts: {
  templateBuffer: Buffer;
  sheetIndexOrName?: number | string;
  mapping: TemplateFieldMapping;
  data: Record<string, any>[];
  headerRowIndex?: number;
  dataStartRow?: number;
}): Promise<{
  buffer: Buffer;
  warnings: ValidationWarning[];
  recordsCount: number;
}> {
  const {
    templateBuffer,
    sheetIndexOrName = 0,
    mapping,
    data,
    headerRowIndex = 1,
    dataStartRow = 2,
  } = opts;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  const worksheet =
    typeof sheetIndexOrName === "string"
      ? workbook.getWorksheet(sheetIndexOrName)
      : workbook.worksheets[sheetIndexOrName || 0];

  if (!worksheet) {
    throw new Error(`La hoja de cálculo indicada no fue encontrada en la plantilla.`);
  }

  const wasProtected = Boolean((worksheet as any).isProtected);
  if (wasProtected) {
    try {
      worksheet.unprotect();
    } catch {}
  }

  const warnings: ValidationWarning[] = [];
  const modelRowIndex = dataStartRow;
  const modelRow = worksheet.getRow(modelRowIndex);

  // Capturar estilos y validaciones de la fila modelo
  const colModelStyles = new Map<string, any>();
  const colValidations = new Map<string, any>();
  const colFormulas = new Map<string, string>();

  modelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const colKey = String(cell.col || colNumber);
    colModelStyles.set(colKey, {
      font: cell.font ? { ...cell.font } : undefined,
      fill: cell.fill ? JSON.parse(JSON.stringify(cell.fill)) : undefined,
      border: cell.border ? JSON.parse(JSON.stringify(cell.border)) : undefined,
      alignment: cell.alignment ? { ...cell.alignment } : undefined,
      numFmt: cell.numFmt,
      protection: cell.protection ? { ...cell.protection } : undefined,
    });

    if (cell.dataValidation) {
      colValidations.set(colKey, cell.dataValidation);
    }
    if (cell.formula) {
      colFormulas.set(colKey, String(cell.formula));
    }
  });

  // Iterar e inyectar los datos fila por fila
  let currentRowIndex = dataStartRow;

  for (let i = 0; i < data.length; i++) {
    const caseRecord = data[i];
    const row = worksheet.getRow(currentRowIndex);

    // Si la fila del modelo tiene altura fija, replicarla
    if (modelRow.height) {
      row.height = modelRow.height;
    }

    // Llenar cada celda según el mapeo
    for (const [colLetter, fieldKey] of Object.entries(mapping)) {
      if (!fieldKey) continue;

      const cell = row.getCell(colLetter);
      const colKey = String(cell.col);
      const rawValue = caseRecord[fieldKey];

      // Aplicar estilos clonados de la fila modelo
      const style = colModelStyles.get(colKey);
      if (style) {
        if (style.font) cell.font = style.font;
        if (style.fill) cell.fill = style.fill;
        if (style.border) cell.border = style.border;
        if (style.alignment) cell.alignment = style.alignment;
        if (style.numFmt) cell.numFmt = style.numFmt;
        if (style.protection) cell.protection = style.protection;
      }

      // Replicar validación de datos
      const valRule = colValidations.get(colKey);
      if (valRule) {
        cell.dataValidation = valRule;

        // Validar si el valor pertenece a la lista desplegable
        if (valRule.type === "list" && Array.isArray(valRule.formulae) && valRule.formulae[0]) {
          const formulaStr = String(valRule.formulae[0]);
          if (formulaStr.startsWith('"') && formulaStr.endsWith('"')) {
            const allowed = formulaStr.slice(1, -1).split(",").map((s: string) => s.trim());
            const strVal = String(rawValue || "").trim();

            if (strVal) {
              const exactMatch = allowed.find(
                (opt: string) => opt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
                  strVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              );

              if (exactMatch) {
                // Normalizar al valor exacto de la lista
                cell.value = exactMatch;
              } else {
                cell.value = rawValue;
                warnings.push({
                  row: currentRowIndex,
                  column: colLetter,
                  header: String(worksheet.getRow(headerRowIndex).getCell(colLetter).value || colLetter),
                  value: rawValue,
                  message: `El valor "${strVal}" no coincide con las opciones de la lista desplegable de la plantilla.`,
                  allowedOptions: allowed,
                });
              }
            } else {
              cell.value = "";
            }
          } else {
            cell.value = rawValue ?? "";
          }
        } else {
          cell.value = rawValue ?? "";
        }
      } else {
        cell.value = rawValue ?? "";
      }

      // Si la columna tenía una fórmula en el modelo y no fue sobreescrita por un mapeo explícito
      const origFormula = colFormulas.get(colKey);
      if (origFormula && !mapping[colLetter]) {
        cell.value = {
          formula: adjustFormulaRow(origFormula, modelRowIndex, currentRowIndex),
          result: undefined,
        };
      }
    }

    row.commit();
    currentRowIndex++;
  }

  // Si estaba protegida originalmente, volver a proteger
  if (wasProtected) {
    try {
      worksheet.protect("", {
        selectLockedCells: true,
        selectUnlockedCells: true,
      });
    } catch {}
  }

  const outBuffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(outBuffer),
    warnings,
    recordsCount: data.length,
  };
}
