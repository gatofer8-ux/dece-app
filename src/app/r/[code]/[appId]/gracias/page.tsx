import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOvpSessionByCode } from "@/lib/ovp/ovpSessions";
import { IPPJ_SCALE_META } from "@/lib/ovp/ippjInstrument";
import { suggestedAreasFor, type CareerArea } from "@/lib/ovp/ippjCareers";
import type { IppjScoreResult } from "@/lib/ovp/ippjScoring";
import type { OvpApplicationRow } from "@/lib/types";

export const metadata = { title: "¡Gracias! — IPPJ" };

export default function GraciasPage({ params }: { params: { code: string; appId: string } }) {
  const s = getOvpSessionByCode(params.code);
  if (!s) notFound();
  const app = db
    .prepare("SELECT * FROM ovp_applications WHERE id = ? AND session_id = ?")
    .get(params.appId, s.id) as OvpApplicationRow | undefined;
  if (!app) notFound();

  let result: IppjScoreResult | null = null;
  try {
    result = app.result_json ? (JSON.parse(app.result_json) as IppjScoreResult) : null;
  } catch {
    result = null;
  }

  const areas: { area: CareerArea }[] = result ? suggestedAreasFor(result.topTypes).slice(0, 4) : [];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h1 className="text-lg font-bold text-slate-900">¡Listo, {app.student_name.split(" ")[0]}!</h1>
        <p className="text-sm text-slate-600 mt-1">
          Tus respuestas se guardaron. El DECE de tu institución revisará tu perfil y lo conversará contigo.
        </p>

        {result && (
          <div className="mt-6 text-left">
            <p className="text-sm font-semibold text-slate-800 mb-1">Tus intereses se orientan hacia:</p>
            <p className="text-sm text-slate-700 mb-3">
              {result.topTypes.map((t) => IPPJ_SCALE_META[t].label).join(" · ")}
            </p>
            <p className="text-sm font-semibold text-slate-800 mb-1">Áreas que podrías explorar:</p>
            <ul className="text-sm text-slate-700 list-disc pl-5 space-y-0.5">
              {areas.map(({ area }) => (
                <li key={area.area}>{area.area}</li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-400 mt-4">
              Esto es una orientación general. La decisión se construye contigo, tu familia y el DECE, tomando en
              cuenta la oferta educativa cercana y las becas disponibles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
