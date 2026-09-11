/**
 * Funciones puras del cronograma de citas OVP (sin acceso a base de datos),
 * para poder importarlas también desde componentes cliente (ej. la vista
 * previa en vivo del formulario de creación).
 */

export interface RosterStudentLite {
  id: string;
  full_name: string;
  document_id: string | null;
  course: string | null;
  parallel: string | null;
}

export interface ScheduleEntry {
  parallel: string;
  position: number; // 1-indexed dentro de su paralelo
  student_id: string;
  full_name: string;
  document_id: string | null;
  time: string; // HH:MM
}

/** Suma minutos a una hora "HH:MM" y devuelve "HH:MM" (formato 24h, sin cruzar a otro día). */
export function addMinutes(hhmm: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  const h0 = m ? parseInt(m[1], 10) : 7;
  const mi0 = m ? parseInt(m[2], 10) : 0;
  const total = h0 * 60 + mi0 + minutes;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const mi = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

/**
 * Genera el cronograma: agenda cada paralelo seguido del anterior (el reloj
 * no se reinicia entre paralelos), asignando `studentsPerSlot` estudiantes a
 * cada franja de `slotMinutes` minutos, en el orden de la lista recibida.
 */
export function buildScheduleEntries(
  rosterByParallel: { parallel: string; students: RosterStudentLite[] }[],
  opts: { startTime: string; slotMinutes: number; studentsPerSlot: number }
): ScheduleEntry[] {
  const slotMinutes = Math.max(1, opts.slotMinutes || 10);
  const perSlot = Math.max(1, opts.studentsPerSlot || 3);
  const entries: ScheduleEntry[] = [];
  let cursor = opts.startTime || "07:00";
  let countInSlot = 0;

  for (const group of rosterByParallel) {
    group.students.forEach((s, idx) => {
      entries.push({
        parallel: group.parallel,
        position: idx + 1,
        student_id: s.id,
        full_name: s.full_name,
        document_id: s.document_id,
        time: cursor,
      });
      countInSlot += 1;
      if (countInSlot >= perSlot) {
        cursor = addMinutes(cursor, slotMinutes);
        countInSlot = 0;
      }
    });
  }

  return entries;
}

export function parseEntries(entriesJson: string): ScheduleEntry[] {
  try {
    const arr = JSON.parse(entriesJson);
    return Array.isArray(arr) ? (arr as ScheduleEntry[]) : [];
  } catch {
    return [];
  }
}

export function parseParallels(parallelsJson: string): string[] {
  try {
    const arr = JSON.parse(parallelsJson);
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

/** Agrupa las entradas del cronograma por paralelo, preservando el orden original. */
export function groupEntriesByParallel(entries: ScheduleEntry[]): { parallel: string; entries: ScheduleEntry[] }[] {
  const order: string[] = [];
  const map = new Map<string, ScheduleEntry[]>();
  for (const e of entries) {
    if (!map.has(e.parallel)) {
      map.set(e.parallel, []);
      order.push(e.parallel);
    }
    map.get(e.parallel)!.push(e);
  }
  return order.map((p) => ({ parallel: p, entries: map.get(p)! }));
}
