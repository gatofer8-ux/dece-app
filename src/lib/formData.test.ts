import { describe, it, expect } from "vitest";
import { z } from "zod";
import { str, requireStr, int, num, bool, getAllStr, dateStr, parseForm } from "./formData";

function fd(entries: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(k, x));
    else f.append(k, v);
  }
  return f;
}

describe("helpers de FormData", () => {
  it("str recorta y devuelve null para vacío", () => {
    expect(str(fd({ a: "  hola  " }), "a")).toBe("hola");
    expect(str(fd({ a: "   " }), "a")).toBeNull();
    expect(str(fd({}), "a")).toBeNull();
  });

  it("requireStr lanza si falta", () => {
    expect(() => requireStr(fd({}), "nombre")).toThrow(/nombre/);
  });

  it("int y num parsean o devuelven null", () => {
    expect(int(fd({ n: "42" }), "n")).toBe(42);
    expect(int(fd({ n: "abc" }), "n")).toBeNull();
    expect(num(fd({ n: "3.14" }), "n")).toBeCloseTo(3.14);
  });

  it("bool reconoce varias formas afirmativas", () => {
    for (const v of ["on", "true", "1", "si", "sí"]) {
      expect(bool(fd({ c: v }), "c")).toBe(true);
    }
    expect(bool(fd({ c: "no" }), "c")).toBe(false);
    expect(bool(fd({}), "c")).toBe(false);
  });

  it("getAllStr descarta valores vacíos", () => {
    expect(getAllStr(fd({ x: ["a", "", "b", "  "] }), "x")).toEqual(["a", "b"]);
  });

  it("dateStr valida el formato ISO", () => {
    expect(dateStr(fd({ d: "2026-01-15" }), "d")).toBe("2026-01-15");
    expect(dateStr(fd({ d: "15/01/2026" }), "d")).toBeNull();
  });

  it("parseForm valida contra un esquema Zod y colapsa claves repetidas", () => {
    const schema = z.object({
      nombre: z.string().min(1),
      edad: z.coerce.number().int().positive(),
      etiquetas: z.array(z.string()),
    });
    const parsed = parseForm(fd({ nombre: "Ana", edad: "12", etiquetas: ["a", "b"] }), schema);
    expect(parsed).toEqual({ nombre: "Ana", edad: 12, etiquetas: ["a", "b"] });
  });

  it("parseForm lanza un error legible cuando falla la validación", () => {
    const schema = z.object({ nombre: z.string().min(3, "muy corto") });
    expect(() => parseForm(fd({ nombre: "x" }), schema)).toThrow(/nombre: muy corto/);
  });
});
