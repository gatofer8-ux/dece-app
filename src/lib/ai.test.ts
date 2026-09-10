import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isAiConfigured, generateWithFallback, GROQ_FALLBACK_CHAIN, draftText, generateRestorativeCircleQuestions } from "./ai";

describe("isAiConfigured", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("devuelve false si ninguna clave está configurada", () => {
    expect(isAiConfigured()).toBe(false);
  });

  it("devuelve true si GROQ_API_KEY está configurada", () => {
    process.env.GROQ_API_KEY = "gsk_test_key";
    expect(isAiConfigured()).toBe(true);
  });

  it("devuelve true si GEMINI_API_KEY está configurada", () => {
    process.env.GEMINI_API_KEY = "gemini_test_key";
    expect(isAiConfigured()).toBe(true);
  });

  it("devuelve true si ambas claves están configuradas", () => {
    process.env.GROQ_API_KEY = "gsk_test_key";
    process.env.GEMINI_API_KEY = "gemini_test_key";
    expect(isAiConfigured()).toBe(true);
  });

  it("devuelve false si las claves son strings vacíos con espacios", () => {
    process.env.GROQ_API_KEY = "   ";
    process.env.GEMINI_API_KEY = "   ";
    expect(isAiConfigured()).toBe(false);
  });
});

describe("generateWithFallback — Groq y fallback automático", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = origEnv;
    vi.restoreAllMocks();
  });

  it("devuelve error si no hay ninguna clave de IA configurada", async () => {
    const res = await generateWithFallback({ prompt: "Hola mundo" });
    expect("error" in res).toBe(true);
    if ("error" in res) {
      expect(res.error).toContain("todavía no está configurada");
    }
  });

  it("intenta con Groq primero cuando GROQ_API_KEY está configurada", async () => {
    process.env.GROQ_API_KEY = "gsk_test_123";
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "**Respuesta** de prueba de Groq con viñeta:\n• Primera línea",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await generateWithFallback({ prompt: "Redactar informe del caso de la cédula 1804567890" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(options.headers["Authorization"]).toBe("Bearer gsk_test_123");
    
    // Verifica que seudonimizó la cédula en el prompt enviado a Groq
    const body = JSON.parse(options.body);
    expect(body.model).toBe(GROQ_FALLBACK_CHAIN[0]);
    expect(body.messages[0].content).not.toContain("1804567890");
    expect(body.messages[0].content).toContain("[documento]");

    // Verifica que la respuesta fue sanitizada (sin ** ni •)
    expect("text" in res).toBe(true);
    if ("text" in res) {
      expect(res.text).not.toContain("**");
      expect(res.text).toContain("Respuesta de prueba de Groq con viñeta:");
      expect(res.text).toContain("1. Primera línea");
    }

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[ai] groq:${GROQ_FALLBACK_CHAIN[0]}`));
  });

  it("recorre la cadena de modelos de Groq si el primero falla con 429 o 404", async () => {
    process.env.GROQ_API_KEY = "gsk_test_123";
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const mockFetch = vi
      .fn()
      // Primer modelo falla con 429
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "Rate limit reached" } }),
      })
      // Segundo modelo responde con éxito
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Respuesta del segundo modelo",
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const res = await generateWithFallback({ prompt: "Prueba de fallback" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).model).toBe(GROQ_FALLBACK_CHAIN[0]);
    expect(JSON.parse(mockFetch.mock.calls[1][1].body).model).toBe(GROQ_FALLBACK_CHAIN[1]);

    expect("text" in res).toBe(true);
    if ("text" in res) {
      expect(res.text).toBe("Respuesta del segundo modelo");
    }
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[ai] groq:${GROQ_FALLBACK_CHAIN[1]}`));
  });

  it("pasa a Gemini si todos los modelos de Groq fallan", async () => {
    process.env.GROQ_API_KEY = "gsk_test_123";
    process.env.GEMINI_API_KEY = "gemini_fallback_key";
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Groq falla en todos los modelos, pero Gemini responde con éxito
    const mockFetch = vi.fn().mockImplementation(async (url: string | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("groq.com")) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: { message: "Service unavailable" } }),
        };
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "Respuesta de respaldo desde Gemini" }],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await generateWithFallback({ prompt: "Prueba fallback total" });

    // Groq se intentó para los 3 modelos de la cadena
    const groqCalls = mockFetch.mock.calls.filter((c) => String(c[0]).includes("groq.com"));
    expect(groqCalls.length).toBe(3);

    // Gemini fue invocado y respondió
    expect("text" in res).toBe(true);
    if ("text" in res) {
      expect(res.text).toBe("Respuesta de respaldo desde Gemini");
    }
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[ai] gemini:"));
  });

  it("respeta GROQ_MODEL cuando está definido en el entorno", async () => {
    process.env.GROQ_API_KEY = "gsk_test_123";
    process.env.GROQ_MODEL = "openai/gpt-oss-120b";
    vi.spyOn(console, "log").mockImplementation(() => {});

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Respuesta rápida" } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await generateWithFallback({ prompt: "Prueba modelo preferido" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("openai/gpt-oss-120b");
  });
});

describe("draftText con generateWithFallback", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    process.env.GROQ_API_KEY = "gsk_test_key";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = origEnv;
    vi.restoreAllMocks();
  });

  it("aplica formato con guiones para acciones de derivación", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "1. Entrevista con la madre\n2. Valoración socioemocional\n3. Derivación a salud",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await draftText({
      fieldLabel: "Acciones desarrolladas en la ficha de derivación",
      context: "Contexto del caso",
      currentText: "",
    });

    expect("text" in res).toBe(true);
    if ("text" in res) {
      expect(res.text).toContain("- Entrevista con la madre");
      expect(res.text).toContain("- Valoración socioemocional");
      expect(res.text).toContain("- Derivación a salud");
    }
  });

  it("agrega nota de corresponsabilidad en compromisos de entrevista si no está presente", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "1. La representante se compromete a acudir puntualmente.\n2. El estudiante realizará sus tareas.",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await draftText({
      fieldLabel: "Compromisos asumidos en la entrevista",
      context: "Contexto del caso",
      currentText: "",
    });

    expect("text" in res).toBe(true);
    if ("text" in res) {
      expect(res.text).toContain("NOTA DE CONOCIMIENTO Y CORRESPONSABILIDAD");
    }
  });

  it("genera preguntas de círculo restaurativo correctamente usando Groq", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                q_icebreaker: ["¿Cómo te sientes hoy?"],
                q_intro: ["¿Qué sucedió en el recreo?"],
                q_develop: ["¿Cómo te afectó lo ocurrido?"],
                q_actions: ["¿Qué podemos hacer para solucionar esto?"],
              }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await generateRestorativeCircleQuestions({
      problematica: "Discusión en el recreo",
      modality: "grupal",
      participantsCount: 3,
    });

    expect("questions" in res).toBe(true);
    if ("questions" in res) {
      expect(res.questions.q_icebreaker).toEqual(["¿Cómo te sientes hoy?"]);
      expect(res.questions.q_intro).toEqual(["¿Qué sucedió en el recreo?"]);
      expect(res.questions.q_develop).toEqual(["¿Cómo te afectó lo ocurrido?"]);
      expect(res.questions.q_actions).toEqual(["¿Qué podemos hacer para solucionar esto?"]);
    }
  });
});
