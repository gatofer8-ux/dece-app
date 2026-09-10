import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { RISK_TYPE_LABELS, type RiskType } from "@/lib/types";
import { formatDocumentId } from "@/lib/documentId";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const institutionId = session.user.institution_id;
  const role = session.user.role;
  const pattern = `%${q}%`;

  const results: Array<{
    type: "student" | "case" | "appointment" | "alert";
    id: string;
    title: string;
    subtitle: string;
    href: string;
    badge?: string;
  }> = [];

  // 1. Estudiantes
  if (role !== "DISTRITO") {
    const students = db
      .prepare(
        `SELECT id, full_name, document_type, document_id, course, parallel 
         FROM students 
         WHERE institution_id = ? AND (full_name LIKE ? OR document_id LIKE ? OR course LIKE ?)
         LIMIT 6`
      )
      .all(institutionId, pattern, pattern, pattern) as Array<{
      id: string;
      full_name: string;
      document_type: string | null;
      document_id: string | null;
      course: string;
      parallel: string | null;
    }>;

    for (const s of students) {
      results.push({
        type: "student",
        id: s.id,
        title: s.full_name,
        subtitle: `${s.course} ${s.parallel || ""} · ${formatDocumentId(s.document_type, s.document_id, "short")}`,
        href: `/estudiantes/${s.id}`,
        badge: "Estudiante",
      });
    }
  }

  // 2. Casos y Fichas (si no es Docente ni Distrito con restricciones)
  if (role === "ADMIN" || role === "DECE") {
    const cases = db
      .prepare(
        `SELECT c.id, c.code, c.risk_type, c.status, c.priority, s.full_name as student_name
         FROM case_files c
         INNER JOIN students s ON s.id = c.student_id
         WHERE c.institution_id = ? AND (c.code LIKE ? OR s.full_name LIKE ? OR c.risk_type LIKE ?)
         LIMIT 6`
      )
      .all(institutionId, pattern, pattern, pattern) as Array<{
      id: string;
      code: string;
      risk_type: RiskType;
      status: string;
      priority: string;
      student_name: string;
    }>;

    for (const c of cases) {
      results.push({
        type: "case",
        id: c.id,
        title: `Caso ${c.code} · ${c.student_name}`,
        subtitle: `${RISK_TYPE_LABELS[c.risk_type] || c.risk_type} · Estado: ${c.status}`,
        href: `/casos/${c.id}`,
        badge: `Prioridad ${c.priority}`,
      });
    }
  }

  // 3. Alertas
  if (role === "ADMIN" || role === "DECE" || role === "DOCENTE") {
    const alerts = db
      .prepare(
        `SELECT a.id, a.description, a.status, s.full_name as student_name
         FROM teacher_alerts a
         INNER JOIN students s ON s.id = a.student_id
         WHERE a.institution_id = ? AND (s.full_name LIKE ? OR a.description LIKE ?)
         LIMIT 4`
      )
      .all(institutionId, pattern, pattern) as Array<{
      id: string;
      description: string;
      status: string;
      student_name: string;
    }>;

    for (const a of alerts) {
      results.push({
        type: "alert",
        id: a.id,
        title: `Alerta: ${a.student_name}`,
        subtitle: a.description.slice(0, 80) + (a.description.length > 80 ? "..." : ""),
        href: `/alertas`,
        badge: a.status,
      });
    }
  }

  // 4. Citas
  if (role === "ADMIN" || role === "DECE") {
    const appts = db
      .prepare(
        `SELECT a.id, a.title, a.date, a.start_time, a.status, s.full_name as student_name
         FROM appointments a
         LEFT JOIN students s ON s.id = a.student_id
         WHERE a.institution_id = ? AND (a.title LIKE ? OR (s.full_name IS NOT NULL AND s.full_name LIKE ?))
         LIMIT 4`
      )
      .all(institutionId, pattern, pattern) as Array<{
      id: string;
      title: string;
      date: string;
      start_time: string;
      status: string;
      student_name: string | null;
    }>;

    for (const ap of appts) {
      results.push({
        type: "appointment",
        id: ap.id,
        title: `Cita: ${ap.title} ${ap.student_name ? `(${ap.student_name})` : ""}`,
        subtitle: `Fecha: ${ap.date} a las ${ap.start_time} · ${ap.status}`,
        href: `/citas`,
        badge: "Agenda",
      });
    }
  }

  return NextResponse.json({ results });
}
