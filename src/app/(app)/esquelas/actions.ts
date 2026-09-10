"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import {
  createEsquela,
  updateEsquela,
  updateTalonStatus,
  deleteEsquela,
  getEsquelaById,
} from "@/lib/esquelas";

function str(formData: FormData, key: string): string {
  const val = formData.get(key);
  return typeof val === "string" ? val.trim() : "";
}

export async function createEsquelaAction(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const studentName = str(formData, "student_name");
  const representativeName = str(formData, "representative_name");
  const citationDate = str(formData, "citation_date");
  const citationTime = str(formData, "citation_time");
  const citationReason = str(formData, "citation_reason");

  if (!studentName) throw new Error("El nombre del estudiante es obligatorio.");
  if (!representativeName) throw new Error("El nombre del representante es obligatorio.");
  if (!citationDate) throw new Error("La fecha de la cita es obligatoria.");
  if (!citationTime) throw new Error("La hora de la cita es obligatoria.");
  if (!citationReason) throw new Error("El motivo de la citación es obligatorio.");

  const caseFileId = str(formData, "case_file_id") || null;
  const studentId = str(formData, "student_id") || null;
  const returnToCase = str(formData, "return_to_case") === "true";

  const esquela = createEsquela({
    institutionId,
    caseFileId,
    studentId,
    studentName,
    studentIdNumber: str(formData, "student_id_number") || null,
    course: str(formData, "course") || null,
    parallel: str(formData, "parallel") || null,
    jornada: str(formData, "jornada") || null,
    representativeName,
    representativeIdNumber: str(formData, "representative_id_number") || null,
    representativePhone: str(formData, "representative_phone") || null,
    citationDate,
    citationTime,
    citationPlace: str(formData, "citation_place") || "Oficina del DECE",
    citationReason,
    urgencyLevel: str(formData, "urgency_level") === "URGENTE" ? "URGENTE" : "ORDINARIA",
    professionalId: session.user.id,
    professionalName: str(formData, "professional_name") || session.user.name || "Profesional DECE",
    professionalRole: str(formData, "professional_role") || "Profesional DECE",
    observations: str(formData, "observations") || null,
    schoolYearText: str(formData, "school_year_text") || null,
  });

  revalidatePath("/esquelas");
  if (caseFileId) {
    revalidatePath(`/casos/${caseFileId}`);
    revalidatePath("/casos");
  }

  if (returnToCase && caseFileId) {
    redirect(`/casos/${caseFileId}`);
  } else {
    redirect(`/esquelas/${esquela.id}`);
  }
}

export async function updateEsquelaAction(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const esquela = getEsquelaById(id, institutionId);
  if (!esquela) throw new Error("Esquela no encontrada.");

  const studentName = str(formData, "student_name");
  const representativeName = str(formData, "representative_name");
  const citationDate = str(formData, "citation_date");
  const citationTime = str(formData, "citation_time");
  const citationReason = str(formData, "citation_reason");

  if (!studentName) throw new Error("El nombre del estudiante es obligatorio.");
  if (!representativeName) throw new Error("El nombre del representante es obligatorio.");
  if (!citationDate) throw new Error("La fecha de la cita es obligatoria.");
  if (!citationTime) throw new Error("La hora de la cita es obligatoria.");
  if (!citationReason) throw new Error("El motivo de la citación es obligatorio.");

  updateEsquela(id, institutionId, {
    studentName,
    studentIdNumber: str(formData, "student_id_number") || null,
    course: str(formData, "course") || null,
    parallel: str(formData, "parallel") || null,
    jornada: str(formData, "jornada") || null,
    representativeName,
    representativeIdNumber: str(formData, "representative_id_number") || null,
    representativePhone: str(formData, "representative_phone") || null,
    citationDate,
    citationTime,
    citationPlace: str(formData, "citation_place") || "Oficina del DECE",
    citationReason,
    urgencyLevel: str(formData, "urgency_level") === "URGENTE" ? "URGENTE" : "ORDINARIA",
    professionalName: str(formData, "professional_name") || esquela.professional_name,
    professionalRole: str(formData, "professional_role") || "Profesional DECE",
    observations: str(formData, "observations") || null,
  });

  revalidatePath("/esquelas");
  revalidatePath(`/esquelas/${id}`);
  if (esquela.case_file_id) {
    revalidatePath(`/casos/${esquela.case_file_id}`);
    revalidatePath("/casos");
  }

  redirect(`/esquelas/${id}`);
}

export async function updateTalonStatusAction(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const esquela = getEsquelaById(id, institutionId);
  if (!esquela) throw new Error("Esquela no encontrada.");

  const talonReturned = formData.get("talon_returned") === "1" || formData.get("talon_returned") === "on";
  const receivedByName = str(formData, "received_by_name") || null;
  const receivedByRelation = str(formData, "received_by_relation") || null;
  const receivedByIdNumber = str(formData, "received_by_id_number") || null;
  const receivedDate = str(formData, "received_date") || null;
  const talonAttendedRaw = str(formData, "talon_attended");
  const talonAttended = talonAttendedRaw ? parseInt(talonAttendedRaw, 10) : 0;
  const talonNotes = str(formData, "talon_notes") || null;

  updateTalonStatus(id, institutionId, {
    talonReturned,
    receivedByName,
    receivedByRelation,
    receivedByIdNumber,
    receivedDate,
    talonAttended: isNaN(talonAttended) ? 0 : talonAttended,
    talonNotes,
  });

  revalidatePath("/esquelas");
  revalidatePath(`/esquelas/${id}`);
  if (esquela.case_file_id) {
    revalidatePath(`/casos/${esquela.case_file_id}`);
    revalidatePath("/casos");
  }
}

export async function deleteEsquelaAction(id: string, caseFileId?: string | null) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  deleteEsquela(id, institutionId);

  revalidatePath("/esquelas");
  if (caseFileId) {
    revalidatePath(`/casos/${caseFileId}`);
    revalidatePath("/casos");
    redirect(`/casos/${caseFileId}`);
  } else {
    redirect("/esquelas");
  }
}
