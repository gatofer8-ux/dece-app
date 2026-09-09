import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import CreateUserForm from "../CreateUserForm";

export default async function NuevoUsuarioPage() {
  await requireRole(["SUPERADMIN"]);
  return (
    <div>
      <PageHeader title="Nuevo usuario" description="Crea una cuenta de acceso para personal de la institución." />
      <CreateUserForm />
    </div>
  );
}
