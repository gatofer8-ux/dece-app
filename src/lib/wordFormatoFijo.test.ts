import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { generateAlertDocxBuffer } from "./alertDocx";
import { generateCorresponsibilityDocxBuffer } from "./corresponsibilityDocx";
import { currentSchoolYearText } from "./schoolYearText";

async function part(buffer: Buffer, name: string): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file(name)!.async("string");
}
const text = (xml: string) => (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? []).map((m) => m.replace(/<[^>]+>/g, "")).join("");

describe("Word de formato fijo", () => {
  it("la ficha de alerta toma el año lectivo vigente en el encabezado (no uno fijo)", async () => {
    const buffer = await generateAlertDocxBuffer({ student_name: "Juan Pérez" } as any);
    const header = text(await part(buffer, "word/header1.xml"));
    expect(header).toContain(`AÑO LECTIVO ${currentSchoolYearText()}`);
    expect(header).not.toContain("2025-2026");
  });

  it("la ficha de alerta usa el fondo sin el texto del ministerio, que se solapaba con el membrete del colegio", async () => {
    const buffer = await generateAlertDocxBuffer({ student_name: "Juan Pérez" } as any);
    const zip = await JSZip.loadAsync(buffer);
    const used = await zip.file("word/media/image1.png")!.async("nodebuffer");
    const asset = fs.readFileSync(path.join(process.cwd(), "templates", "assets", "NOTIFICACION_DE_ALERTA_fondo.png"));
    expect(used.equals(asset)).toBe(true);
  });

  it("el acta de corresponsabilidad no estira las líneas que terminan en salto manual", async () => {
    const buffer = await generateCorresponsibilityDocxBuffer({ representative_name: "María Pérez" } as any, {} as any);
    expect(await part(buffer, "word/settings.xml")).toContain("<w:doNotExpandShiftReturn/>");
  });
});
