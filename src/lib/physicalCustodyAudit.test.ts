import { describe, it, expect } from "vitest";
import { resolveCustodyStatus, getCasesCustodyMap, getInstitutionCustodyAudit } from "./physicalCustodyAudit";

describe("physicalCustodyAudit", () => {
  describe("resolveCustodyStatus", () => {
    it("retorna DIGITAL si tiene evidencia digitalizada cargada", () => {
      expect(
        resolveCustodyStatus({
          physical_file_ref: "Carpeta 1",
          physical_evidence_url: "data:image/png;base64,...",
          signature_type: "FISICA",
        })
      ).toBe("DIGITAL");

      expect(
        resolveCustodyStatus({
          physical_file_ref: null,
          physical_evidence_url: "https://example.com/scan.pdf",
          signature_type: null,
        })
      ).toBe("DIGITAL");
    });

    it("retorna DIGITAL si tiene carpeta física y firma DIGITAL trazable", () => {
      expect(
        resolveCustodyStatus({
          physical_file_ref: "Carpeta Azul #2",
          physical_evidence_url: null,
          signature_type: "DIGITAL",
        })
      ).toBe("DIGITAL");
    });

    it("retorna FISICO si tiene referencia de carpeta pero sin evidencia ni firma digital", () => {
      expect(
        resolveCustodyStatus({
          physical_file_ref: "Archivador 3 - Gaveta 1",
          physical_evidence_url: null,
          signature_type: "FISICA",
        })
      ).toBe("FISICO");

      expect(
        resolveCustodyStatus({
          physical_file_ref: "Carpeta B",
          physical_evidence_url: "",
          signature_type: null,
        })
      ).toBe("FISICO");
    });

    it("retorna PENDIENTE si no tiene referencia de carpeta ni evidencia", () => {
      expect(
        resolveCustodyStatus({
          physical_file_ref: null,
          physical_evidence_url: null,
          signature_type: null,
        })
      ).toBe("PENDIENTE");

      expect(
        resolveCustodyStatus({
          physical_file_ref: "   ",
          physical_evidence_url: "",
          signature_type: "FISICA",
        })
      ).toBe("PENDIENTE");
    });
  });

  describe("getCasesCustodyMap", () => {
    it("retorna mapa vacío si el arreglo de casos está vacío", () => {
      const res = getCasesCustodyMap([]);
      expect(res.size).toBe(0);
    });

    it("inicializa casos inexistentes con total 0 y compliance 100", () => {
      const res = getCasesCustodyMap(["caso-test-999"]);
      expect(res.has("caso-test-999")).toBe(true);
      const item = res.get("caso-test-999")!;
      expect(item.total).toBe(0);
      expect(item.complianceRate).toBe(100);
      expect(item.pending).toBe(0);
      expect(item.primaryFileRef).toBeNull();
    });
  });

  describe("getInstitutionCustodyAudit", () => {
    it("incluye los módulos juntas_curso y actas_reunion en el informe institucional", () => {
      const audit = getInstitutionCustodyAudit("institucion-demo");
      expect(audit).toBeDefined();
      expect(Array.isArray(audit.modules)).toBe(true);

      const juntasModule = audit.modules.find((m) => m.moduleKey === "juntas_curso");
      expect(juntasModule).toBeDefined();
      expect(juntasModule?.moduleName).toContain("Juntas de Curso");

      const actasModule = audit.modules.find((m) => m.moduleKey === "actas_reunion");
      expect(actasModule).toBeDefined();
      expect(actasModule?.moduleName).toContain("Actas de Reunión");
    });
  });
});