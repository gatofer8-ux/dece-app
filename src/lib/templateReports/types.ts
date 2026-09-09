export type TemplateFileType = "XLSX" | "XLS" | "DOCX";

export interface TemplateValidationRule {
  type: string;
  allowBlank?: boolean;
  options?: string[];
  formulae?: string[];
  prompt?: string;
  error?: string;
}

export interface TemplateColumnInfo {
  index: number;
  letter: string;
  header: string;
  sampleValue?: string;
  hasFormula: boolean;
  formula?: string;
  isMerged: boolean;
  isLocked: boolean;
  validation?: TemplateValidationRule;
}

export interface TemplateSheetInfo {
  id: number;
  name: string;
  rowCount: number;
  columnCount: number;
  headerRowIndex: number;
  dataStartRowIndex: number;
  columns: TemplateColumnInfo[];
  isProtected: boolean;
  hasPasswordProtection: boolean;
}

export interface TemplateInspectionResult {
  fileHash: string;
  fileName: string;
  fileType: TemplateFileType;
  sheets: TemplateSheetInfo[];
  suggestedSheetIndex: number;
  docxPlaceholders?: string[];
  docxTablesCount?: number;
}

export type DeceCategory = 
  | "ESTUDIANTE"
  | "CASO"
  | "VIOLENCIA"
  | "OBSERVACION"
  | "ATENCION"
  | "DERIVACION"
  | "INSTITUCIONAL"
  | "FECHAS";

export interface DeceFieldDefinition {
  key: string;
  label: string;
  category: DeceCategory;
  description: string;
  example: string;
  synonyms: string[];
}

export interface TemplateFieldMapping {
  [columnKey: string]: string; // ej: "A": "student.full_name", "B": "student.document_id"
}

export interface TemplateFilterOptions {
  riskTypes?: string[];
  statuses?: string[];
  priorities?: string[];
  educationLevels?: string[];
  courses?: string[];
  parallels?: string[];
  shifts?: string[];
  dateFrom?: string;
  dateTo?: string;
  assignedUserId?: string;
  searchQuery?: string;
}

export interface ValidationWarning {
  row: number;
  column: string;
  header: string;
  value: any;
  message: string;
  allowedOptions?: string[];
}

export interface TemplateGenerationPreview {
  totalCases: number;
  columns: { key: string; header: string; mappedTo?: string }[];
  rows: Record<string, any>[];
  warnings: ValidationWarning[];
}

export interface ReportTemplateRow {
  id: string;
  institution_id: string;
  name: string;
  file_type: TemplateFileType;
  file_hash: string;
  file_path: string;
  metadata_json: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplateMappingRow {
  id: string;
  template_hash: string;
  template_name: string;
  file_type: string;
  mapping_json: string;
  header_row_index: number;
  data_start_row: number;
  sheet_name?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportGenerationHistoryRow {
  id: string;
  institution_id: string;
  template_id?: string | null;
  template_name: string;
  file_type: string;
  filters_json: string;
  records_count: number;
  generated_by?: string | null;
  generated_at: string;
}
