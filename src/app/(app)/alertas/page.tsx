import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, EmptyState, formatDateTime } from "@/components/ui";
import { ALERT_STATUS_LABELS, type TeacherAlertRow, type UserRow, type StudentRow } from "@/lib/types";
import { updateAlertStatus } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: "amber",
  EN_REVISION: "blue",
  CONVERTIDA_EN_CASO: "green",
  DESCARTADA: "slate",
};

export default async function AlertasPage() {
  const session = await requireRole(["ADMIN", "DECE", "DOCENTE"]);
  const institutionId = requireInstitutionId(session);
  const isReviewer = session.user.role === "ADMIN" || session.user.role === "DECE";

  const alerts = isReviewer
    ? (db
        .prepare("SELECT * FROM teacher_alerts WHERE institution_id = ? ORDER BY created_at DESC LIMIT 200")
        .all(institutionId) as TeacherAlertRow[])
    : (db
        .prepare("SELECT * FROM teacher_alerts WHERE institution_id = ? AND reported_by_id = ? ORDER BY created_at DESC LIMIT 200")
        .all(institutionId, session.user.id) as TeacherAlertRow[]);

  const students = db.prepare("SELECT * FROM students WHERE institution_id = ?").all(institutionId) as StudentRow[];
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const users = db.prepare("SELECT * FROM users WHERE institution_id = ?").all(institutionId) as UserRow[];
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div>
      <PageHeader
        title="Alertas"
        description={
          isReviewer
            ? "Situaciones reportadas por docentes, pendientes de revisión por el equipo DECE."
            : "Reporta una situación observada en un estudiante para que el equipo DECE la revise."
        }
        action={
          <Link href="/alertas/nueva" className="btn-primary">
            + Reportar alerta
          </Link>
        }
      />

      {alerts.length === 0 ? (
        <EmptyState title="No hay alertas registradas" />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const student = studentMap.get(a.student_id);
            return (
              <div key={a.id} className="card p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-medium text-slate-800">{student?.full_name || "Estudiante"}</div>
                    <div className="text-xs text-slate-400">{student?.course} {student?.parallel || ""}</div>
                  </div>
                  <Badge color={STATUS_COLOR[a.status]}>{ALERT_STATUS_LABELS[a.status]}</Badge>
                </div>
                <p className="text-sm text-slate-700 mt-2">{a.description}</p>
                <div className="text-xs text-slate-400 mt-2">
                  Reportado por {userMap.get(a.reported_by_id) || "—"} · {formatDateTime(a.created_at)}
                </div>
                {a.case_file_id && (
                  <Link href={`/casos/${a.case_file_id}`} className="text-xs text-brand-600 hover:underline">
                    Ver caso generado →
                  </Link>
                )}
                {isReviewer && a.status !== "CONVERTIDA_EN_CASO" && a.status !== "DESCARTADA" && (
                  <div className="flex gap-3 mt-3">
                    <Link href={`/casos/nuevo?alerta=${a.id}`} className="text-xs text-brand-700 font-medium hover:underline">
                      Convertir en caso →
                    </Link>
                    {a.status === "PENDIENTE" && (
                      <form action={async () => { "use server"; await updateAlertStatus(a.id, "EN_REVISION"); }}>
                        <button className="text-xs text-blue-700 hover:underline">Marcar en revisión</button>
                      </form>
                    )}
                    <form action={async () => { "use server"; await updateAlertStatus(a.id, "DESCARTADA"); }}>
                      <button className="text-xs text-slate-500 hover:underline">Descartar</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
