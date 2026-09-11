"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkshopById } from "@/lib/talleres/talleresData";

export default function TallerDetailPage({ params }: { params: { id: string } }) {
  const workshop = getWorkshopById(params.id);
  if (!workshop) {
    notFound();
  }

  const [activeTab, setActiveTab] = useState<"GUION" | "MATERIALES">("GUION");
  const [expandedPhases, setExpandedPhases] = useState<number[]>(
    workshop.phases.map((p, idx) => p.number ?? idx + 1)
  );

  const togglePhase = (num: number) => {
    setExpandedPhases((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const expandAll = () => setExpandedPhases(workshop.phases.map((p, idx) => p.number ?? idx + 1));
  const collapseAll = () => setExpandedPhases([]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Navegación y Botón Volver */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/talleres"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
        >
          <span>←</span>
          <span>Volver al Repositorio de Talleres</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/actividades/informe-taller/nuevo?tallerId=${workshop.id}&tema=${workshop.relatedActionPlanTopic || ""}&titulo=${encodeURIComponent(workshop.title)}`}
            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-xs"
          >
            <span>📋</span>
            <span>Emitir Informe Técnico (LOEI Art. 73)</span>
          </Link>
        </div>
      </div>

      {/* Cabecera del Taller */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {workshop.categoryLabel}
          </span>
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <span>⏱️ Duración estimada:</span>
            <span className="text-slate-800">{workshop.estimatedDuration}</span>
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {workshop.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            {workshop.subtitle}
          </p>
        </div>

        {/* Ficha Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Población Objetivo</div>
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span>👥</span>
              <span>{workshop.targetAudienceLabel}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marco Legal / Normativo</div>
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span>⚖️</span>
              <span>{workshop.normativeBase}</span>
            </div>
          </div>
        </div>

        {/* Objetivos */}
        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <span className="font-bold text-slate-800">Objetivo General:</span>
            <p className="text-slate-600 mt-0.5 leading-relaxed">{workshop.generalObjective}</p>
          </div>

          <div>
            <span className="font-bold text-slate-800">Objetivos Específicos:</span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mt-1 pl-1">
              {workshop.specificObjectives.map((obj, i) => (
                <li key={i} className="leading-relaxed">{obj}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Nota preliminar si existe */}
        {workshop.preliminaryNotes && (
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-base shrink-0">💡</span>
            <div>
              <span className="font-bold block">Pautas para el Facilitador DECE:</span>
              <span className="text-[11px] leading-relaxed">{workshop.preliminaryNotes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Pestañas Principales: Guión Protegido vs Materiales Descargables */}
      <div className="flex border-b border-slate-200 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab("GUION")}
          className={`px-5 py-3 font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "GUION"
              ? "border-brand-900 text-brand-900 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>🔒</span>
          <span>Guión Metodológico de Facilitación</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
            {workshop.phases.length} fases
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("MATERIALES")}
          className={`px-5 py-3 font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "MATERIALES"
              ? "border-brand-900 text-brand-900 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>✂️</span>
          <span>Materiales de Trabajo y Recortables</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            {workshop.downloadableMaterials.length} descargables
          </span>
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑA 1: GUIÓN PROTEGIDO */}
      {activeTab === "GUION" && (
        <div className="space-y-4">
          {/* Banner de Protección de Propiedad Intelectual */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs flex items-start justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🔒</span>
              <div>
                <span className="font-bold text-white block text-sm">
                  Guión de Facilitación Protegido en Plataforma
                </span>
                <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                  Para resguardar el diseño metodológico e intelectual, este guión está optimizado exclusivamente para consulta, lectura y estudio en pantalla durante la preparación del taller. 
                  <strong className="text-emerald-300 font-semibold"> No cuenta con botón de descarga del guión</strong>, mientras que los materiales prácticos y recortables sí se descargan en la pestaña superior.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={expandAll}
                className="text-[11px] text-slate-300 hover:text-white underline"
              >
                Expandir todas
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[11px] text-slate-300 hover:text-white underline"
              >
                Contraer
              </button>
            </div>
          </div>

          {/* Fases del Taller */}
          <div className="space-y-3">
            {workshop.phases.map((phase, idx) => {
              const phaseNum = phase.number ?? idx + 1;
              const isExpanded = expandedPhases.includes(phaseNum);
              const questions = phase.reflectiveQuestions || phase.reflectionQuestions || [];
              const materials = phase.materials || phase.materialsNeeded || [];

              return (
                <div
                  key={phaseNum}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => togglePhase(phaseNum)}
                    className="w-full text-left p-4.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {phaseNum}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {phase.title}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ⏱️ {phase.durationMinutes} minutos
                        </span>
                      </div>
                    </div>

                    <span className="text-slate-400 text-sm font-bold">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-5 pt-1 border-t border-slate-100 space-y-4 text-xs">
                      {phase.objective && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                          <span className="font-bold text-slate-700">Objetivo de la Fase: </span>
                          <span className="text-slate-600">{phase.objective}</span>
                        </div>
                      )}

                      {/* Guión del Facilitador */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>🗣️</span>
                            <span>Diálogos y Guión del Facilitador:</span>
                          </span>
                          <span className="text-[10px] text-slate-400 italic">Lectura guiada</span>
                        </div>
                        <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 text-slate-800 font-normal leading-relaxed whitespace-pre-line text-xs">
                          {phase.facilitatorScript}
                        </div>
                      </div>

                      {/* Dinámica Grupal / Pasos */}
                      {phase.groupDynamics && (
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>🤝</span>
                            <span>Dinámica e Instrucciones de Trabajo:</span>
                          </span>
                          <p className="text-slate-600 leading-relaxed pl-1">
                            {phase.groupDynamics}
                          </p>
                        </div>
                      )}

                      {phase.activitySteps && phase.activitySteps.length > 0 && (
                        <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>📋</span>
                            <span>Pasos de la Actividad:</span>
                          </span>
                          <ol className="list-decimal list-inside space-y-1 text-slate-700 mt-1 pl-1 text-[11px]">
                            {phase.activitySteps.map((step, sIdx) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Preguntas de Reflexión */}
                      {questions.length > 0 && (
                        <div className="space-y-1 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                          <span className="font-bold text-amber-900 flex items-center gap-1.5">
                            <span>❓</span>
                            <span>Preguntas Clave para el Diálogo y Reflexión:</span>
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-amber-800 mt-1 pl-1 text-[11px]">
                            {questions.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Materiales específicos de esta fase */}
                      {materials.length > 0 && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">Insumos de esta fase:</span>
                          <span>{materials.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA 2: MATERIALES RECORTABLES Y DESCARGABLES */}
      {activeTab === "MATERIALES" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
            <span className="text-2xl shrink-0">✂️</span>
            <div>
              <span className="font-bold text-sm block">
                Material Didáctico Listo para Imprimir y Recortar
              </span>
              <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                Estos documentos han sido diseñados con líneas de corte punteadas (✂️), casilleros amplios y formatos amigables para docentes y estudiantes. Puedes descargarlos directamente en formato Word (.docx) editable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workshop.downloadableMaterials.map((mat) => (
              <div
                key={mat.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {mat.type ? mat.type.replace("_", " ") : (mat.isPrintableCutout ? "RECORTABLE" : "MATERIAL PRÁCTICO")}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Formato Word (.docx)</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {mat.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {mat.description}
                  </p>

                  {(mat.targetUser || mat.printInstructions) && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
                      {mat.targetUser && (
                        <div>
                          <strong className="text-slate-700">Destinatarios:</strong> {mat.targetUser}
                        </div>
                      )}
                      {mat.printInstructions && (
                        <div>
                          <strong className="text-slate-700">Impresión:</strong> {mat.printInstructions}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <a
                    href={`/api/talleres/${workshop.id}/material/${mat.id}`}
                    download
                    className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-semibold shadow-xs"
                  >
                    <span>📥</span>
                    <span>Descargar Documento Word (.docx)</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra Inferior Flotante de Acción */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-600 text-center sm:text-left">
          <span className="font-bold text-slate-900 block">¿Ejecutaste este taller en tu institución?</span>
          <span>Emite el informe técnico para cumplir con el estándar Mineduc y vincularlo a tu Plan de Acción.</span>
        </div>

        <Link
          href={`/actividades/informe-taller/nuevo?tallerId=${workshop.id}&tema=${workshop.relatedActionPlanTopic || ""}&titulo=${encodeURIComponent(workshop.title)}`}
          className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 shadow-sm font-semibold shrink-0"
        >
          <span>📋</span>
          <span>Emitir Informe de Taller (LOEI Art. 73)</span>
        </Link>
      </div>
    </div>
  );
}
