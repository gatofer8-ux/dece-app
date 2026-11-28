import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { buildCaseRows, formatDateDmy, generateReporteJuntaDE3Docx, teacherAdviceOf, DE3_FORMAT } from "./docxJuntasDE3";
import { actionTypesSummary, alertsObservation, localIsoDate } from "./juntasCursoConstants";
import type { CourseBoardReportRow } from "./types";

const part = (buf: Buffer, name: string) => new PizZip(buf).file(name)?.asText() || "";
const plain = (xml: string) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(" | ");

function report(overrides: Partial<CourseBoardReportRow> = {}): CourseBoardReportRow {
  return {
    id: "r1",
    institution_id: "i1",
    school_year_id: "y1",
    school_year_text: "2026-2027",
    user_id: "u1",
    user_name: "Psic. Ana Prueba",
    user_role_label: "Analista DECE",
    tutor_name: "Lcda. Tutora Ejemplo",
    report_code: "INF-001",
    trimester: "2T",
    course: "8.° Grado EGB",
    parallel: "B",
    jornada: "vespertina",
    report_date: "2026-11-27",
    antecedentes: "",
    alcance: "",
    objetivo: "",
    cases_json: JSON.stringify([
      {
        id: "c1",
        student_name: "ESTUDIANTE UNO",
        problematic: "Acoso escolar",
        actions_taken: "-Detección\n-Derivación interna: socialización del caso a docentes.",
        teacher_advice: "Ubicar al estudiante cerca del docente.",
        observations: "Mejora en la convivencia.",
        recommendations: {},
      },
      {
        id: "c2",
        student_name: "ESTUDIANTE & DOS",
        problematic: "Vulnerabilidad",
        actions_taken: "Seguimiento",
        recommendations: { academic: "Ajustes razonables en evaluaciones." },
      },
    ]),
    general_actions: "Taller de prevención del acoso escolar.\nSocialización de rutas y protocolos.",
    conclusiones: "",
    recomendaciones: "",
    report_format: DE3_FORMAT,
    observaciones_generales: "No existieron casos reportados por los docentes.",
    vicerrector_name: "Msc. Vicerrector Ejemplo",
    created_at: "2026-11-27",
    updated_at: "2026-11-27",
    ...overrides,
  } as CourseBoardReportRow;
}

describe("Reporte para Juntas de Grado/Curso (E.D1.C2.DE3)", () => {
  it("llena el encabezado y los datos informativos", () => {
    const body = plain(part(generateReporteJuntaDE3Docx(report()), "word/document.xml"));
    expect(body).toContain("REPORTE PARA JUNTAS DE GRADO/CURSO");
    expect(body).toContain("SEGUNDO TRIMESTRE");
    expect(body).toContain("AÑO LECTIVO  | 2026-2027");
    expect(body).toContain("E.D1.C2.DE3.");
    expect(body).toContain("8.° Grado EGB");
    expect(body).toContain("Paralelo: |  B");
    expect(body).toContain("VESPERTINA");
    expect(body).toContain("Lcda. Tutora Ejemplo");
    expect(body).toContain("durante el segundo trimestre, correspondiente al año lectivo 2026-2027.");
  });

  it("arma la nómina con una fila por estudiante y en el orden de columnas del formato", () => {
    const body = plain(part(generateReporteJuntaDE3Docx(report()), "word/document.xml"));
    expect(body).toContain("01 | ESTUDIANTE UNO | Acoso escolar | -Detección | -Derivación interna");
    expect(body).toContain("Ubicar al estudiante cerca del docente. | Mejora en la convivencia.");
    expect(body).toContain("02 | ESTUDIANTE &amp; DOS | Vulnerabilidad | Seguimiento");
    // informes antiguos: el asesoramiento sale de las recomendaciones guardadas
    expect(body).toContain("Ajustes razonables en evaluaciones.");
  });

  it("llena actividades, observaciones y la tabla de firmas", () => {
    const body = plain(part(generateReporteJuntaDE3Docx(report()), "word/document.xml"));
    expect(body).toContain("Taller de prevención del acoso escolar. | Socialización de rutas y protocolos.");
    expect(body).toContain("Observaciones:  | No existieron casos reportados por los docentes.");
    expect(body).toContain("Psic. Ana Prueba | ANALISTA DECE");
    expect(body).toContain("27/11/2026");
    expect(body).toContain("Msc. Vicerrector Ejemplo | VICERRECTOR | Jornada VESPERTINA");
  });

  it("no deja marcadores, conserva membrete y número de página, y no trae datos de la muestra", () => {
    const buf = generateReporteJuntaDE3Docx(report());
    const zip = new PizZip(buf);
    for (const n of ["word/document.xml", "word/header1.xml", "word/footer1.xml"]) {
      expect(zip.file(n)!.asText()).not.toMatch(/@@[A-Z_]+@@/);
    }
    expect(zip.file("word/media/image1.png")).toBeTruthy();
    expect(zip.file("word/footer1.xml")!.asText()).toContain("PAGE");
    const all = ["word/document.xml", "docProps/core.xml"].map((n) => zip.file(n)!.asText()).join(" ");
    expect(all).not.toMatch(/Andrea|Miño|Gateway|NNA/);
  });

  it("sin estudiantes deja una fila vacía y sin vicerrector deja la línea para escribir a mano", () => {
    const body = plain(part(generateReporteJuntaDE3Docx(report({ cases_json: "[]", vicerrector_name: null })), "word/document.xml"));
    expect(body).toContain("VICERRECTOR | Jornada VESPERTINA");
    expect(buildCaseRows([]).match(/<w:tr>/g)!.length).toBe(1);
  });

  it("utilidades", () => {
    expect(formatDateDmy("2026-11-27")).toBe("27/11/2026");
    expect(teacherAdviceOf({ id: "x", student_name: "", problematic: "", actions_taken: "", recommendations: { coordination: "A", climate: "B" } })).toBe("A\nB");
    expect(alertsObservation(0, "2026-2027")).toContain("no existieron casos");
    expect(alertsObservation(1, "2026-2027")).toContain("existieron 1 caso reportado");
    expect(alertsObservation(3, "2026-2027")).toContain("existieron 3 casos reportados");
  });
});

describe("informes existentes", () => {
  it("un informe del formato anterior sigue generándose con su plantilla, no con la nueva", async () => {
    const { generateCourseBoardReportDocx } = await import("./docxJuntasCurso");
    const legacy = report({
      report_format: "INFORME_TECNICO",
      antecedentes: "Antecedentes de prueba",
      alcance: "Alcance de prueba",
      objetivo: "Objetivo de prueba",
      conclusiones: "Conclusiones de prueba",
      recomendaciones: "Recomendaciones de prueba",
    });
    const body = plain(part(await generateCourseBoardReportDocx({ report: legacy }), "word/document.xml"));
    expect(body).not.toContain("REPORTE PARA JUNTAS DE GRADO/CURSO");
    expect(body).toContain("DATOS GENERALES");

    const nuevo = plain(part(await generateCourseBoardReportDocx({ report: report() }), "word/document.xml"));
    expect(nuevo).toContain("REPORTE PARA JUNTAS DE GRADO/CURSO");
  });
});

describe("ajustes del formato", () => {
  it("las acciones cargadas del caso quedan como viñetas cortas, sin descripciones ni repetidos", () => {
    const raw = "• Detección y recepción de alerta: Apertura del expediente...\n• Entrevista a representante legal: Comparecencia de Sra. X\n• Detección y recepción de alerta: otra\n• Seguimiento";
    expect(actionTypesSummary(raw)).toBe("-Detección y recepción de alerta\n-Entrevista a representante legal\n-Seguimiento");
    expect(actionTypesSummary("")).toBe("");
  });

  it("la fecha por defecto es la local, no la UTC", () => {
    expect(localIsoDate(new Date(2026, 10, 27, 23, 30))).toBe("2026-11-27");
    expect(localIsoDate(new Date(2026, 0, 5, 0, 5))).toBe("2026-01-05");
  });

  it("la tabla de firmas no se parte entre páginas", () => {
    const xml = part(generateReporteJuntaDE3Docx(report()), "word/document.xml");
    const sig = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g)!.pop()!;
    const rows = sig.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g)!;
    for (const r of rows.slice(0, -1)) {
      const pprs = r.match(/<w:pPr>/g)!.length;
      expect(r.match(/<w:pPr><w:keepNext\/>/g)!.length).toBe(pprs);
    }
    expect(rows[rows.length - 1]).not.toContain("<w:keepNext/>");
    // la nómina no se toca
    expect(xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)![0]).not.toContain("<w:keepNext/>");
  });
});
