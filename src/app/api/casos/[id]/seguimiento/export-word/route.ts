import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import { studentGradeLabel } from "@/lib/studentCourse";
import { generateSeguimientoDocx } from "@/lib/seguimientoDocx";
import type { CaseFileRow, StudentRow, CaseActionRow, UserRow, InstitutionRow } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) {
    return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
  }

  const allActions = db
    .prepare("SELECT * FROM case_actions WHERE case_file_id = ? ORDER BY date ASC, created_at ASC")
    .all(caseFile.id) as CaseActionRow[];
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const users = db.prepare("SELECT * FROM users WHERE institution_id = ?").all(institutionId) as UserRow[];
  const userMap: Record<string, string> = {};
  users.forEach((u) => {
    userMap[u.id] = u.name;
  });

  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);
  const professional = {
    name: defaults?.deceProfessional.fullName || session.user.name || "Profesional DECE",
  };

  const studentGrade = studentGradeLabel(student) || [student.course, student.parallel].filter(Boolean).join(" ");

  // Parámetros de personalización (reflejan las opciones elegidas en la vista de impresión)
  const { searchParams } = new URL(req.url);
  const folioNumber = Math.max(1, Math.min(4, parseInt(searchParams.get("folio") || "1", 10) || 1));
  const blankRowsCount = Math.max(0, parseInt(searchParams.get("blank") || "0", 10) || 0);
  const showPerRowSign = searchParams.get("sign") === "1";
  const idsParam = searchParams.get("ids");
  const selectedIds = idsParam ? new Set(idsParam.split(",").filter(Boolean)) : null;
  const actions = selectedIds ? allActions.filter((a) => selectedIds.has(a.id)) : allActions;

  const buffer = await generateSeguimientoDocx({
    student,
    studentGrade,
    actions,
    institution,
    professional,
    userMap,
    folioNumber,
    showPerRowSign,
    blankRowsCount,
  });

  const fileName = `Seguimiento_Atencion_Psicosocial_${student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_")}${folioNumber > 1 ? `_Folio_${folioNumber}` : ""}.docx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
