import { describe, it, expect } from "vitest";
import { WORKSHOPS_DATABASE, getWorkshopById } from "./talleresData";
import { generateWorkshopMaterialDocx } from "./workshopMaterialsDocx";

describe("Módulo de Talleres y Guiones Metodológicos (SADEX)", () => {
  it("debe contener los 12 talleres oficiales estructurados (2023-2024 y 2024-2025)", () => {
    expect(WORKSHOPS_DATABASE.length).toBe(12);

    const ids = WORKSHOPS_DATABASE.map((w) => w.id);
    expect(ids).toContain("prevencion-suicidio");
    expect(ids).toContain("primeros-auxilios-psicologicos");
    expect(ids).toContain("autoestima-ninos-10-anos");
    expect(ids).toContain("formacion-profesionales-dece");
    expect(ids).toContain("estilos-crianza-corresponsabilidad");
    expect(ids).toContain("ovp-triatlon-academico");
    expect(ids).toContain("autoproteccion-infantil-4-anos");
    expect(ids).toContain("riesgos-psicosociales-epilepsia");
    expect(ids).toContain("discriminacion-racismo-interculturalidad");
    expect(ids).toContain("diversidad-rostros-historias");
    expect(ids).toContain("comunicacion-asertiva-objeto");
    expect(ids).toContain("redes-apoyo-bienestar-emocional");
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

    const w2 = getWorkshopById("ovp-triatlon-academico");
    expect(w2).toBeDefined();
    expect(w2?.title).toContain("Triatlón");

    const w3 = getWorkshopById("autoproteccion-infantil-4-anos");
    expect(w3).toBeDefined();
    expect(w3?.targetAudienceLabel).toContain("Inicial");

    const wNone = getWorkshopById("id-inexistente");
    expect(wNone).toBeUndefined();
  });

  it("debe generar documentos Word (.docx) válidos para todos los 19 materiales prácticos y recortables", async () => {
    const allMaterials: { wId: string; mId: string }[] = [];
    for (const w of WORKSHOPS_DATABASE) {
      for (const m of w.downloadableMaterials) {
        allMaterials.push({ wId: w.id, mId: m.id });
      }
    }

    expect(allMaterials.length).toBe(19);

    for (const { wId, mId } of allMaterials) {
      const res = await generateWorkshopMaterialDocx(wId, mId, "Unidad Educativa Modelo");
      expect(res, `Fallo al generar material: ${wId} - ${mId}`).not.toBeNull();
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

    const resGuion2 = await generateWorkshopMaterialDocx("triatlon-ovp-proyectos-vida", "guion-metodologico");
    expect(resGuion2).toBeNull();

    const resUnknown = await generateWorkshopMaterialDocx("prevencion-suicidio", "material-fantasma");
    expect(resUnknown).toBeNull();
  });
});
