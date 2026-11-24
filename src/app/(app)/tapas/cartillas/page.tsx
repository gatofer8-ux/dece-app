import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { ARCHETYPES } from "@/lib/tapas/archetypes";
import { BUILTIN_CATEGORY_CARDS } from "@/lib/tapas/builtinDeck";
import { getDeckRow, getDeckCards, resolveDeckUrls } from "@/lib/tapas/cardDeck";
import DeckUploader from "./DeckUploader";
import { removeTapasDeck } from "./actions";

export default async function TapasCartillasPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const row = getDeckRow(institutionId);
  const loaded = new Set(Object.keys(getDeckCards(institutionId)));
  const urls = resolveDeckUrls(institutionId, (key) => `/api/tapas/deck-admin/${key}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartillas ilustradas del juego"
        description="El juego ya incluye las 74 cartillas ilustradas oficiales del Proyecto TaPas: no tienes que cargar nada. Si tu institución prefiere usar su propia copia, súbela abajo y reemplazará a las incluidas."
        action={<Link href="/tapas" className="btn-secondary text-xs">← Volver</Link>}
      />

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
        ✅ <strong>Mazo incluido:</strong> {ARCHETYPES.length} cartillas de arquetipos y las 3 tarjetas de categoría («Me
        identifico», «No sé, tengo dudas», «No me identifico»). Se usan automáticamente en todas las aplicaciones.
        {loaded.size > 0 && ` Tu institución subió ${loaded.size} cartillas propias, que reemplazan a las incluidas.`}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        Las ilustraciones son de VVOB Education for Development y TaPasCity (Manual de uso de las herramientas TaPas, 1.ª
        edición, 2021). Se distribuyen de forma gratuita, con cita de la fuente, y cada cartilla conserva sus logos y
        créditos originales.
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {ARCHETYPES.length} cartillas en uso
              {loaded.size > 0 ? ` (${loaded.size} propias de la institución)` : " (todas incluidas)"}
            </p>
            {row?.source_note && <p className="text-xs text-slate-500">{row.source_note}</p>}
            {row && <p className="text-[11px] text-slate-400">Actualizado: {row.updated_at.slice(0, 16).replace("T", " ")}</p>}
          </div>
          {row && (
            <form action={removeTapasDeck}>
              <button className="text-xs text-rose-600 hover:underline">Quitar mi mazo y volver al incluido</button>
            </form>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 max-w-md">
          {(["SI", "DUDA", "NO"] as const).map((k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={k} src={BUILTIN_CATEGORY_CARDS[k]} alt={k} className="w-full aspect-[10/7] object-cover rounded border border-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-4">
          {ARCHETYPES.map((a) => (
            <div key={a.key} className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[a.key]}
                alt={a.name}
                loading="lazy"
                className={`w-full aspect-[62/88] object-cover rounded border ${loaded.has(a.key) ? "border-brand-400" : "border-slate-200"}`}
              />
              <p className="text-[9px] text-slate-500 mt-0.5 leading-tight truncate">{a.name}</p>
            </div>
          ))}
        </div>
      </div>

      <DeckUploader />
    </div>
  );
}
