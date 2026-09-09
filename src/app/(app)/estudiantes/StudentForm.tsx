import type { StudentRow } from "@/lib/types";
import {
  JORNADA_OPTIONS,
  LIVES_WITH_OPTIONS,
  LEGAL_GUARDIAN_OPTIONS,
  NEE_TYPE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  parseJsonArray,
} from "@/lib/student";
import { OFFICIAL_TECHNICAL_FIGURES } from "@/lib/technicalCatalog";

export default function StudentForm({
  student,
  action,
}: {
  student?: StudentRow;
  action: (formData: FormData) => void;
}) {
  const neeTypes = student ? parseJsonArray<string>(student.nee_types) : [];

  return (
    <form action={action} className="card p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nombres y apellidos *</label>
          <input name="full_name" required defaultValue={student?.full_name} className="input" />
        </div>
        <div>
          <label className="label">Cédula / documento de identidad</label>
          <input name="document_id" defaultValue={student?.document_id || ""} className="input" />
        </div>
        <div>
          <label className="label">Fecha de nacimiento</label>
          <input type="date" name="birth_date" defaultValue={student?.birth_date?.slice(0, 10) || ""} className="input" />
        </div>
        <div>
          <label className="label">Género</label>
          <select name="gender" defaultValue={student?.gender || ""} className="select">
            <option value="">Seleccionar...</option>
            <option value="Femenino">Femenino</option>
            <option value="Masculino">Masculino</option>
            <option value="Otro">Otro / prefiere no decir</option>
          </select>
        </div>
        <div>
          <label className="label">Curso *</label>
          <input name="course" required placeholder="Ej. 8vo EGB" defaultValue={student?.course} className="input" />
        </div>
        <div>
          <label className="label">Paralelo</label>
          <input name="parallel" placeholder="Ej. A" defaultValue={student?.parallel || ""} className="input" />
        </div>
        <div>
          <label className="label">Jornada</label>
          <select name="jornada" defaultValue={student?.jornada || ""} className="select">
            <option value="">Seleccionar...</option>
            {JORNADA_OPTIONS.map((j) => (
              <option key={j} value={j}>
                {j.charAt(0) + j.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nivel educativo</label>
          <select name="education_level" defaultValue={student?.education_level || ""} className="select">
            <option value="">Seleccionar...</option>
            {EDUCATION_LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Especialidad / Figura Profesional de Bachillerato (si aplica)</label>
          <input
            name="bachillerato_specialty"
            list="official-technical-figures"
            placeholder="Selecciona o escribe la especialidad oficial MINEDUC..."
            defaultValue={student?.bachillerato_specialty || ""}
            className="input"
          />
          <datalist id="official-technical-figures">
            {OFFICIAL_TECHNICAL_FIGURES.map((fig) => (
              <option key={fig.id} value={fig.name}>
                {fig.name} ({fig.family})
              </option>
            ))}
          </datalist>
        </div>
      </div>

      <hr className="border-slate-100" />
      <h3 className="text-sm font-semibold text-slate-700">Lugar de nacimiento</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="label">País</label>
          <input name="birth_country" defaultValue={student?.birth_country || ""} className="input" />
        </div>
        <div>
          <label className="label">Provincia</label>
          <input name="birth_province" defaultValue={student?.birth_province || ""} className="input" />
        </div>
        <div>
          <label className="label">Cantón</label>
          <input name="birth_canton" defaultValue={student?.birth_canton || ""} className="input" />
        </div>
        <div>
          <label className="label">Parroquia</label>
          <input name="birth_parish" defaultValue={student?.birth_parish || ""} className="input" />
        </div>
      </div>

      <hr className="border-slate-100" />
      <h3 className="text-sm font-semibold text-slate-700">Representante / familia</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nombre del representante</label>
          <input name="representative" defaultValue={student?.representative || ""} className="input" />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input name="rep_phone" defaultValue={student?.rep_phone || ""} className="input" />
        </div>
        <div>
          <label className="label">Correo</label>
          <input type="email" name="rep_email" defaultValue={student?.rep_email || ""} className="input" />
        </div>
        <div>
          <label className="label">Dirección</label>
          <input name="address" defaultValue={student?.address || ""} className="input" />
        </div>
        <div>
          <label className="label">Barrio o caserío</label>
          <input name="neighborhood" defaultValue={student?.neighborhood || ""} className="input" />
        </div>
        <div>
          <label className="label">¿Quién es representante legal?</label>
          <select name="legal_guardian" defaultValue={student?.legal_guardian || ""} className="select">
            <option value="">Seleccionar...</option>
            {LEGAL_GUARDIAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">El estudiante vive con</label>
          <select name="lives_with" defaultValue={student?.lives_with || ""} className="select">
            <option value="">Seleccionar...</option>
            {LIVES_WITH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Especificar (si "Otro")</label>
          <input name="lives_with_other" defaultValue={student?.lives_with_other || ""} className="input" />
        </div>
        <div>
          <label className="label">¿Autoriza que el/la estudiante salga solo/a de la institución?</label>
          <select
            name="leaves_alone_authorized"
            defaultValue={student?.leaves_alone_authorized === null || student?.leaves_alone_authorized === undefined ? "" : String(student.leaves_alone_authorized)}
            className="select"
          >
            <option value="">No especificado</option>
            <option value="1">Sí</option>
            <option value="0">No</option>
          </select>
        </div>
      </div>

      <details className="border border-slate-200 rounded-lg p-3">
        <summary className="text-xs font-semibold text-slate-500 uppercase cursor-pointer">
          Datos del padre, madre y representante (si el representante no es papá ni mamá)
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Padre</p>
            <input name="father_name" placeholder="Nombres y apellidos" defaultValue={student?.father_name || ""} className="input" />
            <input name="father_document_id" placeholder="Cédula" defaultValue={student?.father_document_id || ""} className="input" />
            <input name="father_education" placeholder="Instrucción" defaultValue={student?.father_education || ""} className="input" />
            <input name="father_address" placeholder="Domicilio" defaultValue={student?.father_address || ""} className="input" />
            <input name="father_phone" placeholder="Teléfono/celular" defaultValue={student?.father_phone || ""} className="input" />
            <input name="father_occupation" placeholder="Profesión u ocupación" defaultValue={student?.father_occupation || ""} className="input" />
            <input name="father_workplace" placeholder="Lugar de trabajo" defaultValue={student?.father_workplace || ""} className="input" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Madre</p>
            <input name="mother_name" placeholder="Nombres y apellidos" defaultValue={student?.mother_name || ""} className="input" />
            <input name="mother_document_id" placeholder="Cédula" defaultValue={student?.mother_document_id || ""} className="input" />
            <input name="mother_education" placeholder="Instrucción" defaultValue={student?.mother_education || ""} className="input" />
            <input name="mother_address" placeholder="Domicilio" defaultValue={student?.mother_address || ""} className="input" />
            <input name="mother_phone" placeholder="Teléfono/celular" defaultValue={student?.mother_phone || ""} className="input" />
            <input name="mother_occupation" placeholder="Profesión u ocupación" defaultValue={student?.mother_occupation || ""} className="input" />
            <input name="mother_workplace" placeholder="Lugar de trabajo" defaultValue={student?.mother_workplace || ""} className="input" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Representante (si es distinto de papá/mamá)</p>
            <input name="representative_document_id" placeholder="Cédula" defaultValue={student?.representative_document_id || ""} className="input" />
            <input name="representative_education" placeholder="Instrucción" defaultValue={student?.representative_education || ""} className="input" />
            <input name="representative_address" placeholder="Domicilio" defaultValue={student?.representative_address || ""} className="input" />
            <input name="representative_occupation" placeholder="Profesión u ocupación" defaultValue={student?.representative_occupation || ""} className="input" />
            <input name="representative_workplace" placeholder="Lugar de trabajo" defaultValue={student?.representative_workplace || ""} className="input" />
          </div>
        </div>
      </details>

      <hr className="border-slate-100" />
      <h3 className="text-sm font-semibold text-slate-700">Necesidad educativa específica</h3>
      <div className="flex flex-wrap gap-4 text-sm">
        {NEE_TYPE_OPTIONS.map((o) => (
          <label key={o.value} className="flex items-center gap-2">
            <input type="checkbox" name="nee_types" value={o.value} defaultChecked={neeTypes.includes(o.value)} className="rounded" />
            {o.label}
          </label>
        ))}
      </div>
      <div>
        <label className="label">En caso de poseer carnet de discapacidad, detallar aquí</label>
        <input name="disability_card_detail" defaultValue={student?.disability_card_detail || ""} className="input" />
      </div>

      <hr className="border-slate-100" />
      <h3 className="text-sm font-semibold text-slate-700">Datos médicos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Enfermedad</label>
          <input name="medical_condition" defaultValue={student?.medical_condition || ""} className="input" />
        </div>
        <div>
          <label className="label">Alergias</label>
          <input name="medical_allergies" defaultValue={student?.medical_allergies || ""} className="input" />
        </div>
        <div>
          <label className="label">Intolerancia a medicamentos</label>
          <input name="medical_medication_intolerance" defaultValue={student?.medical_medication_intolerance || ""} className="input" />
        </div>
        <div>
          <label className="label">Intolerancia a alimentos</label>
          <input name="medical_food_intolerance" defaultValue={student?.medical_food_intolerance || ""} className="input" />
        </div>
      </div>

      <div>
        <label className="label">Notas adicionales</label>
        <textarea name="notes" rows={3} defaultValue={student?.notes || ""} className="textarea" />
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary">
          {student ? "Guardar cambios" : "Registrar estudiante"}
        </button>
      </div>
    </form>
  );
}
