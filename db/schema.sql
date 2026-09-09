-- ============================================================================
-- Sistema de Gestión DECE — Esquema de base de datos (SQLite)
-- Alineado a los 4 ejes del Modelo de Gestión DECE (Ecuador):
--   Gestión / Acompañamiento psicosocial / Protección integral / Convivencia
--
-- Arquitectura multi-institución (nivel distrito): cada institución educativa
-- tiene sus propios estudiantes, casos, citas, actividades y alertas,
-- visibles solo para su equipo. El rol DISTRITO ve reportes agregados de
-- todas las instituciones, sin acceso al detalle confidencial de cada caso.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Instituciones educativas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institutions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  amie_code   TEXT,              -- código AMIE del Ministerio de Educación
  district    TEXT,              -- distrito educativo
  circuit     TEXT,              -- circuito educativo
  zona        TEXT,              -- coordinación zonal (ej. "ZONA 3")
  address                 TEXT,
  seal_image              TEXT,              -- sello/membrete institucional, como data URI (ej. data:image/png;base64,...)
  latitude                REAL,              -- Coordenada GPS latitud del DECE
  longitude               REAL,              -- Coordenada GPS longitud del DECE
  geofence_radius_meters  INTEGER DEFAULT 250, -- Radio permitido en metros alrededor del DECE
  require_geolocation     INTEGER DEFAULT 1, -- 1 = exige GPS obligatorio para evitar fotos a distancia
  daily_attendance_code   TEXT,              -- Código de seguridad del día para asistencia presencial
  daily_code_date         TEXT,              -- Fecha del código del día
  active                  INTEGER NOT NULL DEFAULT 1,
  deleted_at              TEXT,              -- Fecha/hora de borrado lógico (soft delete)
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id), -- NULL = usuario de distrito (rol DISTRITO)
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('SUPERADMIN','DISTRITO','ADMIN','DECE','AUTORIDAD','DOCENTE')),
  active         INTEGER NOT NULL DEFAULT 1,
  deleted_at     TEXT,              -- Fecha/hora de borrado lógico (soft delete)
  phone          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution_id);

-- ----------------------------------------------------------------------------
-- Estudiantes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  full_name      TEXT NOT NULL,
  document_id    TEXT,
  birth_date     TEXT,
  gender         TEXT,
  course         TEXT NOT NULL,
  parallel       TEXT,
  representative TEXT,
  rep_phone      TEXT,
  rep_email      TEXT,
  address        TEXT,
  ethnicity      TEXT,
  nationality    TEXT,
  active         INTEGER NOT NULL DEFAULT 1,
  notes          TEXT,

  -- Ficha del estudiante (ronda 17) — lugar de nacimiento, jornada, con quién vive
  birth_country          TEXT,
  birth_province         TEXT,
  birth_canton           TEXT,
  birth_parish            TEXT,
  jornada                TEXT, -- MATUTINA / VESPERTINA / NOCTURNA
  education_level          TEXT, -- EGB / BACHILLERATO (ronda 18)
  bachillerato_specialty   TEXT, -- especialidad/figura profesional, solo si BACHILLERATO (ronda 18)
  neighborhood            TEXT, -- barrio o caserío
  lives_with              TEXT, -- PADRES / MADRE / PADRE / ABUELITA / OTRO
  lives_with_other        TEXT,
  leaves_alone_authorized INTEGER, -- 0/1, NULL = no especificado

  -- Datos familiares (ronda 17) — padre, madre, representante (si es distinto)
  legal_guardian              TEXT, -- PADRE / MADRE / REPRESENTANTE
  father_name                 TEXT,
  father_document_id          TEXT,
  father_education            TEXT,
  father_address              TEXT,
  father_phone                 TEXT,
  father_occupation            TEXT,
  father_workplace             TEXT,
  mother_name                  TEXT,
  mother_document_id           TEXT,
  mother_education              TEXT,
  mother_address                TEXT,
  mother_phone                  TEXT,
  mother_occupation             TEXT,
  mother_workplace              TEXT,
  representative_document_id    TEXT,
  representative_education      TEXT,
  representative_address        TEXT,
  representative_occupation     TEXT,
  representative_workplace      TEXT,

  -- Necesidad educativa específica (ronda 17)
  nee_types               TEXT NOT NULL DEFAULT '[]', -- JSON: NINGUNA/FISICA/INTELECTUAL/VISUAL/AUDITIVA/MULTIDISCAPACIDAD/PSICOLOGICA
  disability_card_detail  TEXT,

  -- Datos médicos (ronda 17)
  medical_condition               TEXT,
  medical_allergies                TEXT,
  medical_medication_intolerance   TEXT,
  medical_food_intolerance         TEXT,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(institution_id, course, parallel);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(full_name);
-- La cédula debe ser única solo dentro de la misma institución (evita choques
-- entre datos de prueba/duplicados de distintos colegios en la misma base).
CREATE UNIQUE INDEX IF NOT EXISTS uidx_students_doc_per_institution
  ON students(institution_id, document_id) WHERE document_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Casos / Fichas de atención (núcleo)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_files (
  id               TEXT PRIMARY KEY,
  institution_id   TEXT NOT NULL REFERENCES institutions(id),
  code             TEXT NOT NULL,
  student_id       TEXT NOT NULL REFERENCES students(id),
  opened_by_id     TEXT NOT NULL REFERENCES users(id),
  assigned_to_id   TEXT REFERENCES users(id),

  status           TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (status IN ('ABIERTO','EN_SEGUIMIENTO','DERIVADO','CERRADO')),
  priority         TEXT NOT NULL DEFAULT 'MEDIA' CHECK (priority IN ('ALTA','MEDIA','BAJA')),
  action_axis      TEXT NOT NULL DEFAULT 'ATENCION' CHECK (action_axis IN ('PROMOCION','PREVENCION','ATENCION','SEGUIMIENTO')),
  risk_type        TEXT NOT NULL CHECK (risk_type IN (
                      'VIOLENCIA_INTRAFAMILIAR','VIOLENCIA_ESCOLAR_BULLYING','VIOLENCIA_SEXUAL',
                      'CONSUMO_SUSTANCIAS','SALUD_MENTAL','EMBARAZO_ADOLESCENTE','VULNERACION_DERECHOS',
                      'DIFICULTAD_APRENDIZAJE','CONFLICTO_FAMILIAR','CONECTIVIDAD_ACCESO_EDUCATIVO','OTRO')),
  risk_type_other  TEXT,

  detection_date   TEXT NOT NULL DEFAULT (datetime('now')),
  detection_source TEXT,
  description      TEXT NOT NULL,
  confidential     INTEGER NOT NULL DEFAULT 1,

  closed_at        TEXT,
  closure_reason   TEXT,

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_case_files_institution ON case_files(institution_id);
CREATE INDEX IF NOT EXISTS idx_case_files_status ON case_files(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_case_files_risk ON case_files(risk_type);
CREATE INDEX IF NOT EXISTS idx_case_files_student ON case_files(student_id);
-- El código de caso (DECE-2026-0001) es único dentro de cada institución,
-- no globalmente, para que cada colegio lleve su propio correlativo.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_case_files_code_per_institution
  ON case_files(institution_id, code);

-- Bitácora cronológica de acciones dentro de un caso
CREATE TABLE IF NOT EXISTS case_actions (
  id           TEXT PRIMARY KEY,
  case_file_id TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  author_id    TEXT NOT NULL REFERENCES users(id),
  date         TEXT NOT NULL DEFAULT (datetime('now')),
  type         TEXT NOT NULL,
  description  TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_case_actions_case ON case_actions(case_file_id);

-- Plan de acompañamiento y restitución de derechos
CREATE TABLE IF NOT EXISTS intervention_plans (
  id             TEXT PRIMARY KEY,
  case_file_id   TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  responsible_id TEXT NOT NULL REFERENCES users(id),
  objective      TEXT NOT NULL,
  actions        TEXT NOT NULL,
  start_date     TEXT NOT NULL DEFAULT (datetime('now')),
  end_date       TEXT,
  status         TEXT NOT NULL DEFAULT 'EN_CURSO' CHECK (status IN ('EN_CURSO','CUMPLIDO','INCUMPLIDO')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_plans_case ON intervention_plans(case_file_id);

-- ----------------------------------------------------------------------------
-- Derivaciones
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
  id                TEXT PRIMARY KEY,
  case_file_id      TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  created_by_id     TEXT NOT NULL REFERENCES users(id),
  scope             TEXT NOT NULL CHECK (scope IN ('INTERNA','EXTERNA')),
  institution        TEXT NOT NULL, -- nombre de la entidad externa/interna a la que se deriva (texto libre, NO es institution_id)
  reason            TEXT NOT NULL,
  informed_consent  INTEGER NOT NULL DEFAULT 0,
  consent_signed_by TEXT,
  referral_date     TEXT NOT NULL DEFAULT (datetime('now')),
  status            TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE','EN_PROCESO','RESPONDIDA','CERRADA')),
  response_notes    TEXT,
  follow_up_date    TEXT,
  -- Campos adicionales para generar la Ficha de Derivación oficial (E.D3.C1.DE...)
  destination_detail   TEXT, -- categoría exacta del destino (ver src/lib/referral.ts)
  background_summary   TEXT, -- historia de la situación actual
  actions_taken        TEXT, -- acciones desarrolladas en el ámbito de atención psicosocial
  care_type_required    TEXT, -- tipo de atención que se requiere de la entidad interna/externa
  observations          TEXT,
  elaborated_by_name    TEXT, -- ficha elaborada por (Coordinador/a DECE)
  received_by           TEXT, -- recibido por (Representante legal)
  authority_name         TEXT, -- autoridad institucional (Rector/a)
  -- Campos adicionales de "Datos personales del/la estudiante" tal como aparecen
  -- en la plantilla oficial (edad, discapacidad, nacionalidad, documento del
  -- representante) que no forman parte de la ficha base del estudiante.
  student_age            TEXT,
  student_disability     TEXT,
  student_nationality    TEXT,
  representative_document_id TEXT,
  district_office_label  TEXT, -- ej. "DIRECCIÓN DISTRITAL DE EDUCACIÓN 18D02 AMBATO 2"
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_referrals_case ON referrals(case_file_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ----------------------------------------------------------------------------
-- Citas y agenda
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id              TEXT PRIMARY KEY,
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  student_id      TEXT REFERENCES students(id),
  case_file_id    TEXT REFERENCES case_files(id),
  professional_id TEXT NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  date            TEXT NOT NULL,
  start_time      TEXT NOT NULL,
  end_time        TEXT,
  attendee_type   TEXT NOT NULL DEFAULT 'ESTUDIANTE' CHECK (attendee_type IN ('ESTUDIANTE','REPRESENTANTE','DOCENTE','EXTERNO')),
  location        TEXT,
  status          TEXT NOT NULL DEFAULT 'PROGRAMADA' CHECK (status IN ('PROGRAMADA','ATENDIDA','NO_ASISTIO','CANCELADA')),
  notes           TEXT,
  requester_email     TEXT, -- si la cita vino de una solicitud pública, para poder recordarle por correo
  reminder_24h_sent    INTEGER NOT NULL DEFAULT 0,
  reminder_1h_sent      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appointments_institution ON appointments(institution_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(institution_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ----------------------------------------------------------------------------
-- Solicitudes públicas de cita (sin cuenta) — cualquier miembro de la
-- comunidad educativa pide una cita con el DECE desde un enlace público;
-- el profesional la revisa y confirma/rechaza desde /citas/solicitudes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_requests (
  id                 TEXT PRIMARY KEY,
  institution_id     TEXT NOT NULL REFERENCES institutions(id),
  requester_name     TEXT NOT NULL,
  requester_role     TEXT NOT NULL CHECK (requester_role IN ('ESTUDIANTE','REPRESENTANTE','DOCENTE','OTRO')),
  requester_email    TEXT NOT NULL,
  requester_phone    TEXT,
  student_name       TEXT, -- si la cita es sobre un/a estudiante en particular
  student_course     TEXT,
  reason             TEXT NOT NULL,
  preferred_date     TEXT,
  preferred_time     TEXT,
  professional_id    TEXT REFERENCES users(id), -- a qué profesional se le pidió la cita (ronda 20)
  status             TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE','CONFIRMADA','RECHAZADA','CANCELADA')),
  reject_reason      TEXT,
  appointment_id     TEXT REFERENCES appointments(id),
  reviewed_by_id     TEXT REFERENCES users(id),
  reviewed_at        TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_institution ON appointment_requests(institution_id, status);

-- ----------------------------------------------------------------------------
-- Disponibilidad de horarios por profesional (ronda 20) — cada profesional
-- DECE/ADMIN habilita o deshabilita horas puntuales, día por día (sin
-- plantilla semanal recurrente, a pedido explícito del usuario). El enlace
-- público de citas usa esto (cruzado con las citas ya agendadas) para
-- mostrarle al padre/representante solo las horas realmente disponibles,
-- sin revelar a quién pertenece una cita ya tomada.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS professional_schedule_slots (
  id              TEXT PRIMARY KEY,
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  professional_id TEXT NOT NULL REFERENCES users(id),
  date            TEXT NOT NULL, -- AAAA-MM-DD
  hour            TEXT NOT NULL, -- "07:00", "08:00", ... (inicio del bloque de 1 hora)
  available       INTEGER NOT NULL DEFAULT 1, -- 1 = habilitada, 0 = deshabilitada
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(professional_id, date, hour)
);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_prof_date ON professional_schedule_slots(professional_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_institution ON professional_schedule_slots(institution_id, date);

-- ----------------------------------------------------------------------------
-- Suscripciones a notificaciones push del navegador (Web Push), una fila por
-- dispositivo/navegador en el que el usuario activó las notificaciones.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ----------------------------------------------------------------------------
-- Promoción, prevención y convivencia
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id                 TEXT PRIMARY KEY,
  institution_id     TEXT NOT NULL REFERENCES institutions(id),
  title              TEXT NOT NULL,
  axis               TEXT NOT NULL CHECK (axis IN ('PROMOCION','PREVENCION','CONVIVENCIA')),
  prevention_theme   TEXT,
  description        TEXT,
  target_audience    TEXT,
  courses            TEXT,
  date               TEXT NOT NULL,
  responsible_id     TEXT NOT NULL REFERENCES users(id),
  participants_count INTEGER,
  evidence_notes     TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activities_institution ON activities(institution_id);
CREATE INDEX IF NOT EXISTS idx_activities_axis ON activities(axis);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(institution_id, date);

-- ----------------------------------------------------------------------------
-- Alertas de docentes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_alerts (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  student_id     TEXT NOT NULL REFERENCES students(id),
  reported_by_id TEXT NOT NULL REFERENCES users(id),
  description    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE','EN_REVISION','CONVERTIDA_EN_CASO','DESCARTADA')),
  case_file_id   TEXT UNIQUE REFERENCES case_files(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alerts_institution ON teacher_alerts(institution_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON teacher_alerts(status);

-- ----------------------------------------------------------------------------
-- Adjuntos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id             TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id),
  filename       TEXT NOT NULL,
  path           TEXT NOT NULL,
  mime_type      TEXT,
  size           INTEGER,
  uploaded_at    TEXT NOT NULL DEFAULT (datetime('now')),
  uploaded_by_id TEXT REFERENCES users(id),
  case_file_id   TEXT REFERENCES case_files(id) ON DELETE CASCADE,
  case_action_id TEXT REFERENCES case_actions(id) ON DELETE CASCADE,
  referral_id    TEXT REFERENCES referrals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attachments_case ON attachments(case_file_id);
-- NOTA: el índice por institution_id NO se crea aquí porque esa columna es
-- nueva (ronda 17) y en instalaciones existentes la tabla attachments ya
-- existe sin ella — CREATE INDEX fallaría antes de que corra el
-- safeAddColumn de más abajo. Se crea en src/lib/db.ts, después de las
-- migraciones ligeras.

-- ----------------------------------------------------------------------------
-- Auditoría global — trazabilidad de todas las acciones del sistema
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id             TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id), -- NULL = acción de un usuario de distrito
  user_id        TEXT REFERENCES users(id),
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      TEXT,
  details        TEXT,
  timestamp      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_institution ON audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- ----------------------------------------------------------------------------
-- Checklist de expediente (según tipo de caso) y entrevistas semiestructuradas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_checklist_items (
  id             TEXT PRIMARY KEY,
  case_file_id   TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  category       TEXT NOT NULL CHECK (category IN ('VIOLENCIA_SEXUAL','VIOLENCIA_NO_SEXUAL','ATENCION_PSICOSOCIAL')),
  item_order     INTEGER NOT NULL,
  item_text      TEXT NOT NULL,
  status         TEXT CHECK (status IN ('SI','NO')),
  observations   TEXT,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_checklist_items_case ON case_checklist_items(case_file_id);

CREATE TABLE IF NOT EXISTS case_checklist_reviews (
  id             TEXT PRIMARY KEY,
  case_file_id   TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  role_label     TEXT NOT NULL,
  full_name      TEXT,
  signed_date    TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_checklist_review_role ON case_checklist_reviews(case_file_id, role_label);

CREATE TABLE IF NOT EXISTS case_interviews (
  id                     TEXT PRIMARY KEY,
  case_file_id           TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id         TEXT NOT NULL REFERENCES institutions(id),
  interviewee_full_name  TEXT,
  interviewee_cedula     TEXT,
  course                 TEXT,
  age                    TEXT,
  application_date       TEXT,
  family_relation        TEXT,
  emotional_state        TEXT,
  social_relations       TEXT,
  bullying_history       INTEGER NOT NULL DEFAULT 0,
  academic_history       TEXT,
  summary                TEXT,
  recommendations        TEXT,
  commitment             TEXT,
  representative_name    TEXT,
  professional_id        TEXT REFERENCES users(id),
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_interviews_case ON case_interviews(case_file_id);

-- ----------------------------------------------------------------------------
-- Ficha de Observación Psicosocial (E.D3.C1.DE11.c.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_observation_sheets (
  id                          TEXT PRIMARY KEY,
  case_file_id                TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id              TEXT NOT NULL REFERENCES institutions(id),
  professional_id             TEXT REFERENCES users(id),
  observation_date            TEXT NOT NULL DEFAULT (datetime('now')),
  jornada                     TEXT,
  context                     TEXT NOT NULL CHECK (context IN ('AULA','ENTREVISTA','OTRO')),
  context_other               TEXT,
  subnivel                    TEXT NOT NULL CHECK (subnivel IN ('ELEMENTAL','BASICA_MEDIA','SUPERIOR_BACHILLERATO')),
  anxious_indicators          TEXT NOT NULL DEFAULT '[]',   -- JSON: lista de textos marcados
  depressive_indicators       TEXT NOT NULL DEFAULT '[]',
  suicidal_indicators         TEXT NOT NULL DEFAULT '[]',
  risk_level                  TEXT NOT NULL CHECK (risk_level IN ('BAJO','MEDIO','ALTO','CRITICO')),
  protective_factors          TEXT NOT NULL DEFAULT '[]',
  institutional_actions       TEXT NOT NULL DEFAULT '[]',
  observations                TEXT,
  created_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_observation_sheets_case ON case_observation_sheets(case_file_id);

-- ----------------------------------------------------------------------------
-- Plan de Atención Psicosocial y Seguimiento
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_care_plans (
  id                    TEXT PRIMARY KEY,
  case_file_id          TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id        TEXT NOT NULL REFERENCES institutions(id),
  professional_id       TEXT REFERENCES users(id),
  plan_date             TEXT NOT NULL DEFAULT (datetime('now')),
  jornada               TEXT,
  tutor_name             TEXT,
  diagnosis_summary     TEXT NOT NULL,
  intervention_types    TEXT NOT NULL DEFAULT '[]', -- JSON: INDIVIDUAL / FAMILIAR / GRUPAL
  actions               TEXT NOT NULL DEFAULT '[]', -- JSON: [{accion, profesional, tiempo, observaciones}]
  status                TEXT NOT NULL DEFAULT 'EN_CURSO' CHECK (status IN ('EN_CURSO','CUMPLIDO','SUSPENDIDO')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_care_plans_case ON case_care_plans(case_file_id);

-- ----------------------------------------------------------------------------
-- Plan de Acompañamiento y Restitución de Derechos (casos de violencia)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_restitution_plans (
  id                        TEXT PRIMARY KEY,
  case_file_id              TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id            TEXT NOT NULL REFERENCES institutions(id),
  school_year               TEXT,
  elaboration_date          TEXT NOT NULL DEFAULT (datetime('now')),

  risk_factors              TEXT, -- factores de riesgo individual/familiar/escolar (texto libre)

  violence_types            TEXT NOT NULL DEFAULT '[]', -- JSON: FISICA/PSICOLOGICA/SEXUAL/NEGLIGENCIA/VIRTUAL
  violence_modality         TEXT NOT NULL DEFAULT '[]', -- JSON: INSTITUCIONAL/INTRAFAMILIAR/ENTRE_PARES/OTROS
  violence_modality_other   TEXT,
  perpetrator_relation      TEXT, -- relación de la presunta persona agresora con la víctima

  victims                   TEXT NOT NULL DEFAULT '[]', -- JSON: [{iniciales, cedula, edad, genero, nivel_instruccion}]
  perpetrators               TEXT NOT NULL DEFAULT '[]', -- JSON: [{nombre, edad, cargo_funcion}]
  report_narrative          TEXT, -- narrativa de cómo se conoció/reportó el caso + N° de informe técnico

  legal_instances           TEXT NOT NULL DEFAULT '[]', -- JSON: [{instancia, fecha_denuncia, numero_denuncia, medidas, estado}]
  accompaniment_actions     TEXT NOT NULL DEFAULT '[]', -- JSON: [{categoria, ejecutor, num_personas, fecha_inicio, fecha_fin}]

  prepared_by_name           TEXT,
  prepared_date               TEXT,
  reviewed_coordinator_name   TEXT,
  reviewed_coordinator_date   TEXT,
  reviewed_authority_name     TEXT,
  reviewed_authority_date     TEXT,
  approved_by_name             TEXT,
  approved_date                 TEXT,

  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_restitution_plans_case ON case_restitution_plans(case_file_id);

-- ----------------------------------------------------------------------------
-- Registro de llamadas telefónicas y seguimiento del caso
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_call_logs (
  id                 TEXT PRIMARY KEY,
  case_file_id       TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id     TEXT NOT NULL REFERENCES institutions(id),
  caller_id          TEXT REFERENCES users(id),
  call_date          TEXT NOT NULL DEFAULT (datetime('now')),
  contact_name       TEXT,
  contact_relation   TEXT, -- ej. Representante legal, Madre, Padre, Docente, Estudiante...
  phone_number       TEXT,
  reason             TEXT NOT NULL,
  result             TEXT, -- resumen de lo conversado / acuerdo
  follow_up_needed   INTEGER NOT NULL DEFAULT 0,
  follow_up_date     TEXT,
  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_call_logs_case ON case_call_logs(case_file_id);

-- ----------------------------------------------------------------------------
-- Ficha de Seguimiento de la Atención Psicosocial (registro de cada sesión
-- de atención realizada, distinto del Plan de Atención que define QUÉ se
-- hará: esta ficha registra QUÉ se hizo, sesión por sesión)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_care_followups (
  id                 TEXT PRIMARY KEY,
  case_file_id       TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id     TEXT NOT NULL REFERENCES institutions(id),
  professional_id    TEXT REFERENCES users(id),
  intervention_type  TEXT NOT NULL, -- INDIVIDUAL/FAMILIAR/GRUPAL/CRISIS
  description        TEXT NOT NULL,
  session_date       TEXT NOT NULL DEFAULT (datetime('now')),
  observations        TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_care_followups_case ON case_care_followups(case_file_id);

-- ----------------------------------------------------------------------------
-- Registro de Asesoría a Docentes Tutores
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_advisory_logs (
  id                   TEXT PRIMARY KEY,
  case_file_id         TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id       TEXT NOT NULL REFERENCES institutions(id),
  professional_id      TEXT REFERENCES users(id),
  log_date             TEXT NOT NULL DEFAULT (datetime('now')),
  tutor_name           TEXT NOT NULL,
  jornada              TEXT, -- Matutina/Vespertina/Nocturna
  difficulty_detected  TEXT NOT NULL,
  advice_given         TEXT NOT NULL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_advisory_logs_case ON case_advisory_logs(case_file_id);

-- ----------------------------------------------------------------------------
-- Informe de Reporte del Hecho de Violencia (Anexo 1 MINEDUC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS violence_reports (
  id                          TEXT PRIMARY KEY,
  case_file_id                TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id              TEXT NOT NULL REFERENCES institutions(id),
  report_number                TEXT,
  report_date                  TEXT NOT NULL DEFAULT (datetime('now')),
  dece_professional_name       TEXT,

  representative_relationship  TEXT, -- vínculo del representante con el/la estudiante

  perpetrator_name             TEXT,
  perpetrator_birth_date       TEXT,
  perpetrator_age              TEXT,
  perpetrator_document_id      TEXT,
  perpetrator_gender           TEXT,
  perpetrator_relationship     TEXT, -- relación de la presunta persona agresora con la víctima

  informant_name                TEXT,
  informant_id_number           TEXT,
  informant_role                TEXT,

  incident_date                 TEXT,
  incident_place                TEXT,

  violence_types                TEXT NOT NULL DEFAULT '[]', -- JSON: FISICA/PSICOLOGICA/SEXUAL/NEGLIGENCIA
  violence_modalities           TEXT NOT NULL DEFAULT '[]', -- JSON: INTRAFAMILIAR/INSTITUCIONAL/ACOSO_ESCOLAR/ESTUDIANTE_ADULTO/OTRAS
  violence_modality_other       TEXT,

  summary                        TEXT, -- resumen del presunto hecho de violencia
  observations                   TEXT,

  analyst_name                   TEXT,
  analyst_role                   TEXT DEFAULT 'ANALISTA DECE',
  rectora_name                   TEXT,

  created_by                     TEXT REFERENCES users(id),
  created_at                     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_violence_reports_case ON violence_reports(case_file_id);

-- ----------------------------------------------------------------------------
-- Acta de Socialización de Estudiantes en Situación de Vulnerabilidad
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS socialization_acts (
  id                          TEXT PRIMARY KEY,
  case_file_id                TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id               TEXT NOT NULL REFERENCES institutions(id),
  act_date                     TEXT NOT NULL DEFAULT (datetime('now')),
  act_place                    TEXT,

  vulnerability_type           TEXT NOT NULL, -- ej. situación económica, salud, familiar...
  curricular_adaptation_grade  TEXT, -- grado de adaptación curricular recomendado (opcional)

  agreements                   TEXT NOT NULL DEFAULT '[]', -- JSON string[] (acuerdos, editable desde una lista base)
  teacher_signatures            TEXT NOT NULL DEFAULT '[]', -- JSON [{asignatura, docente}]

  prepared_by_name              TEXT,
  approved_by_name              TEXT, -- Rectora/Rector
  received_by_name              TEXT,
  received_by_role              TEXT, -- ej. Tutor del curso

  created_by                    TEXT REFERENCES users(id),
  created_at                    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_socialization_acts_case ON socialization_acts(case_file_id);

-- ----------------------------------------------------------------------------
-- Acta de Asesoramiento a la Máxima Autoridad Institucional
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS authority_advisory_acts (
  id                    TEXT PRIMARY KEY,
  case_file_id          TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id        TEXT NOT NULL REFERENCES institutions(id),
  act_date              TEXT NOT NULL DEFAULT (datetime('now')),
  act_time              TEXT,
  act_place             TEXT,
  issuing_entity        TEXT, -- ej. Junta Cantonal/Distrital de Protección de Derechos

  standard_code         TEXT, -- ej. E.D3.C1.DE13.c

  participants           TEXT NOT NULL DEFAULT '[]', -- JSON [{nombre, cargo, funcion}]
  background              TEXT NOT NULL DEFAULT '[]', -- JSON string[] (antecedentes, numerados 2.1, 2.2...)
  measures                TEXT NOT NULL DEFAULT '[]', -- JSON string[] (medidas dispuestas: PRIMERO, SEGUNDO...)
  advisory_scope          TEXT NOT NULL DEFAULT '[]', -- JSON string[] (alcance del asesoramiento, numerado 4.1, 4.2...)
  conclusion               TEXT,

  dece_professional_name  TEXT,
  authority_name           TEXT,
  authority_role           TEXT,

  created_by               TEXT REFERENCES users(id),
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_authority_advisory_case ON authority_advisory_acts(case_file_id);

-- ----------------------------------------------------------------------------
-- Informe Técnico Situacional
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS situational_reports (
  id                        TEXT PRIMARY KEY,
  case_file_id              TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id            TEXT NOT NULL REFERENCES institutions(id),
  report_number              TEXT,
  report_date                 TEXT NOT NULL DEFAULT (datetime('now')),

  responsible_name            TEXT,
  responsible_role            TEXT,
  responsible_phone           TEXT,
  responsible_email           TEXT,

  addressed_to_name           TEXT,
  addressed_to_role           TEXT,
  addressed_to_phone          TEXT,
  addressed_to_email          TEXT,

  situation_type               TEXT NOT NULL, -- ej. "intento autolítico", "violencia sexual"...
  tema                          TEXT, -- título completo del informe (se puede autogenerar y editar)
  tutor_name                    TEXT,

  scope_text                    TEXT, -- ALCANCE
  objective_text                 TEXT, -- OBJETIVO

  eje_deteccion                  TEXT, -- AEP1. Eje de Detección
  eje_diagnostico_individual      TEXT, -- AEAP2. Valoración individual
  eje_diagnostico_familiar        TEXT, -- AEAP2. Valoración familiar
  eje_diagnostico_institucional   TEXT, -- AEAP2. Valoración institucional
  eje_atencion_psicosocial        TEXT, -- AEAP3. Eje de Intervención
  eje_derivacion                   TEXT, -- AEP4. Eje de Derivación
  eje_seguimiento                  TEXT, -- AEAP5. Eje de Seguimiento
  eje_reparacion                    TEXT, -- AERP6. Eje de Reparación

  methodology                       TEXT NOT NULL DEFAULT '[]', -- JSON string[] (catálogo fijo de métodos usados)
  conclusions                       TEXT,
  recommendations                   TEXT,

  preparer_name                      TEXT,
  preparer_role                      TEXT,
  approver_name                      TEXT,
  approver_role                      TEXT,

  created_by                         TEXT REFERENCES users(id),
  created_at                         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_situational_reports_case ON situational_reports(case_file_id);

-- ----------------------------------------------------------------------------
-- Registro de Atención Diaria (estudiantes, representantes, docentes y
-- autoridades) — bitácora general de TODA atención que brinda el DECE,
-- se haya abierto o no un caso formal. Un registro puede opcionalmente
-- enlazarse a un caso existente (case_file_id), pero la mayoría de
-- atenciones cotidianas no ameritan abrir un caso.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_attentions (
  id                   TEXT PRIMARY KEY,
  institution_id       TEXT NOT NULL REFERENCES institutions(id),
  professional_id      TEXT REFERENCES users(id),
  case_file_id         TEXT REFERENCES case_files(id) ON DELETE SET NULL, -- opcional

  attendee_type        TEXT NOT NULL, -- ESTUDIANTE / REPRESENTANTE / DOCENTE_AUTORIDAD
  attention_date       TEXT NOT NULL DEFAULT (datetime('now')),
  duration             TEXT, -- solo docentes/autoridades: duración de la atención

  student_name         TEXT, -- nombre del/la estudiante (siempre relevante salvo atención solo a docente sin estudiante asociado)
  student_grade         TEXT, -- grado/año/paralelo
  jornada                TEXT,

  representative_name    TEXT, -- solo REPRESENTANTE
  attendee_name           TEXT, -- solo DOCENTE_AUTORIDAD: nombre del/la docente o autoridad

  reason                   TEXT NOT NULL, -- motivo de atención / de asistencia al DECE

  action_axis              TEXT NOT NULL DEFAULT '[]', -- JSON string[]: DETECCION/INTERVENCION_INDIVIDUAL/INTERVENCION_FAMILIAR/INTERVENCION_CRISIS/MEDIACION_ESCOLAR/DERIVACION/SEGUIMIENTO/PROMOCION

  modality_tech             TEXT, -- medio tecnológico (especifique), si aplica
  modality_signed            INTEGER NOT NULL DEFAULT 0, -- firma registrada
  modality_phone              TEXT, -- número de teléfono de contacto

  has_detection_sheet          TEXT, -- solo docentes/autoridades: "SI"/"NO" (presenta ficha de detección)
  observations                 TEXT,

  created_at                    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_daily_attentions_institution ON daily_attentions(institution_id, attendee_type, attention_date);

-- ----------------------------------------------------------------------------
-- Matriz de Riesgos Psicosociales (MATRIZ RPS-EIS) — datos complementarios
-- que no viven en otras tablas, para poder generar el reporte mensual
-- oficial que la institución envía a distrito/zona (formato de 43 columnas
-- verificado contra la plantilla real MINEDUC). El resto de columnas de la
-- matriz (datos del/la estudiante, del/la representante, de la persona
-- agresora, y de las acciones de acompañamiento) se toman automáticamente
-- de las tablas ya existentes (students, violence_reports,
-- case_restitution_plans) al momento de exportar, para no duplicar
-- digitación.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_risk_matrix_entries (
  id                          TEXT PRIMARY KEY,
  case_file_id                TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id               TEXT NOT NULL REFERENCES institutions(id),
  report_month                  TEXT NOT NULL, -- 'YYYY-MM', mes de reporte a distrito

  case_type                      TEXT NOT NULL, -- TIPO DE CASO (texto libre, ej. "Violencia Física y Psicológica")
  knowledge_date                  TEXT, -- FECHA DE CONOCIMIENTO
  registered_by_name                TEXT, -- NOMBRES Y APELLIDOS DE QUIEN REGISTRA
  registered_by_role                 TEXT, -- CARGO DE QUIEN REGISTRA

  student_ethnicity                   TEXT,
  student_nationality                  TEXT,
  student_has_disability                 TEXT, -- 'SI' / 'NO'
  student_disability_type                 TEXT,
  student_gender_diversity                 TEXT,
  student_other_conditions                  TEXT,

  file_lift_date                             TEXT, -- FECHA DE LEVANTAMIENTO DE LA FICHA
  district_case_number                        TEXT, -- N° DE TRÁMITE PRESENTADO AL DISTRITO
  district_intake_date                         TEXT, -- FECHA DE INGRESO DE CASO EN DISTRITO
  protection_measures_institution               TEXT,
  protection_measures_description                TEXT,

  has_accompaniment_plan                          TEXT, -- descripción libre: qué plan tiene (o "No")

  fiscalia_complaint                               TEXT, -- 'SI' / 'NO'
  fiscalia_date                                     TEXT,
  fiscalia_number                                    TEXT,
  jcpdna_complaint                                    TEXT, -- 'SI' / 'NO'
  jcpdna_date                                          TEXT,

  case_current_status                                   TEXT,
  observations                                           TEXT,

  created_at                                              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                                               TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_risk_matrix_case ON case_risk_matrix_entries(case_file_id);
CREATE INDEX IF NOT EXISTS idx_risk_matrix_institution_month ON case_risk_matrix_entries(institution_id, report_month);

-- ----------------------------------------------------------------------------
-- Años Lectivos (Períodos Escolares) — Gestión y organización por ciclos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_years (
  id              TEXT PRIMARY KEY,
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  name            TEXT NOT NULL, -- ej. "2024-2025 Sierra", "2025-2026 Costa"
  regime          TEXT NOT NULL DEFAULT 'SIERRA_AMAZONIA' CHECK (regime IN ('SIERRA_AMAZONIA','COSTA_GALAPAGOS')),
  start_date      TEXT NOT NULL, -- AAAA-MM-DD
  end_date        TEXT NOT NULL, -- AAAA-MM-DD
  is_active       INTEGER NOT NULL DEFAULT 0, -- 1 = año lectivo activo por defecto
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(institution_id, name)
);
CREATE INDEX IF NOT EXISTS idx_school_years_inst ON school_years(institution_id);
CREATE INDEX IF NOT EXISTS idx_school_years_active ON school_years(institution_id, is_active);

-- ----------------------------------------------------------------------------
-- Matrículas / Historial de Curso por Año Lectivo para Estudiantes
-- Permite que el estudiante conserve su historial acumulado al pasar de año
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_enrollments (
  id              TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_year_id  TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  course          TEXT NOT NULL, -- ej. "8vo EGB", "1ro BGU"
  parallel        TEXT,          -- ej. "A", "B"
  jornada         TEXT,          -- MATUTINA / VESPERTINA / NOCTURNA
  education_level TEXT,          -- EGB / BACHILLERATO
  specialty       TEXT,          -- Especialidad (técnico/ciencias)
  status          TEXT NOT NULL DEFAULT 'MATRICULADO' CHECK (status IN ('MATRICULADO','PROMOVIDO','RETIRADO','DESERTADO')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, school_year_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_year ON student_enrollments(school_year_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON student_enrollments(institution_id, course, parallel);

-- ----------------------------------------------------------------------------
-- Chat y Mensajería Interna
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_channels (
  id              TEXT PRIMARY KEY,
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  type            TEXT NOT NULL CHECK (type IN ('DIRECT', 'GROUP', 'CASE', 'AI_ASSISTANT')),
  name            TEXT,
  description     TEXT,
  case_file_id    TEXT REFERENCES case_files(id) ON DELETE SET NULL,
  created_by_id   TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_channels_inst ON chat_channels(institution_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON chat_channels(type);

CREATE TABLE IF NOT EXISTS chat_channel_members (
  id              TEXT PRIMARY KEY,
  channel_id      TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TEXT NOT NULL DEFAULT (datetime('now')),
  joined_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON chat_channel_members(channel_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              TEXT PRIMARY KEY,
  channel_id      TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id       TEXT REFERENCES users(id),
  content         TEXT NOT NULL,
  attachment_url  TEXT,
  attachment_name TEXT,
  case_file_id    TEXT REFERENCES case_files(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at);

-- ----------------------------------------------------------------------------
-- Informes Bimensuales de Acompañamiento Institucional (Violencia Sexual)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bimonthly_reports (
  id                   TEXT PRIMARY KEY,
  case_file_id         TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id       TEXT NOT NULL REFERENCES institutions(id),
  school_year_id       TEXT REFERENCES school_years(id),
  school_year_text     TEXT NOT NULL,
  period_months        TEXT NOT NULL,
  institution_name     TEXT NOT NULL,
  amie_code            TEXT NOT NULL,
  victim_initials      TEXT NOT NULL,
  processes_data       TEXT NOT NULL DEFAULT '[]',
  elaborated_by_name   TEXT,
  elaborated_by_role   TEXT DEFAULT 'DECE institucional',
  reviewed_by_name     TEXT,
  reviewed_by_role     TEXT DEFAULT 'Autoridad educativa',
  approved_by_name     TEXT,
  approved_by_role     TEXT DEFAULT 'Profesional de apoyo DECE Distrital',
  created_by           TEXT REFERENCES users(id),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bimonthly_reports_case ON bimonthly_reports(case_file_id);

-- ----------------------------------------------------------------------------
-- Planes de Acción Anuales DECE (POA y Estándares de Calidad)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS action_plans (
  id                   TEXT PRIMARY KEY,
  institution_id       TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_id       TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  school_year_text     TEXT NOT NULL,
  students_count       INTEGER NOT NULL DEFAULT 0,
  coordinator_name     TEXT NOT NULL,
  analysts_data        TEXT NOT NULL DEFAULT '[]',
  available_resources  TEXT DEFAULT '',
  items_data           TEXT NOT NULL DEFAULT '[]',
  evaluation_notes     TEXT DEFAULT '',
  elaborated_by        TEXT DEFAULT '',
  reviewed_by          TEXT DEFAULT '',
  approved_by          TEXT DEFAULT '',
  created_by           TEXT REFERENCES users(id),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, school_year_id)
);
CREATE INDEX IF NOT EXISTS idx_action_plans_inst_year ON action_plans(institution_id, school_year_id);

-- ----------------------------------------------------------------------------
-- Fichas de Observación Psicosocial Oficiales MINEDUC (E.D3.C1.DE11.c)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_observation_sheets (
  id                    TEXT PRIMARY KEY,
  case_file_id          TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id        TEXT NOT NULL REFERENCES institutions(id),
  professional_id       TEXT REFERENCES users(id),
  observation_date      TEXT NOT NULL DEFAULT (datetime('now')),
  jornada               TEXT,
  context               TEXT NOT NULL DEFAULT 'ENTREVISTA',
  context_other         TEXT,
  subnivel              TEXT NOT NULL DEFAULT 'SUPERIOR_BACHILLERATO',
  anxious_indicators    TEXT NOT NULL DEFAULT '[]',
  depressive_indicators TEXT NOT NULL DEFAULT '[]',
  suicidal_indicators   TEXT NOT NULL DEFAULT '[]',
  risk_level            TEXT NOT NULL DEFAULT 'MEDIO',
  protective_factors    TEXT NOT NULL DEFAULT '[]',
  institutional_actions TEXT NOT NULL DEFAULT '[]',
  observations          TEXT,
  observation_data      TEXT NOT NULL DEFAULT '{}',
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_obs_sheets_case ON case_observation_sheets(case_file_id);





-- ----------------------------------------------------------------------------
-- Actas de compromiso y corresponsabilidad con representantes legales
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_corresponsibility_acts (
  id                          TEXT PRIMARY KEY,
  case_file_id                TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
  institution_id               TEXT NOT NULL REFERENCES institutions(id),
  
  -- Lugar, fecha y hora
  city                        TEXT NOT NULL DEFAULT 'Ambato',
  act_date                    TEXT NOT NULL,
  act_time                    TEXT,

  -- Datos del Representante Legal
  representative_name         TEXT NOT NULL,
  representative_id_num       TEXT,
  representative_relationship TEXT, -- ej. Madre, Padre, Tutor Legal
  representative_phone        TEXT,
  representative_address      TEXT,

  -- Datos del Estudiante
  student_name                TEXT NOT NULL,
  student_grade               TEXT NOT NULL,
  student_parallel            TEXT,
  jornada                     TEXT, -- MATUTINA / VESPERTINA

  -- Datos del Profesional DECE y Autoridad/Tutor
  dece_professional_name      TEXT NOT NULL,
  dece_professional_id_num    TEXT,
  tutor_authority_name        TEXT,
  tutor_authority_role        TEXT, -- ej. Docente Tutor / Inspector / Rector(a)

  -- Contenido principal
  conflict_type               TEXT NOT NULL DEFAULT 'OTRO',
  detected_difficulty         TEXT NOT NULL,
  legal_framework             TEXT NOT NULL,
  
  -- Acuerdos y compromisos
  commitments_representative  TEXT NOT NULL,
  commitments_dece            TEXT NOT NULL,
  commitments_student         TEXT,

  -- Observaciones adicionales
  observations                TEXT,
  
  created_by                  TEXT REFERENCES users(id),
  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_corresponsibility_acts_case ON case_corresponsibility_acts(case_file_id);
CREATE INDEX IF NOT EXISTS idx_corresponsibility_acts_inst ON case_corresponsibility_acts(institution_id);


-- ----------------------------------------------------------------------------
-- Distributivo de Cobertura DECE (Asignación por Profesional)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dece_distributivos (
  id                   TEXT PRIMARY KEY,
  institution_id       TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_id       TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  school_year_text     TEXT NOT NULL,
  title                TEXT NOT NULL DEFAULT 'Distributivo Institucional de Cobertura DECE',
  coordinator_id       TEXT NOT NULL REFERENCES users(id),
  coordinator_name     TEXT NOT NULL,
  is_active            INTEGER NOT NULL DEFAULT 1,
  elaborated_by_name   TEXT,
  elaborated_by_role   TEXT DEFAULT 'Coordinador/a DECE',
  approved_by_name     TEXT,
  approved_by_role     TEXT DEFAULT 'Rector/a Institucional',
  general_observations TEXT,
  created_by           TEXT REFERENCES users(id),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dece_distributivos_inst ON dece_distributivos(institution_id);
CREATE INDEX IF NOT EXISTS idx_dece_distributivos_year ON dece_distributivos(school_year_id);

CREATE TABLE IF NOT EXISTS dece_distributivo_assignments (
  id                        TEXT PRIMARY KEY,
  distributivo_id           TEXT NOT NULL REFERENCES dece_distributivos(id) ON DELETE CASCADE,
  user_id                   TEXT NOT NULL REFERENCES users(id),
  user_name                 TEXT NOT NULL,
  user_role_label           TEXT NOT NULL DEFAULT 'Profesional DECE',
  jornada                   TEXT NOT NULL DEFAULT 'MATUTINA',
  subniveles                TEXT NOT NULL DEFAULT '[]',
  courses                   TEXT NOT NULL DEFAULT '[]',
  parallels                 TEXT NOT NULL DEFAULT '[]',
  estimated_students_count  INTEGER NOT NULL DEFAULT 0,
  specific_responsibilities TEXT,
  has_enlazada              INTEGER DEFAULT 0,
  enlazada_name             TEXT,
  enlazada_dias             TEXT,
  lunch_schedule            TEXT,
  color                     TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_distributivo_assign_dist ON dece_distributivo_assignments(distributivo_id);
CREATE INDEX IF NOT EXISTS idx_distributivo_assign_user ON dece_distributivo_assignments(user_id);


-- ----------------------------------------------------------------------------
-- Numéricos Institucionales por Curso y Paralelo
-- Permite cargar la estructura de oferta y matrícula cuando no hay listas nominales
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institution_course_quotas (
  id                     TEXT PRIMARY KEY,
  institution_id         TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_id         TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  education_level        TEXT NOT NULL,
  course                 TEXT NOT NULL,
  parallel               TEXT NOT NULL,
  jornada                TEXT NOT NULL DEFAULT 'MATUTINA',
  bachillerato_specialty TEXT,
  student_count          INTEGER NOT NULL DEFAULT 0,
  tutor_name             TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(institution_id, school_year_id, course, parallel, jornada)
);
CREATE INDEX IF NOT EXISTS idx_inst_course_quotas_inst ON institution_course_quotas(institution_id);
CREATE INDEX IF NOT EXISTS idx_inst_course_quotas_year ON institution_course_quotas(school_year_id);

-- ----------------------------------------------------------------------------
-- Informes Técnicos de Juntas de Curso (Trimestral)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_board_reports (
  id                   TEXT PRIMARY KEY,
  institution_id       TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_id       TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  school_year_text     TEXT NOT NULL,
  user_id              TEXT NOT NULL REFERENCES users(id),
  user_name            TEXT NOT NULL,
  user_role_label      TEXT NOT NULL DEFAULT 'ANALISTA DECE',
  user_contact         TEXT,
  user_email           TEXT,
  user_extension       TEXT,
  tutor_name           TEXT NOT NULL,
  tutor_role_label     TEXT NOT NULL DEFAULT 'DOCENTE TUTOR',
  tutor_contact        TEXT,
  tutor_email          TEXT,
  tutor_extension      TEXT,
  report_code          TEXT NOT NULL,
  trimester            TEXT NOT NULL CHECK (trimester IN ('1T', '2T', '3T')),
  course               TEXT NOT NULL,
  parallel             TEXT NOT NULL,
  jornada              TEXT NOT NULL DEFAULT 'MATUTINA',
  report_date          TEXT NOT NULL,
  antecedentes         TEXT NOT NULL,
  alcance              TEXT NOT NULL,
  objetivo             TEXT NOT NULL,
  cases_json           TEXT NOT NULL DEFAULT '[]',
  general_actions      TEXT,
  conclusiones         TEXT NOT NULL,
  recomendaciones      TEXT NOT NULL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jc_reports_inst ON course_board_reports(institution_id);
CREATE INDEX IF NOT EXISTS idx_jc_reports_user ON course_board_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_jc_reports_trim ON course_board_reports(trimester);

CREATE TABLE IF NOT EXISTS annual_management_reports (
  id                             TEXT PRIMARY KEY,
  institution_id                 TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  school_year_id                 TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  school_year_text               TEXT NOT NULL,
  user_id                        TEXT NOT NULL REFERENCES users(id),
  user_name                      TEXT NOT NULL,
  user_role_label                TEXT NOT NULL DEFAULT 'ANALISTA DECE',
  report_type                    TEXT NOT NULL CHECK (report_type IN ('DEPARTAMENTAL', 'INDIVIDUAL')),
  report_code                    TEXT NOT NULL,
  report_date                    TEXT NOT NULL,
  title_topic                    TEXT NOT NULL,
  recipients_json                TEXT NOT NULL DEFAULT '[]',
  professionals_json             TEXT NOT NULL DEFAULT '[]',
  antecedentes_legal             TEXT NOT NULL,
  situational_diagnosis          TEXT NOT NULL,
  distributivo_summary_json      TEXT NOT NULL DEFAULT '[]',
  alcance                        TEXT NOT NULL,
  objetivos                      TEXT NOT NULL,
  counseling_stats_json          TEXT NOT NULL DEFAULT '[]',
  case_typologies_json           TEXT NOT NULL DEFAULT '[]',
  comparative_analysis_json      TEXT NOT NULL DEFAULT '[]',
  psychosocial_note              TEXT NOT NULL,
  prevention_projects_json       TEXT NOT NULL DEFAULT '[]',
  pending_processes              TEXT NOT NULL,
  achievements                   TEXT NOT NULL,
  critical_knots                 TEXT NOT NULL,
  conclusions_counseling         TEXT NOT NULL,
  conclusions_prevention         TEXT NOT NULL,
  conclusions_psychosocial       TEXT NOT NULL,
  conclusions_inclusion          TEXT NOT NULL,
  recommendations_institutional  TEXT NOT NULL,
  recommendations_district       TEXT NOT NULL,
  annexes_notes                  TEXT NOT NULL,
  annex_photos_json              TEXT NOT NULL DEFAULT '[]',
  signatures_json                TEXT NOT NULL DEFAULT '[]',
  created_at                     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ann_mgmt_inst ON annual_management_reports(institution_id);
CREATE INDEX IF NOT EXISTS idx_ann_mgmt_user ON annual_management_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ann_mgmt_year ON annual_management_reports(school_year_id);
CREATE INDEX IF NOT EXISTS idx_ann_mgmt_type ON annual_management_reports(report_type);

-- ----------------------------------------------------------------------------
-- Pasantes y Voluntarios del DECE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interns (
  id                   TEXT PRIMARY KEY,
  institution_id       TEXT NOT NULL REFERENCES institutions(id),
  full_name            TEXT NOT NULL,
  document_id          TEXT NOT NULL,
  email                TEXT,
  phone                TEXT,
  type                 TEXT NOT NULL DEFAULT 'PASANTE' CHECK (type IN ('PASANTE', 'VOLUNTARIO')),
  university_or_origin TEXT NOT NULL,
  career_or_specialty  TEXT,
  tutor_user_id        TEXT REFERENCES users(id),
  tutor_name           TEXT,
  required_hours       INTEGER NOT NULL DEFAULT 160,
  start_date           TEXT NOT NULL,
  end_date             TEXT,
  schedule_type        TEXT DEFAULT 'MATUTINA',
  qr_token             TEXT NOT NULL UNIQUE,
  device_id            TEXT UNIQUE,
  device_name          TEXT,
  device_linked_at     TEXT,
  pin_code             TEXT,
  status               TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO', 'CULMINADO')),
  notes                TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_interns_inst ON interns(institution_id);
CREATE INDEX IF NOT EXISTS idx_interns_qr ON interns(qr_token);
CREATE INDEX IF NOT EXISTS idx_interns_device ON interns(device_id);
CREATE INDEX IF NOT EXISTS idx_interns_status ON interns(institution_id, status);

-- ----------------------------------------------------------------------------
-- Registro de Asistencia (Entrada / Salida) de Pasantes y Voluntarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intern_attendances (
  id              TEXT PRIMARY KEY,
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  intern_id       TEXT NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  check_in_time   TEXT NOT NULL,
  check_out_time  TEXT,
  total_minutes   INTEGER,
  total_hours     REAL,
  activity_notes  TEXT,
  registered_via  TEXT NOT NULL DEFAULT 'QR_MOBILE',
  ip_or_device    TEXT,
  latitude        REAL,
  longitude       REAL,
  distance_meters REAL,
  status          TEXT NOT NULL DEFAULT 'COMPLETADO' CHECK (status IN ('EN_CURSO', 'COMPLETADO', 'JUSTIFICADO')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_intern_att_intern ON intern_attendances(intern_id, date);
CREATE INDEX IF NOT EXISTS idx_intern_att_inst_date ON intern_attendances(institution_id, date);




-- ----------------------------------------------------------------------------
-- Generación de reportes desde plantillas externas (.xlsx, .docx)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_templates (
  id                  TEXT PRIMARY KEY,
  institution_id      TEXT NOT NULL REFERENCES institutions(id),
  name                TEXT NOT NULL,
  file_type           TEXT NOT NULL CHECK (file_type IN ('XLSX', 'XLS', 'DOCX')),
  file_hash           TEXT NOT NULL,
  file_path           TEXT NOT NULL,
  metadata_json       TEXT NOT NULL DEFAULT '{}',
  created_by          TEXT REFERENCES users(id),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rep_templates_hash ON report_templates(file_hash);
CREATE INDEX IF NOT EXISTS idx_rep_templates_inst ON report_templates(institution_id);

CREATE TABLE IF NOT EXISTS report_template_mappings (
  id                  TEXT PRIMARY KEY,
  template_hash       TEXT NOT NULL UNIQUE,
  template_name       TEXT NOT NULL,
  file_type           TEXT NOT NULL,
  mapping_json        TEXT NOT NULL,
  header_row_index    INTEGER NOT NULL DEFAULT 1,
  data_start_row      INTEGER NOT NULL DEFAULT 2,
  sheet_name          TEXT,
  created_by          TEXT REFERENCES users(id),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rep_mappings_hash ON report_template_mappings(template_hash);

CREATE TABLE IF NOT EXISTS report_generation_history (
  id                  TEXT PRIMARY KEY,
  institution_id      TEXT NOT NULL REFERENCES institutions(id),
  template_id         TEXT REFERENCES report_templates(id),
  template_name       TEXT NOT NULL,
  file_type           TEXT NOT NULL,
  filters_json        TEXT NOT NULL DEFAULT '{}',
  records_count       INTEGER NOT NULL DEFAULT 0,
  generated_by        TEXT REFERENCES users(id),
  generated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rep_gen_hist_inst ON report_generation_history(institution_id);

-- ----------------------------------------------------------------------------
-- Delegaciones de Coordinador DECE (permanentes y temporales)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dece_coordinator_delegations (
  id                    TEXT PRIMARY KEY,
  institution_id        TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  original_user_id      TEXT NOT NULL REFERENCES users(id),
  original_user_name    TEXT NOT NULL,
  delegated_user_id     TEXT NOT NULL REFERENCES users(id),
  delegated_user_name   TEXT NOT NULL,
  delegation_type       TEXT NOT NULL CHECK (delegation_type IN ('PERMANENTE','TEMPORAL')),
  reason                TEXT,
  start_date            TEXT NOT NULL,
  end_date              TEXT,
  is_active             INTEGER NOT NULL DEFAULT 1,
  revoked_at            TEXT,
  revoked_by_id         TEXT REFERENCES users(id),
  created_by_id         TEXT NOT NULL REFERENCES users(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_delegations_inst ON dece_coordinator_delegations(institution_id);
CREATE INDEX IF NOT EXISTS idx_delegations_active ON dece_coordinator_delegations(institution_id, is_active);

