import { describe, it, expect } from "vitest";
import { processDictationPunctuation } from "./dictation";

describe("processDictationPunctuation", () => {
  it("normaliza punto y aparte preservando saltos de línea dobles", () => {
    const raw = "estudiante presenta avance positivo punto y aparte se recomienda seguimiento";
    const res = processDictationPunctuation(raw);
    expect(res).toBe("Estudiante presenta avance positivo.\n\nSe recomienda seguimiento");
  });

  it("normaliza comas, dos puntos y punto seguido sin espacios previos", () => {
    const raw = "participantes dos puntos tutor coma estudiante coma representante punto seguido se inició puntualmente";
    const res = processDictationPunctuation(raw);
    expect(res).toBe("Participantes: tutor, estudiante, representante. Se inició puntualmente");
  });

  it("normaliza signos de interrogación y exclamación", () => {
    const raw = "abrir interrogación cómo se siente el estudiante signo de interrogación";
    const res = processDictationPunctuation(raw);
    expect(res).toBe("¿Cómo se siente el estudiante?");
  });

  it("capitaliza tras punto", () => {
    const raw = "primera frase punto segunda frase punto tercera";
    const res = processDictationPunctuation(raw);
    expect(res).toBe("Primera frase. Segunda frase. Tercera");
  });

  it("maneja texto vacío sin fallar", () => {
    expect(processDictationPunctuation("")).toBe("");
  });
});
