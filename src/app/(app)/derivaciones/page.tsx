import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { type ReferralRow } from "@/lib/types";
import DerivacionesKanban from "./components/DerivacionesKanban";

export default async function DerivacionesPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  let where = "WHERE cf.institution_id = ?";
  const params: any[] = [institutionId];

  // We load everything that is not CERRADA to allow Kanban dragging,
  // or everything if explicitly asked. Actually, a Kanban should ideally show all.
  if (searchParams.estado) {
    where += " AND r.status = ?";
    params.push(searchParams.estado);
  }

  const referrals = db
    .prepare(
      `SELECT r.*, s.full_name as student_name, cf.code as case_code FROM referrals r
       JOIN case_files cf ON cf.id = r.case_file_id
       JOIN students s ON s.id = cf.student_id
       ${where} ORDER BY r.referral_date DESC LIMIT 500`
    )
    .all(...params) as (ReferralRow & { student_name: string; case_code: string })[];

  return (
    <div>
      <PageHeader title="Derivaciones" description="Seguimiento de derivaciones internas y externas de todos los casos." />

      <div className="mt-4">
        <DerivacionesKanban initialReferrals={referrals} />
      </div>
    </div>
  );
}
