"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, int, dateStr, getAllStr } from "@/lib/formData";
import {
  buildScheduleEntries,
  createInterviewSchedule,
  deleteInterviewSchedule,
  getStudentsByCourseParallel,
} from "@/lib/ovp/interviewSchedule";

export type ActionState = { error: string | null };

export async function createInterviewScheduleAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  let scheduleId = "";

  try {
    const course = str(formData, "course");
    const parallels = getAllStr(formData, "parallels");
    if (!course) return { error: "Selecciona el curso (ej. 10mo EGB)." };
    if (parallels.length === 0) return { error: "Selecciona al menos un paralelo." };

    const title = str(formData, "title") || "Cronograma de citas para la toma de decisión";
    const interviewDate = dateStr(formData, "interview_date");
    const startTime = str(formData, "start_time") || "07:00";
    const slotMinutes = int(formData, "slot_minutes") || 10;
    const studentsPerSlot = int(formData, "students_per_slot") || 3;
    const location = str(formData, "location");

    const rosterByParallel = parallels.map((p) => ({
      parallel: p,
      students: getStudentsByCourseParallel(institutionId, course, p),
    }));

    const totalStudents = rosterByParallel.reduce((a, g) => a + g.students.length, 0);
    if (totalStudents === 0) {
      return { error: "Los paralelos seleccionados no tienen estudiantes activos registrados." };
    }

    const entries = buildScheduleEntries(rosterByParallel, { startTime, slotMinutes, studentsPerSlot });

    scheduleId = createInterviewSchedule({
      institutionId,
      title,
      course,
      parallels,
      interviewDate,
      startTime,
      slotMinutes,
      studentsPerSlot,
      location,
      entries,
      createdBy: session.user.id,
    });

    logAudit({
      userId: session.user.id,
      action: "CREAR",
      entityType: "OvpInterviewSchedule",
      entityId: scheduleId,
      institutionId,
    });
    revalidatePath("/ovp/cronograma");
  } catch (err: any) {
    return { error: err?.message || "Ocurrió un error al generar el cronograma." };
  }

  redirect(`/ovp/cronograma/${scheduleId}`);
}

export async function deleteInterviewScheduleAction(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  deleteInterviewSchedule(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "OvpInterviewSchedule", entityId: id, institutionId });
  revalidatePath("/ovp/cronograma");
}
