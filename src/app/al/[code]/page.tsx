import { db } from "@/lib/db";
import { getSessionByCode } from "@/lib/alertIdentificationSessions";
import AlertEntryForm from "./AlertEntryForm";

export const metadata = { title: "Acta de Identificación de Alertas" };

export default function AlertaLandingPage({ params }: { params: { code: string } }) {
  const s = getSessionByCode(params.code);

  if (!s) {
    return (
      <Shell>
        <p className="text-slate-600">El código no corresponde a ninguna acta. Verifica que lo hayas escrito bien.</p>
      </Shell>
    );
  }
  if (s.status !== "ABIERTA") {
    return (
      <Shell title={`JUNTA DE CURSO ${s.curso || ""}`}>
        <p className="text-slate-600">Esta acta está cerrada en este momento. Consulta con el DECE de tu institución.</p>
      </Shell>
    );
  }

  const institution = db.prepare("SELECT name FROM institutions WHERE id = ?").get(s.institution_id) as
    | { name: string }
    | undefined;

  return (
    <Shell title={`JUNTA DE CURSO ${s.curso || ""}`} subtitle={institution?.name}>
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-slate-700 mb-5">
        Si identificaste algún riesgo psicosocial en un estudiante durante esta junta de curso, regístralo aquí. Cada
        docente agrega sus propios estudiantes; puedes enviar el formulario varias veces si identificaste a más de uno.
      </div>
      <AlertEntryForm code={s.access_code} />
    </Shell>
  );
}

function Shell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-5">
          <div className="text-3xl mb-1">🚩</div>
          <h1 className="text-lg font-bold text-slate-900">{title || "Acta de Identificación de Alertas"}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
