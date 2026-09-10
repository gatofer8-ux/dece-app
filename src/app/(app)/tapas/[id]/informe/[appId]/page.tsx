import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import { ARCHETYPE_MAP, TAPAS_FAMILIES, TAPAS_SOURCE, type TapasFamily } from "@/lib/tapas/archetypes";
import type { TapasResult } from "@/lib/tapas/tapasScoring";
import type { TapasSessionRow, TapasApplicationRow, InstitutionRow } from "@/lib/types";

export default async function TapasInformePage({ params }: { params: { id: string; appId: string } }) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const s = db
    .prepare("SELECT * FROM tapas_sessions WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as TapasSessionRow | undefined;
  const app = db
    .prepare("SELECT * FROM tapas_applications WHERE id = ? AND session_id = ? AND institution_id = ?")
    .get(params.appId, params.id, institutionId) as TapasApplicationRow | undefined;
  if (!s || !app || !app.result_json) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const r = JSON.parse(app.result_json) as TapasResult;
  const p = "text-[10.5pt] text-justify leading-snug mb-1.5";
  const h = "text-[#17365D] font-bold text-[12pt] mt-4 mb-1";

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href={`/tapas/${s.id}/resultado/${app.id}`} className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <PrintButton hideWordButton />
      </div>

      <div id="printable-content" className="p-6 print:p-0 font-serif text-black">
        <style>{`@media print { @page { size: A4; margin: 1.6cm; } }`}</style>
        <DocumentHeader
          title="Perfil de Talentos — Juego de Arquetipos (TaPas)"
          subtitle="Orientación Vocacional y Profesional — Departamento de Consejería Estudiantil"
          institutionName={institution.name}
          sealImage={institution.seal_image}
          compact
        />

        <h2 className={h}>1. Datos del estudiante</h2>
        <p className={p}>
          <strong>Nombre:</strong> {app.student_name} &nbsp;·&nbsp;
          <strong>Curso:</strong> {[app.course_snapshot, app.parallel_snapshot].filter(Boolean).join(" ") || "—"} &nbsp;·&nbsp;
          <strong>Fecha:</strong> {(app.finished_at || "").slice(0, 10)}
        </p>

        <h2 className={h}>2. Grupos de talentos (del más fuerte al más débil)</h2>
        {r.groups.map((g, i) => (
          <p key={i} className={p}>
            <strong>{i + 1}. {g.name || "(sin nombre)"}:</strong>{" "}
            {g.archetypes.map((k) => ARCHETYPE_MAP[k]?.name || k).join(", ")}.
          </p>
        ))}

        <h2 className={h}>3. Familias de talento</h2>
        <p className={p}>
          Los arquetipos con los que se identifica ({r.identifiedCount} de 74) se concentran en:{" "}
          <strong>
            {r.dominantFamilias.map((f) => TAPAS_FAMILIES[f as TapasFamily].label).join(", ")}
          </strong>
          .
        </p>
        <table className="w-full border-collapse text-[10pt] mt-1">
          <tbody>
            {r.familias.map((f) => (
              <tr key={f.familia}>
                <td className="border border-slate-500 px-2 py-1">{TAPAS_FAMILIES[f.familia as TapasFamily].label}</td>
                <td className="border border-slate-500 px-2 py-1 text-center w-16">{f.count}</td>
                <td className="border border-slate-500 px-2 py-1 text-center w-16">{f.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {app.reflection && (
          <>
            <h2 className={h}>4. Reflexión del estudiante</h2>
            <p className={p}>{app.reflection}</p>
          </>
        )}

        <h2 className={h}>{app.reflection ? "5." : "4."} Recomendaciones para el acompañamiento</h2>
        <p className={p}>
          Se recomienda una entrevista de orientación para contrastar estos grupos de talentos con los intereses
          declarados por el estudiante, sus asignaturas y sus actividades de tiempo libre, e identificar con él o ella
          entre 5 y 10 áreas de estudio o campos ocupacionales relacionados, de los cuales elegirá 3 para explorar,
          considerando la oferta educativa cercana, los costos y las becas disponibles. Este perfil aporta a la
          dimensión de autoconocimiento del Proyecto de Vida.
        </p>

        <p className="text-[8pt] text-slate-400 mt-6">Fuente: {TAPAS_SOURCE}</p>
      </div>
    </div>
  );
}
