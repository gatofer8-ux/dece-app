import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getTapasSessionByCode } from "@/lib/tapas/tapasSessions";
import { ARCHETYPE_MAP, TAPAS_FAMILIES, type TapasFamily } from "@/lib/tapas/archetypes";
import type { TapasResult } from "@/lib/tapas/tapasScoring";
import type { TapasApplicationRow } from "@/lib/types";

export const metadata = { title: "¡Gracias! — Juego de arquetipos" };

export default function TapasGraciasPage({ params }: { params: { code: string; appId: string } }) {
  const s = getTapasSessionByCode(params.code);
  if (!s) notFound();
  const app = db
    .prepare("SELECT * FROM tapas_applications WHERE id = ? AND session_id = ?")
    .get(params.appId, s.id) as TapasApplicationRow | undefined;
  if (!app) notFound();

  let result: TapasResult | null = null;
  try {
    result = app.result_json ? (JSON.parse(app.result_json) as TapasResult) : null;
  } catch {
    result = null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <h1 className="text-lg font-bold text-slate-900">¡Listo, {app.student_name.split(" ")[0]}!</h1>
        <p className="text-sm text-slate-600 mt-1">
          Terminaste el juego. El DECE de tu institución revisará tu perfil de talentos y lo conversará contigo.
        </p>

        {result && (
          <div className="mt-6 text-left space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-1">Tus grupos de talentos, del más fuerte al más débil:</p>
              <ol className="text-sm text-slate-700 list-decimal pl-5 space-y-0.5">
                {result.groups.map((g, i) => (
                  <li key={i}>
                    <strong>{g.name}</strong> — {g.archetypes.map((k) => ARCHETYPE_MAP[k]?.name).slice(0, 4).join(", ")}
                    {g.archetypes.length > 4 ? "…" : ""}
                  </li>
                ))}
              </ol>
            </div>
            {result.dominantFamilias.length > 0 && (
              <p className="text-sm text-slate-700">
                Tus intereses se inclinan hacia:{" "}
                <strong>{result.dominantFamilias.map((f) => TAPAS_FAMILIES[f as TapasFamily].label).join(" · ")}</strong>.
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              Esto es una orientación. Tu decisión se construye contigo, tu familia y el DECE, tomando en cuenta la
              oferta educativa cercana y las becas disponibles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
