import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { listEsquelas } from "@/lib/esquelas";
import { PageHeader, Badge, EmptyState, formatDate } from "@/components/ui";

export default async function EsquelasPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    talon?: string;
    asistencia?: string;
    alcance?: string;
  };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const { q, talon, asistencia, alcance } = searchParams;

  const esquelas = listEsquelas(institutionId, {
    q,
    statusTalon: talon,
    statusAttended: asistencia,
    scope: alcance,
  });

  const total = esquelas.length;
  const devueltos = esquelas.filter((e) => e.talon_returned === 1).length;
  const asistidos = esquelas.filter((e) => e.talon_attended === 1).length;

  const attendedBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge color="green">Asistió</Badge>;
      case 2:
        return <Badge color="amber">Justificó</Badge>;
      case 3:
        return <Badge color="rose">No asistió</Badge>;
      default:
        return <Badge color="slate">Pendiente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Esquelas de citación"
        description="Emisión y control de citaciones a representantes legales y estudiantes con talón desprendible."
        action={
          <Link href="/esquelas/nueva" className="btn-primary flex items-center gap-1.5 font-bold shadow-sm">
            <span>+</span> Nueva esquela de citación
          </Link>
        }
      />

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xl">
            📨
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{total}</div>
            <div className="text-xs text-slate-500 font-medium">Esquelas emitidas</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
            ✂️
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{devueltos}</div>
            <div className="text-xs text-slate-500 font-medium">Talones devueltos firmados</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xl">
            🤝
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{asistidos}</div>
            <div className="text-xs text-slate-500 font-medium">Citas con comparecencia efectiva</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <form method="get" className="card p-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q || ""}
          placeholder="Buscar por estudiante, representante o N°..."
          className="input max-w-xs text-xs"
        />

        <select name="alcance" defaultValue={alcance || ""} className="select max-w-[160px] text-xs">
          <option value="">Todo alcance</option>
          <option value="EN_CASO">En casos de expediente</option>
          <option value="FUERA_CASO">Fuera de caso (general)</option>
        </select>

        <select name="talon" defaultValue={talon || ""} className="select max-w-[160px] text-xs">
          <option value="">Estado del talón</option>
          <option value="DEVUELTO">Talón devuelto firmado</option>
          <option value="PENDIENTE">Talón pendiente</option>
        </select>

        <select name="asistencia" defaultValue={asistencia || ""} className="select max-w-[150px] text-xs">
          <option value="">Comparecencia</option>
          <option value="ASISTIO">Asistió</option>
          <option value="PENDIENTE">Cita pendiente</option>
          <option value="NO_ASISTIO">No asistió / Justificó</option>
        </select>

        <button type="submit" className="btn-secondary text-xs">
          Filtrar
        </button>

        {(q || talon || asistencia || alcance) && (
          <Link href="/esquelas" className="btn-secondary text-xs text-slate-500">
            Limpiar filtros
          </Link>
        )}
      </form>

      {/* Tabla de Esquelas */}
      {esquelas.length === 0 ? (
        <EmptyState
          icon="📨"
          title="No se encontraron esquelas de citación"
          description="Comienza emitiendo la primera esquela con su talón desprendible."
          action={
            <Link href="/esquelas/nueva" className="btn-primary">
              + Emitir esquela
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Citación</th>
                  <th>Estudiante</th>
                  <th>Representante</th>
                  <th>Cita Programada</th>
                  <th>Talón Recibido</th>
                  <th>Comparecencia</th>
                  <th>Origen</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {esquelas.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link
                        href={`/esquelas/${e.id}`}
                        className="font-mono text-xs font-bold text-brand-700 hover:underline block"
                      >
                        {e.citation_number}
                      </Link>
                      {e.urgency_level === "URGENTE" && (
                        <span className="text-[10px] text-red-600 font-bold">⚠️ Urgente</span>
                      )}
                    </td>

                    <td>
                      <div className="font-semibold text-slate-900 text-xs">{e.student_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {e.course} {e.parallel ? `"${e.parallel}"` : ""}
                      </div>
                    </td>

                    <td>
                      <div className="text-xs text-slate-800 font-medium">{e.representative_name}</div>
                      {e.representative_phone && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          📞 {e.representative_phone}
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="text-xs font-bold text-slate-900">{formatDate(e.citation_date)}</div>
                      <div className="text-[11px] font-semibold text-brand-700">⏰ {e.citation_time}</div>
                    </td>

                    <td>
                      {e.talon_returned ? (
                        <Badge color="green">✂️ Devuelto</Badge>
                      ) : (
                        <Badge color="amber">Pendiente</Badge>
                      )}
                      {e.received_by_relation && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Por: {e.received_by_relation}
                        </div>
                      )}
                    </td>

                    <td>{attendedBadge(e.talon_attended)}</td>

                    <td>
                      {e.case_file_id ? (
                        <Link
                          href={`/casos/${e.case_file_id}`}
                          className="text-[11px] font-semibold text-indigo-700 hover:underline"
                          title="Ver caso vinculado"
                        >
                          📁 Caso
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-400">General</span>
                      )}
                    </td>

                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/esquelas/${e.id}/imprimir`}
                          className="text-xs text-brand-700 hover:underline font-semibold"
                          title="Imprimir esquela con talón"
                        >
                          🖨️ Imprimir
                        </Link>
                        <Link
                          href={`/esquelas/${e.id}`}
                          className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          Gestionar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
