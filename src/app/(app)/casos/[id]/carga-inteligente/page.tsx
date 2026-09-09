import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import type { CaseFileRow, StudentRow } from "@/lib/types";
import CargaInteligenteClient from "./CargaInteligenteClient";

export default async function CargaInteligentePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;

  if (!caseFile) notFound();

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;

  if (!student) notFound();

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 py-6">
      {/* Migas de pan / Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/casos" className="hover:text-slate-700">
          Casos
        </Link>
        <span>/</span>
        <Link href={`/casos/${caseFile.id}`} className="hover:text-slate-700">
          Caso #{caseFile.code || caseFile.id.slice(0, 8)}
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">Carga Inteligente de Documento Físico (OCR)</span>
      </div>

      <CargaInteligenteClient
        caseFile={caseFile}
        student={student}
        currentUser={{ id: session.user.id, name: session.user.name || "Profesional DECE" }}
      />
    </div>
  );
}
