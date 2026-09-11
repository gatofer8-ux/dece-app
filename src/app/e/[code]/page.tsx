import { db } from "@/lib/db";
import { getSurveySessionByCode, isSurveySessionOpen } from "@/lib/eneis/eneisSurveySessions";
import { getSurveyQuestions, instrumentLabel, ENEIS_SURVEY_INTRO } from "@/lib/eneis/eneisSurveyInstrument";
import SurveyForm from "./SurveyForm";

export const metadata = { title: "Encuesta ENEIS" };

export default function EncuestaLandingPage({ params }: { params: { code: string } }) {
  const s = getSurveySessionByCode(params.code);

  if (!s) {
    return (
      <Shell>
        <p className="text-slate-600">El código no corresponde a ninguna encuesta. Verifica que lo hayas escrito bien.</p>
      </Shell>
    );
  }
  if (!isSurveySessionOpen(s)) {
    return (
      <Shell title={s.title}>
        <p className="text-slate-600">Esta encuesta está cerrada en este momento. Consulta con el DECE de tu institución.</p>
      </Shell>
    );
  }

  const institution = db.prepare("SELECT name FROM institutions WHERE id = ?").get(s.institution_id) as
    | { name: string }
    | undefined;
  const questions = getSurveyQuestions(s.instrument);

  return (
    <Shell title={instrumentLabel(s.instrument)} subtitle={institution?.name}>
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-slate-700 mb-5">{ENEIS_SURVEY_INTRO}</div>
      <SurveyForm code={s.access_code} questions={questions} />
    </Shell>
  );
}

function Shell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-5">
          <div className="text-3xl mb-1">📊</div>
          <h1 className="text-lg font-bold text-slate-900">{title || "Encuesta ENEIS"}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
