import { notFound } from "next/navigation";
import { getSessionByCode } from "@/lib/alertIdentificationSessions";

export const metadata = { title: "¡Gracias! — Acta de Identificación de Alertas" };

export default function GraciasPage({ params }: { params: { code: string } }) {
  const s = getSessionByCode(params.code);
  if (!s) notFound();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h1 className="text-lg font-bold text-slate-900">¡Registro guardado!</h1>
        <p className="text-sm text-slate-600 mt-1">
          El estudiante quedó registrado en el acta de identificación de alertas de esta junta de curso. El DECE dará
          seguimiento al caso.
        </p>
        <p className="text-[11px] text-slate-400 mt-6">
          ¿Identificaste a otro estudiante? Vuelve atrás y completa el formulario nuevamente.
        </p>
      </div>
    </div>
  );
}
