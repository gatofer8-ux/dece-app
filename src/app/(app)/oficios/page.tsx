import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, Badge, EmptyState, formatDate } from "@/components/ui";
import {
  OFICIO_TYPE_OPTIONS,
  calculateOficioStats,
  getOficioTypeOption,
} from "@/lib/oficios";
import DeleteOficioButton from "./DeleteOficioButton";
import type { OficioRow } from "@/lib/types";

type OficioListRow = OficioRow & { case_code: string | null; student_name: string | null };

export default async function OficiosPage({
  searchParams,
}: {
  searchParams: { q?: string; tipo?: string; firma?: string; alcance?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const { q, tipo, firma, alcance } = searchParams;

  let where = "WHERE o.institution_id = ?";
  const params: (string | number)[] = [institutionId];

  if (q) {
    where += " AND (o.oficio_number LIKE ? OR o.asunto LIKE ? OR o.addressee_name LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (tipo) {
    where += " AND o.oficio_type = ?";
    params.push(tipo);
  }
  if (firma === "FIRMADO") {
    where += " AND o.signature_type IN ('digital', 'fisica')";
  } else if (firma === "PENDIENTE") {
    where += " AND (o.signature_type IS NULL OR o.signature_type NOT IN ('digital', 'fisica'))";
  }
  if (alcance === "EN_CASO") {
    where += " AND o.case_file_id IS NOT NULL";
  } else if (alcance === "FUERA_CASO") {
    where += " AND o.case_file_id IS NULL";
  }

  const oficios = db
    .prepare(
      `SELECT o.*, cf.code as case_code, s.full_name as student_name
       FROM oficios o
       LEFT JOIN case_files cf ON cf.id = o.case_file_id
       LEFT JOIN students s ON s.id = o.student_id
       ${where}
       ORDER BY o.oficio_date DESC, o.created_at DESC
       LIMIT 300`
    )
    .all(...params) as OficioListRow[];

  const stats = calculateOficioStats(oficios);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oficios institucionales"
        description="Correspondencia oficial saliente del DECE dirigida a la máxima autoridad institucional o a una entidad externa."
        action={
          <Link href="/oficios/nueva" className="btn-primary flex items-center gap-1.5 font-bold shadow-sm">
            <span>+</span> Nuevo oficio
          </Link>
        }
      />

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xl">
            ✉️
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            <div className="text-xs text-slate-500 font-medium">Oficios emitidos</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl">
            📁
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{stats.linkedToCase}</div>
            <div className="text-xs text-slate-500 font-medium">Vinculados a un caso</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
            ✍️
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{stats.signed}</div>
            <div className="text-xs text-slate-500 font-medium">Con firma registrada</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <form method="get" className="card p-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q || ""}
          placeholder="Buscar por N°, asunto o destinatario..."
          className="input max-w-xs text-xs"
        />

        <select name="tipo" defaultValue={tipo || ""} className="select max-w-[220px] text-xs">
          <option value="">Toda circunstancia</option>
          {OFICIO_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.icon} {o.label}
            </option>
          ))}
        </select>

        <select name="alcance" defaultValue={alcance || ""} className="select max-w-[160px] text-xs">
          <option value="">Todo alcance</option>
          <option value="EN_CASO">En casos de expediente</option>
          <option value="FUERA_CASO">Fuera de caso (autónomo)</option>
        </select>

        <select name="firma" defaultValue={firma || ""} className="select max-w-[160px] text-xs">
          <option value="">Estado de firma</option>
          <option value="FIRMADO">Firmado</option>
          <option value="PENDIENTE">Firma pendiente</option>
        </select>

        <button type="submit" className="btn-secondary text-xs">
          Filtrar
        </button>

        {(q || tipo || firma || alcance) && (
          <Link href="/oficios" className="btn-secondary text-xs text-slate-500">
            Limpiar filtros
          </Link>
        )}
      </form>

      {/* Tabla de Oficios */}
      {oficios.length === 0 ? (
        <EmptyState
          icon="✉️"
          title="No se encontraron oficios institucionales"
          description="Comienza emitiendo el primer oficio dirigido a la máxima autoridad o a una entidad externa."
          action={
            <Link href="/oficios/nueva" className="btn-primary">
              + Emitir oficio
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>N° de oficio</th>
                  <th>Circunstancia</th>
                  <th>Fecha</th>
                  <th>Destinatario</th>
                  <th>Asunto</th>
                  <th>Firma</th>
                  <th>Origen</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {oficios.map((o) => {
                  const opt = getOficioTypeOption(o.oficio_type);
                  const isSigned = o.signature_type === "digital" || o.signature_type === "fisica";
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link
                          href={`/oficios/${o.id}/imprimir`}
                          className="font-mono text-xs font-bold text-brand-700 hover:underline block"
                        >
                          {o.oficio_number}
                        </Link>
                      </td>
                      <td>
                        <span className="text-xs text-slate-800 font-medium flex items-center gap-1">
                          <span>{opt.icon}</span> {opt.label}
                        </span>
                      </td>
                      <td className="text-xs font-semibold text-slate-900">
                        {formatDate(o.oficio_date)}
                      </td>
                      <td>
                        <div className="text-xs text-slate-800 font-medium">{o.addressee_name}</div>
                        <div className="text-[11px] text-slate-500">{o.addressee_role}</div>
                      </td>
                      <td className="text-xs text-slate-700 max-w-xs truncate" title={o.asunto}>
                        {o.asunto}
                      </td>
                      <td>
                        {isSigned ? (
                          <Badge color="green">
                            {o.signature_type === "digital" ? "🖋️ Digital" : "📄 Papel"}
                          </Badge>
                        ) : (
                          <Badge color="amber">Pendiente</Badge>
                        )}
                      </td>
                      <td>
                        {o.case_file_id ? (
                          <Link
                            href={`/casos/${o.case_file_id}`}
                            className="text-[11px] font-semibold text-indigo-700 hover:underline"
                            title="Ver caso vinculado"
                          >
                            📁 {o.case_code || "Caso"}
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-400">Autónomo</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/oficios/${o.id}/imprimir`}
                            className="text-xs text-brand-700 hover:underline font-semibold"
                            title="Imprimir / descargar oficio"
                          >
                            🖨️ Imprimir
                          </Link>
                          <Link
                            href={`/oficios/${o.id}/editar`}
                            className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                          >
                            ✏️ Editar
                          </Link>
                          <DeleteOficioButton id={o.id} oficioNumber={o.oficio_number} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
