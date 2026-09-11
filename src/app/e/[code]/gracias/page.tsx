import { notFound } from "next/navigation";
import { getSurveySessionByCode } from "@/lib/eneis/eneisSurveySessions";

export const metadata = { title: "¡Gracias! — Encuesta ENEIS" };

export default function GraciasEncuestaPage({ params }: { params: { code: string } }) {
  const s = getSurveySessionByCode(params.code);
  if (!s) notFound();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h1 className="text-lg font-bold text-slate-900">¡Gracias por responder!</h1>
        <p className="text-sm text-slate-600 mt-1">
          Tu respuesta se guardó de forma anónima. Ayuda a mejorar la implementación del ENEIS en tu institución.
        </p>
      </div>
    </div>
  );
}
