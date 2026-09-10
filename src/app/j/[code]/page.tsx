import { db } from "@/lib/db";
import { getTapasSessionByCode, isTapasSessionOpen, getTapasSessionRoster } from "@/lib/tapas/tapasSessions";
import { ARCHETYPE_COUNT, TAPAS_INTRO_STEPS, TAPAS_SOURCE } from "@/lib/tapas/archetypes";
import JStartForm from "./JStartForm";

export const metadata = { title: "Juego de arquetipos — Talentos y Pasiones" };

export default function JLandingPage({ params }: { params: { code: string } }) {
  const s = getTapasSessionByCode(params.code);
  if (!s) return <Shell><p className="text-slate-600">El código no corresponde a ningún juego. Verifica que lo hayas escrito bien.</p></Shell>;
  if (!isTapasSessionOpen(s)) {
    return <Shell title={s.title}><p className="text-slate-600">Este juego está cerrado en este momento. Consulta con el DECE de tu institución.</p></Shell>;
  }

  const institution = db.prepare("SELECT name FROM institutions WHERE id = ?").get(s.institution_id) as { name: string } | undefined;
  const roster = getTapasSessionRoster(s).map((r) => ({ id: r.id, full_name: r.full_name }));

  return (
    <Shell title={s.title} subtitle={institution?.name}>
      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 text-sm text-slate-700 space-y-1.5">
        <p><strong>Juego de Tarjetas de Arquetipos</strong> ({ARCHETYPE_COUNT} tarjetas). Sirve para descubrir tus talentos y pasiones.</p>
        <ol className="list-decimal pl-5 space-y-1">
          {TAPAS_INTRO_STEPS.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
        <p>Toma unos 15–20 minutos. Puedes pausar y continuar después desde el mismo enlace.</p>
      </div>

      <div className="mt-5">
        <JStartForm code={s.access_code} roster={roster} courseFixed={s.course} parallelFixed={s.parallel} />
      </div>

      <p className="text-[10px] text-slate-400 mt-6">Fuente: {TAPAS_SOURCE}</p>
    </Shell>
  );
}

function Shell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-5">
          <div className="text-3xl mb-1">🃏</div>
          <h1 className="text-lg font-bold text-slate-900">{title || "Juego de arquetipos"}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
