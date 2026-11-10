import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DocumentHeader from "./DocumentHeader";
import { getActivityStandards } from "@/lib/documentStandards";

describe("DocumentHeader - codificación de estándares", () => {
  it("imprime código y enunciado de cada estándar del tipo de documento", () => {
    const html = renderToStaticMarkup(
      <DocumentHeader title="Registro de atención a ESTUDIANTES" docKind="registro_atencion_diaria" />
    );
    expect(html).toContain("E.D1.C1.DE1.");
    expect(html).toContain("Elabora documentos sobre los procesos de acompañamiento");
    expect(html).toContain("E.D3.C1.DE12.");
    expect(html).toContain("Realiza la intervención de estudiantes que requieren atención psicosocial.");
  });

  it("`standards` explícito (eje de una actividad) tiene prioridad sobre docKind", () => {
    const html = renderToStaticMarkup(
      <DocumentHeader title="Informe de Talleres" docKind="acta_reunion" standards={getActivityStandards("PREVENCION")} />
    );
    expect(html).toContain("E.D2.C2.DE9.");
    expect(html).not.toContain("E.D4.C1.DE14.");
  });

  it("sin docKind ni standards no agrega ningún código", () => {
    const html = renderToStaticMarkup(<DocumentHeader title="Oficio" />);
    expect(html).not.toMatch(/E\.D\d\.C\d\.DE\d+/);
  });
});
