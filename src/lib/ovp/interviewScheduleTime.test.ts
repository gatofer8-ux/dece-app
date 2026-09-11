import { describe, it, expect } from "vitest";
import { addMinutes, buildScheduleEntries, groupEntriesByParallel, type RosterStudentLite } from "./interviewScheduleTime";

function makeStudents(names: string[]): RosterStudentLite[] {
  return names.map((n, i) => ({ id: `s${i}`, full_name: n, document_id: `000${i}`, course: "10mo EGB", parallel: "A" }));
}

describe("addMinutes", () => {
  it("suma minutos dentro de la misma hora", () => {
    expect(addMinutes("07:10", 10)).toBe("07:20");
  });
  it("cruza la hora", () => {
    expect(addMinutes("07:50", 10)).toBe("08:00");
  });
  it("cruza medianoche (24h)", () => {
    expect(addMinutes("23:50", 20)).toBe("00:10");
  });
});

describe("buildScheduleEntries", () => {
  it("asigna 3 estudiantes por turno de 10 min, como en el cronograma modelo", () => {
    // 8 estudiantes -> turnos de 3, 3, 2 -> 3 horas distintas
    const roster = [{ parallel: "A", students: makeStudents(["Ana", "Beatriz", "Carla", "Diego", "Elena", "Fabián", "Gina", "Hugo"]) }];
    const entries = buildScheduleEntries(roster, { startTime: "07:10", slotMinutes: 10, studentsPerSlot: 3 });

    expect(entries.map((e) => e.time)).toEqual([
      "07:10", "07:10", "07:10",
      "07:20", "07:20", "07:20",
      "07:30", "07:30",
    ]);
    expect(entries.map((e) => e.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("agenda los paralelos seguidos: el segundo continúa donde terminó el reloj del primero", () => {
    const rosterA = { parallel: "A", students: makeStudents(["Ana", "Beatriz", "Carla"]) };
    const rosterB = { parallel: "B", students: makeStudents(["Diego", "Elena", "Fabián"]) };
    const entries = buildScheduleEntries([rosterA, rosterB], { startTime: "07:10", slotMinutes: 10, studentsPerSlot: 3 });

    const byParallel = groupEntriesByParallel(entries);
    expect(byParallel).toHaveLength(2);
    expect(byParallel[0].entries.every((e) => e.time === "07:10")).toBe(true);
    // El paralelo B empieza en el turno siguiente (07:20), no se reinicia a 07:10.
    expect(byParallel[1].entries.every((e) => e.time === "07:20")).toBe(true);
  });

  it("respeta una duración y un tamaño de turno configurados manualmente (ej. 15 min, 2 estudiantes)", () => {
    const roster = [{ parallel: "A", students: makeStudents(["Ana", "Beatriz", "Carla", "Diego"]) }];
    const entries = buildScheduleEntries(roster, { startTime: "08:00", slotMinutes: 15, studentsPerSlot: 2 });
    expect(entries.map((e) => e.time)).toEqual(["08:00", "08:00", "08:15", "08:15"]);
  });
});
