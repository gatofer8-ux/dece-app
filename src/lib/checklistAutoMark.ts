import { db } from "./db";

/**
 * Marca automáticamente en "SÍ" los ítems del checklist de un caso que
 * correspondan a un documento que el propio sistema acaba de generar
 * (ficha de derivación, acta, informe, plan, consentimiento…).
 *
 * `keywords` son fragmentos que deben aparecer TODOS en el texto del ítem
 * (sin distinguir mayúsculas/acentos). Solo marca ítems que aún no estén en
 * "SÍ" y deja constancia en las observaciones.
 */
export function autoMarkChecklistItems(caseId: string, keywords: string[], sourceLabel: string): void {
  if (!keywords.length) return;

  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  const needles = keywords.map(norm).filter(Boolean);

  let items: { id: string; item_text: string; status: string | null; observations: string | null }[];
  try {
    items = db
      .prepare("SELECT id, item_text, status, observations FROM case_checklist_items WHERE case_file_id = ?")
      .all(caseId) as typeof items;
  } catch {
    return;
  }

  const update = db.prepare(
    "UPDATE case_checklist_items SET status = 'SI', observations = ?, updated_at = datetime('now') WHERE id = ? AND (status IS NULL OR status <> 'SI')"
  );
  const stamp = `Generado en el sistema (${sourceLabel}) el ${new Date().toISOString().slice(0, 10)}.`;

  for (const it of items) {
    if (it.status === "SI") continue;
    const hay = norm(it.item_text);
    if (needles.every((n) => hay.includes(n))) {
      const obs = it.observations && it.observations.trim() ? `${it.observations.trim()} — ${stamp}` : stamp;
      update.run(obs, it.id);
    }
  }
}
