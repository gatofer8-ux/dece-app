import { notFound } from "next/navigation";
import { getEneisSessionByCode } from "@/lib/eneis/eneisSessions";

export const metadata = { title: "¡Gracias! — Ficha ENEIS" };

export default function GraciasPage({ params }: { params: { code: string } }) {
  const s = getEneisSessionByCode(params.code);
  if (!s) notFound();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h1 className="text-lg font-bold text-slate-900">¡Ficha recibida!</h1>
        <p className="text-sm text-slate-600 mt-1">
          Gracias por entregar tu ficha de aplicación ENEIS. El DECE de tu institución la revisará y la tendrá lista
          para las firmas de responsabilidad.
        </p>
        <p className="text-[11px] text-slate-400 mt-6">
          Si necesitas otra copia o corregir algo, comunícate con el DECE de tu institución.
        </p>
      </div>
    </div>
  );
}
