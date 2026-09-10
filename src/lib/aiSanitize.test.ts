import { describe, it, expect } from "vitest";
import { sanitizeAiText } from "./ai";

describe("sanitizeAiText", () => {
  it("elimina formato Markdown (negritas, cursivas, encabezados y backticks)", () => {
    const raw = "### Título Principal\n\nEste es un texto con **negrita**, *cursiva* y `código`.";
    const clean = sanitizeAiText(raw);
    expect(clean).not.toContain("###");
    expect(clean).not.toContain("**");
    expect(clean).not.toContain("`");
    expect(clean).toBe("Título Principal\n\nEste es un texto con negrita, cursiva y código.");
  });

  it("normaliza viñetas con símbolos a lista numerada limpia", () => {
    const raw = "Acciones a realizar:\n• Primera acción de apoyo\n• Segunda acción coordinada\n- Tercera acción con docente";
    const clean = sanitizeAiText(raw);
    expect(clean).toContain("1. Primera acción de apoyo");
    expect(clean).toContain("2. Segunda acción coordinada");
    expect(clean).toContain("3. Tercera acción con docente");
    expect(clean).not.toContain("•");
  });

  it("colapsa saltos de línea excesivos a máximo dos", () => {
    const raw = "Párrafo 1\n\n\n\n\nPárrafo 2\n\n\n\nPárrafo 3";
    const clean = sanitizeAiText(raw);
    expect(clean).toBe("Párrafo 1\n\nPárrafo 2\n\nPárrafo 3");
  });

  it("hace trim de espacios al inicio y final", () => {
    const raw = "   \n\nTexto limpio   \n\n   ";
    const clean = sanitizeAiText(raw);
    expect(clean).toBe("Texto limpio");
  });

  it("maneja valores vacíos, null y undefined sin fallar", () => {
    expect(sanitizeAiText("")).toBe("");
    expect(sanitizeAiText(null as any)).toBe("");
    expect(sanitizeAiText(undefined as any)).toBe("");
  });
});
