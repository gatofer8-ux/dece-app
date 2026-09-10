import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { ActivityReportRow } from "@/lib/types";
import ActivityReportForm from "../../../../_report/ActivityReportForm";
import { getActivityReportPrefill } from "@/lib/activityReportDefaults";
import {
  uploadActivityReportPhoto,
  deleteActivityReportPhoto,
} from "../../../../report-actions";

export default async function EditarInformeTallerPage({
  params,
  searchParams,
}: {
  params: { id: string; reportId: string };
  searchParams: { foto_error?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const report = db
    .prepare("SELECT * FROM activity_reports WHERE id = ? AND institution_id = ?")
    .get(params.reportId, institutionId) as ActivityReportRow | undefined;
  if (!report) notFound();

  const prefill = getActivityReportPrefill(report.activity_id, session, institutionId);
  const photos = db
    .prepare("SELECT id, filename, caption FROM attachments WHERE activity_report_id = ? ORDER BY uploaded_at ASC")
    .all(params.reportId) as { id: string; filename: string; caption: string | null }[];

  return (
    <div>
      <PageHeader title="Editar informe de taller" description={report.tema || report.activity_name || ""} />

      <div className="mb-4 flex gap-2">
        <a href={`/actividades/${params.id}/informe/${params.reportId}/imprimir`} className="btn-secondary text-xs">
          👁️ Ver / imprimir
        </a>
      </div>

      <ActivityReportForm
        mode="edit"
        activityId={params.id}
        reportId={params.reportId}
        prefill={prefill}
        initialData={report}
      />

      <section id="fotos" className="card p-6 mt-6 max-w-4xl">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Registro fotográfico</h3>
        <p className="text-xs text-slate-400 mb-3">
          Sube de 2 a 8 fotos (JPG/PNG/WEBP, máx. 15 MB). Se incrustan al final del Word en el anexo «Registro fotográfico».
        </p>
        {searchParams.foto_error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            ⚠️ {searchParams.foto_error}
          </p>
        )}

        {photos.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {photos.map((p) => (
              <li key={p.id} className="border rounded-lg p-2 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/attachments/${p.id}`} alt={p.caption || p.filename} className="w-full h-28 object-cover rounded mb-1" />
                <p className="truncate text-slate-500" title={p.caption || p.filename}>{p.caption || p.filename}</p>
                <form action={deleteActivityReportPhoto.bind(null, p.id, params.reportId, params.id)}>
                  <button type="submit" className="text-red-600 hover:underline mt-1">quitar</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={uploadActivityReportPhoto.bind(null, params.reportId, params.id)}
          encType="multipart/form-data"
          className="flex flex-col sm:flex-row gap-2 sm:items-end"
        >
          <div className="flex-1">
            <label className="label text-xs">Imagen</label>
            <input type="file" name="foto" required accept="image/png,image/jpeg,image/webp" className="text-xs w-full" />
          </div>
          <div className="flex-1">
            <label className="label text-xs">Pie de foto (opcional)</label>
            <input name="caption" className="input text-sm" placeholder="Ej. Momento de la actividad introductoria" />
          </div>
          <button type="submit" className="btn-primary text-xs">Subir foto</button>
        </form>
      </section>
    </div>
  );
}
