"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import type { InterviewStructure, Letterhead, SectionDef } from "@/lib/entrevistaPreguntas";
import {
  removeInterviewTemplateAction,
  resetInterviewFormatAction,
  saveInterviewFormatAction,
  uploadInterviewTemplateAction,
  type FormatState,
} from "./actions";

const initial: FormatState = { error: null, ok: null };

function Btn({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} text-xs disabled:opacity-60`}>
      {pending ? "Guardando..." : children}
    </button>
  );
}

const rid = () => `x${Math.random().toString(36).slice(2, 7)}`;

export default function FormatoEntrevistaForm({
  initialLetterhead,
  initialStructure,
  templateName,
  hasLogo,
}: {
  initialLetterhead: Letterhead;
  initialStructure: InterviewStructure;
  templateName: string | null;
  hasLogo: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [letterhead, setLetterhead] = useState<Letterhead>(initialLetterhead);
  const [structure, setStructure] = useState<InterviewStructure>(initialStructure);

  const [saveState, saveAction] = useFormState(saveInterviewFormatAction, initial);
  const [uploadState, uploadAction] = useFormState(uploadInterviewTemplateAction, initial);
  useToastOnChange(saveState.error, "error");
  useToastOnChange(saveState.ok, "success");
  useToastOnChange(uploadState.error, "error");
  useToastOnChange(uploadState.ok, "success");

  const setSection = (i: number, patch: Partial<SectionDef>) =>
    setStructure((s) => ({ ...s, sections: s.sections.map((sec, k) => (k === i ? { ...sec, ...patch } : sec)) }));

  const setQuestion = (i: number, j: number, patch: Partial<{ text: string; visible: boolean }>) =>
    setStructure((s) => ({
      ...s,
      sections: s.sections.map((sec, k) =>
        k === i ? { ...sec, questions: sec.questions.map((qq, m) => (m === j ? { ...qq, ...patch } : qq)) } : sec
      ),
    }));

  const addQuestion = (i: number) =>
    setStructure((s) => ({
      ...s,
      sections: s.sections.map((sec, k) =>
        k === i ? { ...sec, questions: [...sec.questions, { id: rid(), text: "Nueva pregunta", visible: true }] } : sec
      ),
    }));

  const removeQuestion = (i: number, j: number) =>
    setStructure((s) => ({
      ...s,
      sections: s.sections.map((sec, k) => (k === i ? { ...sec, questions: sec.questions.filter((_, m) => m !== j) } : sec)),
    }));

  const addSection = () =>
    setStructure((s) => ({
      ...s,
      sections: [
        ...s.sections,
        { id: rid(), title: "NUEVA SECCIÓN", visible: true, questions: [{ id: rid(), text: "Nueva pregunta", visible: true }] },
      ],
    }));

  const removeSection = (i: number) => setStructure((s) => ({ ...s, sections: s.sections.filter((_, k) => k !== i) }));

  const isCustom = (id: string) => /^x[a-z0-9]{4}$/.test(id);

  const reset = () => {
    if (!confirm("¿Restablecer al formato estándar? Se perderán tus cambios de membrete, secciones y preguntas.")) return;
    startTransition(async () => {
      await resetInterviewFormatAction();
      // El formulario guarda su estado en useState: se recarga para tomar el formato restablecido.
      window.location.reload();
    });
  };

  const removeTemplate = () => {
    if (!confirm("¿Quitar tu plantilla Word? Volverás al formato del sistema.")) return;
    startTransition(async () => {
      await removeInterviewTemplateAction();
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <form action={saveAction} className="space-y-6">
        <input type="hidden" name="letterhead_json" value={JSON.stringify(letterhead)} />
        <input type="hidden" name="structure_json" value={JSON.stringify(structure)} />

        {/* Membrete */}
        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold">1. Membrete del documento</h2>
          <p className="text-xs text-slate-500">
            Es el encabezado que aparece arriba en el Word. El logo es el sello que ya cargaste en{" "}
            <a href="/institucion" className="text-brand-700 underline">Datos y Membrete Institucional</a>
            {hasLogo ? "." : " (aún no has cargado uno)."}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre de la institución</label>
              <input className="input" value={letterhead.institutionName} maxLength={200}
                onChange={(e) => setLetterhead({ ...letterhead, institutionName: e.target.value })} />
            </div>
            <div>
              <label className="label">Departamento</label>
              <input className="input" value={letterhead.department} maxLength={200}
                onChange={(e) => setLetterhead({ ...letterhead, department: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Lema (opcional)</label>
              <input className="input" value={letterhead.motto} maxLength={250}
                placeholder="Ej. “Educación renovadora con visión humanista”"
                onChange={(e) => setLetterhead({ ...letterhead, motto: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={letterhead.showLogo} disabled={!hasLogo}
                onChange={(e) => setLetterhead({ ...letterhead, showLogo: e.target.checked })} />
              Mostrar el logo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={letterhead.showSchoolYear}
                onChange={(e) => setLetterhead({ ...letterhead, showSchoolYear: e.target.checked })} />
              Mostrar “Año Lectivo”
            </label>
          </div>
        </section>

        {/* Secciones y preguntas */}
        <section className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold">2. Secciones y preguntas de la entrevista</h2>
          <p className="text-xs text-slate-500">
            Marca la casilla para mostrar u ocultar. Puedes cambiar el texto y añadir tus propias preguntas.
            Las entrevistas ya registradas conservan las preguntas con las que se hicieron.
          </p>
          <div>
            <label className="label">Título del documento</label>
            <input className="input" value={structure.title} maxLength={160}
              onChange={(e) => setStructure({ ...structure, title: e.target.value })} />
          </div>

          {structure.sections.map((sec, i) => (
            <div key={sec.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={sec.visible} onChange={(e) => setSection(i, { visible: e.target.checked })}
                  title="Mostrar esta sección" />
                <input className="input font-semibold" value={sec.title} maxLength={160}
                  onChange={(e) => setSection(i, { title: e.target.value })} />
                {isCustom(sec.id) && (
                  <button type="button" onClick={() => removeSection(i)} className="text-xs text-rose-600 hover:underline whitespace-nowrap">
                    Quitar sección
                  </button>
                )}
              </div>
              <div className={`space-y-2 pl-6 ${sec.visible ? "" : "opacity-50"}`}>
                {sec.questions.map((qq, j) => (
                  <div key={qq.id} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-2.5" checked={qq.visible}
                      onChange={(e) => setQuestion(i, j, { visible: e.target.checked })} title="Mostrar esta pregunta" />
                    <textarea className="textarea text-xs" rows={2} value={qq.text} maxLength={600}
                      onChange={(e) => setQuestion(i, j, { text: e.target.value })} />
                    {isCustom(qq.id) && (
                      <button type="button" onClick={() => removeQuestion(i, j)} className="text-xs text-rose-600 hover:underline mt-2">
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addQuestion(i)} className="text-xs text-brand-700 hover:underline">
                  + Añadir pregunta
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSection} className="btn-secondary text-xs">+ Añadir sección</button>
        </section>

        <div className="flex flex-wrap gap-3">
          <Btn>💾 Guardar formato</Btn>
          <button type="button" onClick={reset} className="btn-secondary text-xs">Restablecer formato estándar</button>
        </div>
      </form>

      {/* Plantilla propia */}
      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold">3. Usar tu propia plantilla Word (opcional)</h2>
        <p className="text-xs text-slate-500">
          Si tu institución ya tiene su documento, descarga la plantilla base, cámbiale el membrete, el logo y la letra en Word
          y súbela. SADEX rellenará los datos respetando tu diseño. Cuando hay una plantilla subida, tiene prioridad sobre el
          membrete del punto 1 (las secciones y preguntas del punto 2 siguen valiendo).
        </p>
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">Marcadores disponibles</summary>
          <ul className="mt-2 space-y-1 list-disc pl-5">
            <li><code>{"{{institucion}}"}</code>, <code>{"{{lema}}"}</code>, <code>{"{{departamento}}"}</code>, <code>{"{{anio_lectivo}}"}</code>, <code>{"{{titulo}}"}</code></li>
            <li><code>{"{{estudiante}}"}</code>, <code>{"{{curso}}"}</code>, <code>{"{{fecha}}"}</code>, <code>{"{{profesional}}"}</code>, <code>{"{{cargo_profesional}}"}</code></li>
            <li>Para repetir todas las secciones y preguntas, usa en párrafos separados: <code>{"{{#secciones}}"}</code> … <code>{"{{titulo}}"}</code> … <code>{"{{#preguntas}}"}</code> <code>{"{{pregunta}}"}</code> <code>{"{{respuesta}}"}</code> <code>{"{{/preguntas}}"}</code> … <code>{"{{/secciones}}"}</code> (la plantilla base ya lo trae armado).</li>
            <li>Para una pregunta concreta: <code>{"{{p_a1}}"}</code> (texto) y <code>{"{{r_a1}}"}</code> (respuesta); los códigos van de <code>a1</code> en adelante según la sección.</li>
          </ul>
        </details>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <a href="/api/institucion/formatos/entrevista/plantilla-base" className="btn-secondary text-xs">⬇️ Descargar plantilla base</a>
          {templateName && (
            <>
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">✓ Plantilla activa: {templateName}</span>
              <a href="/api/institucion/formatos/entrevista/plantilla" className="text-brand-700 underline">Descargar la mía</a>
              <button type="button" onClick={removeTemplate} className="text-rose-600 underline">Quitar</button>
            </>
          )}
        </div>
        <form action={uploadAction} className="flex flex-wrap items-center gap-3">
          <input type="file" name="template" accept=".docx" required className="text-xs" />
          <Btn className="btn-secondary">⬆️ Subir plantilla</Btn>
        </form>
      </section>
    </div>
  );
}
