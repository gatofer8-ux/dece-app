import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import { currentSchoolYearText } from "@/lib/schoolYearText";
import { defaultObservaciones } from "@/lib/alertIdentification";
import { createAlertSessionAction } from "../actions";

export default async function NuevaAlertaIdentificacionPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const sig = getSignatureDefaults(session as never, institutionId);

  return (
    <div>
      <PageHeader
        title="Nueva acta de identificación de alertas"
        description="Junta de curso: se genera un código y un enlace para que cada docente registre, sin necesidad de cuenta, los estudiantes en los que identificó un riesgo psicosocial."
      />
      <form action={createAlertSessionAction} className="card p-6 space-y-5 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Curso</label>
            <input name="curso" placeholder="Ej. 8vo A" className="input text-sm" required />
          </div>
          <div>
            <label className="label text-xs">Fecha de la reunión</label>
            <input type="date" name="fecha" defaultValue={new Date().toISOString().slice(0, 10)} className="input text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs">Lugar</label>
            <input name="lugar" placeholder="Ej. Vicerrectorado" className="input text-sm" />
          </div>
        </div>

        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-600">Responsable del acta</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="responsible_name" defaultValue={sig.deceProfessional.fullName} placeholder="Nombre" className="input text-sm" />
            <input name="responsible_role" defaultValue={sig.deceProfessional.role} placeholder="Cargo" className="input text-sm" />
            <input name="responsible_email" type="email" defaultValue={sig.deceProfessional.email} placeholder="Correo electrónico" className="input text-sm" />
            <input name="responsible_phone_ext" defaultValue={sig.deceProfessional.phoneExt} placeholder="Extensión telefónica" className="input text-sm" />
          </div>
        </div>

        <div>
          <label className="label text-xs">Observaciones</label>
          <textarea name="observaciones" rows={3} defaultValue={defaultObservaciones(currentSchoolYearText())} className="textarea text-sm" />
        </div>

        <p className="text-[11px] text-slate-400">
          Las respuestas de los docentes no requieren cuenta: comparten el enlace o el código, y cada uno agrega los
          estudiantes que identificó.
        </p>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Crear y obtener enlace</button>
        </div>
      </form>
    </div>
  );
}
