import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { matchDeceField, DECE_FIELDS_CATALOG } from "./deceFieldsCatalog";
import {
  TemplateColumnInfo,
  TemplateFieldMapping,
  ReportTemplateMappingRow,
} from "./types";

/**
 * Genera un mapeo inicial sugerido para una lista de columnas detectadas.
 */
export function generateAutoMapping(columns: TemplateColumnInfo[]): TemplateFieldMapping {
  const mapping: TemplateFieldMapping = {};

  for (const col of columns) {
    const matched = matchDeceField(col.header);
    if (matched) {
      mapping[col.letter] = matched.key;
    }
  }

  return mapping;
}

/**
 * Busca si ya existe un mapeo guardado en la base de datos para el hash de la plantilla.
 */
export function getSavedMappingByHash(fileHash: string): ReportTemplateMappingRow | undefined {
  return db
    .prepare("SELECT * FROM report_template_mappings WHERE template_hash = ?")
    .get(fileHash) as ReportTemplateMappingRow | undefined;
}

/**
 * Guarda o actualiza el mapeo asociado al hash de la plantilla.
 */
export function saveTemplateMapping(opts: {
  templateHash: string;
  templateName: string;
  fileType: string;
  mapping: TemplateFieldMapping;
  headerRowIndex?: number;
  dataStartRow?: number;
  sheetName?: string;
  userId?: string;
}): void {
  const {
    templateHash,
    templateName,
    fileType,
    mapping,
    headerRowIndex = 1,
    dataStartRow = 2,
    sheetName = "",
    userId,
  } = opts;

  const existing = getSavedMappingByHash(templateHash);

  if (existing) {
    db.prepare(`
      UPDATE report_template_mappings SET
        template_name = @template_name,
        mapping_json = @mapping_json,
        header_row_index = @header_row_index,
        data_start_row = @data_start_row,
        sheet_name = @sheet_name,
        updated_at = datetime('now')
      WHERE template_hash = @template_hash
    `).run({
      template_hash: templateHash,
      template_name: templateName,
      mapping_json: JSON.stringify(mapping),
      header_row_index: headerRowIndex,
      data_start_row: dataStartRow,
      sheet_name: sheetName,
    });
  } else {
    db.prepare(`
      INSERT INTO report_template_mappings
        (id, template_hash, template_name, file_type, mapping_json, header_row_index, data_start_row, sheet_name, created_by)
      VALUES
        (@id, @template_hash, @template_name, @file_type, @mapping_json, @header_row_index, @data_start_row, @sheet_name, @created_by)
    `).run({
      id: randomUUID(),
      template_hash: templateHash,
      template_name: templateName,
      file_type: fileType,
      mapping_json: JSON.stringify(mapping),
      header_row_index: headerRowIndex,
      data_start_row: dataStartRow,
      sheet_name: sheetName,
      created_by: userId || null,
    });
  }
}
