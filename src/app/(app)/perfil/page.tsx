import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/types";
import ProfileForm from "./ProfileForm";

export default async function PerfilPage() {
  const session = await requireSession();

  const user = db
    .prepare(
      "SELECT name, email, role, title_prefix, job_title, document_id, phone, phone_ext FROM users WHERE id = ?"
    )
    .get(session.user.id) as {
    name: string;
    email: string;
    role: keyof typeof ROLE_LABELS;
    title_prefix: string | null;
    job_title: string | null;
    document_id: string | null;
    phone: string | null;
    phone_ext: string | null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi perfil"
        description={`${ROLE_LABELS[user.role] || user.role} · ${user.email}`}
      />
      <ProfileForm user={user} />
    </div>
  );
}
