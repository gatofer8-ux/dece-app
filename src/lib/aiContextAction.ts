"use server";

import { requireRole, requireInstitutionId } from "./session";
import { runAiContextEngine, type AiContextEngineInput, type AiContextEngineResult } from "./aiContextEngine";
import { buildCaseContext } from "./caseContext";
import { db } from "./db";
import { isHeightenedConfidentiality } from "./aiPrivacy";

export interface ExecuteAiContextParams {
  caseId?: string;
  documentType?: string;
  section: string;
  sectionPurpose?: string;
  currentContent?: string;
  selectedText?: string;
  userInstruction?: string;
  relatedSections?: Record<string, string>;
  customContext?: string;
  institutionalRules?: string[];
}

/**
 * Server Action universal para ejecutar el AI_CONTEXT_ENGINE desde cualquier parte del software.
 */
export async function executeAiContextEngineAction(
  params: ExecuteAiContextParams
): Promise<AiContextEngineResult & { heightenedConfidentiality?: boolean }> {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DOCENTE"]);
  const institutionId = requireInstitutionId(session);

  let fullCaseContext = params.customContext || "";
  let isDelicate = false;

  if (params.caseId) {
    try {
      const caseFile = db
        .prepare("SELECT risk_type FROM case_files WHERE id = ? AND institution_id = ?")
        .get(params.caseId, institutionId) as { risk_type: string } | undefined;

      if (caseFile) {
        isDelicate = isHeightenedConfidentiality(caseFile.risk_type);
        const built = buildCaseContext(params.caseId, institutionId);
        if (built) {
          fullCaseContext = fullCaseContext ? `${fullCaseContext}\n\n${built}` : built;
        }
      }
    } catch {
      // Ignorar fallo de lectura de caso si no existe o no tiene permisos
    }
  }

  const engineInput: AiContextEngineInput = {
    documentType: params.documentType,
    section: params.section,
    sectionPurpose: params.sectionPurpose,
    currentContent: params.currentContent,
    selectedText: params.selectedText,
    userInstruction: params.userInstruction,
    caseContext: fullCaseContext,
    relatedSections: params.relatedSections,
    institutionalRules: params.institutionalRules,
  };

  const result = await runAiContextEngine(engineInput);

  return {
    ...result,
    heightenedConfidentiality: isDelicate,
  };
}
