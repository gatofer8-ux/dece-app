import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import { getStudentVocationalSynthesis } from "@/lib/ovp/consolidatedVocationalReport";
import { TAPAS_FAMILIES, ARCHETYPE_MAP, type TapasFamily } from "@/lib/tapas/archetypes";
import { IPPJ_SCALE_META } from "@/lib/ovp/ippjInstrument";
import { studentGradeLabel } from "@/lib/studentCourse";

export default async function ConsolidatedVocationalPage({
  params,
}: {
  params: { studentId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const data = getStudentVocationalSynthesis(params.studentId, institutionId);
  if (!data) notFound();

  const {
    student,
    institution,
    professional,
    tapasApp,
    tapasResult,
    ippjApp,
    ippjResult,
    ippjSurvey,
    suggestedAreas,
    coherenceLevel,
    coherenceTitle,
    coherenceAnalysis,
    recommendedCareers,
    evaluationDate,
  } = data;

  const studentGrade = studentGradeLabel(student);

  return (
    <div className="max-w-4xl mx-auto bg-white space-y-4">
      {/* Barra superior sin impresión */}
      <div className="no-print p-3 bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-2 rounded-xl shadow-xs">
        <Link
          href="/ovp/consolidado"
          className="text-xs text-slate-600 font-bold hover:text-slate-900 flex items-center gap-1"
        >
          <span>←</span> Volver a Consolidado OVP
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`/api/ovp/export-consolidado-word?studentId=${student.id}`}
            className="btn-secondary text-xs flex items-center gap-1 font-bold text-blue-900 bg-blue-50 border-blue-200 hover:bg-blue-100"
          >
            <span>📥</span> Descargar Word (.docx)
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Contenido Imprimible Formato A4 */}
      <div id="printable-content" className="p-8 print:p-0 font-sans text-slate-800 bg-white">
        <style>{`@media print { @page { size: A4; margin: 1.5cm; } }`}</style>

        <DocumentHeader
          title="Informe Psicopedagógico de Orientación Vocacional y Profesional"
          subtitle="Evaluación Vocacional Integrada: Talentos (TaPas) + Intereses (IPPJ - MINEDUC) + Proyecto de Vida"
          institutionName={institution.name}
          sealImage={institution.seal_image}
          compact
        />

        {/* 1. Datos Informativos */}
        <div className="mt-6 border border-slate-300 rounded-xl overflow-hidden text-xs">
          <div className="bg-[#17365D] text-white font-bold px-4 py-2 uppercase tracking-wider">
            1. Datos Informativos del Estudiante y Contexto Familiar
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 divide-slate-100">
            <div>
              <span className="text-slate-500 font-semibold block">Nombres y Apellidos:</span>
              <span className="font-bold text-slate-900 text-sm">{student.full_name}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Cédula de Identidad:</span>
              <span className="font-semibold text-slate-800">{student.document_id || "No registra"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Curso y Nivel:</span>
              <span className="font-semibold text-slate-800">{studentGrade || "3ro de Bachillerato"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Especialidad de Bachillerato:</span>
              <span className="font-semibold text-slate-800">{student.bachillerato_specialty || "BGU Ciencias"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Representante Legal:</span>
              <span className="font-semibold text-slate-800">{student.representative || "No registra"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Teléfono de Contacto:</span>
              <span className="font-semibold text-slate-800">{student.rep_phone || student.mother_phone || student.father_phone || "No registra"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Fecha de Evaluación:</span>
              <span className="font-semibold text-slate-800">{evaluationDate}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">Profesional DECE Asignado:</span>
              <span className="font-bold text-slate-900">{professional?.name || "Equipo DECE Institucional"}</span>
            </div>
          </div>
        </div>

        {/* 2. Objetivo */}
        <div className="mt-6 space-y-2 text-xs text-justify leading-relaxed">
          <h3 className="font-bold text-sm text-[#17365D] uppercase tracking-wide border-b border-slate-200 pb-1">
            2. Objetivo del Informe Vocacional Integrado
          </h3>
          <p>
            El presente documento tiene por finalidad articular técnicamente los hallazgos obtenidos a través de los
            instrumentos oficiales de Orientación Vocacional y Profesional (OVP) del Ministerio de Educación: el{" "}
            <strong>Juego de Tarjetas de Arquetipos y Talentos (TaPas - VVOB)</strong> y el{" "}
            <strong>Inventario de Preferencias Profesionales para Jóvenes (IPPJ - MINEDUC)</strong>. Esta integración
            aporta bases sólidas para el Eje de Autoconocimiento, Información y Toma de Decisiones, consolidando el
            Proyecto de Vida y orientando la postulación a carreras de educación superior universitaria y técnica al
            egreso del 3ro de Bachillerato.
          </p>
        </div>

        {/* 3. Resultados TaPas */}
        <div className="mt-6 space-y-3">
          <h3 className="font-bold text-sm text-[#17365D] uppercase tracking-wide border-b border-slate-200 pb-1">
            3. Evaluación de Personalidad Vocacional y Talentos (TaPas - VVOB)
          </h3>
          {tapasResult ? (
            <div className="space-y-3">
              <p className="text-xs text-justify leading-relaxed">
                El estudiante clasificó 74 arquetipos ocupacionales. Sus familias dominantes de talento corresponden a:{" "}
                <strong className="text-slate-900">
                  {tapasResult.dominantFamilias.map((f) => TAPAS_FAMILIES[f as TapasFamily]?.label || f).join(", ")}
                </strong>
                .
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tapasResult.familias.map((f) => {
                  const meta = TAPAS_FAMILIES[f.familia as TapasFamily];
                  const isDom = tapasResult.dominantFamilias.includes(f.familia);
                  return (
                    <div
                      key={f.familia}
                      className={`p-2.5 rounded-lg border text-xs ${
                        isDom ? "bg-blue-50/80 border-blue-300 font-bold" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{meta?.emoji} {meta?.label || f.familia}</span>
                        <span className="text-slate-700">{f.pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${f.pct}%`, backgroundColor: meta?.color || "#2563EB" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {tapasResult.groups?.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-800 block mb-1">Grupos de Talentos Priorizados:</span>
                  {tapasResult.groups.map((g, i) => (
                    <div key={i} className="text-slate-700">
                      <strong>{i + 1}. {g.name || "(Sin nombre)"}:</strong>{" "}
                      {g.archetypes.map((k) => ARCHETYPE_MAP[k]?.name || k).join(", ")}.
                    </div>
                  ))}
                </div>
              )}

              {tapasApp?.reflection && (
                <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 text-xs italic text-emerald-950">
                  <strong>Reflexión del Estudiante:</strong> "{tapasApp.reflection}"
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
              ⚠️ La evaluación de Talentos y Arquetipos (TaPas) se encuentra pendiente o en progreso para este estudiante.
            </div>
          )}
        </div>

        {/* 4. Resultados IPPJ */}
        <div className="mt-6 space-y-3">
          <h3 className="font-bold text-sm text-[#17365D] uppercase tracking-wide border-b border-slate-200 pb-1">
            4. Inventario de Preferencias Profesionales para Jóvenes (IPPJ - MINEDUC)
          </h3>
          {ippjResult ? (
            <div className="space-y-3">
              <p className="text-xs text-justify leading-relaxed">
                El inventario ubica al estudiante en el código tipológico de Holland{" "}
                <strong className="text-slate-900 font-mono text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {ippjResult.hollandCode}
                </strong>{" "}
                ({ippjResult.topTypes.map((t) => IPPJ_SCALE_META[t].label).join(", ")}). La intensidad es{" "}
                <strong>{ippjResult.intensidad.level.toLowerCase()}</strong>, con consistencia{" "}
                <strong>{ippjResult.consistencia.overall.toLowerCase()}</strong> y diferenciación{" "}
                <strong>{ippjResult.diferenciacion.nivel.toLowerCase()}</strong>.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ippjResult.scales.map((sc) => {
                  const meta = IPPJ_SCALE_META[sc.scale];
                  const isTop = ippjResult.topTypes.includes(sc.scale);
                  return (
                    <div
                      key={sc.scale}
                      className={`p-2.5 rounded-lg border text-xs ${
                        isTop ? "bg-indigo-50/80 border-indigo-300 font-bold" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{meta.label} ({meta.letter})</span>
                        <span>STEN {sc.sten}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-brand-600 rounded-full"
                          style={{ width: `${(sc.sten / 10) * 100}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                        <span>Nivel: {sc.level}</span>
                        <span>Bruto: {sc.raw}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {ippjSurvey && Array.isArray(ippjSurvey.carreras_pref) && ippjSurvey.carreras_pref.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <span className="font-bold text-slate-800">Carreras Declaradas Inicialmente: </span>
                  <span className="font-semibold text-brand-800">
                    {(ippjSurvey.carreras_pref as string[]).filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
              ⚠️ La evaluación de Preferencias Profesionales (IPPJ) se encuentra pendiente o en progreso para este estudiante.
            </div>
          )}
        </div>

        {/* 5. Matriz de Coherencia */}
        <div className="mt-6 space-y-3">
          <h3 className="font-bold text-sm text-[#17365D] uppercase tracking-wide border-b border-slate-200 pb-1">
            5. Matriz Integrada de Coherencia Vocacional (Cruce TaPas ⨉ IPPJ)
          </h3>
          <div
            className={`p-4 rounded-xl border ${
              coherenceLevel === "ALTA_COHERENCIA"
                ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                : coherenceLevel === "COMPLEMENTARIO"
                ? "bg-blue-50/70 border-blue-300 text-blue-950"
                : "bg-amber-50/70 border-amber-300 text-amber-950"
            }`}
          >
            <div className="font-bold text-sm flex items-center gap-2 mb-1">
              <span>{coherenceLevel === "ALTA_COHERENCIA" ? "🎯" : coherenceLevel === "COMPLEMENTARIO" ? "💡" : "🧭"}</span>
              <span>{coherenceTitle}</span>
            </div>
            <p className="text-xs leading-relaxed text-justify">{coherenceAnalysis}</p>
          </div>
        </div>

        {/* 6. Carreras Universitarias Recomendadas */}
        <div className="mt-6 space-y-3">
          <h3 className="font-bold text-sm text-[#17365D] uppercase tracking-wide border-b border-slate-200 pb-1">
            6. Campos Ocupacionales y Carreras Universitarias Prioritarias (3ro de Bachillerato)
          </h3>
          <p className="text-xs text-justify">
            A partir del cruce de personalidad vocacional y áreas de interés, se recomiendan los siguientes campos
            formativos de tercer nivel y técnico-tecnológico superior acreditados en el Ecuador (SENESCYT):
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#17365D] text-white">
                <tr>
                  <th className="text-left px-3 py-2 w-1/3">Campo del Conocimiento</th>
                  <th className="text-left px-3 py-2">Carreras y Figuras Sugeridas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suggestedAreas.length > 0 ? (
                  suggestedAreas.map(({ area }) => (
                    <tr key={area.area} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-800">{area.area}</td>
                      <td className="px-3 py-2 text-slate-700">{area.ejemplos.join(" · ")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-center text-slate-500">
                      {recommendedCareers.join(" · ") || "Campos en exploración según el progreso de las evaluaciones."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. Conclusiones y Recomendaciones */}
        <div className="mt-6 space-y-3 text-xs leading-relaxed text-justify">
          <h3 className="font-bold text-sm text-[#17365D] uppercase tracking-wide border-b border-slate-200 pb-1">
            7. Conclusiones y Recomendaciones de Acompañamiento
          </h3>
          <div className="space-y-2">
            <p>
              <strong>Para el Estudiante:</strong> Explorar activamente las mallas curriculares y sedes universitarias,
              practicar en los simuladores de evaluación de acceso a la educación superior y considerar alternativas de
              tecnologías superiores con alta demanda laboral.
            </p>
            <p>
              <strong>Para la Familia y Representantes:</strong> Acompañar el proceso de elección vocacional con respeto
              a la autonomía y talentos del estudiante, evitando la imposición y dialogando con apertura sobre los costos
              formativos, traslados y opciones de becas.
            </p>
            <p>
              <strong>Para el Equipo DECE:</strong> Efectuar el seguimiento al Proyecto de Vida en el cierre del año
              lectivo y archivar el presente informe técnico en el expediente integral del estudiante.
            </p>
          </div>
        </div>

        {/* 8. Firmas de Responsabilidad (4 Firmas) */}
        <div className="mt-12 pt-4 border-t-2 border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-[10px]">
          <div className="space-y-1 pt-12 border-t border-slate-400">
            <div className="font-bold text-slate-900">{professional?.name || "Profesional DECE"}</div>
            <div className="text-slate-500">RESPONSABLE DECE</div>
          </div>
          <div className="space-y-1 pt-12 border-t border-slate-400">
            <div className="font-bold text-slate-900">{student.representative || "Representante"}</div>
            <div className="text-slate-500">REPRESENTANTE LEGAL</div>
          </div>
          <div className="space-y-1 pt-12 border-t border-slate-400">
            <div className="font-bold text-slate-900">{student.full_name}</div>
            <div className="text-slate-500">ESTUDIANTE (3RO BACH.)</div>
          </div>
          <div className="space-y-1 pt-12 border-t border-slate-400">
            <div className="font-bold text-slate-900">Rectorado / Dirección</div>
            <div className="text-slate-500">APROBADO RECTORADO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
