"use client";

import Link from "next/link";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { visibleStructure, type Answers, type InterviewStructure } from "@/lib/entrevistaPreguntas";

export default function PreguntasInterviewForm({
  structure,
  answers,
  defaults,
  action,
  cancelHref,
  isEditing = false,
}: {
  structure: InterviewStructure;
  answers: Answers;
  defaults: { name: string; course: string; date: string };
  action: (formData: FormData) => Promise<void>;
  cancelHref: string;
  isEditing?: boolean;
}) {
  const vis = visibleStructure(structure);

  return (
    <form action={action} className="card p-6 space-y-6 max-w-3xl">
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos del estudiante</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label text-xs">Nombres y apellidos</label>
            <input name="interviewee_name" required defaultValue={defaults.name} className="input" maxLength={200} />
          </div>
          <div>
            <label className="label text-xs">Curso / paralelo / jornada</label>
            <input name="course" defaultValue={defaults.course} className="input" maxLength={200} />
          </div>
          <div>
            <label className="label text-xs">Fecha</label>
            <input type="date" name="application_date" defaultValue={defaults.date} className="input" />
          </div>
        </div>
      </div>

      {vis.sections.map((sec) => (
        <div key={sec.id} className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 pb-1">{sec.title}</h3>
          {sec.questions.map((qq) => (
            <div key={qq.id}>
              <div className="flex items-start justify-between gap-2">
                <label htmlFor={`ans_${qq.id}`} className="label text-xs flex-1">{qq.text}</label>
                <VoiceDictationButton targetId={`ans_${qq.id}`} />
              </div>
              <textarea
                id={`ans_${qq.id}`}
                name={`ans_${qq.id}`}
                rows={3}
                defaultValue={answers[qq.id] || ""}
                className="textarea"
                maxLength={5000}
              />
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-2">
        <Link href={cancelHref} className="btn-secondary">Cancelar</Link>
        <button type="submit" className="btn-primary">{isEditing ? "Guardar cambios" : "Guardar entrevista"}</button>
      </div>
    </form>
  );
}
