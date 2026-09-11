import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import ImportStudentsForm from "./ImportStudentsForm";
import ImportStudentsPdfAiForm from "./ImportStudentsPdfAiForm";

export default async function ImportarEstudiantesPage() {
  await requireRole(["ADMIN", "DECE"]);
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Importar estudiantes"
        description="Crea varios estudiantes a la vez, desde una planilla Excel o directamente desde un PDF con ayuda de la IA."
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">1</span>
          <h2 className="text-sm font-bold text-slate-800">Desde Excel</h2>
        </div>
        <ImportStudentsForm />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
          <h2 className="text-sm font-bold text-slate-800">Con IA, desde un PDF</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">Beta</span>
        </div>
        <ImportStudentsPdfAiForm />
      </section>
    </div>
  );
}
