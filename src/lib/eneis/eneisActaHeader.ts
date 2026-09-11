import { db } from "@/lib/db";
import type { InstitutionRow } from "@/lib/types";

/** Encabezado institucional del acta ENEIS ("DIRECCIÓN DISTRITAL ... / INSTITUCIÓN EDUCATIVA "..." / ACTA N° ..."). */
export function getEneisActaHeaderInfo(
  institution: Pick<InstitutionRow, "id" | "name" | "district_code" | "district">,
  actaId: string
): { districtLine: string; institutionName: string; actaNumero: string } {
  const rows = db
    .prepare("SELECT id FROM eneis_actas WHERE institution_id = ? ORDER BY created_at ASC")
    .all(institution.id) as { id: string }[];
  const idx = rows.findIndex((r) => r.id === actaId);
  const numero = idx >= 0 ? idx + 1 : rows.length + 1;
  const code = institution.district_code || institution.district || "";
  return {
    districtLine: code ? `DIRECCIÓN DISTRITAL ${code}` : "DIRECCIÓN DISTRITAL",
    institutionName: institution.name,
    actaNumero: String(numero).padStart(3, "0"),
  };
}
