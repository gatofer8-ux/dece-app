/**
 * Capa de persistencia local en el navegador utilizando IndexedDB nativo (HTML5).
 * Permite almacenar en el dispositivo del usuario:
 * 1. Estudiantes en caché para búsqueda inmediata sin conexión.
 * 2. Catálogos y configuración institucional.
 * 3. Cola de transacciones pendientes (Outbox) creadas mientras no había internet.
 */

const DB_NAME = "dece_offline_store_v1";
const DB_VERSION = 1;

export interface CachedStudent {
  id: string;
  full_name: string;
  document_type?: string;
  document_id?: string;
  course?: string;
  parallel?: string;
  jornada?: string;
  education_level?: string;
  bachillerato_specialty?: string;
  representative?: string;
  rep_phone?: string;
  rep_email?: string;
  medical_condition?: string;
  notes?: string;
}

export interface OutboxItem {
  id: string; // UUID de la transacción
  entityId: string; // UUID del registro que se crea
  action: "CREATE_STUDENT" | "CREATE_DAILY_ATTENTION" | "CREATE_INTERVIEW" | "CREATE_ALERT";
  payload: Record<string, any>;
  summary: string; // Resumen legible para la interfaz (ej. "Atención a Juan Pérez")
  createdAt: string;
  status: "pending" | "syncing" | "failed";
  errorMessage?: string;
}

export function isIndexedDbSupported(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      return reject(new Error("IndexedDB no está soportado en este navegador."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store para estudiantes precargados
      if (!db.objectStoreNames.contains("students")) {
        const studentStore = db.createObjectStore("students", { keyPath: "id" });
        studentStore.createIndex("full_name", "full_name", { unique: false });
        studentStore.createIndex("document_id", "document_id", { unique: false });
        studentStore.createIndex("course", "course", { unique: false });
      }

      // Store para catálogos y metadatos
      if (!db.objectStoreNames.contains("catalogues")) {
        db.createObjectStore("catalogues", { keyPath: "key" });
      }

      // Store para la cola de transacciones offline (Outbox)
      if (!db.objectStoreNames.contains("outbox")) {
        const outboxStore = db.createObjectStore("outbox", { keyPath: "id" });
        outboxStore.createIndex("status", "status", { unique: false });
        outboxStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Error abriendo IndexedDB."));
  });
}

/** Guarda los estudiantes descargados en la base local */
export async function saveCachedStudents(students: CachedStudent[]): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("students", "readwrite");
    const store = tx.objectStore("students");

    // Limpiar caché previo e insertar los nuevos
    store.clear();
    for (const student of students) {
      store.put(student);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Obtiene los estudiantes de la caché local con filtro opcional */
export async function getCachedStudents(query = ""): Promise<CachedStudent[]> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("students", "readonly");
    const store = tx.objectStore("students");
    const req = store.getAll();

    req.onsuccess = () => {
      let list: CachedStudent[] = req.result || [];
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        list = list.filter((s) => {
          return (
            (s.full_name && s.full_name.toLowerCase().includes(q)) ||
            (s.document_id && s.document_id.includes(q)) ||
            (s.course && s.course.toLowerCase().includes(q)) ||
            (s.representative && s.representative.toLowerCase().includes(q))
          );
        });
      }
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Guarda información de catálogos y metadatos */
export async function saveMetadata(key: string, data: any): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("catalogues", "readwrite");
    const store = tx.objectStore("catalogues");
    store.put({ key, data, updatedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMetadata<T = any>(key: string): Promise<T | null> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("catalogues", "readonly");
    const store = tx.objectStore("catalogues");
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.data ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** Agrega una operación a la cola Outbox */
export async function enqueueOutbox(item: {
  action: OutboxItem["action"];
  payload: Record<string, any>;
  summary: string;
  entityId?: string;
}): Promise<OutboxItem> {
  const db = await openOfflineDb();
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const entityId = item.entityId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : id);

  const outboxItem: OutboxItem = {
    id,
    entityId,
    action: item.action,
    payload: { ...item.payload, id: entityId },
    summary: item.summary,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    store.put(outboxItem);
    tx.oncomplete = () => {
      // Disparar evento personalizado para que la barra de navegación se actualice
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dece:outbox-updated"));
      }
      resolve(outboxItem);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Obtiene todos los elementos en la cola Outbox */
export async function getOutboxItems(): Promise<OutboxItem[]> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readonly");
    const store = tx.objectStore("outbox");
    const req = store.getAll();
    req.onsuccess = () => {
      const items: OutboxItem[] = req.result || [];
      // Ordenar por fecha descendente
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Elimina elementos ya sincronizados */
export async function removeOutboxItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dece:outbox-updated"));
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Actualiza el estado de un elemento en Outbox (ej. si falló) */
export async function updateOutboxItemStatus(id: string, status: OutboxItem["status"], errorMessage?: string): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    const req = store.get(id);

    req.onsuccess = () => {
      const item: OutboxItem | undefined = req.result;
      if (item) {
        item.status = status;
        if (errorMessage !== undefined) item.errorMessage = errorMessage;
        store.put(item);
      }
    };

    tx.oncomplete = () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dece:outbox-updated"));
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Obtiene el conteo rápido de pendientes */
export async function getPendingOutboxCount(): Promise<number> {
  try {
    const items = await getOutboxItems();
    return items.filter((i) => i.status === "pending" || i.status === "failed").length;
  } catch {
    return 0;
  }
}
