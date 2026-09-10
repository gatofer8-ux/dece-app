import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import { IPPJ_SCALE_META, IPPJ_DISCLAIMER } from "@/lib/ovp/ippjInstrument";
import type { IppjScoreResult } from "@/lib/ovp/ippjScoring";
import { suggestedAreasFor } from "@/lib/ovp/ippjCareers";
import type { OvpSessionRow, OvpApplicationRow, InstitutionRow } from "@/lib/types";

export default async function OvpInformePage({
  params,
  searchParams,
}: {
  params: { id: string; appId: string };
  searchParams: { tecnico?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const s = db
    .prepare("SELECT * FROM ovp_sessions WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as OvpSessionRow | undefined;
  const app = db
    .prepare("SELECT * FROM ovp_applications WHERE id = ? AND session_id = ? AND institution_id = ?")
    .get(params.appId, params.id, institutionId) as OvpApplicationRow | undefined;
  if (!s || !app || !app.result_json) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const r = JSON.parse(app.result_json) as IppjScoreResult;
  const survey = JSON.parse(app.survey_json || "{}") as Record<string, unknown>;
  const areas = suggestedAreasFor(r.topTypes);
  const showTecnico = searchParams.tecnico === "1";
  const preferidas = Array.isArray(survey.carreras_pref) ? (survey.carreras_pref as string[]).filter(Boolean) : [];

  const p = "text-[10.5pt] text-justify leading-snug mb-1.5";
  const h = "text-[#17365D] font-bold text-[12pt] mt-4 mb-1";

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href={`/ovp/${s.id}/resultado/${app.id}`} className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <a
            href={`/ovp/${s.id}/informe/${app.id}${showTecnico ? "" : "?tecnico=1"}`}
            className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold"
          >
            {showTecnico ? "Ocultar desglose técnico" : "Incluir desglose técnico"}
          </a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 font-serif text-black">
        <style>{`@media print { @page { size: A4; margin: 1.6cm; } }`}</style>
        <DocumentHeader
          title="Informe de Orientación Vocacional y Profesional"
          subtitle="Inventario de Preferencias Profesionales para Jóvenes (IPPJ) — Departamento de Consejería Estudiantil"
          institutionName={institution.name}
          sealImage={institution.seal_image}
          compact
        />

        <h2 className={h}>1. Datos del estudiante</h2>
        <p className={p}>
          <strong>Nombre:</strong> {app.student_name} &nbsp;·&nbsp;
          <strong>Curso:</strong> {[app.course_snapshot, app.parallel_snapshot].filter(Boolean).join(" ") || "—"} &nbsp;·&nbsp;
          {app.age ? <><strong>Edad:</strong> {app.age} años &nbsp;·&nbsp;</> : null}
          <strong>Fecha de aplicación:</strong> {(app.finished_at || "").slice(0, 10)}
        </p>

        <h2 className={h}>2. Perfil vocacional</h2>
        <p className={p}>
          El inventario ubica al estudiante en un perfil predominantemente{" "}
          <strong>{r.topTypes.map((t) => IPPJ_SCALE_META[t].label).join(", ")}</strong> (código {r.hollandCode}).{" "}
          {IPPJ_SCALE_META[r.topTypes[0]].description}
        </p>
        <p className={p}>
          La <strong>intensidad</strong> de sus preferencias es {r.intensidad.level.toLowerCase()}, la{" "}
          <strong>consistencia</strong> entre sus tipos dominantes es {r.consistencia.overall.toLowerCase()} y la{" "}
          <strong>diferenciación</strong> del perfil es {r.diferenciacion.nivel.toLowerCase()}.
        </p>

        <h2 className={h}>3. Áreas y campos ocupacionales sugeridos</h2>
        {areas.map(({ area }) => (
          <p key={area.area} className={p}>
            <strong>{area.area}:</strong> {area.ejemplos.join(", ")}. <em>Ruta formativa:</em> {area.bachillerato}.
          </p>
        ))}

        {preferidas.length > 0 && (
          <>
            <h2 className={h}>4. Carreras declaradas por el estudiante</h2>
            <p className={p}>{preferidas.join(", ")}.</p>
          </>
        )}

        <h2 className={h}>{preferidas.length > 0 ? "5." : "4."} Recomendaciones para el acompañamiento</h2>
        <p className={p}>
          Se recomienda una entrevista de orientación para contrastar el perfil con los intereses declarados,
          la oferta educativa cercana, los costos y las becas disponibles, y elaborar con el estudiante y su
          representante el proyecto de vida. Cuando la consistencia o la diferenciación sean bajas, priorizar
          actividades de autoconocimiento e información profesional antes de la decisión.
        </p>

        {showTecnico && (
          <>
            <h2 className={h}>Anexo. Desglose técnico (uso del DECE)</h2>
            <table className="w-full border-collapse text-[10pt]">
              <tbody>
                <tr>
                  <td className="border border-slate-500 px-2 py-1 bg-[#D9D9D9] font-bold">Tipo</td>
                  <td className="border border-slate-500 px-2 py-1 bg-[#D9D9D9] font-bold text-center">Bruto</td>
                  <td className="border border-slate-500 px-2 py-1 bg-[#D9D9D9] font-bold text-center">STEN</td>
                  <td className="border border-slate-500 px-2 py-1 bg-[#D9D9D9] font-bold text-center">Nivel</td>
                </tr>
                {r.ranked.map((sc) => (
                  <tr key={sc.scale}>
                    <td className="border border-slate-500 px-2 py-1">{IPPJ_SCALE_META[sc.scale].label}</td>
                    <td className="border border-slate-500 px-2 py-1 text-center">{sc.raw}</td>
                    <td className="border border-slate-500 px-2 py-1 text-center">{sc.sten}</td>
                    <td className="border border-slate-500 px-2 py-1 text-center">{sc.level}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-slate-500 px-2 py-1 font-semibold">Intensidad total</td>
                  <td className="border border-slate-500 px-2 py-1 text-center">{r.intensidad.raw}</td>
                  <td className="border border-slate-500 px-2 py-1 text-center">{r.intensidad.sten}</td>
                  <td className="border border-slate-500 px-2 py-1 text-center">{r.intensidad.level}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[8.5pt] text-slate-500 mt-1">
              Baremo STEN aplicado según género: {r.gender}. Género no informado usa el promedio de los baremos.
            </p>
          </>
        )}

        <p className="text-[8pt] text-slate-400 mt-6">{IPPJ_DISCLAIMER}</p>
      </div>
    </div>
  );
}
