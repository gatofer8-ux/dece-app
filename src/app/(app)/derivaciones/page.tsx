import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, EmptyState, formatDate } from "@/components/ui";
import { REFERRAL_STATUS_LABELS, type ReferralRow } from "@/lib/types";

export default async function DerivacionesPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  let where = "WHERE cf.institution_id = ?";
  const params: any[] = [institutionId];
  if (searchParams.estado) {
    where += " AND r.status = ?";
    params.push(searchParams.estado);
  } else {
    where += " AND r.status != 'CERRADA'";
  }

  const referrals = db
    .prepare(
      `SELECT r.*, s.full_name as student_name, cf.code as case_code FROM referrals r
       JOIN case_files cf ON cf.id = r.case_file_id
       JOIN students s ON s.id = cf.student_id
       ${where} ORDER BY r.referral_date DESC LIMIT 200`
    )
    .all(...params) as (ReferralRow & { student_name: string; case_code: string })[];

  return (
    <div>
      <PageHeader title="Derivaciones" description="Seguimiento de derivaciones internas y externas de todos los casos." />

      <form className="card p-4 mb-4 flex gap-3" method="get">
        <select name="estado" defaultValue={searchParams.estado || ""} className="select max-w-xs">
          <option value="">Todas (excepto cerradas)</option>
          {Object.entries(REFERRAL_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">Filtrar</button>
      </form>

      {referrals.length === 0 ? (
        <EmptyState title="No hay derivaciones con estos filtros" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Caso</th>
                <th className="text-left px-4 py-3">Estudiante</th>
                <th className="text-left px-4 py-3">Institución</th>
                <th className="text-left px-4 py-3">Alcance</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/casos/${r.case_file_id}`} className="font-medium text-brand-700 hover:underline">
                      {r.case_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.student_name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.institution}</td>
                  <td className="px-4 py-3 text-slate-600">{r.scope === "INTERNA" ? "Interna" : "Externa"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.referral_date)}</td>
                  <td className="px-4 py-3">
                    <Badge color={r.status === "PENDIENTE" ? "amber" : "blue"}>{REFERRAL_STATUS_LABELS[r.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
