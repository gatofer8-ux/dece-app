"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import {
  getInternByQrToken,
  getInternById,
  getInternByDeviceId,
  linkInternDevice,
  unlinkInternDevice,
  resetInternPin,
  verifyInternPin,
  createIntern,
  updateIntern,
  deleteIntern,
  recordCheckIn,
  recordCheckOut,
  updateAttendance,
  getEcuadorCurrentTime,
  calculateMinutesDifference,
  computeInternHours,
  getActiveAttendanceToday,
  calculateDistanceMeters,
  getOrCreateDailyAttendanceCode,
  updateInstitutionGeofence,
} from "@/lib/pasantes";
import type { InternType, InternStatus } from "@/lib/types";

// ============================================================================
// ACCIONES PÚBLICAS / MÓVILES (Con un solo QR y Anti-Suplantación)
// ============================================================================

/**
 * Verifica si el celular (por su deviceId único) ya está vinculado a un pasante.
 * Si está vinculado, devuelve DIRECTAMENTE los datos del pasante y la hora actual.
 */
export async function verifyDeviceAndGetInternAction(
  institutionId: string,
  deviceId: string
) {
  if (!deviceId) {
    return { is_bound: false };
  }

  try {
    const boundIntern = getInternByDeviceId(deviceId, institutionId);
    const { dateStr, timeStr } = getEcuadorCurrentTime();

    const targetInstId = institutionId || boundIntern?.institution_id;
    let instConfig: any = null;
    if (targetInstId) {
      const inst = db
        .prepare(
          `SELECT id, name, latitude, longitude, geofence_radius_meters, require_geolocation FROM institutions WHERE id = ?`
        )
        .get(targetInstId) as any;
      if (inst) {
        instConfig = {
          has_geofence: Boolean(inst.latitude && inst.longitude),
          require_geolocation: inst.require_geolocation === 1 || inst.require_geolocation == null,
          geofence_radius: inst.geofence_radius_meters || 250,
        };
      }
    }

    if (boundIntern) {
      if (boundIntern.status !== "ACTIVO") {
        return {
          is_bound: true,
          blocked: true,
          error: `Tu registro está en estado: ${boundIntern.status}. Comunícate con el tutor DECE.`,
        };
      }

      return {
        is_bound: true,
        intern: {
          id: boundIntern.id,
          full_name: boundIntern.full_name,
          document_id: boundIntern.document_id,
          type: boundIntern.type,
          university_or_origin: boundIntern.university_or_origin,
          career_or_specialty: boundIntern.career_or_specialty,
          tutor_name: boundIntern.tutor_name,
          required_hours: boundIntern.required_hours,
          completed_hours: boundIntern.completed_hours,
          institution_name: boundIntern.institution_name,
          institution_seal: boundIntern.institution_seal,
          schedule_type: boundIntern.schedule_type,
          schedule_details: boundIntern.schedule_details,
          has_pin: Boolean(boundIntern.pin_code),
        },
        current_time: timeStr,
        current_date: dateStr,
        active_attendance: boundIntern.today_attendance,
        institution_config: instConfig,
      };
    }

    // No está vinculado aún a este celular
    return {
      is_bound: false,
      current_time: timeStr,
      current_date: dateStr,
      institution_config: instConfig,
    };
  } catch (error) {
    console.error("Error verifying device:", error);
    return { error: "Error al verificar el dispositivo." };
  }
}

/**
 * Consulta la información del pasante mediante su token único o ID.
 */
export async function getMobileInternDataAction(qrToken: string) {
  if (!qrToken || typeof qrToken !== "string") {
    return { error: "Código QR no válido." };
  }

  try {
    const intern = getInternByQrToken(qrToken.trim());
    if (!intern) {
      return { error: "Pasante o voluntario no encontrado en el sistema." };
    }

    if (intern.status !== "ACTIVO") {
      return {
        error: `Este registro se encuentra actualmente en estado: ${intern.status}. Contacte al DECE institucional.`,
      };
    }

    const { dateStr, timeStr } = getEcuadorCurrentTime();

    return {
      success: true,
      intern: {
        id: intern.id,
        institution_id: intern.institution_id,
        full_name: intern.full_name,
        document_id: intern.document_id,
        type: intern.type,
        university_or_origin: intern.university_or_origin,
        career_or_specialty: intern.career_or_specialty,
        tutor_name: intern.tutor_name,
        required_hours: intern.required_hours,
        completed_hours: intern.completed_hours,
        institution_name: intern.institution_name,
        institution_seal: intern.institution_seal,
        schedule_type: intern.schedule_type,
        schedule_details: intern.schedule_details,
        qr_token: intern.qr_token,
        has_device_linked: Boolean(intern.device_id),
        device_name: intern.device_name,
        device_id: intern.device_id,
        has_pin: Boolean(intern.pin_code),
      },
      current_time: timeStr,
      current_date: dateStr,
      active_attendance: intern.today_attendance,
    };
  } catch (error: any) {
    console.error("Error fetching mobile intern data:", error);
    return { error: "Error al procesar el código QR." };
  }
}

/**
 * Lista pasantes activos de una institución para el escaneo del cartel DECE único.
 */
export async function getInstitutionActiveInternsAction(institutionId?: string) {
  let targetInstId = institutionId;
  if (!targetInstId) {
    const inst = db
      .prepare(
        "SELECT id FROM institutions WHERE active = 1 ORDER BY (CASE WHEN name LIKE '%SANTA ROSA%' THEN 0 ELSE 1 END) ASC, name ASC LIMIT 1"
      )
      .get() as any;
    targetInstId = inst?.id;
  }

  if (!targetInstId) {
    return { error: "No se encontró una institución activa." };
  }

  try {
    const rows = db
      .prepare(
        `SELECT id, institution_id, full_name, document_id, type, university_or_origin, qr_token,
                device_id, device_name, device_linked_at, pin_code
         FROM interns 
         WHERE institution_id = ? AND status = 'ACTIVO' 
         ORDER BY full_name ASC`
      )
      .all(targetInstId) as any[];

    const inst = db
      .prepare(`SELECT name, seal_image FROM institutions WHERE id = ?`)
      .get(targetInstId) as any;

    return {
      success: true,
      interns: rows.map((r) => ({
        id: r.id,
        institution_id: r.institution_id || targetInstId,
        full_name: r.full_name,
        document_id: r.document_id,
        type: r.type,
        university_or_origin: r.university_or_origin,
        qr_token: r.qr_token,
        has_device: Boolean(r.device_id),
        device_name: r.device_name,
        device_id: r.device_id,
      })),
      institution_name: inst?.name || "UNIDAD EDUCATIVA",
      institution_seal: inst?.seal_image || null,
    };
  } catch (error) {
    console.error("Error fetching institution interns:", error);
    return { error: "Error al cargar la lista de pasantes." };
  }
}

/**
 * Vincula este teléfono celular como el dispositivo exclusivo y personal del pasante.
 */
export async function linkDeviceAction(data: {
  institutionId?: string;
  internId: string;
  documentId: string;
  deviceId: string;
  deviceName: string;
  pinCode: string;
}) {
  try {
    const result = linkInternDevice(data);
    if (!result.success) {
      return { error: result.message };
    }

    const { dateStr, timeStr } = getEcuadorCurrentTime();
    const todayAtt = getActiveAttendanceToday(data.internId);
    const stats = computeInternHours(data.internId);

    return {
      success: true,
      message: result.message,
      intern: {
        id: result.intern!.id,
        full_name: result.intern!.full_name,
        document_id: result.intern!.document_id,
        type: result.intern!.type,
        university_or_origin: result.intern!.university_or_origin,
        career_or_specialty: result.intern!.career_or_specialty,
        tutor_name: result.intern!.tutor_name,
        required_hours: result.intern!.required_hours,
        completed_hours: stats.totalHours,
        has_pin: true,
      },
      current_time: timeStr,
      current_date: dateStr,
      active_attendance: todayAtt,
    };
  } catch (error: any) {
    console.error("Error linking device:", error);
    return { error: "Error al vincular el dispositivo celular." };
  }
}

/**
 * Registra asistencia (Entrada o Salida) asegurando que provenga del CELULAR VINCULADO
 * y validando el PIN de 4 dígitos (Sistema Anti-Suplantación).
 */
export async function secureAttendanceAction(data: {
  internId: string;
  deviceId: string;
  pinCode: string;
  actionType: "CHECK_IN" | "CHECK_OUT";
  activityNotes?: string;
  deviceInfo?: string;
  clientLat?: number | null;
  clientLon?: number | null;
  dailyCode?: string | null;
}) {
  try {
    const intern = db
      .prepare(`SELECT * FROM interns WHERE id = ?`)
      .get(data.internId) as any;

    if (!intern) {
      return { error: "Registro de pasante no encontrado." };
    }

    if (intern.status !== "ACTIVO") {
      return { error: "Tu registro de pasantía no se encuentra activo." };
    }

    // 1. VALIDACIÓN ANTI-SUPLANTACIÓN: ¿Este teléfono es el celular registrado del pasante?
    if (!intern.device_id) {
      return {
        error:
          "Tu teléfono celular aún no ha sido vinculado. Por favor realiza la vinculación inicial.",
      };
    }

    if (intern.device_id !== data.deviceId) {
      return {
        error:
          "⛔ DISPOSITIVO NO AUTORIZADO: Solo puedes registrar tu asistencia desde tu propio teléfono celular personal registrado. Por normas de seguridad, está prohibido que otros marquen por ti.",
      };
    }

    // 2. VALIDACIÓN DEL PIN PERSONAL (hash bcrypt; migra valores heredados)
    if (!verifyInternPin(intern.id, intern.pin_code, data.pinCode)) {
      return {
        error: "PIN de 4 dígitos incorrecto. Verifica e intenta nuevamente.",
      };
    }

    // 3. VALIDACIÓN DE PRESENCIA FÍSICA Y GEOFENCING GPS (Anti-Fotos a distancia)
    const inst = db
      .prepare(`SELECT * FROM institutions WHERE id = ?`)
      .get(intern.institution_id) as any;

    let distanceMeters: number | null = null;

    if (inst) {
      const requireGeo =
        inst.require_geolocation === 1 || inst.require_geolocation == null;
      const hasInstCoords =
        inst.latitude != null &&
        inst.longitude != null &&
        !isNaN(Number(inst.latitude)) &&
        !isNaN(Number(inst.longitude));

      if (requireGeo && hasInstCoords) {
        if (data.clientLat == null || data.clientLon == null) {
          return {
            error:
              "📍 UBICACIÓN GPS REQUERIDA: Para certificar tu presencia física en la institución y evitar registros no autorizados a distancia mediante fotografías, debes permitir el acceso a la ubicación GPS en tu celular. Activa el GPS e inténtalo nuevamente.",
            needs_geolocation: true,
          };
        }

        distanceMeters = calculateDistanceMeters(
          data.clientLat,
          data.clientLon,
          Number(inst.latitude),
          Number(inst.longitude)
        );

        const allowedRadius = inst.geofence_radius_meters || 250;

        if (distanceMeters > allowedRadius) {
          const distanceStr =
            distanceMeters >= 1000
              ? `${(distanceMeters / 1000).toFixed(2)} km`
              : `${distanceMeters} metros`;

          return {
            error: `⛔ FUERA DEL PERÍMETRO INSTITUCIONAL: Te encuentras a ${distanceStr} de la institución. Por normas de seguridad y para evitar registros no autorizados mediante fotos del QR a distancia, solo puedes registrar asistencia estando físicamente dentro del colegio (radio permitido: ${allowedRadius}m).`,
            distance_meters: distanceMeters,
            allowed_radius: allowedRadius,
            out_of_bounds: true,
          };
        }
      }

      // Validación opcional de código diario si fue enviado
      if (data.dailyCode && inst.daily_attendance_code) {
        if (data.dailyCode.trim() !== inst.daily_attendance_code.trim()) {
          return {
            error:
              "Código de seguridad diario incorrecto. Verifica el código de hoy en la oficina DECE.",
          };
        }
      }
    }

    const { timeStr } = getEcuadorCurrentTime();

    if (data.actionType === "CHECK_IN") {
      const result = recordCheckIn(intern.id, intern.institution_id, {
        activityNotes: data.activityNotes || "Entrada puntual de jornada",
        device: data.deviceInfo || intern.device_name || "Móvil Personal",
        registeredVia: "QR_MOBILE_BOUND",
        latitude: data.clientLat,
        longitude: data.clientLon,
        distanceMeters,
      });

      if (!result.success) {
        return { error: result.message, attendance: result.attendance };
      }

      const stats = computeInternHours(intern.id);

      return {
        success: true,
        actionType: "CHECK_IN",
        message: result.message,
        time: timeStr,
        attendance: result.attendance,
        completed_hours: stats.totalHours,
        required_hours: intern.required_hours,
        distance_meters: distanceMeters,
      };
    } else {
      // CHECK_OUT
      const activeAtt = getActiveAttendanceToday(intern.id);
      if (!activeAtt) {
        return {
          error: "No tienes una entrada abierta para registrar salida el día de hoy.",
        };
      }

      const result = recordCheckOut(activeAtt.id, {
        activityNotes: data.activityNotes,
        device: data.deviceInfo || intern.device_name || "Móvil Personal",
        latitude: data.clientLat,
        longitude: data.clientLon,
        distanceMeters,
      });

      if (!result.success) {
        return { error: result.message };
      }

      const stats = computeInternHours(intern.id);

      return {
        success: true,
        actionType: "CHECK_OUT",
        message: result.message,
        time: timeStr,
        attendance: result.attendance,
        completed_hours: stats.totalHours,
        required_hours: intern.required_hours,
        distance_meters: distanceMeters,
      };
    }
  } catch (error: any) {
    console.error("Error in secureAttendanceAction:", error);
    return { error: "Ocurrió un error al procesar el registro de asistencia." };
  }
}

// ============================================================================
// ACCIONES ADMINISTRATIVAS DEL DECE (Requieren sesión autenticada)
// ============================================================================

export async function saveInternAction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    return { error: "No autorizado." };
  }

  const institutionId = session.user.institution_id;
  const id = (formData.get("id") as string) || "";
  const fullName = (formData.get("full_name") as string)?.trim();
  const documentId = (formData.get("document_id") as string)?.trim();
  const email = (formData.get("email") as string)?.trim() || "";
  const phone = (formData.get("phone") as string)?.trim() || "";
  const type = ((formData.get("type") as string) || "PASANTE") as InternType;
  const university = (formData.get("university_or_origin") as string)?.trim();
  const career = (formData.get("career_or_specialty") as string)?.trim() || "";
  const tutorUserId = (formData.get("tutor_user_id") as string) || "";
  const tutorName = (formData.get("tutor_name") as string)?.trim() || "";
  const requiredHours = parseInt(formData.get("required_hours") as string, 10) || 160;
  const startDate = (formData.get("start_date") as string)?.trim();
  const endDate = (formData.get("end_date") as string)?.trim() || "";
  const scheduleType = (formData.get("schedule_type") as string) || "MATUTINA";
  const scheduleDetails = (formData.get("schedule_details") as string)?.trim() || "";
  const expectedEntryTime = (formData.get("expected_entry_time") as string)?.trim() || "";
  const expectedExitTime = (formData.get("expected_exit_time") as string)?.trim() || "";
  const status = ((formData.get("status") as string) || "ACTIVO") as InternStatus;
  const notes = (formData.get("notes") as string)?.trim() || "";

  if (!fullName || !documentId || !university || !startDate) {
    return { error: "Por favor complete todos los campos obligatorios (*)." };
  }

  try {
    if (id) {
      updateIntern(id, institutionId, {
        full_name: fullName,
        document_id: documentId,
        email: email || null,
        phone: phone || null,
        type,
        university_or_origin: university,
        career_or_specialty: career || null,
        tutor_user_id: tutorUserId || null,
        tutor_name: tutorName || null,
        required_hours: requiredHours,
        start_date: startDate,
        end_date: endDate || null,
        schedule_type: scheduleType,
        schedule_details: scheduleDetails || null,
        expected_entry_time: expectedEntryTime || null,
        expected_exit_time: expectedExitTime || null,
        status,
        notes: notes || null,
      });

      revalidatePath("/pasantes");
      revalidatePath(`/pasantes/${id}`);
      return { success: true, id };
    } else {
      const created = createIntern({
        institution_id: institutionId,
        full_name: fullName,
        document_id: documentId,
        email: email || undefined,
        phone: phone || undefined,
        type,
        university_or_origin: university,
        career_or_specialty: career || undefined,
        tutor_user_id: tutorUserId || undefined,
        tutor_name: tutorName || undefined,
        required_hours: requiredHours,
        start_date: startDate,
        end_date: endDate || undefined,
        schedule_type: scheduleType,
        schedule_details: scheduleDetails || undefined,
        expected_entry_time: expectedEntryTime || undefined,
        expected_exit_time: expectedExitTime || undefined,
        notes: notes || undefined,
      });

      revalidatePath("/pasantes");
      return { success: true, id: created.id };
    }
  } catch (error: any) {
    console.error("Error saving intern:", error);
    return { error: "Error al guardar el registro del pasante/voluntario." };
  }
}

export async function deleteInternAction(id: string) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    return { error: "No autorizado." };
  }

  try {
    deleteIntern(id, session.user.institution_id);
    revalidatePath("/pasantes");
    return { success: true };
  } catch (error) {
    console.error("Error deleting intern:", error);
    return { error: "Error al eliminar el registro." };
  }
}

/**
 * Desvincula el celular personal de un pasante (Permite registrar un nuevo teléfono).
 */
export async function unlinkDeviceAction(internId: string) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    return { error: "No autorizado." };
  }

  try {
    const result = unlinkInternDevice(internId, session.user.institution_id);
    revalidatePath("/pasantes");
    revalidatePath(`/pasantes/${internId}`);
    return result;
  } catch (error) {
    console.error("Error unlinking device:", error);
    return { error: "Error al desvincular el dispositivo." };
  }
}

/**
 * Resetea el PIN de 4 dígitos de un pasante.
 */
export async function resetPinAction(internId: string, newPin: string) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    return { error: "No autorizado." };
  }

  try {
    const result = resetInternPin(internId, session.user.institution_id, newPin);
    revalidatePath(`/pasantes/${internId}`);
    return result;
  } catch (error) {
    console.error("Error resetting pin:", error);
    return { error: "Error al resetear el PIN." };
  }
}

/**
 * Registro manual de asistencia por parte del personal DECE.
 */
export async function manualRecordAttendanceAction(data: {
  internId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  activityNotes?: string;
}) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    return { error: "No autorizado." };
  }

  const institutionId = session.user.institution_id;
  const crypto = require("crypto");
  const id = crypto.randomUUID();

  let totalMinutes = null;
  let totalHours = null;
  let status = "EN_CURSO";

  if (data.checkOutTime) {
    totalMinutes = calculateMinutesDifference(data.checkInTime, data.checkOutTime);
    totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    status = "COMPLETADO";
  }

  try {
    db.prepare(
      `INSERT INTO intern_attendances (
        id, institution_id, intern_id, date, check_in_time,
        check_out_time, total_minutes, total_hours, activity_notes,
        registered_via, ip_or_device, status
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        'MANUAL_DECE', 'Ingreso por tutor DECE', ?
      )`
    ).run(
      id,
      institutionId,
      data.internId,
      data.date,
      data.checkInTime,
      data.checkOutTime || null,
      totalMinutes,
      totalHours,
      data.activityNotes || null,
      status
    );

    revalidatePath("/pasantes");
    revalidatePath(`/pasantes/${data.internId}`);
    return { success: true };
  } catch (error) {
    console.error("Error creating manual attendance:", error);
    return { error: "Error al registrar la asistencia manual." };
  }
}

/**
 * Permite al DECE editar o ajustar manualmente las horas (entrada/salida/actividades) de una asistencia existente.
 */
export async function updateAttendanceAction(data: {
  attendanceId: string;
  internId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  activityNotes?: string;
}) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    return { error: "No autorizado." };
  }

  try {
    const res = updateAttendance(data.attendanceId, session.user.institution_id, {
      date: data.date,
      checkInTime: data.checkInTime,
      checkOutTime: data.checkOutTime,
      activityNotes: data.activityNotes,
    });

    revalidatePath("/pasantes");
    revalidatePath(`/pasantes/${data.internId}`);
    return { success: true, message: res.message };
  } catch (error: any) {
    console.error("Error updating attendance:", error);
    return { error: "Error al actualizar la asistencia." };
  }
}

export async function deleteAttendanceAction(attendanceId: string, internId: string) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    return { error: "No autorizado." };
  }

  try {
    db.prepare(`DELETE FROM intern_attendances WHERE id = ? AND institution_id = ?`).run(
      attendanceId,
      session.user.institution_id
    );

    revalidatePath("/pasantes");
    revalidatePath(`/pasantes/${internId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return { error: "Error al eliminar la asistencia." };
  }
}

/**
 * Guarda la configuración de geofencing GPS y presencia obligatoria de la institución.
 */
export async function saveGeofenceSettingsAction(data: {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  requireGeo: boolean;
  dailyCode?: string;
}) {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    return { error: "No autorizado." };
  }

  try {
    updateInstitutionGeofence(session.user.institution_id, {
      latitude: data.latitude,
      longitude: data.longitude,
      geofenceRadiusMeters: data.radiusMeters,
      requireGeolocation: data.requireGeo,
      dailyAttendanceCode: data.dailyCode,
    });

    revalidatePath("/pasantes");
    return {
      success: true,
      message: "Configuración de seguridad presencial y GPS guardada correctamente.",
    };
  } catch (error: any) {
    console.error("Error saving geofence settings:", error);
    return { error: "Error al guardar los parámetros de geofencing." };
  }
}

/**
 * Regenera el código diario de seguridad presencial para el DECE.
 */
export async function regenerateDailyCodeAction() {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    return { error: "No autorizado." };
  }

  try {
    const newCode = String(Math.floor(100 + Math.random() * 900));
    const { dateStr } = getEcuadorCurrentTime();
    db.prepare(
      `UPDATE institutions SET daily_attendance_code = ?, daily_code_date = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(newCode, dateStr, session.user.institution_id);

    revalidatePath("/pasantes");
    return { success: true, code: newCode };
  } catch (error: any) {
    console.error("Error regenerating daily code:", error);
    return { error: "Error al generar nuevo código diario." };
  }
}

