import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, formatDate } from "@/components/ui";
import { currentReportMonth, monthLabel } from "@/lib/riskMatrix";
import type { RiskMatrixEntryRow, CaseFileRow, StudentRow } from "@/lib/types";
import { getCasesCustodyMap } from "@/lib/physicalCustodyAudit";

export default async function MatrizRiesgosPage({ searchParams }: { searchParams: { mes?: string } }) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);
  const mes = searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes) ? searchParams.mes : currentReportMonth();

  const entries = db
    .prepare(`SELECT * FROM case_risk_matrix_entries WHERE institution_id = ? AND report_month = ? ORDER BY created_at ASC`)
    .all(institutionId, mes) as RiskMatrixEntryRow[];

  const rows = entries.map((e) => {
    const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(e.case_file_id) as CaseFileRow;
    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
    return { entry: e, caseFile, student };
  });

  const custodyMap = getCasesCustodyMap(rows.map((r) => r.caseFile?.id).filter(Boolean));

  return (
    <div>
      <PageHeader
        title="Matriz de Riesgos Psicosociales"
        description="Reporte mensual (formato MATRIZ RPS-EIS) que se envía a distrito/zona. Los casos se marcan desde cada expediente; aquí se revisa y exporta el mes seleccionado."
        action={
          <a href={`/api/reportes/matriz-riesgos?mes=${mes}`} className="btn-primary">
            ⬇ Exportar a Excel
          </a>
        }
      />

      <form className="card p-4 mb-6 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="label text-xs">Mes de reporte</label>
          <input type="month" name="mes" defaultValue={mes} className="input" />
        </div>
        <button type="submit" className="btn-secondary">Ver</button>
        <Link href={`/reportes/matriz-riesgos?mes=${currentReportMonth()}`} className="text-xs text-brand-600 hover:underline ml-2">
          Mes actual
        </Link>
      </form>

      <h2 className="text-sm font-semibold text-slate-700 mb-3">Casos incluidos en {monthLabel(mes)}</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Caso</th>
              <th className="text-left px-4 py-3">Estudiante</th>
              <th className="text-left px-4 py-3">Tipo de caso</th>
              <th className="text-left px-4 py-3">Custodia y Archivo</th>
              <th className="text-left px-4 py-3">Estado actual</th>
              <th className="text-left px-4 py-3">Fecha de conocimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ entry, caseFile, student }) => {
              const cust = custodyMap.get(caseFile.id);
              return (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/casos/${caseFile.id}`} className="font-medium text-brand-700 hover:underline">{caseFile.code}</Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{student.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.case_type}</td>
                  <td className="px-4 py-3">
                    {!cust || cust.total === 0 ? (
                      <span className="inline-block text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        — Sin docs
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1 items-start">
                        {cust.complianceRate === 100 ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                            title={`${cust.total} doc(s): ${cust.digital} digitalizados, ${cust.physicalOnly} en carpeta física`}
                          >
                            <span>🟢</span> 100%
                          </span>
                        ) : cust.complianceRate >= 60 ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
                            title={`${cust.total} doc(s): ${cust.complianceRate}% custodiado (${cust.pending} pendiente)`}
                          >
                            <span>🟡</span> {cust.complianceRate}%
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
                            title={`${cust.pending} de ${cust.total} documento(s) sin archivar en carpeta física`}
                          >
                            <span>🔴</span> {cust.pending} pend.
                          </span>
                        )}
                        {cust.primaryFileRef && (
                          <span
                            className="text-[11px] font-medium text-amber-800 dark:text-amber-300 max-w-[140px] truncate"
                            title={`Carpeta física: ${cust.primaryFileRef}`}
                          >
                            📁 {cust.primaryFileRef}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{entry.case_current_status || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.knowledge_date ? formatDate(entry.knowledge_date) : "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Ningún caso marcado para este mes todavía. Desde el detalle de cada caso, en la sección "Matriz de Riesgos Psicosociales", puedes incluirlo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
