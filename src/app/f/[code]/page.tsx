import { db } from "@/lib/db";
import { getEneisSessionByCode, isSessionOpen } from "@/lib/eneis/eneisSessions";
import FichaForm from "./FichaForm";

export const metadata = { title: "Ficha de Aplicación ENEIS" };

export default function FichaLandingPage({ params }: { params: { code: string } }) {
  const s = getEneisSessionByCode(params.code);

  if (!s) {
    return (
      <Shell>
        <p className="text-slate-600">El código no corresponde a ninguna convocatoria. Verifica que lo hayas escrito bien.</p>
      </Shell>
    );
  }
  if (!isSessionOpen(s)) {
    return (
      <Shell title={s.title}>
        <p className="text-slate-600">Esta convocatoria está cerrada en este momento. Consulta con el DECE de tu institución.</p>
      </Shell>
    );
  }

  const institution = db.prepare("SELECT name FROM institutions WHERE id = ?").get(s.institution_id) as
    | { name: string }
    | undefined;

  return (
    <Shell title={s.title} subtitle={institution?.name}>
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-slate-700 space-y-1.5 mb-5">
        <p>
          Llena la <strong>Ficha de Actividades de Aplicación ENEIS</strong> de la clase donde trabajaste el tema. No
          necesitas cuenta ni contraseña.
        </p>
        <p>Puedes entregar más de una ficha durante el período si aplicaste el tema en varios cursos o momentos.</p>
      </div>
      <FichaForm code={s.access_code} />
    </Shell>
  );
}

function Shell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-5">
          <div className="text-3xl mb-1">🧩</div>
          <h1 className="text-lg font-bold text-slate-900">{title || "Ficha de Aplicación ENEIS"}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
