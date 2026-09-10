import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, Badge, formatDate } from "@/components/ui";
import DeleteButton from "@/components/DeleteButton";
import { generateQrDataUrl } from "@/lib/pasantes";
import { publicBaseUrl } from "@/lib/ovp/publicUrl";
import { getTapasSessionRoster } from "@/lib/tapas/tapasSessions";
import { TAPAS_FAMILIES, type TapasFamily } from "@/lib/tapas/archetypes";
import type { TapasResult } from "@/lib/tapas/tapasScoring";
import type { TapasSessionRow, TapasApplicationRow } from "@/lib/types";
import { setTapasSessionStatus, deleteTapasSession, deleteTapasApplication } from "../actions";

export default async function TapasSessionDetailPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const s = db
    .prepare("SELECT * FROM tapas_sessions WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as TapasSessionRow | undefined;
  if (!s) notFound();

  const apps = db
    .prepare("SELECT * FROM tapas_applications WHERE session_id = ? ORDER BY finished_at DESC, started_at DESC")
    .all(s.id) as TapasApplicationRow[];
  const roster = getTapasSessionRoster(s);
  const link = `${publicBaseUrl()}/j/${s.access_code}`;
  const qr = await generateQrDataUrl(link);

  const finalized = apps.filter((a) => a.status === "FINALIZADA");
  const respondedIds = new Set(finalized.map((a) => a.student_id).filter(Boolean));
  const pending = roster.filter((r) => !respondedIds.has(r.id));

  const famDist: Record<string, number> = {};
  for (const a of finalized) {
    try {
      const r = JSON.parse(a.result_json || "{}") as TapasResult;
      const top = r.dominantFamilias?.[0];
      if (top) famDist[top] = (famDist[top] || 0) + 1;
    } catch {
      /* noop */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        description={[s.course, s.parallel && `"${s.parallel}"`, s.jornada].filter(Boolean).join(" ") || "Sin curso definido"}
        action={
          <div className="flex items-center gap-2">
            <Link href="/tapas" className="btn-secondary text-xs">← Todas</Link>
            {s.status === "ABIERTA" ? (
              <form action={setTapasSessionStatus.bind(null, s.id, "CERRADA")}>
                <button className="btn-secondary text-xs">Cerrar</button>
              </form>
            ) : (
              <form action={setTapasSessionStatus.bind(null, s.id, "ABIERTA")}>
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
          <p className="text-sm text-slate-600">Los estudiantes entran a:</p>
          <p className="font-mono text-sm bg-slate-100 rounded px-3 py-2 break-all select-all">{link}</p>
          <p className="text-sm text-slate-600">
            O en <span className="font-semibold">{publicBaseUrl().replace(/^https?:\/\//, "")}/j</span> con el código{" "}
            <span className="font-mono text-lg font-bold tracking-widest">{s.access_code}</span>
          </p>
          <p className="text-[11px] text-slate-400">No necesitan cuenta. El juego se puede pausar y retomar desde el mismo enlace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4"><div className="text-2xl font-bold text-slate-800">{roster.length || "—"}</div><div className="text-xs text-slate-500">En la lista del curso</div></div>
        <div className="card p-4"><div className="text-2xl font-bold text-brand-700">{finalized.length}</div><div className="text-xs text-slate-500">Finalizados</div></div>
        <div className="card p-4"><div className="text-2xl font-bold text-amber-600">{apps.length - finalized.length}</div><div className="text-xs text-slate-500">En progreso</div></div>
        <div className="card p-4"><div className="text-2xl font-bold text-rose-600">{roster.length ? pending.length : "—"}</div><div className="text-xs text-slate-500">Pendientes de la lista</div></div>
      </div>

      {finalized.length > 0 && Object.keys(famDist).length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Familia de talento dominante del curso</h3>
          <div className="space-y-1.5">
            {Object.entries(famDist)
              .sort((a, b) => b[1] - a[1])
              .map(([fam, n]) => (
                <div key={fam} className="flex items-center gap-2 text-xs">
                  <span className="w-44 font-medium text-slate-700">
                    {TAPAS_FAMILIES[fam as TapasFamily].emoji} {TAPAS_FAMILIES[fam as TapasFamily].label}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded h-4 overflow-hidden">
                    <div className="h-full" style={{ width: `${(n / finalized.length) * 100}%`, backgroundColor: TAPAS_FAMILIES[fam as TapasFamily].color }} />
                  </div>
                  <span className="w-8 text-right text-slate-500">{n}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">Juegos</h3></div>
        {apps.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">Todavía nadie ha empezado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Estado</th>
                  <th>Talento principal</th>
                  <th>Finalizado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => {
                  let topGroup = "";
                  try {
                    topGroup = (JSON.parse(a.result_json || "{}") as TapasResult).groups?.[0]?.name || "";
                  } catch {
                    /* noop */
                  }
                  return (
                    <tr key={a.id}>
                      <td className="text-sm font-semibold text-slate-900">
                        {a.student_name}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {[a.course_snapshot, a.parallel_snapshot].filter(Boolean).join(" ")}
                        </span>
                      </td>
                      <td>{a.status === "FINALIZADA" ? <Badge color="green">Finalizado</Badge> : <Badge color="amber">En progreso</Badge>}</td>
                      <td className="text-xs text-slate-700">{topGroup || "—"}</td>
                      <td className="text-xs text-slate-500">{a.finished_at ? formatDate(a.finished_at) : "—"}</td>
                      <td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {a.status === "FINALIZADA" && (
                            <>
                              <Link href={`/tapas/${s.id}/resultado/${a.id}`} className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200">
                                Ver perfil
                              </Link>
                              <Link href={`/tapas/${s.id}/informe/${a.id}`} className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded">
                                Informe
                              </Link>
                            </>
                          )}
                          <DeleteButton
                            onDelete={async () => {
                              "use server";
                              await deleteTapasApplication(s.id, a.id);
                            }}
                            confirmMessage="¿Eliminar este juego y sus respuestas?"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <DeleteButton
          onDelete={async () => {
            "use server";
            return await deleteTapasSession(s.id);
          }}
          confirmMessage="¿Eliminar toda la aplicación? Solo es posible si no tiene juegos finalizados."
          label="🗑️ Eliminar aplicación"
          redirectTo="/tapas"
        />
      </div>
    </div>
  );
}
