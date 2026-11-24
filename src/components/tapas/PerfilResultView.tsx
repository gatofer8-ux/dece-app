import QuadrantChart, { itemLabel } from "./QuadrantChart";
import {
  PROFILE_SET_LABELS,
  QUADRANTS,
  QUADRANT_ORDER,
  type PerfilResult,
  type ProfileSet,
  type Quadrant,
} from "@/lib/tapas/instruments";

/** Resultado del Perfil de talentos (versión 1 o 2): planos, cuadrantes y preguntas para la entrevista. */
export default function PerfilResultView({
  result,
  print = false,
  headingClass = "text-sm font-semibold text-slate-700",
  textClass = "text-sm text-slate-700",
}: {
  result: PerfilResult;
  print?: boolean;
  headingClass?: string;
  textClass?: string;
}) {
  const sets: ProfileSet[] = result.version === 1 ? ["own", "other"] : ["studies", "free"];
  const qLabel = (q: Quadrant, set: ProfileSet) => (set === "studies" ? QUADRANTS[q].studyLabel : QUADRANTS[q].label);

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${print ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
        {sets.map((set) => {
          const items = result.sets[set] || [];
          return (
            <div key={set} className={print ? "break-inside-avoid" : "card p-4"}>
              <p className={headingClass}>{PROFILE_SET_LABELS[set]}</p>
              {items.length === 0 ? (
                <p className="text-xs text-slate-400 mt-1">
                  {set === "other" ? "No se completó (es opcional: requiere a otra persona)." : "Sin datos."}
                </p>
              ) : (
                <>
                  <QuadrantChart
                    dots={items.map((it, i) => ({ id: it.id, label: itemLabel(set, i), x: it.x, y: it.y, title: it.text }))}
                    yTop={set === "studies" ? "Tengo buenos resultados" : "Lo hago bien"}
                    yBottom={set === "studies" ? "Tengo malos resultados" : "Lo hago mal"}
                    className="max-w-[18rem] mx-auto my-2"
                  />
                  <table className="w-full border-collapse text-[10pt]">
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={it.id}>
                          <td className="border border-slate-300 px-1.5 py-0.5 w-6 text-center font-bold">{itemLabel(set, i)}</td>
                          <td className="border border-slate-300 px-1.5 py-0.5">{it.emoji ? `${it.emoji} ` : ""}{it.text}</td>
                          <td className="border border-slate-300 px-1.5 py-0.5 text-[9pt]" style={{ color: it.quadrant ? QUADRANTS[it.quadrant].color : undefined }}>
                            {it.quadrant ? `${QUADRANTS[it.quadrant].signs} ${qLabel(it.quadrant, set)}` : "sin ubicar"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className={print ? "" : "card p-4"}>
        <p className={headingClass}>Lectura por cuadrantes</p>
        <ul className="mt-2 space-y-2">
          {QUADRANT_ORDER.map((q) => {
            const names = sets.flatMap((s) => (result.sets[s] || []).filter((i) => i.quadrant === q).map((i) => i.text));
            return (
              <li key={q} className="border-l-4 pl-3" style={{ borderColor: QUADRANTS[q].color }}>
                <p className={textClass}>
                  <strong style={{ color: QUADRANTS[q].color }}>{QUADRANTS[q].signs} {QUADRANTS[q].label}</strong>
                  {names.length ? `: ${names.join(", ")}.` : ": —"}
                </p>
                <p className="text-[11px] text-slate-500">{QUADRANTS[q].meaning}</p>
              </li>
            );
          })}
        </ul>
        {result.version === 1 && result.coincidences.length > 0 && (
          <p className={`${textClass} mt-3`}>
            <strong>Coinciden con lo que ve otra persona:</strong> {result.coincidences.join(", ")}.
          </p>
        )}
        {result.version === 2 && result.bridges && (result.bridges.studies.length > 0 || result.bridges.free.length > 0) && (
          <p className={`${textClass} mt-3`}>
            <strong>Vínculo entre estudios y tiempo libre (talento con pasión en ambos planos):</strong> estudios:{" "}
            {result.bridges.studies.join(", ") || "—"}; tiempo libre: {result.bridges.free.join(", ") || "—"}.
          </p>
        )}
      </div>

      {(result.relation || result.closing) && (
        <div className={print ? "" : "card p-4 space-y-3"}>
          {result.relation && (
            <div>
              <p className={headingClass}>Relación que ve entre sus estudios y su tiempo libre</p>
              <p className={`${textClass} whitespace-pre-wrap`}>{result.relation}</p>
            </div>
          )}
          {result.closing && (
            <div>
              <p className={headingClass}>Lo que descubrió sobre sí mismo/a</p>
              <p className={`${textClass} whitespace-pre-wrap`}>{result.closing}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Preguntas del manual (pp. 22-23) para conversar el perfil en la entrevista. */
export const PERFIL_ENTREVISTA_PREGUNTAS = [
  "¿Percibes una relación entre las asignaturas que disfrutas, tus rasgos de personalidad y las actividades que prefieres en tu tiempo libre?",
  "¿Puedes definir esas similitudes a través de un talento que tienes o de algún campo de actividad (o laboral) que te apasiona?",
  "¿Cómo podrías desarrollar aquellos ámbitos de talento en los que demuestras capacidades pero en cambio disfrutas menos?",
  "¿Qué aspectos de ti salieron a la luz con este ejercicio y cómo te pueden apoyar en tu proceso de construcción del Proyecto de Vida?",
];
