import { describe, it, expect } from "vitest";
import { currentSchoolYearText, currentSchoolYearSpaced } from "./schoolYearText";

describe("currentSchoolYearText — Sierra-Amazonía (inicio septiembre)", () => {
  it("septiembre 2026 -> 2026-2027", () => {
    expect(currentSchoolYearText("SIERRA_AMAZONIA", new Date("2026-09-10T12:00:00"))).toBe("2026-2027");
  });
  it("enero 2027 (mismo año lectivo) -> 2026-2027", () => {
    expect(currentSchoolYearText("SIERRA_AMAZONIA", new Date("2027-01-15T12:00:00"))).toBe("2026-2027");
  });
  it("julio 2026 (aún año lectivo anterior) -> 2025-2026", () => {
    expect(currentSchoolYearText("SIERRA_AMAZONIA", new Date("2026-07-01T12:00:00"))).toBe("2025-2026");
  });
  it("con espacios", () => {
    expect(currentSchoolYearSpaced("SIERRA_AMAZONIA", new Date("2026-09-10T12:00:00"))).toBe("2026 - 2027");
  });
});

describe("currentSchoolYearText — Costa (inicio mayo)", () => {
  it("junio 2026 -> 2026-2027", () => {
    expect(currentSchoolYearText("COSTA", new Date("2026-06-10T12:00:00"))).toBe("2026-2027");
  });
  it("marzo 2027 (mismo año lectivo Costa) -> 2026-2027", () => {
    expect(currentSchoolYearText("COSTA", new Date("2027-03-10T12:00:00"))).toBe("2026-2027");
  });
});
