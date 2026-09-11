"use client";

import { useState, useMemo } from "react";
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
import {
  type DocumentType,
  validateEcuadorianCedula,
  validatePassport,
  detectDocumentType,
} from "@/lib/documentId";

function ParentDocumentInput({
  name,
  label,
  defaultValue = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const [val, setVal] = useState(defaultValue);
  const [docType, setDocType] = useState<DocumentType>(() => detectDocumentType(defaultValue));

  const validation = useMemo(() => {
    const trimmed = val.trim();
    if (!trimmed) return { status: "empty" as const, message: "" };
    if (docType === "CEDULA") {
      const res = validateEcuadorianCedula(trimmed);
      return res.ok
        ? { status: "valid" as const, message: "Cédula válida" }
        : { status: "invalid" as const, message: res.reason || "Cédula no válida" };
    }
    if (docType === "PASAPORTE") {
      const res = validatePassport(trimmed);
      return res.ok
        ? { status: "valid" as const, message: "Pasaporte válido" }
        : { status: "invalid" as const, message: res.reason || "Pasaporte no válido" };
    }
    return { status: "valid" as const, message: "" };
  }, [val, docType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (docType === "CEDULA") {
      v = v.replace(/\D/g, "").slice(0, 10);
    } else if (docType === "PASAPORTE") {
      v = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    }
    setVal(v);
  };

  let borderClass = "";
  if (validation.status === "invalid") {
    borderClass = "!border-rose-500 !ring-1 !ring-rose-500 bg-rose-50/20";
  } else if (validation.status === "valid") {
    borderClass = "!border-emerald-500 !ring-1 !ring-emerald-500 bg-emerald-50/20";
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <select
          value={docType}
          onChange={(e) => {
            const next = e.target.value as DocumentType;
            setDocType(next);
            if (next === "CEDULA") setVal((prev) => prev.replace(/\D/g, "").slice(0, 10));
            else if (next === "PASAPORTE") setVal((prev) => prev.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15));
          }}
          className="select text-xs py-1 px-1.5 w-24 shrink-0"
          aria-label={`Tipo de documento para ${label}`}
        >
          <option value="CEDULA">Cédula</option>
          <option value="PASAPORTE">Pasaporte</option>
          <option value="OTRO">Otro</option>
        </select>
        <input
          name={name}
          value={val}
          onChange={handleChange}
          inputMode={docType === "CEDULA" ? "numeric" : "text"}
          maxLength={docType === "CEDULA" ? 10 : docType === "PASAPORTE" ? 15 : 20}
          placeholder={
            docType === "CEDULA"
              ? "Cédula (10 dígitos)"
              : docType === "PASAPORTE"
              ? "Pasaporte extranjero"
              : "N° documento"
          }
          className={`input text-xs py-1 px-2 flex-1 ${borderClass}`}
        />
      </div>
      {validation.status === "invalid" && (
        <p className="text-[11px] text-rose-600 font-medium">⚠️ {validation.message}</p>
      )}
      {validation.status === "valid" && (
        <p className="text-[11px] text-emerald-600 font-medium">✓ {validation.message}</p>
      )}
    </div>
  );
}

export default function StudentForm({
  student,
  action,
}: {
  student?: StudentRow;
  action: (formData: FormData) => void;
}) {
  const neeTypes = student ? parseJsonArray<string>(student.nee_types) : [];

  const [docType, setDocType] = useState<DocumentType>(() => {
    if (student?.document_type) return student.document_type;
    if (student?.document_id) return detectDocumentType(student.document_id);
    return "CEDULA";
  });
  const [docId, setDocId] = useState<string>(student?.document_id || "");

  const validation = useMemo(() => {
    const trimmed = docId.trim();
    if (!trimmed) {
      return { status: "empty" as const, message: "" };
    }

    if (docType === "CEDULA") {
      const res = validateEcuadorianCedula(trimmed);
      return res.ok
        ? { status: "valid" as const, message: "Cédula válida" }
        : { status: "invalid" as const, message: res.reason || "Cédula inválida" };
    }

    if (docType === "PASAPORTE") {
      const res = validatePassport(trimmed);
      return res.ok
        ? { status: "valid" as const, message: "Pasaporte válido" }
        : { status: "invalid" as const, message: res.reason || "Pasaporte inválido" };
    }

    // OTRO
    if (trimmed.length < 3) {
      return { status: "invalid" as const, message: "Mínimo 3 caracteres" };
    }
    return { status: "valid" as const, message: "Formato aceptado" };
  }, [docType, docId]);

  const handleDocIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (docType === "CEDULA") {
      val = val.replace(/\D/g, "").slice(0, 10);
    } else if (docType === "PASAPORTE") {
      val = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    }
    setDocId(val);
  };

  const handleDocTypeChange = (newType: DocumentType) => {
    setDocType(newType);
    if (newType === "CEDULA") {
      setDocId((prev) => prev.replace(/\D/g, "").slice(0, 10));
    } else if (newType === "PASAPORTE") {
      setDocId((prev) => prev.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15));
    }
  };

  const placeholder =
    docType === "CEDULA"
      ? "Ej: 1710034065 (10 dígitos)"
      : docType === "PASAPORTE"
      ? "Ej: A12345678 (6–15 alfanumérico)"
      : "Número de documento";

  let borderClass = "";
  if (validation.status === "invalid") {
    borderClass = "!border-rose-500 !ring-1 !ring-rose-500 bg-rose-50/20";
  } else if (validation.status === "valid") {
    borderClass = "!border-emerald-500 !ring-1 !ring-emerald-500 bg-emerald-50/20";
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (validation.status === "invalid") {
      e.preventDefault();
      alert(`Por favor corrige el documento de identidad antes de continuar:\n${validation.message}`);
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nombres y apellidos *</label>
          <input name="full_name" required defaultValue={student?.full_name} className="input" />
        </div>
        <div>
          <label className="label">Tipo de documento</label>
          <select
            name="document_type"
            value={docType}
            onChange={(e) => handleDocTypeChange(e.target.value as DocumentType)}
            className="select"
          >
            <option value="CEDULA">Cédula de identidad</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="OTRO">Otro documento</option>
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Número de documento</label>
            {validation.status === "valid" && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                ✓ {validation.message}
              </span>
            )}
          </div>
          <input
            name="document_id"
            value={docId}
            onChange={handleDocIdChange}
            inputMode={docType === "CEDULA" ? "numeric" : "text"}
            maxLength={docType === "CEDULA" ? 10 : docType === "PASAPORTE" ? 15 : 20}
            placeholder={placeholder}
            className={`input ${borderClass}`}
          />
          {validation.status === "invalid" && (
            <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">
              ⚠️ {validation.message}
            </p>
          )}
          {validation.status === "empty" && (
            <p className="text-[11px] text-slate-400 mt-1">
              Opcional si el estudiante aún no dispone de documento registrado.
            </p>
          )}
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
          <select name="jornada" defaultValue={student?.jornada ? student.jornada.toUpperCase() : ""} className="select">
            <option value="">Seleccionar jornada...</option>
            {JORNADA_OPTIONS.map((j) => (
              <option key={j} value={j}>
                {j === "MATUTINA" ? "☀️ Matutina" : j === "VESPERTINA" ? "🌅 Vespertina" : j === "NOCTURNA" ? "🌙 Nocturna" : j}
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
            <ParentDocumentInput name="father_document_id" label="Documento Padre" defaultValue={student?.father_document_id || ""} />
            <input name="father_education" placeholder="Instrucción" defaultValue={student?.father_education || ""} className="input" />
            <input name="father_address" placeholder="Domicilio" defaultValue={student?.father_address || ""} className="input" />
            <input name="father_phone" placeholder="Teléfono/celular" defaultValue={student?.father_phone || ""} className="input" />
            <input name="father_occupation" placeholder="Profesión u ocupación" defaultValue={student?.father_occupation || ""} className="input" />
            <input name="father_workplace" placeholder="Lugar de trabajo" defaultValue={student?.father_workplace || ""} className="input" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Madre</p>
            <input name="mother_name" placeholder="Nombres y apellidos" defaultValue={student?.mother_name || ""} className="input" />
            <ParentDocumentInput name="mother_document_id" label="Documento Madre" defaultValue={student?.mother_document_id || ""} />
            <input name="mother_education" placeholder="Instrucción" defaultValue={student?.mother_education || ""} className="input" />
            <input name="mother_address" placeholder="Domicilio" defaultValue={student?.mother_address || ""} className="input" />
            <input name="mother_phone" placeholder="Teléfono/celular" defaultValue={student?.mother_phone || ""} className="input" />
            <input name="mother_occupation" placeholder="Profesión u ocupación" defaultValue={student?.mother_occupation || ""} className="input" />
            <input name="mother_workplace" placeholder="Lugar de trabajo" defaultValue={student?.mother_workplace || ""} className="input" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Representante (si es distinto de papá/mamá)</p>
            <ParentDocumentInput name="representative_document_id" label="Documento Representante" defaultValue={student?.representative_document_id || ""} />
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
