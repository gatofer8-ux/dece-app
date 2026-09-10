import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { getEsquelaById } from "@/lib/esquelas";
import type { InstitutionRow } from "@/lib/types";
import EsquelaPrintClient from "./EsquelaPrintClient";

export default async function ImprimirEsquelaPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const esquela = getEsquelaById(params.id, institutionId);
  if (!esquela) notFound();

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  return <EsquelaPrintClient esquela={esquela} institution={institution} />;
}
