"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { importTapasDeckFromPdf, clearTapasDeck, type DeckImportResult } from "@/lib/tapas/importDeck";

const MAX_PDF = 40 * 1024 * 1024; // 40 MB

export async function uploadTapasDeck(
  formData: FormData
): Promise<{ ok: true; result: DeckImportResult } | { ok: false; error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const file = formData.get("deck") as File | null;
  const note = (formData.get("source_note") as string)?.trim() || "";
  if (!file || file.size === 0) return { ok: false, error: "Selecciona el archivo PDF de las cartillas." };
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, error: "El archivo debe ser un PDF." };
  }
  if (file.size > MAX_PDF) return { ok: false, error: "El PDF supera el tamaño máximo permitido (40 MB)." };

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await importTapasDeckFromPdf(buf, institutionId, session.user.id, note);
    logAudit({ userId: session.user.id, action: "CARGAR", entityType: "TapasCardDeck", entityId: institutionId, institutionId });
    revalidatePath("/tapas/cartillas");
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo procesar el PDF." };
  }
}

export async function removeTapasDeck() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  clearTapasDeck(institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "TapasCardDeck", entityId: institutionId, institutionId });
  revalidatePath("/tapas/cartillas");
}
