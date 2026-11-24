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
import { TAPAS_INSTRUMENTS, TAPAS_NIVELES, isTapasInstrument, isTapasNivel } from "@/lib/tapas/niveles";
import type { PerfilResult } from "@/lib/tapas/instruments";
import type { TapasSessionRow, TapasApplicationRow } from "@/lib/types";
import { setTapasSessionStatus, deleteTapasSession, deleteTapasApplication, setTapasHojaOpen } from "../actions";
import { estimateMinutes, isMultiHoja, parsePlan, suggestSchedule } from "@/lib/tapas/plan";

export default async function TapasSessionDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { hoja?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const s = db
    .prepare("SELECT * FROM tapas_sessions WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as TapasSessionRow | undefined;
  if (!s) notFound();

  const allApps = db
    .prepare("SELECT * FROM tapas_applications WHERE session_id = ? ORDER BY finished_at DESC, started_at DESC")
    .all(s.id) as TapasApplicationRow[];
  const plan = parsePlan(s);
  const multi = isMultiHoja(plan);
  const hojaParam = searchParams?.hoja;
  const activeHoja =
    multi && hojaParam && isTapasInstrument(hojaParam) && plan.instruments.includes(hojaParam) ? hojaParam : plan.instruments[0];
  /** En un proceso, cada persona tiene una fila por hoja; «iniciada» = ya respondió algo. */
  const isStarted = (a: TapasApplicationRow) =>
    a.status === "FINALIZADA" ||
    !!a.data_json ||
    (a.instrument === "ARQUETIPOS" && a.classification_json && a.classification_json !== "{}");
  const apps = multi ? allApps.filter((a) => a.instrument === activeHoja && isStarted(a)) : allApps;
  const roster = getTapasSessionRoster(s);
  const link = `${publicBaseUrl()}/j/${s.access_code}`;
  const qr = await generateQrDataUrl(link);

  const instrument = multi ? activeHoja : isTapasInstrument(s.instrument) ? s.instrument : "ARQUETIPOS";
  const nivel = isTapasNivel(s.nivel) ? s.nivel : "BACHILLERATO";
  const info = TAPAS_INSTRUMENTS[instrument];
  const finalized = apps.filter((a) => a.status === "FINALIZADA");

  /** Lo más destacado de cada persona, según la herramienta. */
  function highlightOf(a: TapasApplicationRow): string {
    try {
      if (instrument === "ARQUETIPOS") return (JSON.parse(a.result_json || "{}") as TapasResult).groups?.[0]?.name || "";
      if (instrument === "EXPERIMENTO") {
        const d = JSON.parse(a.data_json || "{}") as { p2?: string; sesion?: number };
        return d.p2 ? `${d.p2}${a.status === "FINALIZADA" ? "" : d.sesion === 2 ? " (sesión 1 lista)" : " (sesión 1 en curso)"}` : "";
      }
      return (JSON.parse(a.result_json || "{}") as PerfilResult).strengths?.slice(0, 2).join(", ") || "";
    } catch {
      return "";
    }
  }
  const hasResult = (a: TapasApplicationRow) =>
    a.status === "FINALIZADA" || (instrument === "EXPERIMENTO" && !!a.data_json);
  const respondedIds = new Set(finalized.map((a) => a.student_id).filter(Boolean));
  const pending = roster.filter((r) => !respondedIds.has(r.id));

  const famDist: Record<string, number> = {};
  for (const a of instrument === "ARQUETIPOS" ? finalized : []) {
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
            <Link href={`/tapas/${s.id}/informe-colectivo`} className="btn-secondary text-xs">📊 Informe colectivo</Link>
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
            {multi ? <Badge color="blue">🗂️ Proceso TaPas · {plan.instruments.length} hojas</Badge> : <Badge color="blue">{info.emoji} {info.label}</Badge>}
            <Badge color="amber">Nivel {TAPAS_NIVELES[nivel].label}</Badge>
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

      {multi && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Hojas del proceso</h3>
              <p className="text-[11px] text-slate-500">
                {plan.modo === "VARIAS"
                  ? "Habilita cada hoja en su hora de clase. Los estudiantes vuelven con el mismo código y continúan donde se quedaron."
                  : "Todas las hojas están abiertas: cada estudiante avanza a su ritmo. Puedes cerrar alguna si prefieres ir por partes."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {plan.instruments.map((i) => {
              const rows = allApps.filter((a) => a.instrument === i);
              const done = rows.filter((a) => a.status === "FINALIZADA").length;
              const started = rows.filter(isStarted).length;
              const isOpen = plan.open.includes(i);
              return (
                <div key={i} className={`rounded-lg border p-3 ${i === activeHoja ? "border-brand-500 bg-brand-50/40" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/tapas/${s.id}?hoja=${i}`} className="text-sm font-semibold text-slate-900 hover:underline">
                      {TAPAS_INSTRUMENTS[i].emoji} {TAPAS_INSTRUMENTS[i].label}
                    </Link>
                    <form action={setTapasHojaOpen.bind(null, s.id, i, !isOpen)}>
                      <button className={`text-[11px] font-semibold rounded px-2 py-1 border ${isOpen ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-600"}`}>
                        {isOpen ? "🔓 Abierta · cerrar" : "🔒 Cerrada · habilitar"}
                      </button>
                    </form>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {done} finalizadas · {started - done} en progreso · ≈ {estimateMinutes(i, nivel)} min{i === "EXPERIMENTO" ? " por sesión" : ""}
                  </p>
                </div>
              );
            })}
          </div>
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-700">Plan sugerido de sesiones de clase ({plan.minutosHora} min cada una)</summary>
            <ol className="mt-2 space-y-1">
              {suggestSchedule(plan, nivel).map((ses) => (
                <li key={ses.numero}>
                  <strong>Sesión {ses.numero}</strong> (≈ {ses.minutos} min){ses.nota ? ` — ${ses.nota}` : ""}:{" "}
                  {ses.bloques.map((b) => `${TAPAS_INSTRUMENTS[b.instrument].emoji} ${TAPAS_INSTRUMENTS[b.instrument].label.split(":")[0]}${b.parte ? ` (${b.parte})` : ""}`).join(" + ")}
                </li>
              ))}
            </ol>
          </details>
          {(() => {
            const people = new Map<string, { name: string; rows: TapasApplicationRow[] }>();
            for (const a of allApps) {
              const key = a.participant_id || a.id;
              const cur = people.get(key) || { name: a.student_name, rows: [] };
              cur.rows.push(a);
              people.set(key, cur);
            }
            if (people.size === 0) return null;
            return (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      {plan.instruments.map((i) => <th key={i} className="text-center">{TAPAS_INSTRUMENTS[i].emoji}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...people.values()].sort((a, b) => a.name.localeCompare(b.name, "es")).map((p) => (
                      <tr key={p.name + p.rows[0].id}>
                        <td className="text-xs font-semibold text-slate-800">{p.name}</td>
                        {plan.instruments.map((i) => {
                          const a = p.rows.find((r) => r.instrument === i);
                          if (!a) return <td key={i} className="text-center text-slate-300">—</td>;
                          if (a.status === "FINALIZADA")
                            return (
                              <td key={i} className="text-center">
                                <Link href={`/tapas/${s.id}/resultado/${a.id}`} className="text-emerald-700 font-bold" title="Ver resultado">✓</Link>
                              </td>
                            );
                          return <td key={i} className="text-center text-xs text-amber-700">{isStarted(a) ? "…" : <span className="text-slate-300">○</span>}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] text-slate-400 mt-1">✓ terminada (toca para ver) · … en progreso · ○ sin empezar</p>
              </div>
            );
          })()}
        </div>
      )}

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
        <div className="p-4 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-700">{multi ? `Resultados — ${TAPAS_INSTRUMENTS[instrument].emoji} ${TAPAS_INSTRUMENTS[instrument].label}` : "Juegos"}</h3></div>
        {apps.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">Todavía nadie ha empezado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Estado</th>
                  <th>{instrument === "ARQUETIPOS" ? "Talento principal" : instrument === "EXPERIMENTO" ? "Talento en experimento" : "Talentos con pasión"}</th>
                  <th>Finalizado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => {
                  const topGroup = highlightOf(a);
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
                          {hasResult(a) && (
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
