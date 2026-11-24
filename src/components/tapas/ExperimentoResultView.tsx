import { EXPERIMENTO_OBJETIVOS, type ExperimentoData, type ExperimentoObjetivo } from "@/lib/tapas/instruments";

/** Experimento de talento completo, con los 10 puntos del formato del manual (pp. 48-49). */
export default function ExperimentoResultView({
  data,
  sesion2Completa,
  print = false,
  headingClass = "text-sm font-semibold text-slate-700",
  textClass = "text-sm text-slate-700",
}: {
  data: ExperimentoData;
  sesion2Completa: boolean;
  print?: boolean;
  headingClass?: string;
  textClass?: string;
}) {
  const box = print ? "mb-3 break-inside-avoid" : "card p-4";
  const Point = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <div className={box}>
      <p className={headingClass}>
        <span className="inline-block w-5 h-5 rounded-full bg-slate-600 text-white text-[11px] text-center leading-5 mr-1.5">{n}</span>
        {title}
      </p>
      <div className={`${textClass} mt-1`}>{children}</div>
    </div>
  );
  const text = (v: string) => (v ? <p className="whitespace-pre-wrap">{v}</p> : <p className="text-slate-400">—</p>);
  const list = (items: string[]) =>
    items.length ? (
      <ul className="list-disc pl-5">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    ) : (
      <p className="text-slate-400">—</p>
    );
  const pregunta = Object.entries(data.pregunta)
    .filter(([, v]) => v)
    .map(([k]) => ({ concisa: "concisa", alcanzable: "alcanzable", relevante: "relevante" } as Record<string, string>)[k]);

  return (
    <div className="space-y-3">
      <div className={`rounded-lg px-3 py-2 text-xs ${sesion2Completa ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-amber-50 border border-amber-200 text-amber-900"}`}>
        {sesion2Completa
          ? "Experimento completo: la persona terminó las dos sesiones."
          : data.sesion === 2
          ? "Sesión 1 completa. La sesión 2 (evaluación) todavía no se envía."
          : "Sesión 1 en progreso."}
      </div>

      <p className={`${headingClass} uppercase tracking-wide`}>Sesión 1 — Planificar</p>
      <Point n={1} title="Resumen de mi perfil de talentos (cosas que me gustan y puedo hacer bien)">{list(data.p1)}</Point>
      <Point n={2} title="El talento con el que quiero experimentar es:">
        {text(data.p2)}
        {data.objetivos.length > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            Objetivo(s): {data.objetivos.map((o: ExperimentoObjetivo) => EXPERIMENTO_OBJETIVOS[o].label).join("; ")}.
          </p>
        )}
      </Point>
      <Point n={3} title="¿Qué quiero descubrir sobre mi talento y lo que significa para mí?">
        {text(data.p3)}
        <p className="text-xs text-slate-500 mt-1">
          Revisó que la pregunta fuera: {pregunta.length ? pregunta.join(", ") : "ninguna condición marcada"}.
        </p>
      </Point>
      <Point n={4} title="Por lo tanto, mi experimento de talento consiste en:">{text(data.p4)}</Point>
      <Point n={5} title="¿Cómo puedo yo (y las demás personas) verificar que mi experimento fue exitoso?">{list(data.p5)}</Point>

      <p className={`${headingClass} uppercase tracking-wide pt-2`}>Registro de la semana</p>
      <div className={box}>
        {data.diary.length === 0 ? (
          <p className="text-slate-400 text-sm">Sin anotaciones.</p>
        ) : (
          <table className="w-full border-collapse text-[10pt]">
            <tbody>
              {data.diary.map((e, i) => (
                <tr key={i}>
                  <td className="border border-slate-300 px-1.5 py-0.5 w-24 whitespace-nowrap">{e.date}</td>
                  <td className="border border-slate-300 px-1.5 py-0.5">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className={`${headingClass} uppercase tracking-wide pt-2`}>Sesión 2 — Evaluar</p>
      <Point n={6} title="Resumen de los resultados de mi experimento">{text(data.p6)}</Point>
      <Point n={7} title="Desafíos y cómo puedo mejorar">
        {data.p7.length ? (
          <table className="w-full border-collapse text-[10pt]">
            <thead>
              <tr>
                <th className="border border-slate-300 px-1.5 py-0.5 text-left">Desafío</th>
                <th className="border border-slate-300 px-1.5 py-0.5 text-left">¿Cómo puedo mejorar?</th>
              </tr>
            </thead>
            <tbody>
              {data.p7.map((r, i) => (
                <tr key={i}>
                  <td className="border border-slate-300 px-1.5 py-0.5">{r.reto}</td>
                  <td className="border border-slate-300 px-1.5 py-0.5">{r.mejora}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          text("")
        )}
      </Point>
      <Point n={8} title="Lo más importante que he aprendido es:">{text(data.p8)}</Point>
      <Point n={9} title="La próxima vez, necesito esto de parte de las demás personas:">{text(data.p9)}</Point>
      <Point n={10} title="Así es como se ve mi perfil de talentos ahora:">{text(data.p10)}</Point>
    </div>
  );
}
