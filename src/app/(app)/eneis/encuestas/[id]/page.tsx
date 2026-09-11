import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { PageHeader, Badge, formatDate } from "@/components/ui";
import DeleteButton from "@/components/DeleteButton";
import { generateQrDataUrl } from "@/lib/pasantes";
import { publicBaseUrl } from "@/lib/ovp/publicUrl";
import { getSurveySession, countSurveyResponses, tabulateSurveySession } from "@/lib/eneis/eneisSurveySessions";
import { instrumentLabel } from "@/lib/eneis/eneisSurveyInstrument";
import { setEneisSurveySessionStatusAction, deleteEneisSurveySessionAction } from "../actions";

const BAR_COLORS = ["#1F3864", "#2E5C9E", "#5B9BD5", "#9DC3E6", "#C9DFF3"];

export default async function EneisEncuestaDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const s = getSurveySession(params.id, institutionId);
  if (!s) notFound();

  const total = countSurveyResponses(s.id);
  const link = `${publicBaseUrl()}/e/${s.access_code}`;
  const qr = await generateQrDataUrl(link);
  const tabulation = tabulateSurveySession(s);

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={`${instrumentLabel(s.instrument)} · ${total} respuesta(s) recibida(s)`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/eneis/encuestas" className="btn-secondary text-xs">← Todas</Link>
            {s.status === "ABIERTA" ? (
              <form action={setEneisSurveySessionStatusAction.bind(null, s.id, "CERRADA")}>
                <button className="btn-secondary text-xs">Cerrar</button>
              </form>
            ) : (
              <form action={setEneisSurveySessionStatusAction.bind(null, s.id, "ABIERTA")}>
                <button className="btn-primary text-xs">Reabrir</button>
              </form>
            )}
          </div>
        }
      />

      <div className="card p-5 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Código QR" className="w-40 h-40 rounded-lg border" />
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {s.status === "ABIERTA" ? <Badge color="green">Abierta</Badge> : <Badge color="slate">Cerrada</Badge>}
            {(s.opens_at || s.closes_at) && (
              <span className="text-xs text-slate-500">
                {s.opens_at ? `Desde ${formatDate(s.opens_at)}` : ""} {s.closes_at ? `· Hasta ${formatDate(s.closes_at)}` : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">Se responde en:</p>
          <p className="font-mono text-sm bg-slate-100 rounded px-3 py-2 break-all select-all">{link}</p>
          <p className="text-sm text-slate-600">
            O en <span className="font-semibold">{publicBaseUrl().replace(/^https?:\/\//, "")}/e</span> con el código{" "}
            <span className="font-mono text-lg font-bold tracking-widest">{s.access_code}</span>
          </p>
          <p className="text-[11px] text-slate-400">Respuestas anónimas: no se guarda quién respondió.</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="card p-6 text-sm text-slate-500">
          Todavía no llega ninguna respuesta. Comparte el enlace o el código con {s.instrument === "DOCENTES" ? "los docentes" : "los estudiantes"}.
        </div>
      ) : (
        <div className="space-y-4">
          {tabulation.map((q, qi) => (
            <div key={qi} className="card p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                {qi + 1}. {q.text}
              </h3>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2 text-xs">
                    <span className="w-56 shrink-0 font-medium text-slate-700">{opt.label}</span>
                    <div className="flex-1 bg-slate-100 rounded h-4 overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${opt.pct}%`, backgroundColor: BAR_COLORS[oi % BAR_COLORS.length] }}
                      />
                    </div>
                    <span className="w-20 text-right text-slate-500">
                      {opt.count} ({opt.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="flex justify-end">
          <DeleteButton
            onDelete={async () => {
              "use server";
              return await deleteEneisSurveySessionAction(s.id);
            }}
            confirmMessage="¿Eliminar esta encuesta y todas sus respuestas? Esta acción no se puede deshacer."
            label="🗑️ Eliminar encuesta"
            redirectTo="/eneis/encuestas"
          />
        </div>
      )}
    </div>
  );
}
