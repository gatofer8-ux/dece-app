import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { createEneisSurveySessionAction } from "../actions";

export default async function NuevaEneisEncuestaPage() {
  await requireRole(["ADMIN", "DECE"]);

  return (
    <div>
      <PageHeader
        title="Nueva encuesta ENEIS"
        description="Se genera un código y un enlace para que respondan de forma anónima, sin necesitar cuenta."
      />
      <form action={createEneisSurveySessionAction} className="card p-6 space-y-5 max-w-2xl">
        <div>
          <label className="label text-xs">¿A quién va dirigida?</label>
          <select name="instrument" defaultValue="ESTUDIANTES" className="select text-sm">
            <option value="ESTUDIANTES">Estudiantes</option>
            <option value="DOCENTES">Docentes</option>
            <option value="REPRESENTANTES">Padres de familia / Representantes</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Estudiantes y docentes: cuestionario oficial de 10 preguntas de opción múltiple. Padres de familia: banco
            oficial de preguntas Sí/No sobre la implementación del ENEIS.
          </p>
        </div>
        <div>
          <label className="label text-xs">Título / referencia</label>
          <input name="title" placeholder="Ej. Encuesta a Estudiantes — ENEIS (Semestre 1)" className="input text-sm" />
        </div>
        <p className="text-[11px] text-slate-400">
          Las respuestas son <strong>anónimas</strong>: no se guarda quién respondió, solo las opciones elegidas. Los
          resultados se tabulan automáticamente a medida que llegan.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Disponible desde (opcional)</label>
            <input type="date" name="opens_at" className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">Disponible hasta (opcional)</label>
            <input type="date" name="closes_at" className="input text-sm" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Crear y obtener enlace</button>
        </div>
      </form>
    </div>
  );
}
