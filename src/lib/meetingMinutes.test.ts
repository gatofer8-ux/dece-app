import { describe, it, expect } from "vitest";
import { parseAttendees, parseAgenda, parseSignatories } from "./meetingMinutes";

describe("parseAttendees", () => {
  it("lee el campo actual telefono", () => {
    const json = JSON.stringify([{ nombre: "Ana Pérez", telefono: "0999999999" }]);
    expect(parseAttendees(json)).toEqual([{ nombre: "Ana Pérez", telefono: "0999999999" }]);
  });

  it("usa el campo antiguo correo como respaldo de telefono (actas guardadas antes del cambio)", () => {
    const json = JSON.stringify([{ nombre: "Ana Pérez", correo: "ana@educacion.gob.ec", cargo: "Rectora" }]);
    expect(parseAttendees(json)).toEqual([{ nombre: "Ana Pérez", telefono: "ana@educacion.gob.ec" }]);
  });

  it("devuelve arreglo vacío para JSON inválido o nulo", () => {
    expect(parseAttendees(null)).toEqual([]);
    expect(parseAttendees("no-json")).toEqual([]);
  });
});

describe("parseAgenda / parseSignatories (compatibilidad con actas antiguas)", () => {
  it("siguen leyendo compromisos y firmantes guardados antes del cambio", () => {
    const agendaJson = JSON.stringify([{ tema: "T", compromiso: "C", responsable: "R", fecha_plazo: "2026-01-01" }]);
    expect(parseAgenda(agendaJson)).toEqual([{ tema: "T", compromiso: "C", responsable: "R", fecha_plazo: "2026-01-01" }]);
    expect(parseSignatories(JSON.stringify([{ nombre: "Ana" }]))).toEqual([{ nombre: "Ana" }]);
  });
});
