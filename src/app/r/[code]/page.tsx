import { db } from "@/lib/db";
import { getOvpSessionByCode, isSessionOpen, getSessionRoster } from "@/lib/ovp/ovpSessions";
import { IPPJ_ITEM_COUNT, IPPJ_DISCLAIMER } from "@/lib/ovp/ippjInstrument";
import RStartForm from "./RStartForm";

export const metadata = { title: "Inventario de Preferencias Profesionales (IPPJ)" };

export default function RLandingPage({ params }: { params: { code: string } }) {
  const s = getOvpSessionByCode(params.code);

  if (!s) {
    return <Shell><p className="text-slate-600">El código no corresponde a ninguna evaluación. Verifica que lo hayas escrito bien.</p></Shell>;
  }
  if (!isSessionOpen(s)) {
    return (
      <Shell title={s.title}>
        <p className="text-slate-600">Esta evaluación está cerrada en este momento. Consulta con el DECE de tu institución.</p>
      </Shell>
    );
  }

  const institution = db.prepare("SELECT name FROM institutions WHERE id = ?").get(s.institution_id) as
    | { name: string }
    | undefined;
  const roster = getSessionRoster(s).map((r) => ({ id: r.id, full_name: r.full_name }));

  return (
    <Shell title={s.title} subtitle={institution?.name}>
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-slate-700 space-y-1.5">
        <p>
          Vas a responder el <strong>Inventario de Preferencias Profesionales para Jóvenes (IPPJ)</strong>: una
          encuesta breve y {IPPJ_ITEM_COUNT} frases sobre tus gustos e intereses.
        </p>
        <p>No hay respuestas buenas ni malas. Responde con sinceridad lo que más se parece a ti.</p>
        <p>Toma unos 15–20 minutos. Puedes pausar y continuar después desde el mismo enlace.</p>
      </div>

      <div className="mt-5">
        <RStartForm code={s.access_code} roster={roster} courseFixed={s.course} parallelFixed={s.parallel} />
      </div>

      <p className="text-[10px] text-slate-400 mt-6">{IPPJ_DISCLAIMER}</p>
    </Shell>
  );
}

function Shell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-5">
          <div className="text-3xl mb-1">🧭</div>
          <h1 className="text-lg font-bold text-slate-900">{title || "Orientación Vocacional"}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
