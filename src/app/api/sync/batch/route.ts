import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export interface SyncItem {
  id: string; // UUID del item en cola
  entityId: string; // UUID del registro creado
  action: "CREATE_STUDENT" | "CREATE_DAILY_ATTENTION" | "CREATE_INTERVIEW" | "CREATE_ALERT";
  payload: Record<string, any>;
  clientTimestamp?: string;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado. Inicia sesión para sincronizar." }, { status: 401 });
  }

  let institutionId: string;
  try {
    institutionId = requireInstitutionId(session);
  } catch {
    return NextResponse.json({ error: "Sesión sin institución asociada." }, { status: 400 });
  }

  let body: { items?: SyncItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ success: true, processedCount: 0, results: [] });
  }

  const results: Array<{ id: string; status: "synced" | "failed"; error?: string }> = [];

  const processBatch = db.transaction((syncItems: SyncItem[]) => {
    for (const item of syncItems) {
      try {
        const { action, payload, entityId } = item;
        const recordId = entityId || item.id;

        if (action === "CREATE_STUDENT") {
          const stmt = db.prepare(`
            INSERT INTO students (
              id, institution_id, full_name, document_type, document_id, 
              birth_date, gender, course, parallel, jornada, education_level, 
              bachillerato_specialty, representative, rep_phone, rep_email, 
              medical_condition, notes, created_by_id
            )
            VALUES (
              @id, @institution_id, @full_name, @document_type, @document_id,
              @birth_date, @gender, @course, @parallel, @jornada, @education_level,
              @bachillerato_specialty, @representative, @rep_phone, @rep_email,
              @medical_condition, @notes, @created_by_id
            )
            ON CONFLICT(id) DO UPDATE SET
              full_name = excluded.full_name,
              course = excluded.course,
              parallel = excluded.parallel,
              jornada = excluded.jornada,
              updated_at = datetime('now')
          `);

          stmt.run({
            id: recordId,
            institution_id: institutionId,
            full_name: String(payload.full_name || "").trim(),
            document_type: payload.document_type || "CEDULA",
            document_id: payload.document_id ? String(payload.document_id).trim() : null,
            birth_date: payload.birth_date || null,
            gender: payload.gender || null,
            course: String(payload.course || "").trim(),
            parallel: payload.parallel ? String(payload.parallel).trim().toUpperCase() : null,
            jornada: payload.jornada ? String(payload.jornada).trim().toUpperCase() : null,
            education_level: payload.education_level || null,
            bachillerato_specialty: payload.bachillerato_specialty || null,
            representative: payload.representative || null,
            rep_phone: payload.rep_phone || null,
            rep_email: payload.rep_email || null,
            medical_condition: payload.medical_condition || null,
            notes: payload.notes ? `[Creado Offline] ${payload.notes}` : "[Creado Offline]",
            created_by_id: session.user.id,
          });

          results.push({ id: item.id, status: "synced" });
        } else if (action === "CREATE_DAILY_ATTENTION") {
          const stmt = db.prepare(`
            INSERT INTO daily_attentions (
              id, institution_id, professional_id, case_file_id, attendee_type,
              attention_date, duration, student_name, student_grade, jornada,
              representative_name, attendee_name, reason, action_axis,
              modality_tech, modality_signed, modality_phone, observations
            )
            VALUES (
              @id, @institution_id, @professional_id, @case_file_id, @attendee_type,
              @attention_date, @duration, @student_name, @student_grade, @jornada,
              @representative_name, @attendee_name, @reason, @action_axis,
              @modality_tech, @modality_signed, @modality_phone, @observations
            )
            ON CONFLICT(id) DO NOTHING
          `);

          stmt.run({
            id: recordId,
            institution_id: institutionId,
            professional_id: session.user.id,
            case_file_id: payload.case_file_id || null,
            attendee_type: payload.attendee_type || "ESTUDIANTE",
            attention_date: payload.attention_date || new Date().toISOString().slice(0, 16).replace("T", " "),
            duration: payload.duration || "40 min",
            student_name: payload.student_name || null,
            student_grade: payload.student_grade || null,
            jornada: payload.jornada ? String(payload.jornada).toUpperCase() : null,
            representative_name: payload.representative_name || null,
            attendee_name: payload.attendee_name || null,
            reason: String(payload.reason || "").trim() || "Atención registrada en territorio",
            action_axis: typeof payload.action_axis === "string" ? payload.action_axis : JSON.stringify(payload.action_axis || ["INTERVENCION_INDIVIDUAL"]),
            modality_tech: payload.modality_tech || null,
            modality_signed: payload.modality_signed ? 1 : 0,
            modality_phone: payload.modality_phone || null,
            observations: payload.observations ? `[Sincronizado Offline] ${payload.observations}` : "[Sincronizado Offline]",
          });

          results.push({ id: item.id, status: "synced" });
        } else if (action === "CREATE_INTERVIEW") {
          let caseFileId = payload.case_file_id;
          if (!caseFileId) {
            if (payload.student_id) {
              const existingCase = db.prepare("SELECT id FROM case_files WHERE student_id = ? AND institution_id = ? AND status != 'CERRADO' ORDER BY created_at DESC LIMIT 1").get(payload.student_id, institutionId) as any;
              if (existingCase) caseFileId = existingCase.id;
            }
            if (!caseFileId && payload.interviewee_cedula) {
              const existingCaseByDoc = db.prepare(`
                SELECT cf.id FROM case_files cf
                JOIN students s ON cf.student_id = s.id
                WHERE s.document_id = ? AND cf.institution_id = ? AND cf.status != 'CERRADO'
                LIMIT 1
              `).get(payload.interviewee_cedula, institutionId) as any;
              if (existingCaseByDoc) caseFileId = existingCaseByDoc.id;
            }
            if (!caseFileId) {
              let stId = payload.student_id;
              if (!stId) {
                const st = payload.interviewee_cedula ? (db.prepare("SELECT id FROM students WHERE document_id = ? AND institution_id = ? LIMIT 1").get(payload.interviewee_cedula, institutionId) as any) : null;
                if (st) {
                  stId = st.id;
                } else {
                  stId = `st-off-ent-${Date.now()}`;
                  db.prepare("INSERT OR IGNORE INTO students (id, institution_id, full_name, course) VALUES (?, ?, ?, ?)").run(
                    stId, institutionId, payload.interviewee_full_name || "Entrevistado en Territorio", payload.course || "General"
                  );
                }
              }
              const newCaseId = `case-off-${recordId}`;
              const year = new Date().getFullYear();
              const caseCode = `OFF-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
              db.prepare(`
                INSERT OR IGNORE INTO case_files (
                  id, institution_id, code, student_id, opened_by_id, status, priority, risk_type, description
                )
                VALUES (?, ?, ?, ?, ?, 'ABIERTO', 'MEDIA', 'OTRO', ?)
              `).run(newCaseId, institutionId, caseCode, stId, session.user.id, `Caso generado automáticamente por entrevista offline a ${payload.interviewee_full_name || 'estudiante'}.`);
              caseFileId = newCaseId;
            }
          }

          const stmt = db.prepare(`
            INSERT INTO case_interviews (
              id, case_file_id, institution_id, interviewee_full_name, interviewee_cedula,
              course, age, application_date, family_relation, emotional_state,
              social_relations, bullying_history, academic_history, summary,
              recommendations, commitment, representative_name, professional_id
            )
            VALUES (
              @id, @case_file_id, @institution_id, @interviewee_full_name, @interviewee_cedula,
              @course, @age, @application_date, @family_relation, @emotional_state,
              @social_relations, @bullying_history, @academic_history, @summary,
              @recommendations, @commitment, @representative_name, @professional_id
            )
            ON CONFLICT(id) DO NOTHING
          `);

          stmt.run({
            id: recordId,
            case_file_id: caseFileId,
            institution_id: institutionId,
            interviewee_full_name: payload.interviewee_full_name || null,
            interviewee_cedula: payload.interviewee_cedula || null,
            course: payload.course || null,
            age: payload.age || null,
            application_date: payload.application_date || new Date().toISOString().slice(0, 10),
            family_relation: payload.family_relation || null,
            emotional_state: payload.emotional_state || null,
            social_relations: payload.social_relations || null,
            bullying_history: payload.bullying_history ? 1 : 0,
            academic_history: payload.academic_history || null,
            summary: String(payload.summary || "").trim() || "Entrevista realizada en modo offline.",
            recommendations: payload.recommendations || null,
            commitment: payload.commitment || null,
            representative_name: payload.representative_name || null,
            professional_id: session.user.id,
          });

          results.push({ id: item.id, status: "synced" });
        } else if (action === "CREATE_ALERT") {
          let studentId = payload.student_id;
          if (!studentId && payload.student_name) {
            const found = db.prepare("SELECT id FROM students WHERE institution_id = ? AND full_name LIKE ? LIMIT 1").get(institutionId, `%${payload.student_name}%`) as any;
            if (found) studentId = found.id;
          }
          if (!studentId) {
            let generalStudent = db.prepare("SELECT id FROM students WHERE institution_id = ? AND full_name = ? LIMIT 1").get(institutionId, "Estudiante No Especificado (Alerta)") as any;
            if (!generalStudent) {
              const genId = `gen-alert-${institutionId}`;
              db.prepare("INSERT OR IGNORE INTO students (id, institution_id, full_name, course) VALUES (?, ?, ?, ?)").run(genId, institutionId, "Estudiante No Especificado (Alerta)", "General");
              studentId = genId;
            } else {
              studentId = generalStudent.id;
            }
          }

          const stmt = db.prepare(`
            INSERT INTO teacher_alerts (
              id, institution_id, student_id, reported_by_id, description, status
            )
            VALUES (
              @id, @institution_id, @student_id, @reported_by_id, @description, 'PENDIENTE'
            )
            ON CONFLICT(id) DO NOTHING
          `);

          stmt.run({
            id: recordId,
            institution_id: institutionId,
            student_id: studentId,
            reported_by_id: session.user.id,
            description: payload.description ? `[Alerta Offline] ${payload.description}` : "[Alerta Offline]",
          });

          results.push({ id: item.id, status: "synced" });
        } else {
          results.push({ id: item.id, status: "failed", error: `Acción no reconocida: ${action}` });
        }
      } catch (err: any) {
        console.error(`[sync-batch] Error procesando item ${item.id}:`, err);
        results.push({ id: item.id, status: "failed", error: err?.message || "Error al procesar registro" });
      }
    }
  });

  processBatch(items);

  const syncedCount = results.filter((r) => r.status === "synced").length;
  if (syncedCount > 0) {
    logAudit({
      userId: session.user.id,
      action: "SINCRONIZACION_OFFLINE",
      entityType: "SyncBatch",
      details: `Sincronizados exitosamente ${syncedCount} de ${items.length} registros offline.`,
      institutionId,
    });
  }

  return NextResponse.json({
    success: true,
    processedCount: items.length,
    syncedCount,
    results,
  });
}
