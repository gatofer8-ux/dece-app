import { describe, it, expect } from "vitest";
import {
  validateSurveyAnswers,
  getSurveyQuestions,
  ENEIS_STUDENT_SURVEY,
  ENEIS_TEACHER_SURVEY,
} from "./eneisSurveyInstrument";

describe("instrumento ENEIS", () => {
  it("cada encuesta tiene 10 preguntas con 5 opciones", () => {
    expect(ENEIS_STUDENT_SURVEY).toHaveLength(10);
    expect(ENEIS_TEACHER_SURVEY).toHaveLength(10);
    for (const q of [...ENEIS_STUDENT_SURVEY, ...ENEIS_TEACHER_SURVEY]) {
      expect(q.options).toHaveLength(5);
    }
  });

  it("getSurveyQuestions devuelve el instrumento correcto", () => {
    expect(getSurveyQuestions("DOCENTES")).toBe(ENEIS_TEACHER_SURVEY);
    expect(getSurveyQuestions("ESTUDIANTES")).toBe(ENEIS_STUDENT_SURVEY);
  });
});

describe("validateSurveyAnswers", () => {
  it("acepta un arreglo completo de índices válidos", () => {
    const answers = ENEIS_STUDENT_SURVEY.map(() => 0);
    expect(validateSurveyAnswers("ESTUDIANTES", answers)).toEqual(answers);
  });

  it("rechaza si falta alguna respuesta", () => {
    const answers = ENEIS_STUDENT_SURVEY.map(() => 0).slice(0, 9);
    expect(validateSurveyAnswers("ESTUDIANTES", answers)).toBeNull();
  });

  it("rechaza un índice de opción fuera de rango", () => {
    const answers = ENEIS_STUDENT_SURVEY.map(() => 0);
    answers[3] = 99;
    expect(validateSurveyAnswers("ESTUDIANTES", answers)).toBeNull();
  });

  it("rechaza si no es un arreglo", () => {
    expect(validateSurveyAnswers("DOCENTES", "no-array")).toBeNull();
  });
});
