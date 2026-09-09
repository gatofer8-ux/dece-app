import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canViewCaseDetail } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  RISK_TYPE_LABELS,
  CASE_STATUS_LABELS,
  CASE_PRIORITY_LABELS,
  ACTION_AXIS_LABELS,
  REFERRAL_STATUS_LABELS,
  ACTIVITY_AXIS_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || !["ADMIN", "DECE", "AUTORIDAD"].includes(session.user.role) || !session.user.institution_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const institutionId = session.user.institution_id;

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") || new Date().toISOString().slice(0, 10);
  const end = searchParams.get("end") || new Date().toISOString().slice(0, 10);
  const includeNarrative = canViewCaseDetail(session.user.role);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Gestión DECE";
  workbook.created = new Date();

  // ---- Hoja resumen ----
  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [{ header: "Indicador", key: "k", width: 40 }, { header: "Valor", key: "v", width: 20 }];
  summary.getRow(1).font = { bold: true };

  const caseCount = (db.prepare(`SELECT COUNT(*) n FROM case_files WHERE institution_id = ? AND date(detection_date) BETWEEN date(?) AND date(?)`).get(institutionId, start, end) as any).n;
  const referralCount = (
    db
      .prepare(
        `SELECT COUNT(*) n FROM referrals r JOIN case_files cf ON cf.id = r.case_file_id WHERE cf.institution_id = ? AND date(r.referral_date) BETWEEN date(?) AND date(?)`
      )
      .get(institutionId, start, end) as any
  ).n;
  const activityCount = (db.prepare(`SELECT COUNT(*) n FROM activities WHERE institution_id = ? AND date(date) BETWEEN date(?) AND date(?)`).get(institutionId, start, end) as any).n;
  const apptCount = (db.prepare(`SELECT COUNT(*) n FROM appointments WHERE institution_id = ? AND date(date) BETWEEN date(?) AND date(?)`).get(institutionId, start, end) as any).n;

  summary.addRows([
    { k: "Período", v: `${start} a ${end}` },
    { k: "Generado por", v: `${session.user.name} (${session.user.role})` },
    { k: "Fecha de generación", v: new Date().toLocaleString("es-EC") },
    { k: "Total de casos", v: caseCount },
    { k: "Total de derivaciones", v: referralCount },
    { k: "Total de actividades", v: activityCount },
    { k: "Total de citas", v: apptCount },
  ]);

  // ---- Hoja casos ----
  const casesSheet = workbook.addWorksheet("Casos");
  const caseColumns = [
    { header: "Código", key: "code", width: 16 },
    { header: "Estudiante", key: "student_name", width: 28 },
    { header: "Curso", key: "course", width: 14 },
    { header: "Tipo de riesgo", key: "risk", width: 28 },
    { header: "Eje", key: "axis", width: 14 },
    { header: "Prioridad", key: "priority", width: 12 },
    { header: "Estado", key: "status", width: 16 },
    { header: "Fecha detección", key: "detection_date", width: 16 },
    { header: "Fuente detección", key: "detection_source", width: 22 },
  ];
  if (includeNarrative) {
    caseColumns.push({ header: "Descripción (confidencial)", key: "description", width: 60 });
  }
  casesSheet.columns = caseColumns;
  casesSheet.getRow(1).font = { bold: true };

  const cases = db
    .prepare(
      `SELECT cf.*, s.full_name as student_name, s.course as course FROM case_files cf
       JOIN students s ON s.id = cf.student_id
       WHERE cf.institution_id = ? AND date(cf.detection_date) BETWEEN date(?) AND date(?)
       ORDER BY cf.detection_date DESC`
    )
    .all(institutionId, start, end) as any[];

  for (const c of cases) {
    casesSheet.addRow({
      code: c.code,
      student_name: c.student_name,
      course: `${c.course} ${c.parallel || ""}`,
      risk: RISK_TYPE_LABELS[c.risk_type as keyof typeof RISK_TYPE_LABELS] + (c.risk_type_other ? ` (${c.risk_type_other})` : ""),
      axis: ACTION_AXIS_LABELS[c.action_axis as keyof typeof ACTION_AXIS_LABELS],
      priority: CASE_PRIORITY_LABELS[c.priority as keyof typeof CASE_PRIORITY_LABELS],
      status: CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS],
      detection_date: c.detection_date?.slice(0, 10),
      detection_source: c.detection_source || "",
      ...(includeNarrative ? { description: c.description } : {}),
    });
  }

  // ---- Hoja derivaciones ----
  const referralsSheet = workbook.addWorksheet("Derivaciones");
  referralsSheet.columns = [
    { header: "Caso", key: "code", width: 16 },
    { header: "Estudiante", key: "student_name", width: 28 },
    { header: "Alcance", key: "scope", width: 12 },
    { header: "Institución", key: "institution", width: 26 },
    { header: "Motivo", key: "reason", width: 40 },
    { header: "Consentimiento", key: "consent", width: 16 },
    { header: "Fecha", key: "date", width: 14 },
    { header: "Estado", key: "status", width: 14 },
  ];
  referralsSheet.getRow(1).font = { bold: true };
  const referrals = db
    .prepare(
      `SELECT r.*, cf.code as case_code, s.full_name as student_name FROM referrals r
       JOIN case_files cf ON cf.id = r.case_file_id
       JOIN students s ON s.id = cf.student_id
       WHERE date(r.referral_date) BETWEEN date(?) AND date(?)
       ORDER BY r.referral_date DESC`
    )
    .all(start, end) as any[];
  for (const r of referrals) {
    referralsSheet.addRow({
      code: r.case_code,
      student_name: r.student_name,
      scope: r.scope === "INTERNA" ? "Interna" : "Externa",
      institution: r.institution,
      reason: r.reason,
      consent: r.informed_consent ? "Sí" : "No",
      date: r.referral_date?.slice(0, 10),
      status: REFERRAL_STATUS_LABELS[r.status as keyof typeof REFERRAL_STATUS_LABELS],
    });
  }

  // ---- Hoja actividades ----
  const activitiesSheet = workbook.addWorksheet("Actividades");
  activitiesSheet.columns = [
    { header: "Título", key: "title", width: 30 },
    { header: "Eje", key: "axis", width: 18 },
    { header: "Fecha", key: "date", width: 14 },
    { header: "Dirigido a", key: "target_audience", width: 24 },
    { header: "Cursos", key: "courses", width: 20 },
    { header: "Participantes", key: "participants_count", width: 14 },
  ];
  activitiesSheet.getRow(1).font = { bold: true };
  const activities = db
    .prepare(`SELECT * FROM activities WHERE institution_id = ? AND date(date) BETWEEN date(?) AND date(?) ORDER BY date DESC`)
    .all(institutionId, start, end) as any[];
  for (const a of activities) {
    activitiesSheet.addRow({
      title: a.title,
      axis: ACTIVITY_AXIS_LABELS[a.axis as keyof typeof ACTIVITY_AXIS_LABELS],
      date: a.date?.slice(0, 10),
      target_audience: a.target_audience || "",
      courses: a.courses || "",
      participants_count: a.participants_count ?? "",
    });
  }

  // ---- Hoja citas ----
  const apptSheet = workbook.addWorksheet("Citas");
  apptSheet.columns = [
    { header: "Fecha", key: "date", width: 14 },
    { header: "Hora", key: "time", width: 10 },
    { header: "Título", key: "title", width: 28 },
    { header: "Estudiante", key: "student_name", width: 28 },
    { header: "Estado", key: "status", width: 14 },
  ];
  apptSheet.getRow(1).font = { bold: true };
  const appts = db
    .prepare(
      `SELECT a.*, s.full_name as student_name FROM appointments a LEFT JOIN students s ON s.id = a.student_id
       WHERE a.institution_id = ? AND date(a.date) BETWEEN date(?) AND date(?) ORDER BY a.date DESC`
    )
    .all(institutionId, start, end) as any[];
  for (const a of appts) {
    apptSheet.addRow({
      date: a.date?.slice(0, 10),
      time: a.start_time,
      title: a.title,
      student_name: a.student_name || "",
      status: APPOINTMENT_STATUS_LABELS[a.status as keyof typeof APPOINTMENT_STATUS_LABELS],
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  logAudit({
    userId: session.user.id,
    action: "EXPORTAR",
    entityType: "Reporte",
    details: `${start} a ${end}`,
    institutionId,
  });

  return new NextResponse(buffer as Buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte_dece_${start}_a_${end}.xlsx"`,
    },
  });
}
