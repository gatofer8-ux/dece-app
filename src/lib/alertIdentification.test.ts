import { describe, it, expect } from "vitest";
import { parseAttendees, defaultObservaciones, mergeAttendeesWithReportingTeachers } from "./alertIdentification";

describe("alertIdentification (puro)", () => {
  it("defaultObservaciones interpola el año lectivo", () => {
    expect(defaultObservaciones("2026-2027")).toBe(
      "Los docentes miembros de la junta de grado/curso conocen los casos de vulnerabilidad atendidos por el DECE durante el año lectivo 2026-2027."
    );
  });

  it("parseAttendees devuelve arreglo vacío para JSON inválido o nulo", () => {
    expect(parseAttendees(null)).toEqual([]);
    expect(parseAttendees("no-json")).toEqual([]);
    expect(parseAttendees(JSON.stringify([{ nombre: "Ana", telefono: "099" }]))).toEqual([{ nombre: "Ana", telefono: "099" }]);
  });
});

describe("mergeAttendeesWithReportingTeachers", () => {
  it("agrega a los docentes que reportaron un estudiante como asistentes", () => {
    const attendees = [{ nombre: "Directora", telefono: "0999999999" }];
    const entries = [{ teacher_name: "Prof. Ana Pérez" }, { teacher_name: "Prof. Luis Vera" }];
    const merged = mergeAttendeesWithReportingTeachers(attendees, entries);
    expect(merged).toEqual([
      { nombre: "Directora", telefono: "0999999999" },
      { nombre: "Prof. Ana Pérez", telefono: "" },
      { nombre: "Prof. Luis Vera", telefono: "" },
    ]);
  });

  it("no duplica un docente ya agregado manualmente (sin distinguir mayúsculas ni espacios)", () => {
    const attendees = [{ nombre: "  Prof. Ana Pérez ", telefono: "0999999999" }];
    const entries = [{ teacher_name: "prof. ana pérez" }, { teacher_name: "Prof. Luis Vera" }];
    const merged = mergeAttendeesWithReportingTeachers(attendees, entries);
    expect(merged).toEqual([
      { nombre: "  Prof. Ana Pérez ", telefono: "0999999999" },
      { nombre: "Prof. Luis Vera", telefono: "" },
    ]);
  });

  it("no duplica entre docentes repetidos en las entradas ni agrega nombres vacíos", () => {
    const merged = mergeAttendeesWithReportingTeachers([], [{ teacher_name: "Prof. Ana" }, { teacher_name: "Prof. Ana" }, { teacher_name: "  " }]);
    expect(merged).toEqual([{ nombre: "Prof. Ana", telefono: "" }]);
  });
});
