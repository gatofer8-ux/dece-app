import { DECE_QUALITY_STANDARDS } from "./actionPlan";
import { ACTIVITY_AXIS_STANDARDS, DOCUMENT_STANDARDS, type DocumentKind } from "./documentStandards";

// Aparte de documentStandards.ts para que el catálogo completo (actionPlan.ts)
// no entre al bundle de los componentes cliente que solo imprimen el membrete.

/** Código base de un estándar del catálogo ("E.D3.C1.DE12.c" -> "E.D3.C1.DE12"). */
export function baseStandardCode(catalogCode: string): string {
  const m = catalogCode.match(/^E\.D\d\.C\d\.DE\d+/);
  return m ? m[0] : catalogCode;
}

/** Auditoría de cobertura: por cada estándar del catálogo, qué documentos lo evidencian. */
export function auditStandardCoverage(): {
  code: string;
  name: string;
  documents: DocumentKind[];
  viaActivityAxis: boolean;
}[] {
  const entries = Object.entries(DOCUMENT_STANDARDS) as [DocumentKind, readonly string[]][];
  const axisCodes = Object.values(ACTIVITY_AXIS_STANDARDS).flat();
  return DECE_QUALITY_STANDARDS.map((std) => {
    const base = baseStandardCode(std.code);
    return {
      code: base,
      name: std.name,
      documents: entries.filter(([, codes]) => codes.includes(base)).map(([kind]) => kind),
      viaActivityAxis: axisCodes.includes(base),
    };
  });
}
