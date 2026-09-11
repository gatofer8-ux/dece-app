import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, formatDate } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CASE_PRIORITY_LABELS,
  RISK_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  ALERT_STATUS_LABELS,
  type StudentRow,
  type CaseFileRow,
  type AppointmentRow,
  type TeacherAlertRow,
  type DailyAttentionRow,
} from "@/lib/types";
import { toggleStudentActive, deleteStudent, enrollStudentInYearAction } from "../actions";
import { NEE_TYPE_LABELS, LIVES_WITH_LABELS, LEGAL_GUARDIAN_LABELS, EDUCATION_LEVEL_LABELS, parseJsonArray } from "@/lib/student";
import { listSchoolYears, getStudentEnrollmentHistory } from "@/lib/schoolYear";
import DeleteButton from "@/components/DeleteButton";
import { formatDocumentId, getDocumentTypeLabel } from "@/lib/documentId";

const STATUS_COLOR: Record<string, string> = {
  ABIERTO: "amber",
  EN_SEGUIMIENTO: "blue",
  DERIVADO: "purple",
  CERRADO: "green",
};

export default async function EstudianteDetallePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const student = db
    .prepare("SELECT * FROM students WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as StudentRow | undefined;
  if (!student) notFound();

  const neeTypes = parseJsonArray<string>(student.nee_types).filter((t) => t !== "NINGUNA");
  const hasFamilyData =
    student.father_name || student.mother_name || student.representative_document_id || student.legal_guardian;
  const hasMedicalData =
    student.medical_condition || student.medical_allergies || student.medical_medication_intolerance || student.medical_food_intolerance;

  // 1. Casos del estudiante
  const cases = db
    .prepare("SELECT * FROM case_files WHERE student_id = ? AND institution_id = ? ORDER BY created_at DESC")
    .all(params.id, institutionId) as CaseFileRow[];

  // 2. Citas del estudiante
  const appointments = db
    .prepare("SELECT * FROM appointments WHERE student_id = ? AND institution_id = ? ORDER BY date DESC, start_time DESC")
    .all(params.id, institutionId) as AppointmentRow[];

  // 3. Alertas tempranas reportadas para este estudiante
  const alerts = db
    .prepare(
      `SELECT a.*, u.name as reporter_name
       FROM teacher_alerts a
       LEFT JOIN users u ON u.id = a.reported_by_id
       WHERE a.student_id = ? AND a.institution_id = ?
       ORDER BY a.created_at DESC`
    )
    .all(params.id, institutionId) as (TeacherAlertRow & { reporter_name: string | null })[];

  // 4. Atenciones diarias
  const dailyAttentions = db
    .prepare(
      `SELECT d.*, u.name as professional_name
       FROM daily_attentions d
       LEFT JOIN users u ON u.id = d.professional_id
       WHERE d.institution_id = ? AND (d.student_name LIKE ? OR d.case_file_id IN (SELECT id FROM case_files WHERE student_id = ?))
       ORDER BY d.attention_date DESC LIMIT 10`
    )
    .all(institutionId, `%${student.full_name}%`, student.id) as (DailyAttentionRow & { professional_name: string | null })[];

  // 5. Historial de Matrículas / Años Lectivos
  const enrollmentHistory = getStudentEnrollmentHistory(student.id);
  const schoolYears = listSchoolYears(institutionId);

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title={student.full_name}
        description={`${student.course} ${student.parallel || ""}${
          student.jornada ? ` · Jornada ${student.jornada.charAt(0).toUpperCase() + student.jornada.slice(1).toLowerCase()}` : ""
        }${
          student.education_level ? ` · ${EDUCATION_LEVEL_LABELS[student.education_level] || student.education_level}` : ""
        }${student.bachillerato_specialty ? ` (${student.bachillerato_specialty})` : ""} · ${formatDocumentId(student.document_type, student.document_id, "short")}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/estudiantes/carnets?id=${student.id}`} className="btn-secondary text-xs flex items-center gap-1">
              <span>🪪</span> Carnet con QR
            </Link>
            <Link href={`/estudiantes/${student.id}/imprimir`} className="btn-secondary text-xs">
              🖨️ Imprimir ficha
            </Link>
            <Link href={`/estudiantes/${student.id}/editar`} className="btn-secondary text-xs">
              Editar
            </Link>
            <Link href={`/casos/nuevo?estudiante=${student.id}`} className="btn-primary text-xs">
              + Nuevo caso
            </Link>
          </div>
        }
      />

      {/* Barra de Trazabilidad 360° - Indicadores Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 flex items-center gap-3 bg-gradient-to-br from-amber-50 to-white border-amber-200/60">
          <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
            📁
          </div>
          <div>
            <div className="text-xs text-amber-800 font-semibold uppercase">Casos DECE</div>
            <div className="text-xl font-bold text-slate-900">{cases.length}</div>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3 bg-gradient-to-br from-rose-50 to-white border-rose-200/60">
          <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xl shrink-0">
            🚩
          </div>
          <div>
            <div className="text-xs text-rose-800 font-semibold uppercase">Alertas</div>
            <div className="text-xl font-bold text-slate-900">{alerts.length}</div>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3 bg-gradient-to-br from-emerald-50 to-white border-emerald-200/60">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
            📅
          </div>
          <div>
            <div className="text-xs text-emerald-800 font-semibold uppercase">Citas / Agenda</div>
            <div className="text-xl font-bold text-slate-900">{appointments.length}</div>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3 bg-gradient-to-br from-blue-50 to-white border-blue-200/60">
          <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0">
            📋
          </div>
          <div>
            <div className="text-xs text-blue-800 font-semibold uppercase">Atenciones</div>
            <div className="text-xl font-bold text-slate-900">{dailyAttentions.length}</div>
          </div>
        </div>
      </div>

      {/* Datos del estudiante */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase">Documento de identidad</div>
          <div className="text-sm font-semibold text-slate-800 mt-1">
            {formatDocumentId(student.document_type, student.document_id, "full")}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{getDocumentTypeLabel(student.document_type)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase">Representante</div>
          <div className="text-sm font-semibold text-slate-800 mt-1">{student.representative || "No registrado"}</div>
          <div className="text-xs text-slate-500 mt-0.5">{student.rep_phone || ""} {student.rep_email ? `· ${student.rep_email}` : ""}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase">Fecha de nacimiento & Género</div>
          <div className="text-sm font-semibold text-slate-800 mt-1">{formatDate(student.birth_date)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{student.gender || "No especificado"}</div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase">Estado del registro</div>
            <div className="mt-1">{student.active ? <Badge color="green">Activo</Badge> : <Badge color="slate">Inactivo</Badge>}</div>
          </div>
          <div className="flex items-center gap-2">
            <form
              action={async () => {
                "use server";
                await toggleStudentActive(student.id, !student.active);
              }}
            >
              <button className="btn-secondary text-xs">{student.active ? "Desactivar" : "Reactivar"}</button>
            </form>
            <DeleteButton
              label="🗑️ Borrar"
              confirmMessage={`¿Borrar a ${student.full_name}?`}
              redirectTo="/estudiantes"
              onDelete={async () => {
                "use server";
                try {
                  await deleteStudent(student.id);
                } catch (err) {
                  return { error: err instanceof Error ? err.message : "No se pudo borrar el registro." };
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Sección Años Lectivos e Historial de Matrículas */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span>📅</span> Historial Acumulativo por Años Lectivos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cursos cursados y trayectoria del estudiante a través de los diferentes períodos escolares
            </p>
          </div>

          {/* Formulario rápido para matricular / registrar en año lectivo */}
          {schoolYears.length > 0 && (
            <form action={enrollStudentInYearAction} className="flex flex-wrap items-center gap-2 text-xs">
              <input type="hidden" name="student_id" value={student.id} />
              <select name="school_year_id" required className="input text-xs py-1 px-2">
                <option value="">Seleccionar Año Lectivo...</option>
                {schoolYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_active ? "(Vigente)" : ""}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="course"
                required
                defaultValue={student.course}
                placeholder="Curso (ej. 9no EGB)"
                className="input text-xs py-1 px-2 w-28"
              />
              <input
                type="text"
                name="parallel"
                defaultValue={student.parallel || ""}
                placeholder="Paralelo (A/B)"
                className="input text-xs py-1 px-2 w-20"
              />
              <select
                name="jornada"
                defaultValue={student.jornada ? student.jornada.toUpperCase() : ""}
                className="input text-xs py-1 px-2 w-28"
              >
                <option value="">Jornada...</option>
                <option value="MATUTINA">Matutina</option>
                <option value="VESPERTINA">Vespertina</option>
                <option value="NOCTURNA">Nocturna</option>
              </select>
              <button type="submit" className="btn-primary text-xs py-1 px-2.5">
                + Matricular / Actualizar
              </button>
            </form>
          )}
        </div>

        {enrollmentHistory.length === 0 ? (
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg flex items-center justify-between">
            <span>Matrícula actual registrada: <strong>{student.course} {student.parallel || ""}</strong> (Jornada: {student.jornada || "No especificada"}).</span>
            <span className="text-slate-400">Puedes vincularlo a un año lectivo formal usando el selector superior.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {enrollmentHistory.map((enr) => (
              <div key={enr.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs">{enr.school_year_name}</span>
                  <Badge color="blue">{enr.status}</Badge>
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  Curso: {enr.course} {enr.parallel || ""}
                </div>
                <div className="text-[11px] text-slate-500">
                  {enr.jornada ? `Jornada ${enr.jornada}` : ""} {enr.specialty ? `· ${enr.specialty}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notas / NEE / Datos Médicos / Familiares */}
      {student.notes && (
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase mb-1">Notas</div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{student.notes}</p>
        </div>
      )}

      {(neeTypes.length > 0 || student.disability_card_detail) && (
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase mb-1">Necesidad educativa específica</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {neeTypes.map((t) => (
              <Badge key={t} color="purple">
                {NEE_TYPE_LABELS[t] || t}
              </Badge>
            ))}
          </div>
          {student.disability_card_detail && (
            <p className="text-sm text-slate-600 mt-2">Carnet de discapacidad: {student.disability_card_detail}</p>
          )}
        </div>
      )}

      {hasMedicalData && (
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase mb-2">Datos médicos</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
            {student.medical_condition && <div><span className="text-slate-500">Enfermedad:</span> {student.medical_condition}</div>}
            {student.medical_allergies && <div><span className="text-slate-500">Alergias:</span> {student.medical_allergies}</div>}
            {student.medical_medication_intolerance && (
              <div><span className="text-slate-500">Intolerancia a medicamentos:</span> {student.medical_medication_intolerance}</div>
            )}
            {student.medical_food_intolerance && (
              <div><span className="text-slate-500">Intolerancia a alimentos:</span> {student.medical_food_intolerance}</div>
            )}
          </div>
        </div>
      )}

      {hasFamilyData && (
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase mb-3">Datos familiares</div>
          {student.legal_guardian && (
            <p className="text-sm text-slate-600 mb-2">
              Representante legal: <span className="font-medium">{LEGAL_GUARDIAN_LABELS[student.legal_guardian] || student.legal_guardian}</span>
            </p>
          )}
          {student.lives_with && (
            <p className="text-sm text-slate-600 mb-3">
              Vive con: {LIVES_WITH_LABELS[student.lives_with] || student.lives_with}
              {student.lives_with === "OTRO" && student.lives_with_other ? ` (${student.lives_with_other})` : ""}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {student.father_name && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Padre</p>
                <p>{student.father_name}</p>
                {student.father_phone && <p className="text-slate-500">{student.father_phone}</p>}
                {student.father_occupation && <p className="text-slate-500">{student.father_occupation}</p>}
              </div>
            )}
            {student.mother_name && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Madre</p>
                <p>{student.mother_name}</p>
                {student.mother_phone && <p className="text-slate-500">{student.mother_phone}</p>}
                {student.mother_occupation && <p className="text-slate-500">{student.mother_occupation}</p>}
              </div>
            )}
            {student.representative_document_id && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Representante</p>
                <p>{student.representative_document_id}</p>
                {student.representative_occupation && <p className="text-slate-500">{student.representative_occupation}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Casos y Fichas de Atención */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span>📁</span> Casos y Expedientes de Atención ({cases.length})
          </h2>
          <Link href={`/casos/nuevo?estudiante=${student.id}`} className="text-xs text-brand-700 font-semibold hover:underline">
            + Abrir nuevo caso
          </Link>
        </div>
        {cases.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500 text-center">Este estudiante no tiene casos registrados.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-left px-4 py-3">Tipo de riesgo</th>
                  <th className="text-left px-4 py-3">Prioridad</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Detección</th>
                  <th className="text-right px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/casos/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                        {c.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{RISK_TYPE_LABELS[c.risk_type]}</td>
                    <td className="px-4 py-3 text-slate-600">{CASE_PRIORITY_LABELS[c.priority]}</td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLOR[c.status]}>{CASE_STATUS_LABELS[c.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.detection_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/casos/${c.id}`} className="btn-secondary text-xs py-1 px-2">
                        Ver expediente →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alertas Tempranas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span>🚩</span> Alertas Tempranas Reportadas ({alerts.length})
          </h2>
          <Link href={`/alertas/nueva`} className="text-xs text-brand-700 font-semibold hover:underline">
            + Reportar nueva alerta
          </Link>
        </div>
        {alerts.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500 text-center">No hay alertas registradas para este estudiante.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Reportado por</th>
                  <th className="text-left px-4 py-3">Situación observada</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map((al) => (
                  <tr key={al.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(al.created_at)}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{al.reporter_name || "Docente"}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-md">{al.description}</td>
                    <td className="px-4 py-3">
                      <Badge color={al.status === "PENDIENTE" ? "amber" : al.status === "CONVERTIDA_EN_CASO" ? "green" : "slate"}>
                        {ALERT_STATUS_LABELS[al.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Citas y Agenda */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span>📅</span> Citas y Agenda ({appointments.length})
          </h2>
          <Link href={`/citas/nueva?estudiante=${student.id}`} className="text-xs text-brand-700 font-semibold hover:underline">
            + Agendar cita
          </Link>
        </div>
        {appointments.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500 text-center">No hay citas registradas.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Fecha y Hora</th>
                  <th className="text-left px-4 py-3">Título / Motivo</th>
                  <th className="text-left px-4 py-3">Asistente</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-slate-600 font-medium">{formatDate(a.date)} {a.start_time}</td>
                    <td className="px-4 py-3 text-slate-800">{a.title}</td>
                    <td className="px-4 py-3 text-slate-600">{a.attendee_type}</td>
                    <td className="px-4 py-3">
                      <Badge>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
