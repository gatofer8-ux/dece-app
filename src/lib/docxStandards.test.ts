import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { generateInterviewDocx } from "./docxExport";
import { generateDailyAttentionDocx } from "./dailyAttentionDocx";
import { getDocumentStandards } from "./documentStandards";

async function documentText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")!.async("string");
  return (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? [])
    .map((m) => m.replace(/<[^>]+>/g, ""))
    .join("")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

describe("codificación de Estándares de Calidad en los Word", () => {
  it("la entrevista imprime DE11 y DE12 con su enunciado", async () => {
    const buffer = await generateInterviewDocx({
      interview: { interviewee_full_name: "María Pérez", application_date: "2026-11-10" },
      student: { full_name: "Juan Pérez", course: "Segundo de Bachillerato", parallel: "A" },
      institution: { id: "i1", name: "Unidad Educativa Rumiñahui" },
      professionalName: "Mgtr. Marlon Jácome",
    });
    const text = await documentText(buffer);
    for (const s of getDocumentStandards("entrevista_estudiante")) {
      expect(text).toContain(`${s.code} ${s.text}`);
    }
  });

  it("el registro de atención diaria imprime DE1 + DE12 para estudiantes y DE1 + DE8 + DE14 para docentes", async () => {
    const institution = { id: "i1", name: "Unidad Educativa Rumiñahui" } as any;
    const estudiantes = await documentText(
      await generateDailyAttentionDocx({ institution, tipo: "ESTUDIANTE", entries: [] })
    );
    expect(estudiantes).toContain("E.D1.C1.DE1. Elabora documentos");
    expect(estudiantes).toContain("E.D3.C1.DE12. Realiza la intervención de estudiantes");

    const docentes = await documentText(
      await generateDailyAttentionDocx({ institution, tipo: "DOCENTE_AUTORIDAD", entries: [] })
    );
    expect(docentes).toContain("E.D2.C2.DE8.");
    expect(docentes).toContain("E.D4.C1.DE14.");
    expect(docentes).not.toContain("E.D3.C1.DE12.");
  });
});

describe("injectStandardsIntoDocx", () => {
  async function makeDocx(): Promise<Buffer> {
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const doc = new Document({
      sections: [{ children: [new Paragraph({ children: [new TextRun("TITULO ORIGINAL & <único>")] })] }],
    });
    return Packer.toBuffer(doc);
  }

  it("agrega los códigos antes del contenido original y el .docx sigue abriendo", async () => {
    const { injectStandardsIntoDocx } = await import("./docxStandards");
    const out = injectStandardsIntoDocx(await makeDocx(), "plan_atencion");
    const text = await documentText(out);
    expect(text.indexOf("E.D3.C1.DE12. Realiza la intervención")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("E.D3.C1.DE12.")).toBeLessThan(text.indexOf("TITULO ORIGINAL"));
    expect(text).toContain("TITULO ORIGINAL & <único>");
  });

  it("es idempotente y respeta una lista explícita de códigos", async () => {
    const { injectStandardsIntoDocx } = await import("./docxStandards");
    const { getActivityStandards } = await import("./documentStandards");
    const once = injectStandardsIntoDocx(await makeDocx(), getActivityStandards("PROMOCION"));
    const twice = injectStandardsIntoDocx(once, getActivityStandards("PROMOCION"));
    expect(twice).toBe(once);
    expect((await documentText(twice)).match(/E\.D2\.C1\.DE7\./g)).toHaveLength(1);
  });
});

describe("generadores envueltos", () => {
  it("el acta de socialización sale codificada con DE12 sin perder su contenido", async () => {
    const { generateSocializationActDocx } = await import("./docxExport");
    const buffer = await generateSocializationActDocx({
      act: {
        id: "act-1",
        case_file_id: "case-1",
        act_date: "2026-09-10",
        act_place: "Quito",
        vulnerability_type: "Académica y psicosocial",
        curricular_adaptation_grade: "Ajustes razonables",
        agreements: JSON.stringify(["Mantener comunicación fluida con el DECE"]),
        teacher_signatures: JSON.stringify([{ asignatura: "Matemáticas", docente: "Lic. Pedro Gómez" }]),
        prepared_by_name: "Lic. Carlos Méndez",
        approved_by_name: "Dra. Martha Ruiz",
        received_by_name: "Lic. Tutor Juan",
        received_by_role: "Tutor de curso",
      } as any,
      student: { id: "st-1", full_name: "Juan Pérez", course: "Segundo de Bachillerato", parallel: "A" } as any,
      institution: { id: "inst-1", name: "Colegio Nacional Experimental" } as any,
    });
    const text = await documentText(buffer);
    expect(text).toContain("E.D3.C1.DE12. Realiza la intervención de estudiantes");
    expect(text).toContain("Lic. Pedro Gómez");
  });
});

describe("plantillas Word de formato fijo", () => {
  it("ficha de alerta y acta de corresponsabilidad salen con su código y abren como .docx", async () => {
    const { generateAlertDocxBuffer } = await import("./alertDocx");
    const { generateCorresponsibilityDocxBuffer } = await import("./corresponsibilityDocx");
    const alert = await documentText(await generateAlertDocxBuffer({ student_name: "Juan Pérez" } as any));
    expect(alert).toContain("E.D1.C1.DE2. Actualiza mensualmente el Registro de Casos de Riesgo Psicosocial");
    expect(alert.length).toBeGreaterThan(500); // el contenido de la plantilla sigue ahí
    const act = await documentText(
      await generateCorresponsibilityDocxBuffer({ representative_name: "María Pérez" } as any, { full_name: "Juan Pérez" } as any)
    );
    expect(act).toContain("E.D3.C1.DE12. Realiza la intervención de estudiantes");
    expect(act.length).toBeGreaterThan(500);
  });
});
