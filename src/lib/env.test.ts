import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * `env.ts` se evalúa al importarse, así que cada caso ajusta el entorno con
 * `vi.stubEnv` y re-importa el módulo con la caché de módulos limpia.
 */
async function loadEnv() {
  vi.resetModules();
  return (await import("./env")).env;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("validación de entorno", () => {
  it("en producción lanza si NEXTAUTH_SECRET falta", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    await expect(loadEnv()).rejects.toThrow(/NEXTAUTH_SECRET/);
  });

  it("en producción lanza con el secreto por defecto inseguro histórico", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", "dece-app-default-secret-production-2026-key");
    await expect(loadEnv()).rejects.toThrow(/inseguro/i);
  });

  it("acepta un secreto largo y aleatorio", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", "Zm9vYmFy" + "x".repeat(40));
    const env = await loadEnv();
    expect(env.NEXTAUTH_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it("en desarrollo no lanza aunque falte el secreto (usa uno efímero)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = await loadEnv();
    expect(env.NEXTAUTH_SECRET).toContain("dev-only-ephemeral");
  });

  it("SEED_DEMO solo es true con el valor exacto '1'", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXTAUTH_SECRET", "x".repeat(40));
    vi.stubEnv("SEED_DEMO", "true");
    expect((await loadEnv()).SEED_DEMO).toBe(false);
    vi.stubEnv("SEED_DEMO", "1");
    expect((await loadEnv()).SEED_DEMO).toBe(true);
  });
});
