import { describe, it, expect } from "vitest";
import { findRelevantExcerpt } from "./eneisMaterialesContent";
import { ENEIS_MATERIALES } from "./eneisMaterialesCatalog";

describe("findRelevantExcerpt", () => {
  it("encuentra contenido real y páginas reales en cada material del catálogo", () => {
    for (const material of ENEIS_MATERIALES) {
      const { excerpt, pages } = findRelevantExcerpt(material.id, "sexualidad educacion", 4000);
      expect(excerpt.length).toBeGreaterThan(0);
      expect(pages.length).toBeGreaterThan(0);
      // Las páginas citadas deben aparecer literalmente marcadas en el fragmento devuelto.
      for (const p of pages) {
        expect(excerpt).toContain(`[PÁGINA ${p}]`);
      }
    }
  });

  it("no revienta y devuelve algo razonable con una consulta vacía", () => {
    const { excerpt, pages } = findRelevantExcerpt("rurankapak", "", 2000);
    expect(excerpt.length).toBeGreaterThan(0);
    expect(pages.length).toBeGreaterThan(0);
  });

  it("devuelve vacío para un material que no existe", () => {
    const { excerpt, pages } = findRelevantExcerpt("libro_inexistente", "sexualidad", 2000);
    expect(excerpt).toBe("");
    expect(pages).toEqual([]);
  });

  it("respeta el límite de caracteres pedido", () => {
    const { excerpt } = findRelevantExcerpt("oportunidades_1", "sexualidad genero derechos", 500);
    expect(excerpt.length).toBeLessThanOrEqual(600); // algo de margen por el marcador de página
  });
});
