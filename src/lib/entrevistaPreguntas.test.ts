import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import {
  DEFAULT_STRUCTURE,
  defaultLetterhead,
  isoToDmy,
  pairQuestions,
  parseAnswers,
  parseDistribution,
  parseLetterhead,
  parseStructure,
  restorePlaceholders,
  visibleStructure,
} from "./entrevistaPreguntas";
import {
  buildBaseTemplate,
  fillCustomTemplate,
  generateDefaultInterviewDocx,
  validateTemplate,
  type InterviewDocData,
} from "./entrevistaPreguntasDocx";

const docText = (buf: Buffer, part = "word/document.xml") => {
  const xml = new PizZip(buf).file(part)?.asText() || "";
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(" ");
};

function sampleData(overrides: Partial<InterviewDocData> = {}): InterviewDocData {
  return {
    letterhead: { ...defaultLetterhead("UNIDAD EDUCATIVA PRUEBA"), motto: "Lema de prueba" },
    logoDataUri: null,
    structure: structuredClone(DEFAULT_STRUCTURE),
    answers: { a1: "Respuesta uno", b1: "Se siente bien", d3: "Ninguno" },
    student: "Estudiante Ejemplo",
    course: "1ro Bachillerato A",
    date: "09/11/2026",
    professional: "Psic. Ana Prueba",
    professionalRole: "ANALISTA DECE",
    schoolYear: "2026 - 2027",
    ...overrides,
  };
}

describe("estructura por defecto", () => {
  it("trae las 4 secciones y 20 preguntas del formato institucional", () => {
    expect(DEFAULT_STRUCTURE.sections.map((s) => s.id)).toEqual(["A", "B", "C", "D"]);
    expect(DEFAULT_STRUCTURE.sections.flatMap((s) => s.questions)).toHaveLength(20);
  });

  it("agrupa preguntas de a dos y deja la última sola si es impar", () => {
    expect(pairQuestions([1, 2, 3, 4, 5]).map((r) => r.length)).toEqual([2, 2, 1]);
  });
});

describe("parseStructure", () => {
  it("vuelve al formato estándar con JSON roto o vacío", () => {
    expect(parseStructure("{no es json").sections).toHaveLength(4);
    expect(parseStructure({ sections: "x" }).sections).toHaveLength(4);
  });

  it("limpia textos, asegura ids únicos y respeta visible=false", () => {
    const s = parseStructure({
      title: "  Mi   entrevista ",
      sections: [
        { id: "A", title: "Sec", visible: false, questions: [{ id: "q", text: "  Hola\n mundo ", visible: true }, { id: "q", text: "Otra", visible: false }] },
      ],
    });
    expect(s.title).toBe("Mi entrevista");
    expect(s.sections[0].visible).toBe(false);
    expect(s.sections[0].questions[0].text).toBe("Hola mundo");
    expect(new Set(s.sections[0].questions.map((q) => q.id)).size).toBe(2);
  });

  it("visibleStructure quita secciones ocultas y las que se quedan sin preguntas", () => {
    const s = structuredClone(DEFAULT_STRUCTURE);
    s.sections[0].visible = false;
    s.sections[1].questions.forEach((q) => (q.visible = false));
    expect(visibleStructure(s).sections.map((x) => x.id)).toEqual(["C", "D"]);
  });
});

describe("membrete y respuestas", () => {
  it("usa el nombre de la institución por defecto y acepta cambios", () => {
    expect(parseLetterhead(null, "UE Demo").institutionName).toBe("UE Demo");
    expect(parseLetterhead({ institutionName: "Otra", motto: "Lema", showLogo: false }, "UE Demo")).toMatchObject({
      institutionName: "Otra",
      motto: "Lema",
      showLogo: false,
    });
  });

  it("parseAnswers ignora valores que no son texto", () => {
    expect(parseAnswers('{"a1":"x","a2":5,"a3":null}')).toEqual({ a1: "x" });
    expect(parseAnswers("basura")).toEqual({});
  });
});

describe("documento Word por defecto", () => {
  it("incluye membrete, datos, preguntas y respuestas", async () => {
    const buf = await generateDefaultInterviewDocx(sampleData());
    const body = docText(buf);
    expect(body).toContain("ENTREVISTA A ESTUDIANTES");
    expect(body).toContain("Estudiante Ejemplo");
    expect(body).toContain("A.- MOTIVO");
    expect(body).toContain("Respuesta uno");
    const header = docText(buf, "word/header1.xml");
    expect(header).toContain("UNIDAD EDUCATIVA PRUEBA");
    expect(header).toContain("Lema de prueba");
    expect(header).toContain("Año Lectivo 2026 - 2027");
  });

  it("no muestra secciones ni preguntas ocultas, y respeta textos cambiados", async () => {
    const data = sampleData();
    data.structure.sections[2].visible = false; // C
    data.structure.sections[0].questions[1].text = "Pregunta propia de la institución";
    data.structure.sections[0].questions[2].visible = false;
    const body = docText(await generateDefaultInterviewDocx(data));
    expect(body).not.toContain("C.- RELACIONES FAMILIARES");
    expect(body).toContain("Pregunta propia de la institución");
    expect(body).not.toContain("¿Cómo te sientes con lo que está sucediendo?");
  });

  it("no incluye el año lectivo si se desactiva", async () => {
    const data = sampleData();
    data.letterhead.showSchoolYear = false;
    expect(docText(await generateDefaultInterviewDocx(data), "word/header1.xml")).not.toContain("Año Lectivo");
  });
});

describe("plantilla propia", () => {
  it("la plantilla base es válida y se rellena con los datos", async () => {
    const base = await buildBaseTemplate();
    expect(validateTemplate(base)).toBeNull();
    const filled = fillCustomTemplate(base, sampleData());
    const body = docText(filled);
    expect(body).toContain("Estudiante Ejemplo");
    expect(body).toContain("A.- MOTIVO");
    expect(body).toContain("Respuesta uno");
    expect(body).toContain("¿Qué logros has alcanzado en tu vida?");
    expect(body).not.toContain("{{");
    expect(docText(filled, "word/header1.xml")).toContain("UNIDAD EDUCATIVA PRUEBA");
  });

  it("la plantilla respeta secciones y preguntas ocultas", async () => {
    const data = sampleData();
    data.structure.sections[1].visible = false;
    const body = docText(fillCustomTemplate(await buildBaseTemplate(), data));
    expect(body).not.toContain("ADAPTACIÓN EN EL CONTEXTO EDUCATIVO");
    expect(body).toContain("C.- RELACIONES FAMILIARES");
  });

  it("rechaza archivos que no son Word y marcadores mal cerrados", () => {
    expect(validateTemplate(Buffer.from("esto no es un docx"))).toBeTruthy();
    const zip = new PizZip();
    zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
    zip.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{{#secciones}} sin cerrar</w:t></w:r></w:p></w:body></w:document>');
    expect(validateTemplate(zip.generate({ type: "nodebuffer" }))).toContain("marcador");
  });
});


describe("reparto del relato con IA", () => {
  const ids = ["a1", "a2", "b1"];

  it("lee el JSON aunque venga con texto alrededor y solo acepta preguntas conocidas", () => {
    const raw = 'Aquí está:\n```json\n{"a1":"Refiere sentirse bien.","zz":"inventada","a2":"","b1":"Tiene amigos."}\n```';
    expect(parseDistribution(raw, ids)).toEqual({ a1: "Refiere sentirse bien.", b1: "Tiene amigos." });
  });

  it("descarta respuestas vacías o de relleno y tolera JSON roto", () => {
    expect(parseDistribution('{"a1":"Sin información","a2":"No se menciona.","b1":"  "}', ids)).toEqual({});
    expect(parseDistribution("{no es json", ids)).toEqual({});
    expect(parseDistribution("sin llaves", ids)).toEqual({});
  });

  it("repone los marcadores de privacidad con expresiones neutras", () => {
    expect(restorePlaceholders("[estudiante] vive con [madre] y [padre] en [dirección] , llama al [teléfono] .")).toBe(
      "el/la estudiante vive con la madre y el padre en el domicilio, llama al."
    );
  });
});

import { buildInterviewTable, generateMineducInterviewDocx } from "./entrevistaPreguntasMineduc";

// PNG de 2x3 px (para probar el ajuste de proporción del logo)
const PNG_2x3 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAEUlEQVR4nGP4z8Dwn4EBBgAV/QH+PzqVoQAAAABJRU5ErkJggg==";

const partText = (buf: Buffer, part: string) => new PizZip(buf).file(part)?.asText() || "";
const plain = (xml: string) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(" | ");

describe("formato institucional (copia del documento del colegio)", () => {
  it("arma el encabezado con los textos de la institución y conserva las imágenes del Ministerio", () => {
    const buf = generateMineducInterviewDocx(sampleData());
    const zip = new PizZip(buf);
    const header = plain(zip.file("word/header1.xml")!.asText());
    expect(header).toContain("UNIDAD EDUCATIVA PRUEBA");
    expect(header).toContain("Lema de prueba");
    expect(header).toContain("DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL");
    expect(header).toContain("Año Lectivo 2026 - 2027");
    // banner del Ministerio (encabezado) y bloque de dirección (pie)
    expect(zip.file("word/media/image2.png")).toBeTruthy();
    expect(zip.file("word/media/image3.png")).toBeTruthy();
    expect(zip.file("word/footer1.xml")).toBeTruthy();
  });

  it("no deja marcadores sin reemplazar ni datos de la muestra original", () => {
    const buf = generateMineducInterviewDocx(sampleData());
    for (const part of ["word/document.xml", "word/header1.xml", "word/footer1.xml"]) {
      const xml = partText(buf, part);
      expect(xml).not.toContain("@@TABLA@@");
      expect(xml).not.toContain("{{");
    }
    const all = ["word/document.xml", "word/header1.xml", "docProps/core.xml"].map((p) => partText(buf, p)).join(" ");
    expect(all).not.toMatch(/Jonathan|Lucero|Rumi[ñn]ahui|Jácome|Santana/i);
  });

  it("la tabla conserva las medidas, colores y estructura del formato original", () => {
    const table = buildInterviewTable(sampleData());
    expect(table).toContain('<w:tblW w:w="8504" w:type="dxa"/>');
    expect(table).toContain('<w:gridCol w:w="4399"/><w:gridCol w:w="4105"/>');
    expect(table).toContain('w:fill="BDD7EE"'); // título
    expect(table).toContain('w:fill="D9D9D9"'); // secciones
    expect(table).toContain("Times New Roman");
    // Con la estructura estándar son las mismas 32 filas que el documento original.
    expect(table.match(/<w:tr>/g)!.length).toBe(32);
  });

  it("coloca los datos y las respuestas en su lugar y respeta saltos de línea", () => {
    const data = sampleData({ answers: { a1: "Primera línea\nSegunda línea", b1: "Se siente bien" }, student: "María & José" });
    const body = plain(partText(generateMineducInterviewDocx(data), "word/document.xml"));
    expect(body).toContain("NOMBRES Y APELLIDOS:");
    expect(body).toContain("María &amp; José");
    expect(body).toContain("CURSO/PARALELO/ JORNADA:");
    expect(body).toContain("FECHA:");
    expect(body).toContain("Primera línea | Segunda línea");
    expect(body).toContain("Se siente bien");
    expect(body).toContain("Nombres y Apellidos del estudiante");
    expect(body).toContain("Psic. Ana Prueba");
  });

  it("respeta secciones y preguntas ocultas, y los textos editados", () => {
    const data = sampleData();
    data.structure.sections[1].visible = false; // B
    data.structure.sections[0].questions[0].text = "Pregunta propia";
    data.structure.sections[0].questions[3].visible = false; // quedan 3 en A: un par + una sola
    const body = plain(partText(generateMineducInterviewDocx(data), "word/document.xml"));
    expect(body).not.toContain("B.- ADAPTACIÓN");
    expect(body).toContain("Pregunta propia");
    expect(body).not.toContain("¿Has tratado de solucionar el problema?");
  });

  it("quita del encabezado lo que la institución no usa", () => {
    const data = sampleData();
    data.letterhead.motto = "";
    data.letterhead.showSchoolYear = false;
    const header = plain(partText(generateMineducInterviewDocx(data), "word/header1.xml"));
    expect(header).not.toContain("Año Lectivo");
    expect(header).toContain("UNIDAD EDUCATIVA PRUEBA");
  });

  it("incrusta el logo de la institución ajustado a su proporción, y sin logo no deja imagen vacía", () => {
    const withLogo = generateMineducInterviewDocx(sampleData({ logoDataUri: PNG_2x3 }));
    const zip = new PizZip(withLogo);
    expect(zip.file("word/media/logo.png")!.asNodeBuffer().length).toBeGreaterThan(70); // no es el marcador transparente
    const header = zip.file("word/header1.xml")!.asText();
    expect(header).toContain('r:embed="rId1"');
    // proporción 2:3 dentro de la caja original (689610 x 828675)
    expect(header).toMatch(/cx="552450" cy="828675"/);

    const noLogo = partText(generateMineducInterviewDocx(sampleData({ logoDataUri: null })), "word/header1.xml");
    expect(noLogo).not.toContain('r:embed="rId1"');
  });

  it("el paquete resultante es un .docx legible", async () => {
    const Docxtemplater = (await import("docxtemplater")).default;
    const buf = generateMineducInterviewDocx(sampleData({ logoDataUri: PNG_2x3 }));
    expect(() => new Docxtemplater(new PizZip(buf), { delimiters: { start: "{{", end: "}}" } })).not.toThrow();
    const ct = partText(buf, "[Content_Types].xml");
    expect(ct).toContain('Extension="png"');
  });
});

describe("fecha del documento", () => {
  it("convierte fechas ISO a día/mes/año", () => {
    expect(isoToDmy("2026-11-09")).toBe("09/11/2026");
    expect(isoToDmy("2026-11-09T10:20:00")).toBe("09/11/2026");
    expect(isoToDmy("")).toBe("");
    expect(isoToDmy(null)).toBe("");
    expect(isoToDmy("09 nov 2026")).toBe("");
  });
});
