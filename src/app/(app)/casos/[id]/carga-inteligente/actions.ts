"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { saveAttachmentBuffer } from "@/lib/uploads";
import { processDocumentOcr, classifyDocumentType } from "@/lib/ocr/localOcrService";
import {
  extractCorresponsibilityData,
  extractAlertNotificationData,
} from "@/lib/ocr/schemaExtractors";
import type { PresenterRole } from "@/lib/types";

function requireOwnedCase(caseId: string, institutionId: string) {
  const row = db
    .prepare("SELECT c.*, s.full_name as student_name, s.course, s.parallel, s.representative, s.rep_phone, s.document_id as student_document_id FROM case_files c JOIN students s ON s.id = c.student_id WHERE c.id = ? AND c.institution_id = ?")
    .get(caseId, institutionId) as any;
  if (!row) throw new Error("Caso no encontrado en tu institución.");
  return row;
}

/**
 * Procesa el archivo físico subido, ejecuta OCR local y extrae los campos
 */
export async function analyzeScannedDocumentAction(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseData = requireOwnedCase(caseId, institutionId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Por favor selecciona una foto o archivo escaneado." };
  }

  const forcedType = formData.get("document_type") as string | null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ocrResult = await processDocumentOcr(buffer, file.type, file.name);

    // Determinar tipo efectivo (forzado por el usuario o auto-detectado)
    const effectiveType = (forcedType && forcedType !== "AUTO")
      ? (forcedType as "ACTA_CORRESPONSABILIDAD" | "FICHA_ALERTA" | "OTRO")
      : ocrResult.detectedType;

    const studentCtx = {
      full_name: caseData.student_name,
      course: caseData.course,
      parallel: caseData.parallel,
      representative: caseData.representative,
      rep_phone: caseData.rep_phone,
    };

    let extractedData: any = null;
    if (effectiveType === "ACTA_CORRESPONSABILIDAD") {
      extractedData = extractCorresponsibilityData(ocrResult.fullText, studentCtx);
    } else if (effectiveType === "FICHA_ALERTA") {
      extractedData = extractAlertNotificationData(ocrResult.fullText, studentCtx);
    }

    return {
      success: true,
      error: null,
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      rawBase64File: buffer.toString("base64"),
      detectedType: ocrResult.detectedType,
      detectedTypeLabel: ocrResult.detectedTypeLabel,
      detectionConfidence: ocrResult.detectionConfidence,
      effectiveType,
      pages: ocrResult.pages,
      averageConfidence: ocrResult.averageConfidence,
      trocrAvailable: ocrResult.trocrAvailable,
      extractedData,
      studentId: caseData.student_id,
      studentName: caseData.student_name,
    };
  } catch (err: any) {
    console.error("[analyzeScannedDocumentAction] Error en OCR:", err);
    return { error: err?.message || "Ocurrió un error al procesar el documento con OCR local." };
  }
}

/**
 * Guarda el documento confirmado, actualiza la ficha del caso/estudiante y archiva el escaneo original
 */
export async function confirmAndSaveOcrDocumentAction(payload: {
  caseId: string;
  documentType: "ACTA_CORRESPONSABILIDAD" | "FICHA_ALERTA" | "OTRO";
  presentedByRole: PresenterRole;
  presentedByName: string;
  filename: string;
  rawBase64File: string;
  updateCentralStudent: boolean;
  data: any;
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseData = requireOwnedCase(payload.caseId, institutionId);

  const buffer = Buffer.from(payload.rawBase64File, "base64");
  const { relativePath, size } = saveAttachmentBuffer(buffer, payload.filename, payload.caseId);

  const attachmentId = randomUUID();
  const docId = randomUUID();
  const d = payload.data || {};

  try {
    db.transaction(() => {
      // 1. Guardar el archivo escaneado original en attachments con trazabilidad inmutable
      db.prepare(`
        INSERT INTO attachments (
          id, institution_id, filename, path, mime_type, size,
          uploaded_by_id, case_file_id, presented_by_role, presented_by_name,
          document_type, ocr_extracted_at
        ) VALUES (
          @id, @institution_id, @filename, @path, @mime_type, @size,
          @uploaded_by_id, @case_file_id, @presented_by_role, @presented_by_name,
          @document_type, datetime('now')
        )
      `).run({
        id: attachmentId,
        institution_id: institutionId,
        filename: payload.filename || "escaneo_fisico.jpg",
        path: relativePath,
        mime_type: payload.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        size,
        uploaded_by_id: session.user.id,
        case_file_id: payload.caseId,
        presented_by_role: payload.presentedByRole,
        presented_by_name: payload.presentedByName || null,
        document_type: payload.documentType,
      });

      // 2. Si el usuario marcó actualizar la ficha central del estudiante
      if (payload.updateCentralStudent) {
        db.prepare(`
          UPDATE students
          SET document_id = COALESCE(NULLIF(?, ''), document_id),
              representative = COALESCE(NULLIF(?, ''), representative),
              rep_phone = COALESCE(NULLIF(?, ''), rep_phone),
              address = COALESCE(NULLIF(?, ''), address),
              course = COALESCE(NULLIF(?, ''), course),
              parallel = COALESCE(NULLIF(?, ''), parallel),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(
          d.representative_id_num || d.student_id_num || "",
          d.representative_name || "",
          d.representative_phone || "",
          d.representative_address || "",
          d.student_grade || "",
          d.student_parallel || "",
          caseData.student_id
        );
      }

      // 3. Crear el documento correspondiente en la base de datos
      if (payload.documentType === "ACTA_CORRESPONSABILIDAD") {
        db.prepare(`
          INSERT INTO case_corresponsibility_acts (
            id, case_file_id, institution_id, city, act_date, act_time,
            representative_name, representative_id_num, representative_relationship,
            representative_phone, representative_address, student_name, student_grade,
            student_parallel, jornada, dece_professional_name, dece_professional_id_num,
            tutor_authority_name, tutor_authority_role, conflict_type, detected_difficulty,
            legal_framework, commitments_representative, commitments_dece, commitments_student,
            observations, created_by
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?
          )
        `).run(
          docId,
          payload.caseId,
          institutionId,
          d.city || "Ambato",
          d.act_date || new Date().toISOString().split("T")[0],
          d.act_time || "10:00",
          d.representative_name || caseData.representative || "Representante",
          d.representative_id_num || null,
          d.representative_relationship || "Madre",
          d.representative_phone || caseData.rep_phone || null,
          d.representative_address || null,
          d.student_name || caseData.student_name,
          d.student_grade || caseData.course || "",
          d.student_parallel || caseData.parallel || null,
          d.jornada || "MATUTINA",
          session.user.name || "Profesional DECE",
          null,
          payload.presentedByName || "Docente Tutor",
          payload.presentedByRole === "DOCENTE_TUTOR" ? "Docente Tutor" : "Autoridad Institucional",
          d.conflict_type || "OTRO",
          d.detected_difficulty || "Dificultad registrada a partir de documento físico escaneado.",
          "Art. 44, 45 Constitución de la República del Ecuador; LOEI y Reglamento General.",
          d.commitments_representative || "Acompañar y supervisar las actividades escolares del estudiante.",
          d.commitments_dece || "Realizar acompañamiento y seguimiento psicosocial continuo.",
          d.commitments_student || "Cumplir con las normas de convivencia institucional.",
          d.observations || `Documento físico digitalizado presentado por: ${payload.presentedByRole} (${payload.presentedByName || "Sin nombre especificado"}).`,
          session.user.id
        );

        // Registrar acción en la bitácora del caso
        const actionId = randomUUID();
        db.prepare(`
          INSERT INTO case_actions (id, case_file_id, date, axis, title, details, author_id, created_by)
          VALUES (?, ?, ?, 'SEGUIMIENTO', 'Acta de Corresponsabilidad (Documento Físico Digitalizado)', ?, ?, ?)
        `).run(
          actionId,
          payload.caseId,
          d.act_date || new Date().toISOString().split("T")[0],
          `Se procesó y digitalizó el Acta de Corresponsabilidad física entregada por ${payload.presentedByRole} (${payload.presentedByName || "N/A"}). El archivo original reposa en los adjuntos del caso.`,
          session.user.id,
          session.user.id
        );
      } else if (payload.documentType === "FICHA_ALERTA") {
        db.prepare(`
          INSERT INTO case_alert_notifications (
            id, case_file_id, institution_id, student_name, student_id_num, student_birth_date,
            student_age, representative_name, representative_address, representative_phone,
            student_grade, student_parallel, jornada, docente_tutor,
            alerta_inestabilidad_emocional, alerta_hijo_ppl, alerta_trabajo_infantil,
            alerta_riesgo_psicosocial, alerta_movilidad_humana, alerta_conflictos_intrafamiliares,
            alerta_autolesiones_ideacion, alerta_hostigamiento_academico,
            alerta_embarazo_maternidad_paternidad, alerta_posible_dependencia_sustancias,
            alerta_vulneracion_derechos, alerta_otros, especificar_alerta,
            lugar_fecha_hechos, intervencion_pregunta_1, intervencion_pregunta_2,
            intervencion_pregunta_3, intervencion_pregunta_4, intervencion_pregunta_5,
            notificador_nombre, notificador_cargo, notificador_contacto, fecha_entrega_dece,
            created_by
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?
          )
        `).run(
          docId,
          payload.caseId,
          institutionId,
          d.student_name || caseData.student_name,
          d.student_id_num || null,
          d.student_birth_date || null,
          d.student_age || null,
          d.representative_name || caseData.representative || null,
          d.representative_address || null,
          d.representative_phone || caseData.rep_phone || null,
          d.student_grade || caseData.course || "",
          d.student_parallel || caseData.parallel || null,
          d.jornada || "MATUTINA",
          d.docente_tutor || payload.presentedByName || null,
          d.alerta_inestabilidad_emocional ? 1 : 0,
          d.alerta_hijo_ppl ? 1 : 0,
          d.alerta_trabajo_infantil ? 1 : 0,
          d.alerta_riesgo_psicosocial ? 1 : 0,
          d.alerta_movilidad_humana ? 1 : 0,
          d.alerta_conflictos_intrafamiliares ? 1 : 0,
          d.alerta_autolesiones_ideacion ? 1 : 0,
          d.alerta_hostigamiento_academico ? 1 : 0,
          d.alerta_embarazo_maternidad_paternidad ? 1 : 0,
          d.alerta_posible_dependencia_sustancias ? 1 : 0,
          d.alerta_vulneracion_derechos ? 1 : 0,
          d.alerta_otros ? 1 : 0,
          d.especificar_alerta || null,
          d.lugar_fecha_hechos || "Hechos y antecedentes registrados en la ficha física escaneada.",
          d.intervencion_pregunta_1 || null,
          d.intervencion_pregunta_2 || null,
          d.intervencion_pregunta_3 || null,
          d.intervencion_pregunta_4 || null,
          d.intervencion_pregunta_5 || null,
          d.notificador_nombre || payload.presentedByName || "Docente Notificador",
          d.notificador_cargo || "Docente Tutor",
          d.notificador_contacto || d.representative_phone || null,
          d.fecha_entrega_dece || new Date().toISOString().split("T")[0],
          session.user.id
        );

        // Registrar acción en la bitácora del caso
        const actionId = randomUUID();
        db.prepare(`
          INSERT INTO case_actions (id, case_file_id, date, axis, title, details, author_id, created_by)
          VALUES (?, ?, ?, 'PREVENCION', 'Ficha de Notificación de Alerta (Documento Físico Digitalizado)', ?, ?, ?)
        `).run(
          actionId,
          payload.caseId,
          d.fecha_entrega_dece || new Date().toISOString().split("T")[0],
          `Ficha física de notificación de alerta procesada mediante OCR y agregada al expediente. Presentada por: ${payload.presentedByRole} (${payload.presentedByName || "N/A"}). Respaldo escaneado archivado.`,
          session.user.id,
          session.user.id
        );
      } else {
        // Documento institucional general
        const actionId = randomUUID();
        db.prepare(`
          INSERT INTO case_actions (id, case_file_id, date, axis, title, details, author_id, created_by)
          VALUES (?, ?, ?, 'SEGUIMIENTO', 'Documento Físico Digitalizado (Adjunto)', ?, ?, ?)
        `).run(
          actionId,
          payload.caseId,
          new Date().toISOString().split("T")[0],
          `Documento físico archivado con trazabilidad. Presentado por: ${payload.presentedByRole} (${payload.presentedByName || "N/A"}). Archivo: ${payload.filename}`,
          session.user.id,
          session.user.id
        );
      }

      // 4. Registrar auditoría global
      logAudit({
        userId: session.user.id,
        action: "CARGA_INTELIGENTE_DOCUMENTO_OCR",
        entityType: "Attachment",
        entityId: attachmentId,
        institutionId,
        details: `Documento físico "${payload.filename}" (Tipo: ${payload.documentType}) digitalizado mediante OCR local y guardado con éxito. Presentado por: ${payload.presentedByRole} (${payload.presentedByName || "N/A"}).`,
      });
    })();

    revalidatePath(`/casos/${payload.caseId}`);
    revalidatePath("/casos");
    return { success: true, redirectUrl: `/casos/${payload.caseId}` };
  } catch (err: any) {
    console.error("[confirmAndSaveOcrDocumentAction] Error guardando:", err);
    return { error: err?.message || "Error al guardar el documento y sus adjuntos." };
  }
}
