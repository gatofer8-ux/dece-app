import { describe, it, expect } from "vitest";
import { WORKSHOPS_DATABASE, getWorkshopById } from "./talleresData";
import { generateWorkshopMaterialDocx } from "./workshopMaterialsDocx";

describe("Módulo de Talleres y Guiones Metodológicos (SADEX)", () => {
  it("debe contener los 4 talleres oficiales estructurados", () => {
    expect(WORKSHOPS_DATABASE.length).toBe(4);

    const ids = WORKSHOPS_DATABASE.map((w) => w.id);
    expect(ids).toContain("prevencion-suicidio");
    expect(ids).toContain("primeros-auxilios-psicologicos");
    expect(ids).toContain("autoestima-ninos-10-anos");
    expect(ids).toContain("formacion-profesionales-dece");
  });

  it("cada taller debe poseer fases con guiones de facilitación y tiempos válidos", () => {
    for (const w of WORKSHOPS_DATABASE) {
      expect(w.phases.length).toBeGreaterThan(0);
      for (const p of w.phases) {
        expect(p.durationMinutes).toBeGreaterThan(0);
        expect(p.title.trim().length).toBeGreaterThan(0);
        expect(p.facilitatorScript.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("getWorkshopById debe encontrar talleres por id y por slug", () => {
    const w1 = getWorkshopById("prevencion-suicidio");
    expect(w1).toBeDefined();
    expect(w1?.title).toContain("Suicidio");

    const w2 = getWorkshopById("primeros-auxilios-psicologicos");
    expect(w2).toBeDefined();
    expect(w2?.title).toContain("Primeros Auxilios");

    const wNone = getWorkshopById("id-inexistente");
    expect(wNone).toBeUndefined();
  });

  it("debe generar documentos Word (.docx) válidos para todos los materiales prácticos y recortables", async () => {
    const materials = [
      { wId: "prevencion-suicidio", mId: "casos-simulacion-suicidio" },
      { wId: "prevencion-suicidio", mId: "guia-senales-alerta-mitos" },
      { wId: "primeros-auxilios-psicologicos", mId: "guia-bolsillo-pap-docentes" },
      { wId: "primeros-auxilios-psicologicos", mId: "tarjetas-grounding-respiracion" },
      { wId: "autoestima-ninos-10-anos", mId: "ficha-flor-fortalezas" },
      { wId: "autoestima-ninos-10-anos", mId: "tarjetas-afirmaciones-positivas" },
      { wId: "formacion-profesionales-dece", mId: "matriz-analisis-contexto-dece" },
    ];

    for (const { wId, mId } of materials) {
      const res = await generateWorkshopMaterialDocx(wId, mId, "Unidad Educativa Modelo");
      expect(res).not.toBeNull();
      expect(res?.buffer).toBeDefined();
      expect(res!.buffer.length).toBeGreaterThan(1000);
      // Cabecera ZIP de archivo docx (PK..)
      expect(res!.buffer[0]).toBe(0x50);
      expect(res!.buffer[1]).toBe(0x4b);
      expect(res?.fileName.endsWith(".docx")).toBe(true);
    }
  });

  it("debe rechazar la descarga de guiones o IDs inválidos para proteger la propiedad intelectual", async () => {
    const resGuion = await generateWorkshopMaterialDocx("prevencion-suicidio", "guion-completo");
    expect(resGuion).toBeNull();

    const resUnknown = await generateWorkshopMaterialDocx("prevencion-suicidio", "material-fantasma");
    expect(resUnknown).toBeNull();
  });
});
