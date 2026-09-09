import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import StudentForm from "../StudentForm";
import ScanPDFButton from "@/components/ScanPDFButton";
import { createStudent } from "../actions";

export default async function NuevoEstudiantePage() {
  await requireRole(["ADMIN", "DECE"]);
  return (
    <div>
      <PageHeader title="Nuevo estudiante" description="Registra los datos básicos del estudiante y su representante." />
      <ScanPDFButton />
      <StudentForm action={createStudent} />
    </div>
  );
}

