import { describe, it, expect } from "vitest";
import type { Role } from "./types";
import {
  canViewCaseDetail,
  canEditCase,
  canManageUsers,
  canManageStudents,
  canManageInstitutions,
  canCreateAlert,
  canViewAuditLog,
  isInstitutionScoped,
  roleHomePath,
} from "./permissions";

const ALL_ROLES: Role[] = ["SUPERADMIN", "DISTRITO", "ADMIN", "DECE", "AUTORIDAD", "DOCENTE"];

describe("matriz de permisos DECE", () => {
  it("solo SUPERADMIN gestiona usuarios", () => {
    const allowed = ALL_ROLES.filter(canManageUsers);
    expect(allowed).toEqual(["SUPERADMIN"]);
  });

  it("solo SUPERADMIN gestiona instituciones", () => {
    const allowed = ALL_ROLES.filter(canManageInstitutions);
    expect(allowed).toEqual(["SUPERADMIN"]);
  });

  it("el relato confidencial del caso NO es visible para AUTORIDAD, DISTRITO ni DOCENTE", () => {
    expect(canViewCaseDetail("AUTORIDAD")).toBe(false);
    expect(canViewCaseDetail("DISTRITO")).toBe(false);
    expect(canViewCaseDetail("DOCENTE")).toBe(false);
  });

  it("solo ADMIN, DECE y SUPERADMIN ven y editan el detalle del caso", () => {
    expect(ALL_ROLES.filter(canViewCaseDetail).sort()).toEqual(["ADMIN", "DECE", "SUPERADMIN"]);
    expect(ALL_ROLES.filter(canEditCase).sort()).toEqual(["ADMIN", "DECE", "SUPERADMIN"]);
  });

  it("DOCENTE puede crear alertas pero no gestionar estudiantes", () => {
    expect(canCreateAlert("DOCENTE")).toBe(true);
    expect(canManageStudents("DOCENTE")).toBe(false);
  });

  it("AUTORIDAD no puede ver la bitácora de auditoría; ADMIN/DISTRITO/SUPERADMIN sí", () => {
    expect(canViewAuditLog("AUTORIDAD")).toBe(false);
    expect(canViewAuditLog("DOCENTE")).toBe(false);
    expect(canViewAuditLog("ADMIN")).toBe(true);
    expect(canViewAuditLog("DISTRITO")).toBe(true);
    expect(canViewAuditLog("SUPERADMIN")).toBe(true);
  });

  it("SUPERADMIN y DISTRITO operan a escala global; el resto está limitado a su institución", () => {
    expect(isInstitutionScoped("SUPERADMIN")).toBe(false);
    expect(isInstitutionScoped("DISTRITO")).toBe(false);
    for (const r of ["ADMIN", "DECE", "AUTORIDAD", "DOCENTE"] as Role[]) {
      expect(isInstitutionScoped(r)).toBe(true);
    }
  });

  it("cada rol tiene una página de inicio conocida", () => {
    for (const r of ALL_ROLES) {
      expect(roleHomePath(r)).toMatch(/^\//);
    }
    expect(roleHomePath("DOCENTE")).toBe("/alertas");
    expect(roleHomePath("AUTORIDAD")).toBe("/reportes");
  });
});
