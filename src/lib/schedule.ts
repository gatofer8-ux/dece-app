// Disponibilidad de horarios por profesional (ronda 20).
//
// Bloques fijos de 1 hora, día por día (sin plantilla semanal recurrente —
// decisión explícita del usuario). Cubre una jornada amplia (07:00 a 20:00)
// para dar cabida a instituciones con jornada matutina, vespertina y
// nocturna.

export const HOUR_SLOTS: string[] = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

/** Hora de fin de un bloque de 1 hora, para precargar el campo "hora fin" al confirmar una cita. */
export function endOfHourSlot(hour: string): string {
  const [h, m] = hour.split(":").map(Number);
  const endH = (h + 1) % 24;
  return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidHourSlot(hour: string | null | undefined): hour is string {
  return !!hour && HOUR_SLOTS.includes(hour);
}
