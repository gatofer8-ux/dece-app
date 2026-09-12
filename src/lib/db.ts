import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { runMigrations } from "./migrations";
import { recodifyExistingCases } from "./recodifyCases";
import { recodifyExistingReports } from "./recodifyReports";

// Ubicación del archivo de base de datos SQLite.
// Por defecto se guarda en /data/dece.db (pensado para volumen persistente en Docker);
// se puede sobreescribir con la variable de entorno DATABASE_FILE.
const DEFAULT_DB_DIR = path.join(process.cwd(), "data");
export const DB_PATH = process.env.DATABASE_FILE || path.join(DEFAULT_DB_DIR, "dece.db");

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __deceDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  ensureDir(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -64000");
  db.pragma("temp_store = MEMORY");
  db.pragma("mmap_size = 268435456");
  db.pragma("foreign_keys = ON");

  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  // Migraciones ligeras: columnas nuevas agregadas a tablas ya existentes en
  // instalaciones anteriores (CREATE TABLE IF NOT EXISTS no las agrega solo).
  // Cada ALTER se intenta una vez; si la columna ya existe, se ignora el error.
  const safeAddColumn = (table: string, columnDef: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    } catch {
      // La columna ya existe — no hay nada que hacer.
    }
  };
  safeAddColumn("case_actions", "intervention_type TEXT");
  safeAddColumn("institution_course_quotas", "tutor_name TEXT");
  safeAddColumn("dece_distributivo_assignments", "has_enlazada INTEGER DEFAULT 0");
  safeAddColumn("dece_distributivo_assignments", "enlazada_name TEXT");
  safeAddColumn("dece_distributivo_assignments", "enlazada_dias TEXT");
  safeAddColumn("dece_distributivo_assignments", "lunch_schedule TEXT");
  safeAddColumn("dece_distributivo_assignments", "color TEXT");
  safeAddColumn("case_restitution_plans", "prepared_by_email TEXT");
  safeAddColumn("case_restitution_plans", "prepared_by_role TEXT");
  safeAddColumn("case_interviews", "updated_at TEXT");
  safeAddColumn("users", "deleted_at TEXT");
  safeAddColumn("institutions", "deleted_at TEXT");
  safeAddColumn("attachments", "presented_by_role TEXT");
  safeAddColumn("attachments", "presented_by_name TEXT");
  safeAddColumn("attachments", "document_type TEXT");
  safeAddColumn("attachments", "ocr_extracted_at TEXT");

  try {
    db.exec(`
      -- ----------------------------------------------------------------------------
      -- Fichas de Notificación de Alerta DECE (Formato Canónico)
      -- ----------------------------------------------------------------------------
      CREATE TABLE IF NOT EXISTS case_alert_notifications (
        id                                    TEXT PRIMARY KEY,
        case_file_id                          TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
        institution_id                        TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
        
        -- 1. Información del Estudiante
        student_name                          TEXT NOT NULL,
        student_id_num                        TEXT,
        student_birth_date                    TEXT,
        student_age                           TEXT,
        representative_name                   TEXT,
        representative_address                TEXT,
        representative_phone                  TEXT,
        student_grade                         TEXT NOT NULL,
        student_parallel                      TEXT,
        jornada                               TEXT NOT NULL DEFAULT 'MATUTINA',
        docente_tutor                         TEXT,

        -- 2. Aspectos de Dificultad (12 categorías booleanas)
        alerta_inestabilidad_emocional        INTEGER NOT NULL DEFAULT 0,
        alerta_hijo_ppl                       INTEGER NOT NULL DEFAULT 0,
        alerta_trabajo_infantil               INTEGER NOT NULL DEFAULT 0,
        alerta_riesgo_psicosocial             INTEGER NOT NULL DEFAULT 0,
        alerta_movilidad_humana               INTEGER NOT NULL DEFAULT 0,
        alerta_conflictos_intrafamiliares     INTEGER NOT NULL DEFAULT 0,
        alerta_autolesiones_ideacion          INTEGER NOT NULL DEFAULT 0,
        alerta_hostigamiento_academico        INTEGER NOT NULL DEFAULT 0,
        alerta_embarazo_maternidad_paternidad INTEGER NOT NULL DEFAULT 0,
        alerta_posible_dependencia_sustancias INTEGER NOT NULL DEFAULT 0,
        alerta_vulneracion_derechos           INTEGER NOT NULL DEFAULT 0,
        alerta_otros                          INTEGER NOT NULL DEFAULT 0,
        especificar_alerta                    TEXT,

        -- 3. Lugar y fecha / Hechos y antecedentes
        lugar_fecha_hechos                    TEXT,

        -- 4. Preguntas técnicas de Intervención Docente
        intervencion_pregunta_1               TEXT,
        intervencion_pregunta_2               TEXT,
        intervencion_pregunta_3               TEXT,
        intervencion_pregunta_4               TEXT,
        intervencion_pregunta_5               TEXT,

        -- 5. Información de quien notifica la alerta
        notificador_nombre                    TEXT NOT NULL,
        notificador_cargo                     TEXT NOT NULL DEFAULT 'Analista DECE',
        notificador_contacto                  TEXT,
        fecha_entrega_dece                    TEXT NOT NULL,

        created_by                            TEXT REFERENCES users(id),
        created_at                            TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at                            TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_alert_notifications_case ON case_alert_notifications(case_file_id);
      CREATE INDEX IF NOT EXISTS idx_alert_notifications_inst ON case_alert_notifications(institution_id);
    `);
  } catch (e) {
    // table or indexes already exist
  }

  try {
    db.exec(`${"\n-- ----------------------------------------------------------------------------\n-- Actas de compromiso y corresponsabilidad con representantes legales\n-- ----------------------------------------------------------------------------\nCREATE TABLE IF NOT EXISTS case_corresponsibility_acts (\n  id                          TEXT PRIMARY KEY,\n  case_file_id                TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,\n  institution_id               TEXT NOT NULL REFERENCES institutions(id),\n  \n  -- Lugar, fecha y hora\n  city                        TEXT NOT NULL DEFAULT 'Ambato',\n  act_date                    TEXT NOT NULL,\n  act_time                    TEXT,\n\n  -- Datos del Representante Legal\n  representative_name         TEXT NOT NULL,\n  representative_id_num       TEXT,\n  representative_relationship TEXT, -- ej. Madre, Padre, Tutor Legal\n  representative_phone        TEXT,\n  representative_address      TEXT,\n\n  -- Datos del Estudiante\n  student_name                TEXT NOT NULL,\n  student_grade               TEXT NOT NULL,\n  student_parallel            TEXT,\n  jornada                     TEXT, -- MATUTINA / VESPERTINA\n\n  -- Datos del Profesional DECE y Autoridad/Tutor\n  dece_professional_name      TEXT NOT NULL,\n  dece_professional_id_num    TEXT,\n  tutor_authority_name        TEXT,\n  tutor_authority_role        TEXT, -- ej. Docente Tutor / Inspector / Rector(a)\n\n  -- Contenido principal\n  conflict_type               TEXT NOT NULL DEFAULT 'OTRO',\n  detected_difficulty         TEXT NOT NULL,\n  legal_framework             TEXT NOT NULL,\n  \n  -- Acuerdos y compromisos\n  commitments_representative  TEXT NOT NULL,\n  commitments_dece            TEXT NOT NULL,\n  commitments_student         TEXT,\n\n  -- Observaciones adicionales\n  observations                TEXT,\n  \n  created_by                  TEXT REFERENCES users(id),\n  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),\n  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))\n);\nCREATE INDEX IF NOT EXISTS idx_corresponsibility_acts_case ON case_corresponsibility_acts(case_file_id);\nCREATE INDEX IF NOT EXISTS idx_corresponsibility_acts_inst ON case_corresponsibility_acts(institution_id);\n"}`);
  } catch (e) {
    // table or indexes already exist
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS case_closure_reports (
        id                          TEXT PRIMARY KEY,
        case_file_id                TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
        institution_id               TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
        school_year_id              TEXT REFERENCES school_years(id) ON DELETE SET NULL,
        school_year_text            TEXT NOT NULL DEFAULT '2024 - 2025',
        report_date                 TEXT NOT NULL,
        report_number               TEXT NOT NULL,
        closure_type                TEXT NOT NULL DEFAULT 'FINALIZACION_ANO_LECTIVO',
        dece_user_id                TEXT REFERENCES users(id),
        dece_name                   TEXT NOT NULL,
        dece_role                   TEXT NOT NULL DEFAULT 'PROFESIONAL DECE INSTITUCIONAL',
        dece_phone_ext              TEXT,
        dece_email                  TEXT,
        authority_name              TEXT NOT NULL,
        authority_role              TEXT NOT NULL DEFAULT 'AUTORIDAD INSTITUCIONAL',
        authority_phone_ext         TEXT,
        authority_email             TEXT,
        topic                       TEXT NOT NULL,
        closure_reasons             TEXT NOT NULL,
        legal_framework             TEXT NOT NULL,
        scope                       TEXT NOT NULL,
        objective                   TEXT NOT NULL,
        student_name                TEXT NOT NULL,
        student_id_num              TEXT,
        student_age                 INTEGER,
        student_birth_date          TEXT,
        student_grade               TEXT NOT NULL,
        student_parallel            TEXT,
        student_section             TEXT NOT NULL DEFAULT 'MATUTINA',
        student_address             TEXT,
        student_address_ref         TEXT,
        rep_name                    TEXT,
        rep_id_num                  TEXT,
        rep_phone                   TEXT,
        activities_counseling       TEXT,
        activities_prevention       TEXT,
        activities_psychosocial     TEXT,
        activities_inclusion        TEXT,
        bimonthly_summary_json      TEXT NOT NULL DEFAULT '[]',
        methodology                 TEXT NOT NULL,
        conclusions                 TEXT NOT NULL,
        recommendations             TEXT NOT NULL,
        elaborated_by_name          TEXT NOT NULL,
        elaborated_by_role          TEXT NOT NULL DEFAULT 'ANALISTA DECE',
        elaborated_date             TEXT NOT NULL,
        reviewed_by_name            TEXT NOT NULL,
        reviewed_by_role            TEXT NOT NULL DEFAULT 'COORDINADORA DECE INSTITUCIONAL',
        reviewed_date               TEXT NOT NULL,
        approved_by_name            TEXT NOT NULL,
        approved_by_role            TEXT NOT NULL DEFAULT 'RECTOR (E) DE LA UNIDAD EDUCATIVA',
        approved_date               TEXT NOT NULL,
        annexes_notes               TEXT,
        created_by                  TEXT REFERENCES users(id),
        created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_case_closure_case ON case_closure_reports(case_file_id);
      CREATE INDEX IF NOT EXISTS idx_case_closure_inst ON case_closure_reports(institution_id);
    `);
  } catch (e) {
    // table or indexes already exist
  }
  
  safeAddColumn("case_actions", "observations TEXT");

  safeAddColumn("case_corresponsibility_acts", "signatures_json TEXT DEFAULT '[]'");
  safeAddColumn("case_corresponsibility_acts", "signature_type TEXT DEFAULT 'PENDIENTE'");
  safeAddColumn("case_corresponsibility_acts", "physical_file_ref TEXT");
  safeAddColumn("case_corresponsibility_acts", "physical_evidence_url TEXT");

  safeAddColumn("restorative_circle_consents", "signatures_json TEXT DEFAULT '[]'");
  safeAddColumn("restorative_circle_consents", "signature_type TEXT DEFAULT 'PENDIENTE'");
  safeAddColumn("restorative_circle_consents", "physical_file_ref TEXT");
  safeAddColumn("restorative_circle_consents", "physical_evidence_url TEXT");

  safeAddColumn("socialization_acts", "signatures_json TEXT DEFAULT '[]'");
  safeAddColumn("socialization_acts", "signature_type TEXT DEFAULT 'PENDIENTE'");
  safeAddColumn("socialization_acts", "physical_file_ref TEXT");
  safeAddColumn("socialization_acts", "physical_evidence_url TEXT");

  safeAddColumn("authority_advisory_acts", "signatures_json TEXT DEFAULT '[]'");
  safeAddColumn("authority_advisory_acts", "signature_type TEXT DEFAULT 'PENDIENTE'");
  safeAddColumn("authority_advisory_acts", "physical_file_ref TEXT");
  safeAddColumn("authority_advisory_acts", "physical_evidence_url TEXT");

  safeAddColumn("dece_esquelas", "physical_file_ref TEXT");
  safeAddColumn("dece_esquelas", "physical_evidence_url TEXT");

  safeAddColumn("referrals", "destination_detail TEXT");
  safeAddColumn("referrals", "background_summary TEXT");
  safeAddColumn("referrals", "actions_taken TEXT");
  safeAddColumn("referrals", "care_type_required TEXT");
  safeAddColumn("referrals", "observations TEXT");
  safeAddColumn("referrals", "elaborated_by_name TEXT");
  safeAddColumn("referrals", "received_by TEXT");
  safeAddColumn("referrals", "authority_name TEXT");
  safeAddColumn("referrals", "student_age TEXT");
  safeAddColumn("referrals", "student_disability TEXT");
  safeAddColumn("referrals", "student_nationality TEXT");
  safeAddColumn("referrals", "representative_document_id TEXT");
  safeAddColumn("referrals", "signatures_json TEXT DEFAULT '[]'");
  safeAddColumn("referrals", "signature_type TEXT DEFAULT 'PENDIENTE'");
  safeAddColumn("referrals", "physical_file_ref TEXT");
  safeAddColumn("referrals", "physical_evidence_url TEXT");

  safeAddColumn("case_interviews", "signatures_json TEXT DEFAULT '[]'");
  safeAddColumn("case_interviews", "signature_type TEXT DEFAULT 'PENDIENTE'");
  safeAddColumn("case_interviews", "physical_file_ref TEXT");
  safeAddColumn("case_interviews", "physical_evidence_url TEXT");

  safeAddColumn("institutions", "seal_image TEXT");
  safeAddColumn("institutions", "zona TEXT");

  safeAddColumn("students", "ethnicity TEXT");
  safeAddColumn("students", "nationality TEXT");
  safeAddColumn("students", "created_by_id TEXT");

  safeAddColumn("violence_reports", "perpetrator_document_id TEXT");
  safeAddColumn("violence_reports", "perpetrator_gender TEXT");
  safeAddColumn("violence_reports", "analyst_role TEXT DEFAULT 'ANALISTA DECE'");

  safeAddColumn("appointments", "requester_email TEXT");
  safeAddColumn("appointments", "reminder_24h_sent INTEGER NOT NULL DEFAULT 0");
  safeAddColumn("appointments", "reminder_1h_sent INTEGER NOT NULL DEFAULT 0");

  // Ficha del estudiante ampliada (ronda 17) — ver db/schema.sql para el detalle completo
  safeAddColumn("students", "birth_country TEXT");
  safeAddColumn("students", "birth_province TEXT");
  safeAddColumn("students", "birth_canton TEXT");
  safeAddColumn("students", "birth_parish TEXT");
  safeAddColumn("students", "jornada TEXT");
  safeAddColumn("students", "education_level TEXT");
  safeAddColumn("students", "bachillerato_specialty TEXT");
  safeAddColumn("students", "neighborhood TEXT");
  safeAddColumn("students", "lives_with TEXT");
  safeAddColumn("students", "lives_with_other TEXT");
  safeAddColumn("students", "leaves_alone_authorized INTEGER");
  safeAddColumn("students", "legal_guardian TEXT");
  safeAddColumn("students", "father_name TEXT");
  safeAddColumn("students", "father_document_id TEXT");
  safeAddColumn("students", "father_education TEXT");
  safeAddColumn("students", "father_address TEXT");
  safeAddColumn("students", "father_phone TEXT");
  safeAddColumn("students", "father_occupation TEXT");
  safeAddColumn("students", "father_workplace TEXT");
  safeAddColumn("students", "mother_name TEXT");
  safeAddColumn("students", "mother_document_id TEXT");
  safeAddColumn("students", "mother_education TEXT");
  safeAddColumn("students", "mother_address TEXT");
  safeAddColumn("students", "mother_phone TEXT");
  safeAddColumn("students", "mother_occupation TEXT");
  safeAddColumn("students", "mother_workplace TEXT");
  safeAddColumn("students", "representative_document_id TEXT");
  safeAddColumn("students", "representative_education TEXT");
  safeAddColumn("students", "representative_address TEXT");
  safeAddColumn("students", "representative_occupation TEXT");
  safeAddColumn("students", "representative_workplace TEXT");
  safeAddColumn("students", "nee_types TEXT NOT NULL DEFAULT '[]'");
  safeAddColumn("students", "disability_card_detail TEXT");
  safeAddColumn("students", "medical_condition TEXT");
  safeAddColumn("students", "medical_allergies TEXT");
  safeAddColumn("students", "medical_medication_intolerance TEXT");
  safeAddColumn("students", "medical_food_intolerance TEXT");

  // Disponibilidad de horarios por profesional (ronda 20)
  safeAddColumn("appointment_requests", "professional_id TEXT REFERENCES users(id)");
  safeAddColumn("users", "coverage_courses TEXT");
  safeAddColumn("users", "job_title TEXT");
  safeAddColumn("professional_schedule_slots", "activity_type TEXT");
  safeAddColumn("professional_schedule_slots", "activity_title TEXT");

  // Temática de prevención (ronda 21) — catálogo oficial del Acuerdo
  // MINEDEC-MINEDEC-2026-00044-A, para actividades con eje "Prevención".
  safeAddColumn("activities", "prevention_theme TEXT");

  // Archivos adjuntos
  safeAddColumn("attachments", "institution_id TEXT REFERENCES institutions(id)");
  safeAddColumn("attachments", "uploaded_by_id TEXT REFERENCES users(id)");

  // Años Lectivos (Períodos Escolares) — vinculación de registros a ciclos académicos
  safeAddColumn("case_files", "school_year_id TEXT REFERENCES school_years(id)");
  safeAddColumn("appointments", "school_year_id TEXT REFERENCES school_years(id)");
  safeAddColumn("teacher_alerts", "school_year_id TEXT REFERENCES school_years(id)");
  safeAddColumn("activities", "school_year_id TEXT REFERENCES school_years(id)");
  safeAddColumn("daily_attentions", "school_year_id TEXT REFERENCES school_years(id)");
  safeAddColumn("situational_reports", "reviewer_name TEXT");
  safeAddColumn("situational_reports", "reviewer_role TEXT");
    safeAddColumn("situational_reports", "legal_basis TEXT");
    safeAddColumn("socialization_acts", "normative_text TEXT");
    safeAddColumn("socialization_acts", "psychosocial_strategies TEXT");

  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_case_files_year ON case_files(school_year_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_appointments_year ON appointments(school_year_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_alerts_year ON teacher_alerts(school_year_id)");

    // Módulo de Chat y Mensajería Interna
    db.exec(`
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

      CREATE TABLE IF NOT EXISTS case_closure_reports (
        id                       TEXT PRIMARY KEY,
        case_file_id             TEXT NOT NULL REFERENCES case_files(id) ON DELETE CASCADE,
        institution_id           TEXT NOT NULL REFERENCES institutions(id),
        school_year_id           TEXT REFERENCES school_years(id),
        school_year_text         TEXT NOT NULL,
        report_date              TEXT NOT NULL,
        report_number            TEXT NOT NULL,
        closure_type             TEXT NOT NULL DEFAULT 'FINALIZACION_ANO_LECTIVO' 
                                 CHECK (closure_type IN ('FINALIZACION_ANO_LECTIVO', 'CIERRE_POR_GRADUACION', 'CIERRE_POR_TRASLADO')),
        
        dece_user_id             TEXT REFERENCES users(id),
        dece_name                TEXT NOT NULL,
        dece_role                TEXT NOT NULL DEFAULT 'PROFESIONAL DECE INSTITUCIONAL',
        dece_phone_ext           TEXT,
        dece_email               TEXT,
        
        authority_name           TEXT NOT NULL,
        authority_role           TEXT NOT NULL DEFAULT 'AUTORIDAD INSTITUCIONAL',
        authority_phone_ext      TEXT,
        authority_email          TEXT,
        
        topic                    TEXT NOT NULL,
        closure_reasons          TEXT NOT NULL,
        legal_framework          TEXT NOT NULL,
        scope                    TEXT NOT NULL,
        objective                TEXT NOT NULL,
        
        student_name             TEXT NOT NULL,
        student_id_num           TEXT,
        student_age              INTEGER,
        student_birth_date       TEXT,
        student_grade            TEXT NOT NULL,
        student_parallel         TEXT,
        student_section          TEXT,
        student_address          TEXT,
        student_address_ref      TEXT,
        rep_name                 TEXT,
        rep_id_num               TEXT,
        rep_phone                TEXT,
        
        activities_counseling    TEXT,
        activities_prevention    TEXT,
        activities_psychosocial  TEXT,
        activities_inclusion     TEXT,
        bimonthly_summary_json   TEXT NOT NULL DEFAULT '[]',
        
        methodology              TEXT NOT NULL,
        conclusions              TEXT NOT NULL,
        recommendations          TEXT NOT NULL,
        
        elaborated_by_name       TEXT NOT NULL,
        elaborated_by_role       TEXT NOT NULL DEFAULT 'ANALISTA DECE',
        elaborated_date          TEXT NOT NULL,
        reviewed_by_name         TEXT NOT NULL,
        reviewed_by_role         TEXT NOT NULL DEFAULT 'COORDINADORA DECE INSTITUCIONAL',
        reviewed_date            TEXT NOT NULL,
        approved_by_name         TEXT NOT NULL,
        approved_by_role         TEXT NOT NULL DEFAULT 'RECTOR (E) DE LA UNIDAD EDUCATIVA',
        approved_date            TEXT NOT NULL,
        
        annexes_notes            TEXT,
        
        created_by               TEXT REFERENCES users(id),
        created_at               TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_case_closure_case ON case_closure_reports(case_file_id);
      CREATE INDEX IF NOT EXISTS idx_case_closure_inst ON case_closure_reports(institution_id);

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

      CREATE TABLE IF NOT EXISTS restorative_circle_consents (
        id                       TEXT PRIMARY KEY,
        institution_id           TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
        school_year_id           TEXT REFERENCES school_years(id) ON DELETE SET NULL,
        case_file_id             TEXT REFERENCES case_files(id) ON DELETE CASCADE,
        student_id               TEXT REFERENCES students(id) ON DELETE SET NULL,
        
        student_name             TEXT NOT NULL,
        course_parallel          TEXT NOT NULL,
        course_parallel_full     TEXT NOT NULL,
        course_parallel_short    TEXT NOT NULL,
        shift                    TEXT NOT NULL,
        representative_phone     TEXT,
        consent_date             TEXT NOT NULL,
        
        representative_name      TEXT,
        representative_ci        TEXT,
        
        dece_user_id             TEXT REFERENCES users(id) ON DELETE SET NULL,
        dece_name                TEXT NOT NULL,
        dece_role                TEXT NOT NULL DEFAULT 'Profesional DECE',
        
        created_by               TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at               TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_circle_consents_inst ON restorative_circle_consents(institution_id);
      CREATE INDEX IF NOT EXISTS idx_circle_consents_case ON restorative_circle_consents(case_file_id);
      CREATE INDEX IF NOT EXISTS idx_circle_consents_student ON restorative_circle_consents(student_id);
    `);


    try {
      db.exec(`ALTER TABLE case_observation_sheets ADD COLUMN observation_data TEXT DEFAULT '{}'`);
    } catch {
      // ya existe la columna
    }

    try {
      db.exec(`
        INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, intervention_type, observations)
        SELECT 
          lower(hex(randomblob(16))),
          a.case_file_id,
          COALESCE(a.created_by, (SELECT id FROM users WHERE institution_id = a.institution_id LIMIT 1)),
          COALESCE(a.act_date, date('now')),
          'Acta de compromiso y corresponsabilidad',
          'Acta de compromiso y corresponsabilidad suscrita con ' || a.representative_name || ' (' || COALESCE(a.representative_relationship, 'Representante legal') || '). Dificultad: ' || substr(a.detected_difficulty, 1, 160),
          'Acuerdo de corresponsabilidad',
          a.observations
        FROM case_corresponsibility_acts a
        WHERE NOT EXISTS (
          SELECT 1 FROM case_actions ca 
          WHERE ca.case_file_id = a.case_file_id 
            AND (ca.type = 'Acta de compromiso y corresponsabilidad' OR ca.type = 'Acta de compromiso')
            AND ca.description LIKE '%' || a.representative_name || '%'
        );
      `);
    } catch {
      // ignorar si no existe la tabla aún
    }
  } catch {
    // ignorar si fallan los índices en caliente
  }

  
    try {
      db.exec(`
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
  schedule_details     TEXT,
  expected_entry_time  TEXT,
  expected_exit_time   TEXT,
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
  status          TEXT NOT NULL DEFAULT 'COMPLETADO' CHECK (status IN ('EN_CURSO', 'COMPLETADO', 'JUSTIFICADO')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_intern_att_intern ON intern_attendances(intern_id, date);
CREATE INDEX IF NOT EXISTS idx_intern_att_inst_date ON intern_attendances(institution_id, date);
`);
    } catch {
      // tables already exist
    }

    try {
      db.exec(`
        ALTER TABLE interns ADD COLUMN device_id TEXT;
        ALTER TABLE interns ADD COLUMN device_name TEXT;
        ALTER TABLE interns ADD COLUMN device_linked_at TEXT;
        ALTER TABLE interns ADD COLUMN pin_code TEXT;
        CREATE INDEX IF NOT EXISTS idx_interns_device ON interns(device_id);
      `);
    } catch {
      // columns may already exist
    }

    try {
      db.exec(`
        ALTER TABLE institutions ADD COLUMN latitude REAL;
        ALTER TABLE institutions ADD COLUMN longitude REAL;
        ALTER TABLE institutions ADD COLUMN geofence_radius_meters INTEGER DEFAULT 250;
        ALTER TABLE institutions ADD COLUMN require_geolocation INTEGER DEFAULT 1;
        ALTER TABLE institutions ADD COLUMN daily_attendance_code TEXT;
        ALTER TABLE institutions ADD COLUMN daily_code_date TEXT;
      `);
    } catch {
      // columns may already exist
    }

    try {
      db.exec(`
        ALTER TABLE intern_attendances ADD COLUMN latitude REAL;
        ALTER TABLE intern_attendances ADD COLUMN longitude REAL;
        ALTER TABLE intern_attendances ADD COLUMN distance_meters REAL;
      `);
    } catch {
      // columns may already exist
    }

    try {
      db.exec(`
        ALTER TABLE interns ADD COLUMN schedule_details TEXT;
        ALTER TABLE interns ADD COLUMN expected_entry_time TEXT;
        ALTER TABLE interns ADD COLUMN expected_exit_time TEXT;
      `);
    } catch {
      // columns may already exist
    }
  
  
    try {
      db.exec(`
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
`);
    } catch (e) {
      // tables already exist
    }

  // Migraciones incrementales nuevas (ver src/lib/migrations.ts y /migrations).
  // Se apilan sobre el bloque legado de arriba; cada archivo se aplica una vez.
  try {
    runMigrations(db, path.join(process.cwd(), "migrations"));
  } catch (err) {
    console.error("[db] Error aplicando migraciones incrementales:", err);
    throw err;
  }

  // Recodifica una sola vez los casos con el formato antiguo (DECE-AAAA-NNNN)
  // al nuevo SIGLAS-DOCUMENTO-AÑO-NN. Idempotente.
  try {
    recodifyExistingCases(db);
  } catch (err) {
    console.error("[db] Error recodificando casos existentes:", err);
  }

  // Recodifica retroactivamente e idempotente todos los informes DECE existentes
  // al formato oficial: Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-001
  try {
    recodifyExistingReports(db);
  } catch (err) {
    console.error("[db] Error recodificando informes existentes:", err);
  }

  return db;
}

// Reutilizamos la conexión entre recargas en desarrollo (hot reload de Next.js)
export const db: Database.Database = global.__deceDb || createConnection();
if (process.env.NODE_ENV !== "production") {
  global.__deceDb = db;
}
