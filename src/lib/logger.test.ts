import { describe, it, expect, vi, afterEach } from "vitest";
import { logger, setErrorReporter } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
  setErrorReporter(null);
});

describe("logger", () => {
  it("warn escribe en console.warn con el ámbito y el error serializado", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("pagos", "algo raro", new Error("boom"));
    expect(spy).toHaveBeenCalledWith("[pagos] algo raro — Error: boom");
  });

  it("error reenvía al reporter externo si está configurado", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reporter = vi.fn();
    setErrorReporter(reporter);
    const err = new Error("x");
    logger.error("cron", "falló el barrido", err);
    expect(reporter).toHaveBeenCalledWith("cron", "falló el barrido", err);
  });

  it("un reporter que lanza no rompe el flujo", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setErrorReporter(() => {
      throw new Error("reporter roto");
    });
    expect(() => logger.error("x", "y", new Error("z"))).not.toThrow();
  });
});
