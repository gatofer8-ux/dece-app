import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ARCHETYPE_MAP, ARCHETYPES } from "./archetypes";
import { BUILTIN_CATEGORY_CARDS, BUILTIN_DECK_KEYS, builtinCardUrl } from "./builtinDeck";
import {
  BASICA_ARCHETYPE_KEYS,
  INICIAL_ARCHETYPE_KEYS,
  INICIAL_MEANINGS,
  TAPAS_NIVELES,
  TAPAS_NIVEL_KEYS,
  archetypesForNivel,
  resolveInstrumentAndNivel,
  suggestNivelFromCourse,
} from "./niveles";
import {
  aggregateExperimento,
  aggregatePerfil,
  emptyExperimento,
  normalizeText,
  quadrantOf,
  sanitizeExperimento,
  sanitizePerfilData,
  scorePerfil,
  topFrequencies,
  validateExperimento,
  validatePerfil,
  type PerfilV1Data,
} from "./instruments";
import { aggregateArquetipos, scoreTapas } from "./tapasScoring";

const publicFile = (url: string) => path.join(process.cwd(), "public", url.replace(/^\//, ""));

describe("mazo incluido", () => {
  it("cada uno de los 74 arquetipos y las 3 categorías tienen su imagen en public/", () => {
    expect(BUILTIN_DECK_KEYS).toHaveLength(74);
    for (const key of BUILTIN_DECK_KEYS) expect(fs.existsSync(publicFile(builtinCardUrl(key))), key).toBe(true);
    for (const url of Object.values(BUILTIN_CATEGORY_CARDS)) expect(fs.existsSync(publicFile(url)), url).toBe(true);
  });
});

describe("niveles", () => {
  it("los subconjuntos usan claves reales y van de menos a más (Inicial ⊂ Básica ⊂ las 74)", () => {
    for (const k of BASICA_ARCHETYPE_KEYS) expect(ARCHETYPE_MAP[k], k).toBeDefined();
    expect(new Set(BASICA_ARCHETYPE_KEYS).size).toBe(BASICA_ARCHETYPE_KEYS.length);
    for (const k of INICIAL_ARCHETYPE_KEYS) expect(BASICA_ARCHETYPE_KEYS).toContain(k);
    expect(archetypesForNivel("INICIAL")).toHaveLength(16);
    expect(archetypesForNivel("BASICA")).toHaveLength(40);
    expect(archetypesForNivel("BACHILLERATO")).toHaveLength(ARCHETYPES.length);
  });

  it("Inicial tiene una frase sencilla para leer en voz alta por cada tarjeta", () => {
    for (const k of INICIAL_ARCHETYPE_KEYS) expect(INICIAL_MEANINGS[k], k).toBeTruthy();
  });

  it("los umbrales del juego caben en la cantidad de tarjetas de cada nivel", () => {
    for (const n of TAPAS_NIVEL_KEYS) {
      const cfg = TAPAS_NIVELES[n];
      expect(cfg.minIdentified).toBeLessThanOrEqual(archetypesForNivel(n).length);
      expect(cfg.minGroups).toBeLessThanOrEqual(cfg.maxGroups);
      expect(cfg.profile.min).toBeLessThanOrEqual(cfg.profile.max);
    }
  });

  it("valida combinaciones de herramienta y nivel (el experimento no va en Inicial)", () => {
    expect(resolveInstrumentAndNivel("EXPERIMENTO", "INICIAL").ok).toBe(false);
    expect(resolveInstrumentAndNivel("PERFIL_V2", "INICIAL").ok).toBe(false);
    expect(resolveInstrumentAndNivel("PERFIL_V1", "INICIAL")).toEqual({ ok: true, instrument: "PERFIL_V1", nivel: "INICIAL" });
    expect(resolveInstrumentAndNivel(undefined, undefined)).toEqual({ ok: true, instrument: "ARQUETIPOS", nivel: "BACHILLERATO" });
  });

  it("sugiere el nivel por el nombre del curso", () => {
    expect(suggestNivelFromCourse("Inicial 2")).toBe("INICIAL");
    expect(suggestNivelFromCourse("2º BGU")).toBe("BACHILLERATO");
    expect(suggestNivelFromCourse("8vo EGB")).toBe("BASICA");
    expect(suggestNivelFromCourse("")).toBeNull();
  });
});

describe("perfil de talentos", () => {
  const v1: PerfilV1Data = {
    version: 1,
    own: [
      { id: "a", text: "Dibujar", x: 0.8, y: 0.7 },
      { id: "b", text: "Matemática", x: -0.6, y: 0.5 },
      { id: "c", text: "Cantar", x: 0.4, y: -0.6 },
    ],
    other: [{ id: "d", text: "dibujar ", x: 0.5, y: 0.5 }],
    closing: "Descubrí que me gusta crear.",
  };

  it("ubica cada punto en su cuadrante (talento × gusto)", () => {
    expect(quadrantOf(0.5, 0.5)).toBe("BIEN_GUSTA");
    expect(quadrantOf(-0.5, 0.5)).toBe("BIEN_NOGUSTA");
    expect(quadrantOf(0.5, -0.5)).toBe("MAL_GUSTA");
    expect(quadrantOf(-0.5, -0.5)).toBe("MAL_NOGUSTA");
    expect(quadrantOf(null, 0.3)).toBeNull();
  });

  it("resume fortalezas, pasiones por desarrollar y coincidencias con la otra persona", () => {
    // En la app los datos siempre pasan por sanitizePerfilData antes de puntuar
    const r = scorePerfil(sanitizePerfilData(v1, 1));
    expect(r.strengths).toEqual(["Dibujar", "dibujar"]);
    expect(r.skillsWithoutPassion).toEqual(["Matemática"]);
    expect(r.toDevelop).toEqual(["Cantar"]);
    expect(r.coincidences).toEqual(["dibujar"]);
    expect(r.quadrantCounts.own).toEqual({ BIEN_GUSTA: 1, BIEN_NOGUSTA: 1, MAL_GUSTA: 1, MAL_NOGUSTA: 0 });
  });

  it("exige el mínimo del nivel y que todo esté ubicado; la perspectiva de otra persona es opcional", () => {
    expect(validatePerfil(v1, "BACHILLERATO")).toEqual([]);
    const sinUbicar = { ...v1, own: [...v1.own.slice(0, 2), { id: "c", text: "Cantar", x: null, y: null }] };
    expect(validatePerfil(sinUbicar, "BACHILLERATO").join(" ")).toMatch(/ubica/);
    expect(validatePerfil({ ...v1, own: v1.own.slice(0, 2) }, "BACHILLERATO").join(" ")).toMatch(/al menos 3/);
    expect(validatePerfil({ ...v1, own: v1.own.slice(0, 2) }, "BASICA")).toEqual([]);
    expect(validatePerfil({ ...v1, other: [] }, "BACHILLERATO")).toEqual([]);
  });

  it("limpia lo que llega del navegador: recorta textos, descarta vacíos y coordenadas fuera del plano", () => {
    const clean = sanitizePerfilData({ own: [{ id: "x", text: "  ", x: 0.1, y: 0.1 }, { id: "y", text: "Leer", x: 5, y: 0.2 }] }, 1);
    expect(clean.version).toBe(1);
    if (clean.version === 1) {
      expect(clean.own).toHaveLength(1);
      expect(clean.own[0]).toMatchObject({ text: "Leer", x: null, y: 0.2 });
    }
  });

  it("agrega el grupo: cuenta cuadrantes y talentos frecuentes sin importar tildes o mayúsculas", () => {
    const clean = sanitizePerfilData(v1, 1);
    const agg = aggregatePerfil([scorePerfil(clean), scorePerfil(clean)], 1);
    expect(agg.respondents).toBe(2);
    expect(agg.quadrants.own?.BIEN_GUSTA).toBe(2);
    expect(agg.strengths[0]).toEqual({ text: "Dibujar", count: 4 });
    expect(agg.coincidenceRate).toBe(100);
    expect(normalizeText("Canción!")).toBe("cancion");
    expect(topFrequencies(["Fútbol", "futbol", "Leer"])).toEqual([{ text: "Fútbol", count: 2 }, { text: "Leer", count: 1 }]);
  });
});

describe("experimento de talento", () => {
  const s1 = {
    ...emptyExperimento(),
    p1: ["Cocinar"],
    p2: "Cocinar recetas nuevas",
    p3: "¿Cocino por creatividad o por precisión?",
    p4: "Una receta nueva cada día",
    p5: ["Mi familia la prueba", "Anoto cómo me sentí", "Comparo con la receta"],
  };

  it("valida la sesión 1 (planificar) y la sesión 2 (evaluar) por separado", () => {
    expect(validateExperimento(s1, 1, "BACHILLERATO")).toEqual([]);
    expect(validateExperimento({ ...s1, p5: s1.p5.slice(0, 2) }, 1, "BACHILLERATO").join(" ")).toMatch(/al menos 3/);
    expect(validateExperimento({ ...s1, p5: s1.p5.slice(0, 2) }, 1, "BASICA")).toEqual([]);
    expect(validateExperimento(s1, 2, "BACHILLERATO").length).toBeGreaterThan(0);
    const s2 = { ...s1, sesion: 2 as const, p6: "Me dio energía", p7: [{ reto: "Medir", mejora: "Usar balanza" }], p8: "Soy creativo" };
    expect(validateExperimento(s2, 2, "BACHILLERATO")).toEqual([]);
  });

  it("limpia objetivos desconocidos y entradas vacías del registro diario", () => {
    const d = sanitizeExperimento({ ...s1, objetivos: ["PASION", "OTRO", "PASION"], diary: [{ date: "2026-11-20", note: "" }, { date: "2026-11-21", note: "Hice pan" }] });
    expect(d.objetivos).toEqual(["PASION"]);
    expect(d.diary).toEqual([{ date: "2026-11-21", note: "Hice pan" }]);
  });

  it("agrega el grupo: cuántos completaron cada sesión y qué talentos eligieron", () => {
    const s2 = { ...s1, sesion: 2 as const, p6: "Bien", p7: [{ reto: "Medir", mejora: "x" }], p8: "Aprendí" };
    const agg = aggregateExperimento([s1, s2], "BACHILLERATO");
    expect(agg.sesion1Completa).toBe(2);
    expect(agg.sesion2Completa).toBe(1);
    expect(agg.talentos[0]).toEqual({ text: "Cocinar recetas nuevas", count: 2 });
  });
});

describe("informe colectivo del juego de arquetipos", () => {
  it("cuenta bien la tarjeta «constructor» (nombre que coincide con una propiedad interna de JavaScript)", () => {
    // como llega de la base (JSON.parse): «constructor» es una clave propia del objeto
    const cls = JSON.parse('{"constructor":"SI","pintor":"SI"}') as Record<string, "SI" | "DUDA" | "NO">;
    const r = scoreTapas(cls, [{ name: "Construir", archetypes: ["constructor"] }]);
    const agg = aggregateArquetipos([r, r]);
    expect(agg.topArchetypes.find((t) => t.key === "constructor")).toMatchObject({ count: 2 });
    expect(Number.isFinite(agg.topArchetypes[0].count)).toBe(true);
  });

  it("suma familias, arquetipos más elegidos y verbos de los nombres de grupo", () => {
    const r1 = scoreTapas({ pintor: "SI", musico: "SI", medico: "NO" }, [{ name: "Crear arte", archetypes: ["pintor", "musico"] }]);
    const r2 = scoreTapas({ pintor: "SI", medico: "SI" }, [{ name: "crear cosas", archetypes: ["pintor"] }, { name: "Cuidar", archetypes: ["medico"] }]);
    const agg = aggregateArquetipos([r1, r2]);
    expect(agg.respondents).toBe(2);
    expect(agg.avgIdentified).toBe(2);
    expect(agg.topArchetypes[0]).toMatchObject({ key: "pintor", count: 2 });
    expect(agg.topVerbs[0]).toEqual({ text: "Crear", count: 2 });
  });
});
