import { db } from "@/lib/db";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import { institutionAcronym } from "@/lib/codesShared";
import { buildFichaCode } from "@/lib/restorativeCircleFicha";
import { formatStudentCourseFull } from "@/lib/studentCourse";

interface SessionLike {
  user: { id: string; institution_id: string | null; name?: string | null };
}

/** Precarga de la ficha de círculo restaurativo (institución, facilitador, código, caso/estudiante). */
export function getFichaPrefill(
  session: SessionLike,
  institutionId: string,
  opts: { caseFileId?: string | null } = {}
): Record<string, string> {
  const sig = getSignatureDefaults(session as never, institutionId);
  const inst = db
    .prepare("SELECT acronym, name, district FROM institutions WHERE id = ?")
    .get(institutionId) as
    | { acronym: string | null; name: string | null; district: string | null }
    | undefined;

  const year = new Date().getFullYear();
  const n = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM restorative_circle_fichas WHERE institution_id = ? AND ficha_code LIKE ?"
      )
      .get(institutionId, `CR-DECE-%-${year}-%`) as { c: number }
  ).c;

  const out: Record<string, string> = {
    ficha_code: buildFichaCode(institutionAcronym(inst), year, n + 1),
    center_name: inst?.name || "",
    district_name: inst?.district || "",
    facilitator_name: sig.deceProfessional.fullName || session.user.name || "",
    circle_type: "Reactivo",
    circle_date: new Date().toISOString().slice(0, 10),
  };

  if (opts.caseFileId) {
    const cf = db
      .prepare(
        `SELECT cf.id, cf.student_id, s.course, s.parallel, s.jornada, s.education_level, s.bachillerato_specialty
         FROM case_files cf LEFT JOIN students s ON s.id = cf.student_id
         WHERE cf.id = ? AND cf.institution_id = ?`
      )
      .get(opts.caseFileId, institutionId) as
      | {
          id: string;
          student_id: string | null;
          course: string | null;
          parallel: string | null;
          jornada: string | null;
          education_level: string | null;
          bachillerato_specialty: string | null;
        }
      | undefined;
    if (cf) {
      out.case_file_id = cf.id;
      if (cf.student_id) out.student_id = cf.student_id;
      const courseLabel = formatStudentCourseFull(
        {
          course: cf.course,
          parallel: cf.parallel,
          jornada: cf.jornada,
          education_level: cf.education_level,
          bachillerato_specialty: cf.bachillerato_specialty,
        } as never,
        { includeJornada: false }
      );
      out.participant_type = courseLabel
        ? `Estudiantes de ${courseLabel}`
        : "";
    }
  }

  return out;
}
