import { randomUUID } from "crypto";
import { db } from "@/lib/db";

export * from "./interviewScheduleTime";
import type { RosterStudentLite, ScheduleEntry } from "./interviewScheduleTime";

/** Estudiantes activos de un curso/paralelo puntual, en orden alfabético. */
export function getStudentsByCourseParallel(
  institutionId: string,
  course: string,
  parallel: string
): RosterStudentLite[] {
  return db
    .prepare(
      `SELECT id, full_name, document_id, course, parallel
       FROM students
       WHERE institution_id = ? AND active = 1 AND course = ? AND parallel = ?
       ORDER BY full_name ASC`
    )
    .all(institutionId, course, parallel) as RosterStudentLite[];
}

/** Paralelos disponibles (con estudiantes activos) para un curso dado. */
export function getParallelsForCourse(institutionId: string, course: string): string[] {
  return (
    db
      .prepare(
        `SELECT DISTINCT parallel FROM students
         WHERE institution_id = ? AND active = 1 AND course = ? AND parallel IS NOT NULL AND parallel <> ''
         ORDER BY parallel ASC`
      )
      .all(institutionId, course) as { parallel: string }[]
  ).map((r) => r.parallel);
}

export interface OvpInterviewScheduleRow {
  id: string;
  institution_id: string;
  title: string;
  course: string;
  parallels_json: string;
  interview_date: string | null;
  start_time: string;
  slot_minutes: number;
  students_per_slot: number;
  location: string | null;
  entries_json: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function createInterviewSchedule(input: {
  institutionId: string;
  title: string;
  course: string;
  parallels: string[];
  interviewDate: string | null;
  startTime: string;
  slotMinutes: number;
  studentsPerSlot: number;
  location: string | null;
  entries: ScheduleEntry[];
  createdBy: string | null;
}): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO ovp_interview_schedules
      (id, institution_id, title, course, parallels_json, interview_date, start_time, slot_minutes, students_per_slot, location, entries_json, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.institutionId,
    input.title,
    input.course,
    JSON.stringify(input.parallels),
    input.interviewDate,
    input.startTime,
    input.slotMinutes,
    input.studentsPerSlot,
    input.location,
    JSON.stringify(input.entries),
    input.createdBy
  );
  return id;
}

export function getInterviewSchedule(id: string, institutionId: string): OvpInterviewScheduleRow | null {
  const row = db
    .prepare("SELECT * FROM ovp_interview_schedules WHERE id = ? AND institution_id = ?")
    .get(id, institutionId) as OvpInterviewScheduleRow | undefined;
  return row || null;
}

export function listInterviewSchedules(institutionId: string): OvpInterviewScheduleRow[] {
  return db
    .prepare("SELECT * FROM ovp_interview_schedules WHERE institution_id = ? ORDER BY created_at DESC")
    .all(institutionId) as OvpInterviewScheduleRow[];
}

export function deleteInterviewSchedule(id: string, institutionId: string): void {
  db.prepare("DELETE FROM ovp_interview_schedules WHERE id = ? AND institution_id = ?").run(id, institutionId);
}
