"use client";

import { useState } from "react";
import { RISK_TYPE_LABELS, type RiskType } from "@/lib/types";

interface RiskStat {
  risk_type: RiskType;
  count: number;
}

interface CourseStat {
  course: string;
  count: number;
}

interface MonthlyStat {
  month: string;
  cases: number;
  attentions: number;
}

interface StatusStat {
  status: string;
  count: number;
}

export default function DashboardCharts({
  riskStats,
  courseStats,
  monthlyStats,
  statusStats,
}: {
  riskStats: RiskStat[];
  courseStats: CourseStat[];
  monthlyStats: MonthlyStat[];
  statusStats: StatusStat[];
}) {
  const [activeTab, setActiveTab] = useState<"risks" | "courses" | "trend">("risks");

  const totalCasesByRisk = riskStats.reduce((acc, r) => acc + r.count, 0);
  const maxRiskCount = Math.max(...riskStats.map((r) => r.count), 1);
  const maxCourseCount = Math.max(...courseStats.map((c) => c.count), 1);
  const maxMonthlyCount = Math.max(
    ...monthlyStats.map((m) => Math.max(m.cases, m.attentions)),
    1
  );

  const STATUS_COLORS: Record<string, string> = {
    ABIERTO: "bg-amber-500 text-white",
    EN_SEGUIMIENTO: "bg-blue-500 text-white",
    DERIVADO: "bg-purple-500 text-white",
    CERRADO: "bg-emerald-500 text-white",
  };

  const STATUS_LABELS_ES: Record<string, string> = {
    ABIERTO: "Abierto",
    EN_SEGUIMIENTO: "En seguimiento",
    DERIVADO: "Derivado",
    CERRADO: "Cerrado",
  };

  return (
    <div className="card p-5 space-y-6">
      {/* Cabecera y Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
            <span>📊</span> Análisis Gráfico y Estadístico
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribución e indicadores de acompañamiento socioemocional
          </p>
        </div>

        {/* Selector de Pestaña */}
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("risks")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "risks"
                ? "bg-white text-brand-900 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tipos de Riesgo
          </button>
          <button
            onClick={() => setActiveTab("courses")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "courses"
                ? "bg-white text-brand-900 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Por Cursos
          </button>
          <button
            onClick={() => setActiveTab("trend")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "trend"
                ? "bg-white text-brand-900 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Evolución Mensual
          </button>
        </div>
      </div>

      {/* Resumen Rápido de Estados */}
      {statusStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {statusStats.map((st) => (
            <div
              key={st.status}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between"
            >
              <div className="text-xs text-slate-600 font-medium">
                {STATUS_LABELS_ES[st.status] || st.status}
              </div>
              <div
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  STATUS_COLORS[st.status] || "bg-slate-200 text-slate-800"
                }`}
              >
                {st.count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contenido según Tab Activo */}
      {activeTab === "risks" && (
        <div className="space-y-3">
          {riskStats.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No hay casos registrados en este período.
            </div>
          ) : (
            riskStats.map((item) => {
              const pct = totalCasesByRisk > 0 ? Math.round((item.count / totalCasesByRisk) * 100) : 0;
              const barWidthPct = Math.round((item.count / maxRiskCount) * 100);
              return (
                <div key={item.risk_type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      {RISK_TYPE_LABELS[item.risk_type] || item.risk_type}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.count} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "courses" && (
        <div className="space-y-3">
          {courseStats.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No hay registros vinculados a cursos en este período.
            </div>
          ) : (
            courseStats.map((item) => {
              const barWidthPct = Math.round((item.count / maxCourseCount) * 100);
              return (
                <div key={item.course} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{item.course}</span>
                    <span className="font-semibold text-slate-900">{item.count} casos</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "trend" && (
        <div className="space-y-4">
          {monthlyStats.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No hay registros mensuales para graficar en este período.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-end gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-brand-500" />
                  <span className="text-slate-600">Casos Nuevos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-emerald-500" />
                  <span className="text-slate-600">Atenciones Diarias</span>
                </div>
              </div>

              <div className="grid grid-cols-1 divide-y divide-slate-100">
                {monthlyStats.map((m) => (
                  <div key={m.month} className="py-2.5 flex items-center gap-3 text-xs">
                    <div className="w-20 font-medium text-slate-600 shrink-0">{m.month}</div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex-1">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{
                              width: `${Math.round((m.cases / maxMonthlyCount) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-right font-semibold text-brand-700">{m.cases}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex-1">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${Math.round((m.attentions / maxMonthlyCount) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-right font-semibold text-emerald-700">
                          {m.attentions}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
