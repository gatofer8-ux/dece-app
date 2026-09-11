import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de sesión
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

// Mock de GoogleGenAI
const mockGenerateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe("POST /api/dictado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza peticiones sin sesión autenticada con HTTP 401", async () => {
    const { getSession } = await import("@/lib/session");
    (getSession as any).mockResolvedValue(null);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/dictado", {
      method: "POST",
      body: new FormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Sesión no válida/i);
  });

  it("rechaza peticiones sin archivo de audio con HTTP 400", async () => {
    const { getSession } = await import("@/lib/session");
    (getSession as any).mockResolvedValue({ user: { id: "user-1" } });

    const { POST } = await import("./route");
    const fd = new FormData();
    const req = new Request("http://localhost/api/dictado", {
      method: "POST",
      body: fd,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/No se recibió archivo/i);
  });

  it("transcribe audio con Gemini y normaliza puntuación correctamente", async () => {
    const { getSession } = await import("@/lib/session");
    (getSession as any).mockResolvedValue({ user: { id: "user-1" } });

    vi.stubEnv("GEMINI_API_KEY", "dummy-key");

    mockGenerateContent.mockResolvedValue({
      text: "estudiante mostró mejora académica punto y aparte se recomienda seguimiento",
    });

    const { POST } = await import("./route");
    const fd = new FormData();
    const fakeAudio = new Blob(["fake audio buffer"], { type: "audio/webm" });
    fd.append("audio", fakeAudio, "test.webm");

    const req = new Request("http://localhost/api/dictado", {
      method: "POST",
      body: fd,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe("Estudiante mostró mejora académica.\n\nSe recomienda seguimiento");
  });
});
