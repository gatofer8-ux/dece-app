"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import { createEneisInformeAction, type EneisInformeActionState } from "../actions";

const initialState: EneisInformeActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
      {pending ? "Generando informe..." : "📄 Generar informe"}
    </button>
  );
}

export default function NewInformeForm({
  defaultResponsableNombre,
  institutionName,
}: {
  defaultResponsableNombre: string;
  institutionName: string;
}) {
  const [state, dispatch] = useFormState(createEneisInformeAction, initialState);
  useToastOnChange(state.error, "error");

  return (
    <form action={dispatch} className="card p-6 space-y-5 max-w-3xl">
      {institutionName && <p className="text-xs text-slate-500">Institución: <strong>{institutionName}</strong></p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Tipo de informe</label>
          <select name="tipo" defaultValue="SEMESTRAL" className="select text-sm">
            <option value="SEMESTRAL">Semestral</option>
            <option value="TRIMESTRAL">Trimestral</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">N° de informe (opcional)</label>
          <input name="numero_informe" placeholder="Ej. 001-CZ3-18D02-DECE-2026" className="input text-sm" />
        </div>
      </div>

      <div>
        <label className="label text-xs">Título / tema</label>
        <input
          name="titulo"
          placeholder='Se completa automático: "INFORME [TIPO] DE IMPLEMENTACIÓN DE LA ESTRATEGIA NACIONAL..."'
          className="input text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Período desde *</label>
          <input type="date" name="periodo_desde" required className="input text-sm" />
        </div>
        <div>
          <label className="label text-xs">Período hasta *</label>
          <input type="date" name="periodo_hasta" required className="input text-sm" />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        Las tablas de "Actividades realizadas por docentes" y "Cobertura" se arman solas con las fichas de aplicación
        ENEIS que tengan fecha dentro de este rango — no hace falta contarlas a mano.
      </p>

      <div>
        <label className="label text-xs">Fecha del informe</label>
        <input type="date" name="fecha_informe" className="input text-sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
        <p className="sm:col-span-3 text-xs font-bold text-slate-700 -mb-1">Funcionario responsable</p>
        <input name="responsable_nombre" defaultValue={defaultResponsableNombre} placeholder="Nombre" className="input text-sm" />
        <input name="responsable_contacto" placeholder="Correo o extensión telefónica" className="input text-sm" />
        <input name="responsable_cargo" defaultValue="Analista DECE" placeholder="Cargo" className="input text-sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
        <p className="sm:col-span-3 text-xs font-bold text-slate-700 -mb-1">Informe dirigido a</p>
        <input name="dirigido_nombre" placeholder="Nombre del/la Director/a Distrital" className="input text-sm" />
        <input name="dirigido_contacto" placeholder="Correo" className="input text-sm" />
        <input name="dirigido_cargo" placeholder='Ej. Director/a Distrital de Educación 18D02' className="input text-sm" />
      </div>

      <div className="pt-2 border-t border-slate-100">
        <label className="label text-xs">N° de padres, madres y/o representantes alcanzados (opcional)</label>
        <input type="number" name="padres_alcanzados" min={0} className="input text-sm max-w-xs" placeholder="Ej. 200" />
        <p className="text-[11px] text-slate-400 mt-1">
          Este dato no se calcula solo (no viene de las fichas de clase): anótalo si ya hiciste talleres/charlas a
          representantes en este período.
        </p>
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-100">
        <p className="text-xs font-bold text-slate-700">Narrativa del informe</p>
        <div>
          <label className="label text-xs">Resumen de las acciones de seguimiento (Desarrollo)</label>
          <textarea name="desarrollo_resumen" rows={4} className="textarea text-sm" placeholder="Resumen mes a mes de las reuniones y el seguimiento institucional al Programa ENEIS..." />
        </div>
        <div>
          <label className="label text-xs">Actividades realizadas por el/la DECE Institucional</label>
          <textarea name="actividades_dece" rows={3} className="textarea text-sm" placeholder="Talleres, capacitaciones y acompañamiento que realizó directamente el DECE en este período..." />
        </div>
        <div>
          <label className="label text-xs">Buenas prácticas y experiencias exitosas</label>
          <textarea name="buenas_practicas" rows={3} className="textarea text-sm" />
        </div>
        <div>
          <label className="label text-xs">Nudos críticos y dificultades</label>
          <textarea name="nudos_criticos" rows={3} className="textarea text-sm" />
        </div>
        <div>
          <label className="label text-xs">Conclusiones</label>
          <textarea name="conclusiones" rows={3} className="textarea text-sm" />
        </div>
        <div>
          <label className="label text-xs">Recomendaciones</label>
          <textarea name="recomendaciones" rows={3} className="textarea text-sm" />
        </div>
      </div>

      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">⚠️ {state.error}</div>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
