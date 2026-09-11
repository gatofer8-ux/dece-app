"use client";

import { useState } from "react";
import Link from "next/link";
import { WORKSHOPS_DATABASE } from "@/lib/talleres/talleresData";
import type { WorkshopCategory } from "@/lib/talleres/types";

export default function TalleresPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredWorkshops = WORKSHOPS_DATABASE.filter((w) => {
    if (selectedCategory !== "TODAS" && w.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = w.title.toLowerCase().includes(q);
      const matchDesc = w.subtitle.toLowerCase().includes(q);
      const matchAudience = w.targetAudienceLabel.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchAudience;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📚</span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Repositorio de Talleres y Guiones Metodológicos
            </h1>
          </div>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Planes de facilitación estructurados para el aula y la comunidad educativa en el marco del 
            <strong className="text-slate-800 font-semibold"> Acuerdo Ministerial MINEDUC-044-A</strong> y el 
            <strong className="text-slate-800 font-semibold"> Art. 73 de la LOEI</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/actividades/informe-taller/nuevo"
            className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-xs"
          >
            <span>📝</span>
            <span>Nuevo Informe de Taller (LOEI)</span>
          </Link>
          <Link
            href="/plan-accion"
            className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <span>🎯</span>
            <span>Plan de Acción (POA)</span>
          </Link>
        </div>
      </div>

      {/* Banner Informativo de Autoría y Descargas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-xs flex items-start gap-3">
          <span className="text-xl shrink-0">🔒</span>
          <div>
            <span className="font-bold text-amber-900 block">Guiones Metodológicos Protegidos</span>
            <span className="text-amber-800/90 text-[11px] leading-relaxed">
              Los guiones completos de facilitación se consultan y revisan directamente en pantalla para resguardar la propiedad intelectual institucional. No disponen de opción de descarga.
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-xs flex items-start gap-3">
          <span className="text-xl shrink-0">✂️</span>
          <div>
            <span className="font-bold text-emerald-900 block">Materiales Didácticos y Recortables</span>
            <span className="text-emerald-800/90 text-[11px] leading-relaxed">
              Las tarjetas de casos con líneas de corte, fichas de trabajo, guías de bolsillo para docentes y dinámicas para estudiantes sí se descargan en formato Word (.docx) listo para imprimir.
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar taller por palabra clave, población..."
              className="input w-full text-xs pl-8 py-2"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>

          {/* Categorías */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory("TODAS")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedCategory === "TODAS"
                  ? "bg-brand-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos ({WORKSHOPS_DATABASE.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("PREVENCION_044A")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedCategory === "PREVENCION_044A"
                  ? "bg-brand-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Prevención 044-A
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("PRIMEROS_AUXILIOS_PAP")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedCategory === "PRIMEROS_AUXILIOS_PAP"
                  ? "bg-brand-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Primeros Auxilios (PAP)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("DESARROLLO_SOCIOEMOCIONAL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedCategory === "DESARROLLO_SOCIOEMOCIONAL"
                  ? "bg-brand-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Autoestima y Niños
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("FORMACION_DECE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedCategory === "FORMACION_DECE"
                  ? "bg-brand-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Equipos DECE
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Talleres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredWorkshops.map((w) => {
          const is044 = w.category === "PREVENCION_044A";
          const isPap = w.category === "PRIMEROS_AUXILIOS_PAP";
          const isKids = w.category === "DESARROLLO_SOCIOEMOCIONAL";

          return (
            <div
              key={w.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5 space-y-3.5">
                {/* Categoría y Duración */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      is044
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : isPap
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : isKids
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {w.categoryLabel}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <span>⏱️</span>
                    <span>{w.estimatedDuration}</span>
                  </span>
                </div>

                {/* Título y Subtítulo */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-700 transition-colors leading-snug">
                    <Link href={`/talleres/${w.slug}`}>{w.title}</Link>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {w.subtitle}
                  </p>
                </div>

                {/* Población Destinataria y Base Legal */}
                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-start gap-1.5">
                    <span className="shrink-0 text-slate-400">👥</span>
                    <span className="text-[11px]">
                      <strong className="text-slate-700">Población:</strong> {w.targetAudienceLabel}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="shrink-0 text-slate-400">⚖️</span>
                    <span className="text-[11px]">
                      <strong className="text-slate-700">Base Normativa:</strong> {w.normativeBase}
                    </span>
                  </div>
                </div>

                {/* Materiales Descargables Disponibles */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Materiales prácticos para aula ({w.downloadableMaterials.length}):
                  </span>
                  <div className="space-y-1">
                    {w.downloadableMaterials.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-[11px] bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                      >
                        <span className="truncate pr-2 font-medium text-slate-700 flex items-center gap-1.5">
                          <span>✂️</span>
                          <span className="truncate">{m.title}</span>
                        </span>
                        <a
                          href={`/api/talleres/${w.id}/material/${m.id}`}
                          download
                          className="shrink-0 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors"
                          title="Descargar material recortable en formato Word (.docx)"
                        >
                          Descargar .docx
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Barra Inferior de Acciones */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/talleres/${w.slug}`}
                  className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-semibold text-slate-700"
                >
                  <span>📖</span>
                  <span>Ver Guión Completo</span>
                </Link>

                <Link
                  href={`/actividades/informe-taller/nuevo?tallerId=${w.id}&tema=${w.relatedActionPlanTopic || ""}&titulo=${encodeURIComponent(w.title)}`}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 font-semibold"
                  title="Generar informe técnico de taller bajo la base legal Art. 73 de la LOEI"
                >
                  <span>📋</span>
                  <span>Emitir Informe LOEI</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
