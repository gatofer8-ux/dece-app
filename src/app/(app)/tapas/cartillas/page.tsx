import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { ARCHETYPES } from "@/lib/tapas/archetypes";
import { getDeckRow, getDeckCards } from "@/lib/tapas/cardDeck";
import DeckUploader from "./DeckUploader";
import { removeTapasDeck } from "./actions";

export default async function TapasCartillasPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const row = getDeckRow(institutionId);
  const cards = getDeckCards(institutionId);
  const loaded = new Set(Object.keys(cards));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartillas ilustradas del juego"
        description="Carga la versión ilustrada oficial de las tarjetas de arquetipos (Proyecto TaPas – VVOB / MinEduc) para que aparezcan en el juego. Si no cargas nada, el juego usa íconos genéricos."
        action={<Link href="/tapas" className="btn-secondary text-xs">← Volver</Link>}
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        Las ilustraciones de las tarjetas son de VVOB Education for Development y TaPasCity. Se distribuyen de forma
        gratuita para uso educativo, con cita de la fuente. Cada institución carga aquí su propia copia del archivo
        oficial; el sistema no incluye las ilustraciones.
      </div>

      {row && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {loaded.size} de {ARCHETYPES.length} cartillas cargadas
              </p>
              {row.source_note && <p className="text-xs text-slate-500">{row.source_note}</p>}
              <p className="text-[11px] text-slate-400">Actualizado: {row.updated_at.slice(0, 16).replace("T", " ")}</p>
            </div>
            <form action={removeTapasDeck}>
              <button className="text-xs text-rose-600 hover:underline">Quitar el mazo</button>
            </form>
          </div>
          {loaded.size < ARCHETYPES.length && (
            <p className="text-xs text-amber-700 mt-2">
              Faltan: {ARCHETYPES.filter((a) => !loaded.has(a.key)).map((a) => a.name).slice(0, 12).join(", ")}
              {ARCHETYPES.filter((a) => !loaded.has(a.key)).length > 12 ? "…" : ""}. Puedes volver a subir el PDF completo.
            </p>
          )}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-4">
            {ARCHETYPES.map((a) => (
              <div key={a.key} className="text-center">
                {loaded.has(a.key) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/tapas/deck-admin/${a.key}`}
                    alt={a.name}
                    className="w-full aspect-[62/88] object-cover rounded border border-slate-200"
                  />
                ) : (
                  <div className="w-full aspect-[62/88] rounded border border-dashed border-slate-300 flex items-center justify-center text-2xl bg-slate-50">
                    {a.emoji}
                  </div>
                )}
                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight truncate">{a.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <DeckUploader />
    </div>
  );
}
