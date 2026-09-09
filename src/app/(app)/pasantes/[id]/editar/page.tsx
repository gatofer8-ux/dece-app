import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getInternById } from "@/lib/pasantes";
import InternForm from "../../InternForm";

export default async function EditInternPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    redirect("/login");
  }

  const institutionId = session.user.institution_id;
  const intern = getInternById(params.id, institutionId);
  if (!intern) {
    notFound();
  }

  const deceUsers = db
    .prepare(
      "SELECT id, name, role FROM users WHERE institution_id = ? AND active = 1 AND role IN ('DECE', 'ADMIN') ORDER BY name ASC"
    )
    .all(institutionId) as { id: string; name: string; role: string }[];

  return <InternForm intern={intern} deceUsers={deceUsers} />;
}
