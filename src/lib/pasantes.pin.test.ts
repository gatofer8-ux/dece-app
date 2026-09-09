import { describe, it, expect, vi } from "vitest";

// El módulo pasantes.ts importa ./db, que abre una conexión SQLite real al
// cargarse. Lo sustituimos por un doble mínimo.
const run = vi.fn();
vi.mock("./db", () => ({
  db: { prepare: () => ({ run, get: () => undefined, all: () => [] }) },
}));

const { hashPin, verifyInternPin } = await import("./pasantes");

describe("PIN de pasantes", () => {
  it("hashPin produce un hash bcrypt, no el texto plano", () => {
    const h = hashPin("1234");
    expect(h).not.toBe("1234");
    expect(h.startsWith("$2")).toBe(true);
  });

  it("verifica un PIN correcto contra su hash", () => {
    const h = hashPin("4321");
    expect(verifyInternPin("i1", h, "4321")).toBe(true);
    expect(verifyInternPin("i1", h, "0000")).toBe(false);
  });

  it("acepta un valor heredado en texto plano y lo re-guarda hasheado", () => {
    run.mockClear();
    expect(verifyInternPin("i2", "1234", "1234")).toBe(true);
    expect(run).toHaveBeenCalledOnce(); // upgrade oportunista
    expect(verifyInternPin("i2", "1234", "9999")).toBe(false);
  });

  it("un pin_code nulo significa 'sin PIN' y no bloquea", () => {
    expect(verifyInternPin("i3", null, "")).toBe(true);
  });
});
