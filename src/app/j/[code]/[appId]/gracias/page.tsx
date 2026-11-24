import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getTapasSessionByCode } from "@/lib/tapas/tapasSessions";
import { ARCHETYPE_MAP, TAPAS_FAMILIES, type TapasFamily } from "@/lib/tapas/archetypes";
import { isTapasNivel } from "@/lib/tapas/niveles";
import type { TapasResult } from "@/lib/tapas/tapasScoring";
import { QUADRANTS, type ExperimentoResult, type PerfilResult } from "@/lib/tapas/instruments";
import type { TapasApplicationRow } from "@/lib/types";

export const metadata = { title: "¡Gracias! — TaPas" };

export default function TapasGraciasPage({ params }: { params: { code: string; appId: string } }) {
  const s = getTapasSessionByCode(params.code);
  if (!s) notFound();
  const app = db
    .prepare("SELECT * FROM tapas_applications WHERE id = ? AND session_id = ?")
    .get(params.appId, s.id) as TapasApplicationRow | undefined;
  if (!app) notFound();

  let result: unknown = null;
  try {
    result = app.result_json ? JSON.parse(app.result_json) : null;
  } catch {
    result = null;
  }
  const nivel = isTapasNivel(s.nivel) ? s.nivel : "BACHILLERATO";
  const inicial = nivel === "INICIAL";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <h1 className="text-lg font-bold text-slate-900">¡Listo, {app.student_name.split(" ")[0]}!</h1>
        <p className="text-sm text-slate-600 mt-1">
          {inicial
            ? "¡Terminaste! Tu maestra o maestro conversará contigo sobre lo que más te gusta."
            : "Terminaste. El DECE de tu institución revisará tu trabajo y lo conversará contigo."}
        </p>

        {result !== null && (
          <div className="mt-6 text-left space-y-4">
            {app.instrument === "ARQUETIPOS" && <Arquetipos r={result as TapasResult} inicial={inicial} />}
            {(app.instrument === "PERFIL_V1" || app.instrument === "PERFIL_V2") && <Perfil r={result as PerfilResult} />}
            {app.instrument === "EXPERIMENTO" && <Experimento r={result as ExperimentoResult} />}
            <p className="text-[11px] text-slate-400">
              Esto es una orientación. Tu decisión se construye contigo, tu familia y el DECE.
            </p>
          </div>
        )}

        {app.participant_id && (
          <a
            href={`/j/${params.code}/h/${app.participant_id}`}
            className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white"
          >
            Ir a mis hojas →
          </a>
        )}
      </div>
    </div>
  );
}

function Arquetipos({ r, inicial }: { r: TapasResult; inicial: boolean }) {
  return (
    <>
      <div>
        <p className="text-sm font-semibold text-slate-800 mb-1">
          {inicial ? "Tus tarjetas favoritas:" : "Tus grupos de talentos, del más fuerte al más débil:"}
        </p>
        <ol className="text-sm text-slate-700 list-decimal pl-5 space-y-0.5">
          {r.groups.map((g, i) => (
            <li key={i}>
              <strong>{g.name}</strong>
              {inicial
                ? ""
                : ` — ${g.archetypes.map((k) => ARCHETYPE_MAP[k]?.name).slice(0, 4).join(", ")}${g.archetypes.length > 4 ? "…" : ""}`}
            </li>
          ))}
        </ol>
      </div>
      {!inicial && r.dominantFamilias.length > 0 && (
        <p className="text-sm text-slate-700">
          Tus intereses se inclinan hacia:{" "}
          <strong>{r.dominantFamilias.map((f) => TAPAS_FAMILIES[f as TapasFamily].label).join(" · ")}</strong>.
        </p>
      )}
    </>
  );
}

function Perfil({ r }: { r: PerfilResult }) {
  return (
    <div className="space-y-2 text-sm text-slate-700">
      {r.strengths.length > 0 && (
        <p>
          <strong style={{ color: QUADRANTS.BIEN_GUSTA.color }}>Lo que haces bien y te gusta:</strong> {r.strengths.join(", ")}.
        </p>
      )}
      {r.toDevelop.length > 0 && (
        <p>
          <strong style={{ color: QUADRANTS.MAL_GUSTA.color }}>Lo que te gusta y puedes desarrollar:</strong> {r.toDevelop.join(", ")}.
        </p>
      )}
      {r.strengths.length === 0 && r.toDevelop.length === 0 && <p>Tu perfil quedó guardado para conversarlo con el DECE.</p>}
    </div>
  );
}

function Experimento({ r }: { r: ExperimentoResult }) {
  return (
    <div className="space-y-2 text-sm text-slate-700">
      <p><strong>Tu talento:</strong> {r.talento}</p>
      {r.aprendizaje && <p><strong>Lo más importante que aprendiste:</strong> {r.aprendizaje}</p>}
    </div>
  );
}
