import type { InstitutionRow } from "@/lib/types";

/**
 * Pie de página oficial de documentos.
 * Retorna null para mantener los documentos limpios sin leyendas sobre el sistema
 * conforme a los requerimientos oficiales del DECE.
 */
export default function DocumentFooter({
  institution,
  confidentialNotice = false,
}: {
  institution?: InstitutionRow | null;
  confidentialNotice?: boolean;
}) {
  return null;
}

