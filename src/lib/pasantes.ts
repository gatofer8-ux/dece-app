import crypto from "crypto";
import QRCode from "qrcode";
import { db } from "./db";
import type {
  InternRow,
  InternAttendanceRow,
  InternWithStats,
  InternStatus,
  InternType,
} from "./types";

/**
 * Genera un código QR como Data URL (PNG en Base64).
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: "#1e1b4b", // Brand dark indigo
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return "";
  }
}

/**
 * Genera un token seguro para el QR del pasante.
 */
export function generateInternQrToken(): string {
  return "pas_" + crypto.randomBytes(12).toString("hex");
}

/**
 * Obtiene la hora actual en zona horaria de Ecuador (America/Guayaquil, UTC-5).
 */
export function getEcuadorCurrentTime(): { dateStr: string; timeStr: string } {
  // Ecuador está en UTC-5 todo el año (sin cambio de horario)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ecDate = new Date(utc - 5 * 3600000);

  const yyyy = ecDate.getFullYear();
  const mm = String(ecDate.getMonth() + 1).padStart(2, "0");
  const dd = String(ecDate.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const hh = String(ecDate.getHours()).padStart(2, "0");
  const min = String(ecDate.getMinutes()).padStart(2, "0");
  const ss = String(ecDate.getSeconds()).padStart(2, "0");
  const timeStr = `${hh}:${min}:${ss}`;

  return { dateStr, timeStr };
}

/**
 * Calcula la diferencia en minutos entre dos horas 'HH:MM:SS' o 'HH:MM'.
 */
export function calculateMinutesDifference(startTime: string, endTime: string): number {
  try {
    const [h1, m1] = startTime.split(":").map(Number);
    const [h2, m2] = endTime.split(":").map(Number);
    const startMins = h1 * 60 + m1;
    const endMins = h2 * 60 + m2;
    const diff = endMins - startMins;
    return diff > 0 ? diff : 0;
  } catch {
    return 0;
  }
}

/**
 * Obtiene el total de minutos y horas acumuladas de un pasante.
 */
export function computeInternHours(internId: string): {
  totalMinutes: number;
  totalHours: number;
} {
  const result = db
    .prepare(
      `SELECT COALESCE(SUM(total_minutes), 0) as sum_minutes,
              COALESCE(SUM(total_hours), 0.0) as sum_hours
       FROM intern_attendances
       WHERE intern_id = ? AND status = 'COMPLETADO'`
    )
    .get(internId) as { sum_minutes: number; sum_hours: number } | undefined;

  const totalMinutes = result ? Number(result.sum_minutes) : 0;
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  return { totalMinutes, totalHours };
}

/**
 * Obtiene todos los pasantes y voluntarios de una institución con sus estadísticas.
 */
export function getInterns(
  institutionId: string,
  statusFilter?: InternStatus | "TODOS"
): InternWithStats[] {
  let query = `SELECT * FROM interns WHERE institution_id = ?`;
  const params: any[] = [institutionId];

  if (statusFilter && statusFilter !== "TODOS") {
    query += ` AND status = ?`;
    params.push(statusFilter);
  }

  query += ` ORDER BY status ASC, full_name ASC`;

  const rows = db.prepare(query).all(...params) as InternRow[];
  const { dateStr } = getEcuadorCurrentTime();

  return rows.map((intern) => {
    const { totalMinutes, totalHours } = computeInternHours(intern.id);
    const req = intern.required_hours || 160;
    const progress = Math.min(100, Math.round((totalHours / req) * 100));

    // Buscar si tiene asistencia hoy
    const todayAtt = db
      .prepare(
        `SELECT * FROM intern_attendances 
         WHERE intern_id = ? AND date = ? 
         ORDER BY check_in_time DESC LIMIT 1`
      )
      .get(intern.id, dateStr) as InternAttendanceRow | undefined;

    return {
      ...intern,
      completed_minutes: totalMinutes,
      completed_hours: totalHours,
      progress_percentage: progress,
      active_today: todayAtt ? todayAtt.status === "EN_CURSO" : false,
      today_attendance: todayAtt || null,
    };
  });
}

/**
 * Obtiene un pasante por su ID.
 */
export function getInternById(
  id: string,
  institutionId: string
): InternWithStats | null {
  const row = db
    .prepare(`SELECT * FROM interns WHERE id = ? AND institution_id = ?`)
    .get(id, institutionId) as InternRow | undefined;

  if (!row) return null;

  const { totalMinutes, totalHours } = computeInternHours(row.id);
  const req = row.required_hours || 160;
  const progress = Math.min(100, Math.round((totalHours / req) * 100));

  const { dateStr } = getEcuadorCurrentTime();
  const todayAtt = db
    .prepare(
      `SELECT * FROM intern_attendances 
       WHERE intern_id = ? AND date = ? 
       ORDER BY check_in_time DESC LIMIT 1`
    )
    .get(row.id, dateStr) as InternAttendanceRow | undefined;

  return {
    ...row,
    completed_minutes: totalMinutes,
    completed_hours: totalHours,
    progress_percentage: progress,
    active_today: todayAtt ? todayAtt.status === "EN_CURSO" : false,
    today_attendance: todayAtt || null,
  };
}

/**
 * Busca a un pasante por su QR Token público (para marcaje móvil sin login).
 */
export function getInternByQrToken(qrToken: string):
  | (InternRow & {
      institution_name: string;
      institution_seal: string | null;
      today_attendance: InternAttendanceRow | null;
      completed_hours: number;
    })
  | null {
  const row = db
    .prepare(
      `SELECT i.*, inst.name as institution_name, inst.seal_image as institution_seal
       FROM interns i
       JOIN institutions inst ON inst.id = i.institution_id
       WHERE i.qr_token = ?`
    )
    .get(qrToken) as any;

  if (!row) return null;

  const { dateStr } = getEcuadorCurrentTime();
  const todayAtt = db
    .prepare(
      `SELECT * FROM intern_attendances 
       WHERE intern_id = ? AND date = ? 
       ORDER BY check_in_time DESC LIMIT 1`
    )
    .get(row.id, dateStr) as InternAttendanceRow | undefined;

  const { totalHours } = computeInternHours(row.id);

  return {
    ...row,
    today_attendance: todayAtt || null,
    completed_hours: totalHours,
  };
}

/**
 * Crea un nuevo pasante o voluntario.
 */
export function createIntern(data: {
  institution_id: string;
  full_name: string;
  document_id: string;
  email?: string;
  phone?: string;
  type: InternType;
  university_or_origin: string;
  career_or_specialty?: string;
  tutor_user_id?: string;
  tutor_name?: string;
  required_hours?: number;
  start_date: string;
  end_date?: string;
  schedule_type?: string;
  schedule_details?: string;
  expected_entry_time?: string;
  expected_exit_time?: string;
  notes?: string;
}): InternRow {
  const id = crypto.randomUUID();
  const qrToken = generateInternQrToken();
  const requiredHours = data.required_hours || 160;

  db.prepare(
    `INSERT INTO interns (
      id, institution_id, full_name, document_id, email, phone,
      type, university_or_origin, career_or_specialty, tutor_user_id,
      tutor_name, required_hours, start_date, end_date, schedule_type,
      schedule_details, expected_entry_time, expected_exit_time,
      qr_token, status, notes
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, 'ACTIVO', ?
    )`
  ).run(
    id,
    data.institution_id,
    data.full_name.trim(),
    data.document_id.trim(),
    data.email?.trim() || null,
    data.phone?.trim() || null,
    data.type,
    data.university_or_origin.trim(),
    data.career_or_specialty?.trim() || null,
    data.tutor_user_id || null,
    data.tutor_name?.trim() || null,
    requiredHours,
    data.start_date,
    data.end_date || null,
    data.schedule_type || "MATUTINA",
    data.schedule_details?.trim() || null,
    data.expected_entry_time?.trim() || null,
    data.expected_exit_time?.trim() || null,
    qrToken,
    data.notes?.trim() || null
  );

  return db.prepare(`SELECT * FROM interns WHERE id = ?`).get(id) as InternRow;
}

/**
 * Actualiza un pasante o voluntario.
 */
export function updateIntern(
  id: string,
  institutionId: string,
  data: Partial<InternRow>
): void {
  const allowed = [
    "full_name",
    "document_id",
    "email",
    "phone",
    "type",
    "university_or_origin",
    "career_or_specialty",
    "tutor_user_id",
    "tutor_name",
    "required_hours",
    "start_date",
    "end_date",
    "schedule_type",
    "schedule_details",
    "expected_entry_time",
    "expected_exit_time",
    "status",
    "notes",
  ];

  const sets: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(data)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  values.push(id, institutionId);

  db.prepare(
    `UPDATE interns SET ${sets.join(", ")} WHERE id = ? AND institution_id = ?`
  ).run(...values);
}

/**
 * Elimina un pasante y todas sus asistencias.
 */
export function deleteIntern(id: string, institutionId: string): void {
  db.prepare(`DELETE FROM interns WHERE id = ? AND institution_id = ?`).run(
    id,
    institutionId
  );
}

/**
 * Obtiene todas las asistencias registradas hoy en una institución.
 */
export function getTodayAttendances(institutionId: string) {
  const { dateStr } = getEcuadorCurrentTime();

  return db
    .prepare(
      `SELECT a.*, i.full_name as intern_name, i.type as intern_type, 
              i.university_or_origin as university, i.career_or_specialty as career
       FROM intern_attendances a
       JOIN interns i ON i.id = a.intern_id
       WHERE a.institution_id = ? AND a.date = ?
       ORDER BY a.check_in_time DESC`
    )
    .all(institutionId, dateStr) as (InternAttendanceRow & {
    intern_name: string;
    intern_type: InternType;
    university: string;
    career: string | null;
  })[];
}

/**
 * Obtiene el historial de asistencias de un pasante.
 */
export function getInternAttendances(
  internId: string,
  institutionId: string
): InternAttendanceRow[] {
  return db
    .prepare(
      `SELECT * FROM intern_attendances
       WHERE intern_id = ? AND institution_id = ?
       ORDER BY date DESC, check_in_time DESC`
    )
    .all(internId, institutionId) as InternAttendanceRow[];
}

/**
 * Obtiene la asistencia activa de hoy si no ha marcado salida.
 */
export function getActiveAttendanceToday(
  internId: string
): InternAttendanceRow | null {
  const { dateStr } = getEcuadorCurrentTime();

  const row = db
    .prepare(
      `SELECT * FROM intern_attendances
       WHERE intern_id = ? AND date = ? AND status = 'EN_CURSO'
       ORDER BY check_in_time DESC LIMIT 1`
    )
    .get(internId, dateStr) as InternAttendanceRow | undefined;

  return row || null;
}

/**
 * Registra ENTRADA de un pasante o voluntario.
 */
export function recordCheckIn(
  internId: string,
  institutionId: string,
  options?: {
    activityNotes?: string;
    device?: string;
    registeredVia?: string;
    latitude?: number | null;
    longitude?: number | null;
    distanceMeters?: number | null;
  }
): { success: boolean; attendance?: InternAttendanceRow; message: string } {
  const { dateStr, timeStr } = getEcuadorCurrentTime();

  // Verificar si ya tiene una entrada abierta hoy
  const active = getActiveAttendanceToday(internId);
  if (active) {
    return {
      success: false,
      attendance: active,
      message: `Ya tienes una entrada registrada hoy a las ${active.check_in_time}. Debes registrar tu salida.`,
    };
  }

  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO intern_attendances (
      id, institution_id, intern_id, date, check_in_time,
      check_out_time, total_minutes, total_hours, activity_notes,
      registered_via, ip_or_device, latitude, longitude, distance_meters, status
    ) VALUES (
      ?, ?, ?, ?, ?,
      NULL, NULL, NULL, ?,
      ?, ?, ?, ?, ?, 'EN_CURSO'
    )`
  ).run(
    id,
    institutionId,
    internId,
    dateStr,
    timeStr,
    options?.activityNotes?.trim() || null,
    options?.registeredVia || "QR_MOBILE",
    options?.device?.trim() || null,
    options?.latitude ?? null,
    options?.longitude ?? null,
    options?.distanceMeters ?? null
  );

  const created = db
    .prepare(`SELECT * FROM intern_attendances WHERE id = ?`)
    .get(id) as InternAttendanceRow;

  return {
    success: true,
    attendance: created,
    message: `¡Entrada registrada con éxito a las ${timeStr}!`,
  };
}

/**
 * Registra SALIDA de un pasante o voluntario.
 */
export function recordCheckOut(
  attendanceId: string,
  options?: {
    activityNotes?: string;
    device?: string;
    latitude?: number | null;
    longitude?: number | null;
    distanceMeters?: number | null;
  }
): { success: boolean; attendance?: InternAttendanceRow; message: string } {
  const att = db
    .prepare(`SELECT * FROM intern_attendances WHERE id = ?`)
    .get(attendanceId) as InternAttendanceRow | undefined;

  if (!att) {
    return { success: false, message: "Registro de asistencia no encontrado." };
  }

  if (att.status === "COMPLETADO" && att.check_out_time) {
    return {
      success: false,
      attendance: att,
      message: `Ya se registró la salida para este turno a las ${att.check_out_time}.`,
    };
  }

  const { timeStr } = getEcuadorCurrentTime();
  const minutes = calculateMinutesDifference(att.check_in_time, timeStr);
  const hours = Math.round((minutes / 60) * 10) / 10;

  const updatedNotes = options?.activityNotes?.trim()
    ? att.activity_notes
      ? `${att.activity_notes} | ${options.activityNotes.trim()}`
      : options.activityNotes.trim()
    : att.activity_notes;

  db.prepare(
    `UPDATE intern_attendances SET
      check_out_time = ?,
      total_minutes = ?,
      total_hours = ?,
      activity_notes = ?,
      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude),
      distance_meters = COALESCE(?, distance_meters),
      status = 'COMPLETADO',
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    timeStr,
    minutes,
    hours,
    updatedNotes,
    options?.latitude ?? null,
    options?.longitude ?? null,
    options?.distanceMeters ?? null,
    attendanceId
  );

  const updated = db
    .prepare(`SELECT * FROM intern_attendances WHERE id = ?`)
    .get(attendanceId) as InternAttendanceRow;

  const hoursDisplay = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  return {
    success: true,
    attendance: updated,
    message: `¡Salida registrada a las ${timeStr}! Tiempo cumplido: ${hoursDisplay}.`,
  };
}

/**
 * Permite al personal DECE editar o ajustar manualmente las horas de un registro de asistencia.
 */
export function updateAttendance(
  attendanceId: string,
  institutionId: string,
  data: {
    date: string;
    checkInTime: string;
    checkOutTime?: string | null;
    activityNotes?: string | null;
  }
): { success: boolean; message: string; attendance?: InternAttendanceRow } {
  let totalMinutes: number | null = null;
  let totalHours: number | null = null;
  let status = "EN_CURSO";

  if (data.checkOutTime && data.checkOutTime.trim() !== "") {
    totalMinutes = calculateMinutesDifference(data.checkInTime, data.checkOutTime);
    totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    status = "COMPLETADO";
  }

  db.prepare(
    `UPDATE intern_attendances SET
      date = ?,
      check_in_time = ?,
      check_out_time = ?,
      total_minutes = ?,
      total_hours = ?,
      activity_notes = ?,
      status = ?,
      updated_at = datetime('now')
     WHERE id = ? AND institution_id = ?`
  ).run(
    data.date,
    data.checkInTime,
    data.checkOutTime?.trim() || null,
    totalMinutes,
    totalHours,
    data.activityNotes?.trim() || null,
    status,
    attendanceId,
    institutionId
  );

  const updated = db
    .prepare(`SELECT * FROM intern_attendances WHERE id = ?`)
    .get(attendanceId) as InternAttendanceRow;

  return {
    success: true,
    message: "Registro de asistencia actualizado exitosamente.",
    attendance: updated,
  };
}

/**
 * Busca al pasante vinculado a un dispositivo específico (deviceId).
 */
export function getInternByDeviceId(
  deviceId: string,
  institutionId?: string
): (InternRow & {
  institution_name: string;
  institution_seal: string | null;
  today_attendance: InternAttendanceRow | null;
  completed_hours: number;
}) | null {
  if (!deviceId) return null;

  let query = `
    SELECT i.*, inst.name as institution_name, inst.seal_image as institution_seal
    FROM interns i
    JOIN institutions inst ON inst.id = i.institution_id
    WHERE i.device_id = ?
  `;
  const params: any[] = [deviceId];

  if (institutionId) {
    query += ` AND i.institution_id = ?`;
    params.push(institutionId);
  }

  const row = db.prepare(query).get(...params) as any;
  if (!row) return null;

  const { dateStr } = getEcuadorCurrentTime();
  const todayAtt = db
    .prepare(
      `SELECT * FROM intern_attendances 
       WHERE intern_id = ? AND date = ? 
       ORDER BY check_in_time DESC LIMIT 1`
    )
    .get(row.id, dateStr) as InternAttendanceRow | undefined;

  const { totalHours } = computeInternHours(row.id);

  return {
    ...row,
    today_attendance: todayAtt || null,
    completed_hours: totalHours,
  };
}

/**
 * Vincula un teléfono celular exclusivo a un pasante con su PIN de 4 dígitos.
 * Implementa validaciones estrictas anti-suplantación.
 */
export function linkInternDevice(data: {
  internId: string;
  institutionId?: string;
  documentId: string;
  deviceId: string;
  deviceName: string;
  pinCode: string;
}): { success: boolean; message: string; intern?: InternRow } {
  // 1. Verificar si el pasante existe por su ID único
  const intern = db
    .prepare(`SELECT * FROM interns WHERE id = ?`)
    .get(data.internId) as InternRow | undefined;

  if (!intern) {
    return { success: false, message: "Registro de pasante no encontrado en el sistema." };
  }

  if (intern.status !== "ACTIVO") {
    return {
      success: false,
      message: `El pasante se encuentra en estado ${intern.status}. No puede vincular dispositivos.`,
    };
  }

  // Comparación limpia y normalizada de cédula (sin guiones, espacios ni caracteres especiales)
  const cleanDbDoc = intern.document_id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const cleanInputDoc = data.documentId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (cleanDbDoc !== cleanInputDoc) {
    return {
      success: false,
      message: "El número de cédula ingresado no coincide con el pasante seleccionado. Verifica tu número de cédula.",
    };
  }

  // 2. Verificar si el pasante YA tiene otro teléfono vinculado (evita que un amigo le registre otro cel)
  if (intern.device_id && intern.device_id !== data.deviceId) {
    return {
      success: false,
      message:
        `Este pasante ya tiene un teléfono celular personal vinculado (${intern.device_name || "Móvil registrado"}). Por seguridad anti-suplantación, no es posible vincular otro dispositivo. Solicita al tutor DECE desvincular tu equipo anterior si cambiaste de celular.`,
    };
  }

  // 3. Verificar si ESTE teléfono ya está vinculado a OTRO pasante (evita que 1 celular marque por varios)
  const existingOwner = db
    .prepare(
      `SELECT id, full_name FROM interns WHERE device_id = ? AND id != ?`
    )
    .get(data.deviceId, data.internId) as { id: string; full_name: string } | undefined;

  if (existingOwner) {
    return {
      success: false,
      message: `Este teléfono celular ya se encuentra registrado a nombre de "${existingOwner.full_name}". Cada pasante debe registrar su asistencia estrictamente desde su propio celular personal.`,
    };
  }

  // 4. Validar PIN (exactamente 4 dígitos numéricos)
  const cleanPin = data.pinCode.trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    return {
      success: false,
      message: "El código PIN debe ser exactamente de 4 dígitos numéricos.",
    };
  }

  const { dateStr, timeStr } = getEcuadorCurrentTime();
  const linkedAt = `${dateStr} ${timeStr}`;

  db.prepare(
    `UPDATE interns SET
      device_id = ?,
      device_name = ?,
      device_linked_at = ?,
      pin_code = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    data.deviceId,
    data.deviceName || "Teléfono Móvil",
    linkedAt,
    cleanPin,
    data.internId
  );

  const updated = db
    .prepare(`SELECT * FROM interns WHERE id = ?`)
    .get(data.internId) as InternRow;

  return {
    success: true,
    message: "¡Teléfono celular vinculado exitosamente a tu nombre!",
    intern: updated,
  };
}

/**
 * Desvincula el teléfono de un pasante (solo permitido por el tutor DECE o admin).
 */
export function unlinkInternDevice(
  internId: string,
  institutionId: string
): { success: boolean; message: string } {
  db.prepare(
    `UPDATE interns SET
      device_id = NULL,
      device_name = NULL,
      device_linked_at = NULL,
      updated_at = datetime('now')
     WHERE id = ? AND institution_id = ?`
  ).run(internId, institutionId);

  return {
    success: true,
    message: "Dispositivo desvinculado con éxito. El pasante podrá vincular su nuevo celular.",
  };
}

/**
 * Resetea el PIN de 4 dígitos de un pasante.
 */
export function resetInternPin(
  internId: string,
  institutionId: string,
  newPin: string
): { success: boolean; message: string } {
  if (!/^\d{4}$/.test(newPin.trim())) {
    return {
      success: false,
      message: "El PIN debe tener exactamente 4 dígitos.",
    };
  }

  db.prepare(
    `UPDATE interns SET pin_code = ?, updated_at = datetime('now')
     WHERE id = ? AND institution_id = ?`
  ).run(newPin.trim(), internId, institutionId);

  return { success: true, message: "PIN actualizado correctamente." };
}

/**
 * Calcula la distancia en metros entre dos coordenadas geográficas (Fórmula Haversine).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Obtiene o genera el código rotativo diario de presencia física (3 dígitos, ej. "482").
 */
export function getOrCreateDailyAttendanceCode(institutionId: string): string {
  const { dateStr } = getEcuadorCurrentTime();
  const inst = db
    .prepare(
      `SELECT daily_attendance_code, daily_code_date FROM institutions WHERE id = ?`
    )
    .get(institutionId) as
    | { daily_attendance_code?: string | null; daily_code_date?: string | null }
    | undefined;

  if (
    inst &&
    inst.daily_code_date === dateStr &&
    inst.daily_attendance_code &&
    inst.daily_attendance_code.trim() !== ""
  ) {
    return inst.daily_attendance_code;
  }

  // Generar un nuevo código diario de 3 dígitos numéricos
  const newCode = String(Math.floor(100 + Math.random() * 900));
  db.prepare(
    `UPDATE institutions SET daily_attendance_code = ?, daily_code_date = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(newCode, dateStr, institutionId);

  return newCode;
}

/**
 * Actualiza la configuración de geofencing y presencia física de la institución.
 */
export function updateInstitutionGeofence(
  institutionId: string,
  data: {
    latitude: number | null;
    longitude: number | null;
    geofenceRadiusMeters?: number;
    requireGeolocation?: boolean;
    dailyAttendanceCode?: string;
  }
) {
  const { dateStr } = getEcuadorCurrentTime();
  db.prepare(
    `UPDATE institutions SET
      latitude = ?,
      longitude = ?,
      geofence_radius_meters = COALESCE(?, geofence_radius_meters, 250),
      require_geolocation = ?,
      daily_attendance_code = COALESCE(?, daily_attendance_code),
      daily_code_date = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    data.latitude,
    data.longitude,
    data.geofenceRadiusMeters ?? 250,
    data.requireGeolocation === false ? 0 : 1,
    data.dailyAttendanceCode?.trim() || null,
    dateStr,
    institutionId
  );
}

