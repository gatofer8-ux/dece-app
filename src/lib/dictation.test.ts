import { describe, it, expect } from "vitest";
import {
  filterWhisperSegments,
  hasKnownHallucination,
  hasRepetitionLoop,
  looksLikePromptEcho,
  processDictationPunctuation,
} from "./dictation";

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


describe("filtro anti-alucinaciones de Whisper", () => {
  const PROMPT = "Consejería estudiantil, acompañamiento psicosocial, representante legal, junta de curso.";

  it("detecta cuando el texto es la pista repetida", () => {
    expect(looksLikePromptEcho("Consejería estudiantil, acompañamiento psicosocial.", PROMPT)).toBe(true);
    expect(looksLikePromptEcho("El estudiante llegó tarde a clases por tercera vez", PROMPT)).toBe(false);
    // Frases cortas pueden ser dictado legítimo
    expect(looksLikePromptEcho("representante legal", PROMPT)).toBe(false);
    expect(looksLikePromptEcho("acta de reunión", PROMPT)).toBe(false);
  });

  it("detecta frases inventadas conocidas, con o sin tildes", () => {
    expect(hasKnownHallucination("Dictado formal en español ecuatoriano.")).toBe(true);
    expect(hasKnownHallucination("Subtítulos realizados por la comunidad de Amara.org")).toBe(true);
    expect(hasKnownHallucination("El representante asistió a la reunión")).toBe(false);
  });

  it("detecta bucles de la misma frase", () => {
    expect(hasRepetitionLoop("la Croni Mgtr la Croni Mgtr la Croni Mgtr la Croni Mgtr")).toBe(true);
    expect(hasRepetitionLoop("el estudiante refiere sentirse bien en casa y en el colegio")).toBe(false);
  });

  it("descarta segmentos silenciosos, repetitivos o que repiten la pista", () => {
    const text = filterWhisperSegments(
      {
        segments: [
          { text: "Consejería estudiantil, acompañamiento psicosocial.", no_speech_prob: 0.1, avg_logprob: -0.2, compression_ratio: 1.2 },
          { text: "Sí.", no_speech_prob: 0.9, avg_logprob: -1.5, compression_ratio: 1.0 },
          { text: "la Croni la Croni la Croni la Croni", no_speech_prob: 0.1, avg_logprob: -0.3, compression_ratio: 3.1 },
          { text: "El estudiante refiere sentirse bien.", no_speech_prob: 0.05, avg_logprob: -0.25, compression_ratio: 1.3 },
        ],
      },
      PROMPT
    );
    expect(text).toBe("El estudiante refiere sentirse bien.");
  });

  it("devuelve vacío si todo era ruido, y respeta el texto limpio", () => {
    expect(filterWhisperSegments({ segments: [{ text: "Dictado formal en español ecuatoriano.", no_speech_prob: 0.2, avg_logprob: -0.4, compression_ratio: 1 }] }, PROMPT)).toBe("");
    expect(filterWhisperSegments({ text: "Buenos días, vengo a una cita." }, PROMPT)).toBe("Buenos días, vengo a una cita.");
    expect(filterWhisperSegments({ text: "" }, PROMPT)).toBe("");
  });
});
