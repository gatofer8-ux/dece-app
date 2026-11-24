import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getTapasSessionByCode, isTapasSessionOpen } from "@/lib/tapas/tapasSessions";
import { TAPAS_INSTRUMENTS, TAPAS_NIVELES, isTapasNivel, type TapasInstrument } from "@/lib/tapas/niveles";
import { estimateMinutes, isHojaOpen, parsePlan } from "@/lib/tapas/plan";
import type { TapasApplicationRow } from "@/lib/types";

export const metadata = { title: "Mis hojas — TaPas" };

/** Hojas del proceso TaPas de una persona: cuáles terminó, cuál sigue y cuáles aún no abre el DECE. */
export default function MisHojasPage({ params }: { params: { code: string; pid: string } }) {
  const s = getTapasSessionByCode(params.code);
  if (!s) notFound();
  const apps = db
    .prepare("SELECT * FROM tapas_applications WHERE session_id = ? AND participant_id = ?")
    .all(s.id, params.pid) as TapasApplicationRow[];
  if (apps.length === 0) notFound();

  const plan = parsePlan(s);
  const nivel = isTapasNivel(s.nivel) ? s.nivel : "BACHILLERATO";
  const byInstrument = new Map(apps.map((a) => [a.instrument, a]));
  const open = isTapasSessionOpen(s);
  const done = apps.filter((a) => a.status === "FINALIZADA").length;
  const name = apps[0].student_name;

  function state(i: TapasInstrument, a: TapasApplicationRow | undefined) {
    if (!a) return { label: "No disponible", tone: "slate", action: null as string | null, cta: "" };
    if (a.status === "FINALIZADA") return { label: "Terminada ✓", tone: "emerald", action: `/j/${params.code}/${a.id}/gracias`, cta: "Ver lo que hice" };
    if (!open || !isHojaOpen(plan, i)) return { label: "🔒 Se abre cuando el DECE la habilite", tone: "slate", action: null, cta: "" };
    let started = false;
    let note = "";
    try {
      if (i === "ARQUETIPOS") started = Object.keys(JSON.parse(a.classification_json || "{}")).length > 0;
      else if (a.data_json) {
        started = true;
        if (i === "EXPERIMENTO" && (JSON.parse(a.data_json) as { sesion?: number }).sesion === 2) {
          note = "Sesión 1 lista. Haz tu experimento esta semana y vuelve para la sesión 2.";
        }
      }
    } catch {
      started = false;
    }
    return {
      label: note || (started ? "En progreso" : "Pendiente"),
      tone: started ? "amber" : "sky",
      action: `/j/${params.code}/${a.id}`,
      cta: started ? "Continuar" : "Empezar",
    };
  }

  const firstPending = plan.instruments.find((i) => {
    const a = byInstrument.get(i);
    return a && a.status !== "FINALIZADA" && open && isHojaOpen(plan, i);
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-5">
          <div className="text-3xl mb-1">🗂️</div>
          <h1 className="text-lg font-bold text-slate-900">Mis hojas TaPas</h1>
          <p className="text-sm text-slate-500">
            {name} · {s.title} · Nivel {TAPAS_NIVELES[nivel].label}
          </p>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Avance</span>
            <span>
              {done} de {plan.instruments.length} hojas
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600" style={{ width: `${(done / plan.instruments.length) * 100}%` }} />
          </div>
        </div>

        <ol className="space-y-2">
          {plan.instruments.map((i, idx) => {
            const a = byInstrument.get(i);
            const st = state(i, a);
            const info = TAPAS_INSTRUMENTS[i];
            const highlight = i === firstPending;
            return (
              <li key={i} className={`rounded-xl border-2 p-3 ${highlight ? "border-emerald-500 bg-emerald-50/40" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{info.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {idx + 1}. {info.label}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Unos {estimateMinutes(i, nivel)} min{i === "EXPERIMENTO" ? " por sesión (son dos sesiones)" : ""}
                    </p>
                    <p
                      className={`text-xs mt-1 font-medium ${
                        st.tone === "emerald" ? "text-emerald-700" : st.tone === "amber" ? "text-amber-700" : st.tone === "sky" ? "text-sky-700" : "text-slate-500"
                      }`}
                    >
                      {st.label}
                    </p>
                  </div>
                  {st.action && (
                    <Link
                      href={st.action}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                        st.tone === "emerald" ? "border border-slate-300 text-slate-600" : "bg-emerald-600 text-white"
                      }`}
                    >
                      {st.cta}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="text-[11px] text-slate-400 mt-5 text-center">
          {plan.modo === "VARIAS"
            ? "Este proceso se hace en varias horas de clase. Guarda este enlace o vuelve a entrar con el código y tu nombre para continuar."
            : "Puedes hacer las hojas seguidas. Si se acaba el tiempo, vuelve con el código y tu nombre: tu avance queda guardado."}
        </p>
      </div>
    </div>
  );
}
