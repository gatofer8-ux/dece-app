"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, num as intOrNull, getAllStr } from "@/lib/formData";
import {
  validateDocumentId,
  normalizeDocumentId,
  detectDocumentType,
  type DocumentType,
} from "@/lib/documentId";

/** Validación de los campos críticos de la ficha del estudiante. */
const studentCoreSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, "El nombre completo del estudiante es obligatorio."),
  rep_email: z
    .string()
    .trim()
    .email("El correo del representante no es válido.")
    .optional()
    .or(z.literal("")),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de nacimiento debe tener formato AAAA-MM-DD.")
    .optional()
    .or(z.literal("")),
});

/** Lanza con un mensaje legible si los campos críticos del formulario no validan. */
function assertValidStudent(formData: FormData) {
  const result = studentCoreSchema.safeParse({
    full_name: formData.get("full_name") ?? "",
    rep_email: formData.get("rep_email") ?? "",
    birth_date: formData.get("birth_date") ?? "",
  });
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Datos del estudiante inválidos.");
  }

  const rawDocId = str(formData, "document_id");
  if (rawDocId) {
    const rawDocType = str(formData, "document_type");
    const docId = normalizeDocumentId(rawDocId);
    const docType = (rawDocType || detectDocumentType(docId)) as DocumentType;
    const validation = validateDocumentId(docType, docId, { required: false });
    if (!validation.ok) {
      throw new Error(validation.reason ?? "El número de documento no es válido.");
    }
  }
}

/** Campos de la ficha ampliada del estudiante (ronda 17), compartidos entre crear y editar. */
function extendedStudentFields(formData: FormData) {
  return {
    birth_country: str(formData, "birth_country"),
    birth_province: str(formData, "birth_province"),
    birth_canton: str(formData, "birth_canton"),
    birth_parish: str(formData, "birth_parish"),
    jornada: str(formData, "jornada") ? str(formData, "jornada")!.toUpperCase().trim() : null,
    education_level: str(formData, "education_level"),
    bachillerato_specialty: str(formData, "bachillerato_specialty"),
    neighborhood: str(formData, "neighborhood"),
    lives_with: str(formData, "lives_with"),
    lives_with_other: str(formData, "lives_with_other"),
    leaves_alone_authorized: intOrNull(formData, "leaves_alone_authorized"),
    legal_guardian: str(formData, "legal_guardian"),
    father_name: str(formData, "father_name"),
    father_document_id: str(formData, "father_document_id") ? normalizeDocumentId(str(formData, "father_document_id")!) : null,
    father_education: str(formData, "father_education"),
    father_address: str(formData, "father_address"),
    father_phone: str(formData, "father_phone"),
    father_occupation: str(formData, "father_occupation"),
    father_workplace: str(formData, "father_workplace"),
    mother_name: str(formData, "mother_name"),
    mother_document_id: str(formData, "mother_document_id") ? normalizeDocumentId(str(formData, "mother_document_id")!) : null,
    mother_education: str(formData, "mother_education"),
    mother_address: str(formData, "mother_address"),
    mother_phone: str(formData, "mother_phone"),
    mother_occupation: str(formData, "mother_occupation"),
    mother_workplace: str(formData, "mother_workplace"),
    representative_document_id: str(formData, "representative_document_id") ? normalizeDocumentId(str(formData, "representative_document_id")!) : null,
    representative_education: str(formData, "representative_education"),
    representative_address: str(formData, "representative_address"),
    representative_occupation: str(formData, "representative_occupation"),
    representative_workplace: str(formData, "representative_workplace"),
    nee_types: JSON.stringify(getAllStr(formData, "nee_types")),
    disability_card_detail: str(formData, "disability_card_detail"),
    medical_condition: str(formData, "medical_condition"),
    medical_allergies: str(formData, "medical_allergies"),
    medical_medication_intolerance: str(formData, "medical_medication_intolerance"),
    medical_food_intolerance: str(formData, "medical_food_intolerance"),
  };
}

export async function createStudent(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  assertValidStudent(formData);
  const id = randomUUID();

  const rawDocId = str(formData, "document_id");
  const docId = rawDocId ? normalizeDocumentId(rawDocId) : null;
  const docType = str(formData, "document_type") || (docId ? detectDocumentType(docId) : "CEDULA");

  try {
    db.prepare(
      `INSERT INTO students (
         id, institution_id, full_name, document_type, document_id, birth_date, gender, course, parallel, representative, rep_phone, rep_email, address, notes,
         birth_country, birth_province, birth_canton, birth_parish, jornada, education_level, bachillerato_specialty, neighborhood, lives_with, lives_with_other, leaves_alone_authorized,
         legal_guardian, father_name, father_document_id, father_education, father_address, father_phone, father_occupation, father_workplace,
         mother_name, mother_document_id, mother_education, mother_address, mother_phone, mother_occupation, mother_workplace,
         representative_document_id, representative_education, representative_address, representative_occupation, representative_workplace,
         nee_types, disability_card_detail,
         medical_condition, medical_allergies, medical_medication_intolerance, medical_food_intolerance
       )
       VALUES (
         @id, @institution_id, @full_name, @document_type, @document_id, @birth_date, @gender, @course, @parallel, @representative, @rep_phone, @rep_email, @address, @notes,
         @birth_country, @birth_province, @birth_canton, @birth_parish, @jornada, @education_level, @bachillerato_specialty, @neighborhood, @lives_with, @lives_with_other, @leaves_alone_authorized,
         @legal_guardian, @father_name, @father_document_id, @father_education, @father_address, @father_phone, @father_occupation, @father_workplace,
         @mother_name, @mother_document_id, @mother_education, @mother_address, @mother_phone, @mother_occupation, @mother_workplace,
         @representative_document_id, @representative_education, @representative_address, @representative_occupation, @representative_workplace,
         @nee_types, @disability_card_detail,
         @medical_condition, @medical_allergies, @medical_medication_intolerance, @medical_food_intolerance
       )`
    ).run({
      id,
      institution_id: institutionId,
      full_name: str(formData, "full_name"),
      document_type: docType,
      document_id: docId,
      birth_date: str(formData, "birth_date"),
      gender: str(formData, "gender"),
      course: str(formData, "course"),
      parallel: str(formData, "parallel"),
      representative: str(formData, "representative"),
      rep_phone: str(formData, "rep_phone"),
      rep_email: str(formData, "rep_email"),
      address: str(formData, "address"),
      notes: str(formData, "notes"),
      ...extendedStudentFields(formData),
    });
  } catch (err: any) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      throw new Error("Ya existe un estudiante registrado con este documento en la institución.");
    }
    throw err;
  }

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "Student", entityId: id, institutionId });
  revalidatePath("/estudiantes");
  redirect(`/estudiantes/${id}`);
}

export async function updateStudent(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  assertValidStudent(formData);

  const rawDocId = str(formData, "document_id");
  const docId = rawDocId ? normalizeDocumentId(rawDocId) : null;
  const docType = str(formData, "document_type") || (docId ? detectDocumentType(docId) : "CEDULA");

  try {
    db.prepare(
      `UPDATE students SET full_name=@full_name, document_type=@document_type, document_id=@document_id, birth_date=@birth_date, gender=@gender,
         course=@course, parallel=@parallel, representative=@representative, rep_phone=@rep_phone, rep_email=@rep_email,
         address=@address, notes=@notes,
         birth_country=@birth_country, birth_province=@birth_province, birth_canton=@birth_canton, birth_parish=@birth_parish,
         jornada=@jornada, education_level=@education_level, bachillerato_specialty=@bachillerato_specialty,
         neighborhood=@neighborhood, lives_with=@lives_with, lives_with_other=@lives_with_other,
         leaves_alone_authorized=@leaves_alone_authorized,
         legal_guardian=@legal_guardian,
         father_name=@father_name, father_document_id=@father_document_id, father_education=@father_education,
         father_address=@father_address, father_phone=@father_phone, father_occupation=@father_occupation, father_workplace=@father_workplace,
         mother_name=@mother_name, mother_document_id=@mother_document_id, mother_education=@mother_education,
         mother_address=@mother_address, mother_phone=@mother_phone, mother_occupation=@mother_occupation, mother_workplace=@mother_workplace,
         representative_document_id=@representative_document_id, representative_education=@representative_education,
         representative_address=@representative_address, representative_occupation=@representative_occupation, representative_workplace=@representative_workplace,
         nee_types=@nee_types, disability_card_detail=@disability_card_detail,
         medical_condition=@medical_condition, medical_allergies=@medical_allergies,
         medical_medication_intolerance=@medical_medication_intolerance, medical_food_intolerance=@medical_food_intolerance,
         updated_at=datetime('now')
       WHERE id=@id AND institution_id=@institution_id`
    ).run({
      id,
      institution_id: institutionId,
      full_name: str(formData, "full_name"),
      document_type: docType,
      document_id: docId,
      birth_date: str(formData, "birth_date"),
      gender: str(formData, "gender"),
      course: str(formData, "course"),
      parallel: str(formData, "parallel"),
      representative: str(formData, "representative"),
      rep_phone: str(formData, "rep_phone"),
      rep_email: str(formData, "rep_email"),
      address: str(formData, "address"),
      notes: str(formData, "notes"),
      ...extendedStudentFields(formData),
    });
  } catch (err: any) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      throw new Error("Ya existe un estudiante registrado con este documento en la institución.");
    }
    throw err;
  }

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "Student", entityId: id, institutionId });
  revalidatePath("/estudiantes");
  revalidatePath(`/estudiantes/${id}`);
  redirect(`/estudiantes/${id}`);
}

/**
 * Borra un estudiante (ronda 19) — solo para corregir registros duplicados
 * creados por error. Por seguridad de integridad referencial, se bloquea el
 * borrado si el estudiante tiene casos, citas o alertas de docentes
 * asociados (esas tablas no tienen ON DELETE CASCADE hacia students), y se
 * sugiere desactivar el registro en su lugar.
 */
export async function deleteStudent(id: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const student = db.prepare("SELECT id FROM students WHERE id = ? AND institution_id = ?").get(id, institutionId);
  if (!student) throw new Error("Estudiante no encontrado en tu institución.");

  const caseCount = (db.prepare("SELECT COUNT(*) AS n FROM case_files WHERE student_id = ?").get(id) as { n: number }).n;
  const appointmentCount = (db.prepare("SELECT COUNT(*) AS n FROM appointments WHERE student_id = ?").get(id) as { n: number }).n;
  const alertCount = (db.prepare("SELECT COUNT(*) AS n FROM teacher_alerts WHERE student_id = ?").get(id) as { n: number }).n;

  if (caseCount > 0 || appointmentCount > 0 || alertCount > 0) {
    const partes: string[] = [];
    if (caseCount > 0) partes.push(`${caseCount} caso(s)`);
    if (appointmentCount > 0) partes.push(`${appointmentCount} cita(s)`);
    if (alertCount > 0) partes.push(`${alertCount} alerta(s) de docente`);
    throw new Error(
      `No se puede borrar: este estudiante tiene ${partes.join(", ")} asociado(s). ` +
        `Borra o reasigna esos registros primero, o usa "Desactivar" si solo quieres ocultarlo de la lista.`
    );
  }

  db.prepare("DELETE FROM students WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "Student", entityId: id, institutionId });
  revalidatePath("/estudiantes");
}

export async function toggleStudentActive(id: string, active: boolean) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare(`UPDATE students SET active=?, updated_at=datetime('now') WHERE id=? AND institution_id=?`).run(
    active ? 1 : 0,
    id,
    institutionId
  );
  logAudit({
    userId: session.user.id,
    action: active ? "REACTIVAR" : "DESACTIVAR",
    entityType: "Student",
    entityId: id,
    institutionId,
  });
  revalidatePath("/estudiantes");
  revalidatePath(`/estudiantes/${id}`);
}

export async function enrollStudentInYearAction(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const studentId = String(formData.get("student_id") || "");
  const schoolYearId = String(formData.get("school_year_id") || "");
  const course = String(formData.get("course") || "").trim();
  const parallel = str(formData, "parallel");
  const jornada = str(formData, "jornada") ? str(formData, "jornada")!.toUpperCase().trim() : null;
  const education_level = str(formData, "education_level");
  const specialty = str(formData, "specialty");

  if (!studentId || !schoolYearId || !course) {
    throw new Error("Estudiante, Año Lectivo y Curso son obligatorios.");
  }

  const { upsertStudentEnrollment } = await import("@/lib/schoolYear");
  upsertStudentEnrollment({
    studentId,
    schoolYearId,
    institutionId,
    course,
    parallel,
    jornada,
    educationLevel: education_level,
    specialty,
  });

  // Opcional: actualizar también curso y paralelo en la ficha base
  db.prepare(
    `UPDATE students SET course = ?, parallel = ?, jornada = COALESCE(?, jornada), education_level = COALESCE(?, education_level), bachillerato_specialty = COALESCE(?, bachillerato_specialty), updated_at = datetime('now')
     WHERE id = ? AND institution_id = ?`
  ).run(course, parallel, jornada, education_level, specialty, studentId, institutionId);

  logAudit({
    userId: session.user.id,
    action: "MATRICULAR",
    entityType: "Student",
    entityId: studentId,
    institutionId,
    details: `Matriculado en año lectivo ID ${schoolYearId}, Curso: ${course} ${parallel || ""}`,
  });

  revalidatePath(`/estudiantes/${studentId}`);
  revalidatePath("/estudiantes");
}

