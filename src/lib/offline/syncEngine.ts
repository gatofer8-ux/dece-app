import {
  getOutboxItems,
  removeOutboxItems,
  updateOutboxItemStatus,
  saveCachedStudents,
  saveMetadata,
  type OutboxItem,
} from "./db";

export interface SyncResult {
  success: boolean;
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Ejecuta la sincronización de la cola Outbox con el servidor central.
 */
export async function syncOutboxToServer(): Promise<SyncResult> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return {
      success: false,
      total: 0,
      synced: 0,
      failed: 0,
      errors: ["Dispositivo sin conexión a internet."],
    };
  }

  const items = await getOutboxItems();
  const pendingItems = items.filter((i) => i.status === "pending" || i.status === "failed");

  if (pendingItems.length === 0) {
    return { success: true, total: 0, synced: 0, failed: 0, errors: [] };
  }

  // Marcar como en proceso
  for (const item of pendingItems) {
    await updateOutboxItemStatus(item.id, "syncing");
  }

  try {
    const payloadItems = pendingItems.map((i) => ({
      id: i.id,
      entityId: i.entityId,
      action: i.action,
      payload: i.payload,
      clientTimestamp: i.createdAt,
    }));

    const res = await fetch("/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payloadItems }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error || `Error del servidor (${res.status})`;
      for (const item of pendingItems) {
        await updateOutboxItemStatus(item.id, "failed", msg);
      }
      return { success: false, total: pendingItems.length, synced: 0, failed: pendingItems.length, errors: [msg] };
    }

    const data = await res.json();
    const results: Array<{ id: string; status: "synced" | "failed"; error?: string }> = data.results || [];

    const syncedIds: string[] = [];
    const errors: string[] = [];

    for (const r of results) {
      if (r.status === "synced") {
        syncedIds.push(r.id);
      } else {
        errors.push(r.error || `Error en registro ${r.id}`);
        await updateOutboxItemStatus(r.id, "failed", r.error);
      }
    }

    // Purgar de IndexedDB los items que ya se consolidaron en el servidor
    if (syncedIds.length > 0) {
      await removeOutboxItems(syncedIds);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dece:sync-completed", {
          detail: { syncedCount: syncedIds.length, failedCount: errors.length },
        })
      );
    }

    return {
      success: errors.length === 0,
      total: pendingItems.length,
      synced: syncedIds.length,
      failed: errors.length,
      errors,
    };
  } catch (err: any) {
    const errorMsg = err?.message || "Error de red durante la sincronización.";
    for (const item of pendingItems) {
      await updateOutboxItemStatus(item.id, "failed", errorMsg);
    }
    return {
      success: false,
      total: pendingItems.length,
      synced: 0,
      failed: pendingItems.length,
      errors: [errorMsg],
    };
  }
}

/**
 * Descarga y guarda en IndexedDB los estudiantes y catálogos de la institución
 * para que estén disponibles cuando el profesional salga a zonas sin señal.
 */
export async function preloadInstitutionData(): Promise<{ studentCount: number; timestamp: string }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    throw new Error("Se requiere conexión a internet para precargar los datos.");
  }

  const res = await fetch("/api/sync/preload");
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || `Error al precargar datos (${res.status})`);
  }

  const data = await res.json();

  if (Array.isArray(data.students)) {
    await saveCachedStudents(data.students);
  }

  if (data.catalogues) {
    await saveMetadata("catalogues", data.catalogues);
  }
  if (data.schoolYears) {
    await saveMetadata("schoolYears", data.schoolYears);
  }
  if (data.institution) {
    await saveMetadata("institution", data.institution);
  }
  if (data.user) {
    await saveMetadata("user", data.user);
  }
  await saveMetadata("lastPreloadTimestamp", data.timestamp);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("dece:preload-completed", {
        detail: { studentCount: data.students.length, timestamp: data.timestamp },
      })
    );
  }

  return {
    studentCount: data.students.length,
    timestamp: data.timestamp,
  };
}
