"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { requireSession, requireInstitutionId } from "./session";
import { canManageStudents } from "./permissions";
import type { RestorativeCircleConsentRow } from "./types";

export async function getCircleConsentById(
  id: string,
  institutionId: string
): Promise<RestorativeCircleConsentRow | null> {
  const row = db
    .prepare("SELECT * FROM restorative_circle_consents WHERE id = ? AND institution_id = ?")
    .get(id, institutionId) as RestorativeCircleConsentRow | undefined;
  return row || null;
}

export async function listCircleConsents(
  institutionId: string,
  schoolYearId?: string | null
): Promise<RestorativeCircleConsentRow[]> {
  let query = "SELECT * FROM restorative_circle_consents WHERE institution_id = ?";
  const params: any[] = [institutionId];

  if (schoolYearId) {
    query += " AND school_year_id = ?";
    params.push(schoolYearId);
  }

  query += " ORDER BY consent_date DESC, created_at DESC";
  return db.prepare(query).all(...params) as RestorativeCircleConsentRow[];
}

export async function listCircleConsentsByCase(
  caseFileId: string
): Promise<RestorativeCircleConsentRow[]> {
  return db
    .prepare(
      "SELECT * FROM restorative_circle_consents WHERE case_file_id = ? ORDER BY consent_date DESC, created_at DESC"
    )
    .all(caseFileId) as RestorativeCircleConsentRow[];
}

export async function createCircleConsentAction(formData: FormData) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  if (!canManageStudents(session.user.role)) {
    throw new Error("No tienes permisos para crear consentimientos.");
  }

  const id = crypto.randomUUID();
  const caseFileId = (formData.get("case_file_id") as string)?.trim() || null;
  const studentId = (formData.get("student_id") as string)?.trim() || null;
  const schoolYearId = (formData.get("school_year_id") as string)?.trim() || null;

  let studentName = (formData.get("student_name") as string)?.trim() || "";
  if (!studentName && studentId) {
    const student = db.prepare("SELECT full_name FROM students WHERE id = ?").get(studentId) as { full_name: string } | undefined;
    if (student?.full_name) {
      studentName = student.full_name;
    }
  }
  const courseParallel = (formData.get("course_parallel") as string)?.trim() || "";
  const courseParallelFull = (formData.get("course_parallel_full") as string)?.trim() || courseParallel;
  const courseParallelShort = (formData.get("course_parallel_short") as string)?.trim() || courseParallel;
  const shift = (formData.get("shift") as string)?.trim() || "Matutina";
  const representativePhone = (formData.get("representative_phone") as string)?.trim() || null;
  const consentDate = (formData.get("consent_date") as string)?.trim() || new Date().toISOString().split("T")[0];

  const representativeName = (formData.get("representative_name") as string)?.trim() || null;
  const representativeCi = (formData.get("representative_ci") as string)?.trim() || null;

  const deceUserId = session.user.id;
  const deceName = (formData.get("dece_name") as string)?.trim() || session.user.name || "Profesional DECE";
  const deceRole = (formData.get("dece_role") as string)?.trim() || "Profesional DECE";

  db.prepare(`
    INSERT INTO restorative_circle_consents (
      id, institution_id, school_year_id, case_file_id, student_id,
      student_name, course_parallel, course_parallel_full, course_parallel_short,
      shift, representative_phone, consent_date,
      representative_name, representative_ci,
      dece_user_id, dece_name, dece_role,
      created_by, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, datetime('now'), datetime('now')
    )
  `).run(
    id, institutionId, schoolYearId, caseFileId, studentId,
    studentName, courseParallel, courseParallelFull, courseParallelShort,
    shift, representativePhone, consentDate,
    representativeName, representativeCi,
    deceUserId, deceName, deceRole,
    session.user.id
  );

  // If associated with a case file, also register an action log in case_actions
  if (caseFileId) {
    try {
      db.prepare(`
        INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, intervention_type, observations)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        caseFileId,
        session.user.id,
        consentDate,
        "Consentimiento informado Círculo Restaurativo",
        `Emisión de consentimiento informado de círculo restaurativo para el estudiante ${studentName} (${courseParallelShort}). Representante: ${representativeName || "Por definir"}.`,
        "Intervención Restaurativa",
        `Jornada: ${shift}. Círculo restaurativo planificado para ${courseParallelFull}.`
      );
      revalidatePath(`/casos/${caseFileId}`);
    } catch {
      // ignore
    }
  }

  revalidatePath("/circulos-restaurativos");
  redirect(`/circulos-restaurativos/${id}/imprimir`);
}

export async function updateCircleConsentAction(id: string, formData: FormData) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  if (!canManageStudents(session.user.role)) {
    throw new Error("No tienes permisos para editar consentimientos.");
  }

  const existing = await getCircleConsentById(id, institutionId);
  if (!existing) {
    throw new Error("Consentimiento no encontrado.");
  }
  let studentName = (formData.get("student_name") as string)?.trim() || "";
  if (!studentName && existing.student_id) {
    const student = db.prepare("SELECT full_name FROM students WHERE id = ?").get(existing.student_id) as { full_name: string } | undefined;
    studentName = student?.full_name || existing.student_name;
  } else if (!studentName) {
    studentName = existing.student_name;
  }
  const courseParallel = (formData.get("course_parallel") as string)?.trim() || "";
  const courseParallelFull = (formData.get("course_parallel_full") as string)?.trim() || courseParallel;
  const courseParallelShort = (formData.get("course_parallel_short") as string)?.trim() || courseParallel;
  const shift = (formData.get("shift") as string)?.trim() || "Matutina";
  const representativePhone = (formData.get("representative_phone") as string)?.trim() || null;
  const consentDate = (formData.get("consent_date") as string)?.trim() || new Date().toISOString().split("T")[0];

  const representativeName = (formData.get("representative_name") as string)?.trim() || null;
  const representativeCi = (formData.get("representative_ci") as string)?.trim() || null;

  const deceName = (formData.get("dece_name") as string)?.trim() || existing.dece_name;
  const deceRole = (formData.get("dece_role") as string)?.trim() || existing.dece_role;

  db.prepare(`
    UPDATE restorative_circle_consents SET
      student_name = ?,
      course_parallel = ?,
      course_parallel_full = ?,
      course_parallel_short = ?,
      shift = ?,
      representative_phone = ?,
      consent_date = ?,
      representative_name = ?,
      representative_ci = ?,
      dece_name = ?,
      dece_role = ?,
      updated_at = datetime('now')
    WHERE id = ? AND institution_id = ?
  `).run(
    studentName, courseParallel, courseParallelFull, courseParallelShort,
    shift, representativePhone, consentDate,
    representativeName, representativeCi,
    deceName, deceRole,
    id, institutionId
  );

  if (existing.case_file_id) {
    revalidatePath(`/casos/${existing.case_file_id}`);
  }
  revalidatePath("/circulos-restaurativos");
  redirect(`/circulos-restaurativos/${id}/imprimir`);
}

export async function deleteCircleConsentAction(id: string) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  if (!canManageStudents(session.user.role)) {
    throw new Error("No tienes permisos para eliminar consentimientos.");
  }

  const existing = await getCircleConsentById(id, institutionId);
  if (existing) {
    db.prepare("DELETE FROM restorative_circle_consents WHERE id = ? AND institution_id = ?").run(
      id,
      institutionId
    );
    if (existing.case_file_id) {
      revalidatePath(`/casos/${existing.case_file_id}`);
    }
    revalidatePath("/circulos-restaurativos");
  }
}
