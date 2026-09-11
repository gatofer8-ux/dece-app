import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { createEneisSessionAction } from "../actions";

export default async function NuevaEneisSessionPage() {
  await requireRole(["ADMIN", "DECE"]);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
  const defaultTitle = `Fichas ENEIS — ${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)}`;

  return (
    <div>
      <PageHeader
        title="Nueva convocatoria de fichas ENEIS"
        description="Se genera un código y un enlace para que los docentes entreguen su ficha de aplicación directamente ahí."
      />
      <form action={createEneisSessionAction} className="card p-6 space-y-5 max-w-2xl">
        <div>
          <label className="label text-xs">Título / referencia</label>
          <input name="title" defaultValue={defaultTitle} className="input text-sm" required />
        </div>
        <p className="text-[11px] text-slate-400">
          Lo normal es abrir una convocatoria por mes (o por bloque), igual que la carpeta de fichas que ya manejas. Los
          docentes no necesitan cuenta: entran con el código o el enlace y llenan su ficha ahí mismo, cuantas veces
          necesiten durante el período.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Disponible desde (opcional)</label>
            <input type="date" name="opens_at" className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">Disponible hasta (opcional)</label>
            <input type="date" name="closes_at" className="input text-sm" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Crear y obtener enlace</button>
        </div>
      </form>
    </div>
  );
}
