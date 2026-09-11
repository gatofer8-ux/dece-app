export type Role = "SUPERADMIN" | "DISTRITO" | "ADMIN" | "DECE" | "AUTORIDAD" | "DOCENTE";

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Superadministrador General",
  DISTRITO: "Distrito educativo",
  ADMIN: "Administrador / Coordinador DECE",
  DECE: "Profesional DECE",
  AUTORIDAD: "Autoridad institucional",
  DOCENTE: "Docente tutor",
};

export interface CoordinatorDelegationRow {
  id: string;
  institution_id: string;
  original_user_id: string;
  original_user_name: string;
  delegated_user_id: string;
  delegated_user_name: string;
  delegation_type: "PERMANENTE" | "TEMPORAL";
  reason: string | null;
  start_date: string;
  end_date: string | null;
  is_active: number;
  revoked_at: string | null;
  revoked_by_id: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export type CaseStatus = "ABIERTO" | "EN_SEGUIMIENTO" | "DERIVADO" | "CERRADO";
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  ABIERTO: "Abierto",
  EN_SEGUIMIENTO: "En seguimiento",
  DERIVADO: "Derivado",
  CERRADO: "Cerrado",
};

export type CasePriority = "ALTA" | "MEDIA" | "BAJA";
export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

export type ActionAxis = "PROMOCION" | "PREVENCION" | "ATENCION" | "SEGUIMIENTO";
export const ACTION_AXIS_LABELS: Record<ActionAxis, string> = {
  PROMOCION: "Promoción",
  PREVENCION: "Prevención",
  ATENCION: "Atención",
  SEGUIMIENTO: "Seguimiento",
};

export type RiskType =
  | "VIOLENCIA_INTRAFAMILIAR"
  | "VIOLENCIA_ESCOLAR_BULLYING"
  | "VIOLENCIA_SEXUAL"
  | "CONSUMO_SUSTANCIAS"
  | "SALUD_MENTAL"
  | "EMBARAZO_ADOLESCENTE"
  | "VULNERACION_DERECHOS"
  | "DIFICULTAD_APRENDIZAJE"
  | "CONFLICTO_FAMILIAR"
  | "CONECTIVIDAD_ACCESO_EDUCATIVO"
  | "OTRO";

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  VIOLENCIA_INTRAFAMILIAR: "Violencia intrafamiliar",
  VIOLENCIA_ESCOLAR_BULLYING: "Violencia escolar / acoso (bullying)",
  VIOLENCIA_SEXUAL: "Violencia sexual",
  CONSUMO_SUSTANCIAS: "Consumo de sustancias",
  SALUD_MENTAL: "Salud mental",
  EMBARAZO_ADOLESCENTE: "Embarazo adolescente",
  VULNERACION_DERECHOS: "Vulneración de derechos",
  DIFICULTAD_APRENDIZAJE: "Dificultad de aprendizaje",
  CONFLICTO_FAMILIAR: "Conflicto familiar",
  CONECTIVIDAD_ACCESO_EDUCATIVO: "Acceso/conectividad educativa",
  OTRO: "Otro",
};

export type ReferralScope = "INTERNA" | "EXTERNA";
export type ReferralStatus = "PENDIENTE" | "EN_PROCESO" | "RESPONDIDA" | "CERRADA";
export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  RESPONDIDA: "Respondida",
  CERRADA: "Cerrada",
};

export type AppointmentStatus = "PROGRAMADA" | "ATENDIDA" | "NO_ASISTIO" | "CANCELADA";
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PROGRAMADA: "Programada",
  ATENDIDA: "Atendida",
  NO_ASISTIO: "No asistió",
  CANCELADA: "Cancelada",
};

export type ActivityAxis = "PROMOCION" | "PREVENCION" | "CONVIVENCIA";
export const ACTIVITY_AXIS_LABELS: Record<ActivityAxis, string> = {
  PROMOCION: "Promoción de derechos",
  PREVENCION: "Prevención de riesgos",
  CONVIVENCIA: "Convivencia armónica",
};

// Temáticas de prevención universal, según el Acuerdo Ministerial
// MINEDEC-MINEDEC-2026-00044-A (Normativa que regula el acompañamiento con
// enfoque integral de niñas, niños y adolescentes). Se usan en actividades
// cuyo eje es "Prevención de riesgos".
export const PREVENTION_THEME_OPTIONS: { value: string; label: string }[] = [
  { value: "SOCIOEMOCIONAL", label: "Educación socioemocional" },
  { value: "DROGAS", label: "Prevención del uso y consumo de drogas" },
  { value: "CONVIVENCIA_PAZ", label: "Convivencia pacífica y cultura de paz" },
  { value: "ACOSO_CIBERACOSO", label: "Prevención del acoso escolar y ciberacoso" },
  { value: "SUICIDIO", label: "Prevención del suicidio e intentos autolíticos" },
  { value: "VIOLENCIA", label: "Prevención de violencia física, psicológica y sexual" },
  { value: "SALUD_MENTAL", label: "Promoción de la salud mental" },
  { value: "INCLUSION_DIVERSIDAD", label: "Educación para la inclusión y valoración de la diversidad" },
  { value: "PARTICIPACION_PARES", label: "Participación estudiantil y apoyo entre pares" },
  { value: "VINCULO_FAMILIAS", label: "Fortalecimiento del vínculo entre familias e institución educativa" },
  { value: "EMBARAZO_ADOLESCENTE", label: "Prevención del embarazo adolescente" },
  { value: "ENEIS", label: "Estrategia Nacional de Educación Integral en Sexualidad (ENEIS)" },
];

export function preventionThemeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return PREVENTION_THEME_OPTIONS.find((o) => o.value === value)?.label || value;
}

export type AlertStatus = "PENDIENTE" | "EN_REVISION" | "CONVERTIDA_EN_CASO" | "DESCARTADA";
export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  CONVERTIDA_EN_CASO: "Convertida en caso",
  DESCARTADA: "Descartada",
};

export interface InstitutionRow {
  id: string;
  name: string;
  amie_code: string | null;
  acronym?: string | null;
  district: string | null;
  circuit: string | null;
  zona: string | null;
  address: string | null;
  seal_image: string | null;
  rector_title?: string | null;
  rector_name?: string | null;
  rector_role?: string | null;
  dece_coordinator_title?: string | null;
  dece_coordinator_name?: string | null;
  institution_phone?: string | null;
  mineduc_code?: string | null;
  zone_code?: string | null;
  district_code?: string | null;
  dece_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_meters?: number | null;
  require_geolocation?: number | null;
  daily_attendance_code?: string | null;
  daily_code_date?: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  institution_id: string | null;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  active: number;
  phone: string | null;
  document_id?: string | null;
  title_prefix?: string | null;
  phone_ext?: string | null;
  professional_code?: string | null;
  coverage_courses?: string | null;
  job_title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentRow {
  id: string;
  institution_id: string;
  full_name: string;
  document_id: string | null;
  document_type?: "CEDULA" | "PASAPORTE" | "OTRO" | null;
  birth_date: string | null;
  gender: string | null;
  course: string;
  parallel: string | null;
  representative: string | null;
  rep_phone: string | null;
  rep_email: string | null;
  address: string | null;
  ethnicity: string | null;
  nationality: string | null;
  active: number;
  notes: string | null;

  birth_country: string | null;
  birth_province: string | null;
  birth_canton: string | null;
  birth_parish: string | null;
  jornada: string | null;
  education_level: string | null;
  bachillerato_specialty: string | null;
  neighborhood: string | null;
  lives_with: string | null;
  lives_with_other: string | null;
  leaves_alone_authorized: number | null;

  legal_guardian: string | null;
  father_name: string | null;
  father_document_id: string | null;
  father_education: string | null;
  father_address: string | null;
  father_phone: string | null;
  father_occupation: string | null;
  father_workplace: string | null;
  mother_name: string | null;
  mother_document_id: string | null;
  mother_education: string | null;
  mother_address: string | null;
  mother_phone: string | null;
  mother_occupation: string | null;
  mother_workplace: string | null;
  representative_document_id: string | null;
  representative_education: string | null;
  representative_address: string | null;
  representative_occupation: string | null;
  representative_workplace: string | null;

  nee_types: string;
  disability_card_detail: string | null;

  medical_condition: string | null;
  medical_allergies: string | null;
  medical_medication_intolerance: string | null;
  medical_food_intolerance: string | null;

  created_at: string;
  updated_at: string;
}

export interface CaseFileRow {
  id: string;
  institution_id: string;
  code: string;
  legacy_code?: string | null;
  student_id: string;
  opened_by_id: string;
  assigned_to_id: string | null;
  status: CaseStatus;
  priority: CasePriority;
  action_axis: ActionAxis;
  risk_type: RiskType;
  risk_type_other: string | null;
  detection_date: string;
  detection_source: string | null;
  description: string;
  confidential: number;
  closed_at: string | null;
  closure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseActionRow {
  id: string;
  case_file_id: string;
  author_id: string;
  date: string;
  type: string;
  description: string;
  intervention_type: string | null;
  observations: string | null;
  created_at: string;
}

export type ChecklistCategory = "VIOLENCIA_SEXUAL" | "VIOLENCIA_NO_SEXUAL" | "ATENCION_PSICOSOCIAL";
export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  VIOLENCIA_SEXUAL: "Casos de violencia sexual",
  VIOLENCIA_NO_SEXUAL: "Casos de violencia (todo tipo, no sexual)",
  ATENCION_PSICOSOCIAL: "Atención psicosocial",
};

export type ChecklistStatus = "SI" | "NO";

export interface CaseChecklistItemRow {
  id: string;
  case_file_id: string;
  category: ChecklistCategory;
  item_order: number;
  item_text: string;
  status: ChecklistStatus | null;
  observations: string | null;
  attachment_id: string | null;
  updated_at: string;
}

export interface CaseChecklistReviewRow {
  id: string;
  case_file_id: string;
  role_label: string;
  full_name: string | null;
  signed_date: string | null;
}

export const INTERVENTION_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual",
  FAMILIAR: "Familiar",
  GRUPAL: "Grupal",
  CRISIS: "En crisis",
};

export interface CaseInterviewRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  interviewee_full_name: string | null;
  interviewee_cedula: string | null;
  course: string | null;
  age: string | null;
  application_date: string | null;
  family_relation: string | null;
  emotional_state: string | null;
  social_relations: string | null;
  bullying_history: number;
  academic_history: string | null;
  summary: string | null;
  recommendations: string | null;
  commitment: string | null;
  representative_name: string | null;
  professional_id: string | null;
  created_at: string;
}

export type ObservationContext = "AULA" | "ENTREVISTA" | "OTRO";
export type ObservationSubnivel = "ELEMENTAL" | "BASICA_MEDIA" | "SUPERIOR_BACHILLERATO";
export type ObservationRiskLevel = "BAJO" | "MEDIO" | "ALTO" | "CRITICO";

export interface OfficialObservationQuestionItem {
  id: number;
  question: string;
  answer: "SI" | "NO" | "";
  comment: string;
}

export interface OfficialObservationData {
  duration: string;
  is_aulica: boolean;
  is_externa: boolean;
  questions: OfficialObservationQuestionItem[];
  care_types: {
    requires_dece: { answer: "SI" | "NO" | ""; detail: string };
    requires_other: { answer: "SI" | "NO" | ""; detail: string };
  };
  referrals: {
    internal: {
      answer: "SI" | "NO" | "";
      inspeccion: boolean;
      inclusion: boolean;
      medico: boolean;
      otro: boolean;
      otro_detail: string;
    };
    external: {
      answer: "SI" | "NO" | "";
      medica: boolean;
      psicologica: boolean;
      udai: boolean;
      otro: boolean;
      otro_detail: string;
    };
  };
  professional_name: string;
  application_date: string;
}

export interface CaseObservationSheetRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  professional_id: string | null;
  observation_date: string;
  jornada: string | null;
  context: ObservationContext;
  context_other: string | null;
  subnivel: ObservationSubnivel;
  anxious_indicators: string;
  depressive_indicators: string;
  suicidal_indicators: string;
  risk_level: ObservationRiskLevel;
  protective_factors: string;
  institutional_actions: string;
  observations: string | null;
  observation_data?: string; // JSON OfficialObservationData
  created_at: string;
}

export interface InterventionPlanRow {
  id: string;
  case_file_id: string;
  responsible_id: string;
  objective: string;
  actions: string;
  start_date: string;
  end_date: string | null;
  status: "EN_CURSO" | "CUMPLIDO" | "INCUMPLIDO";
  created_at: string;
  updated_at: string;
}

export interface ReferralRow {
  id: string;
  case_file_id: string;
  created_by_id: string;
  scope: ReferralScope;
  institution: string;
  reason: string;
  informed_consent: number;
  consent_signed_by: string | null;
  referral_date: string;
  status: ReferralStatus;
  response_notes: string | null;
  follow_up_date: string | null;
  destination_detail: string | null;
  background_summary: string | null;
  current_situation_history: string | null;
  actions_taken: string | null;
  care_type_required: string | null;
  observations: string | null;
  elaborated_by_name: string | null;
  received_by: string | null;
  authority_name: string | null;
  student_age: string | null;
  student_disability: string | null;
  student_nationality: string | null;
  representative_document_id: string | null;
  district_office_label: string | null;
  created_at: string;
  updated_at: string;
}

export type CarePlanStatus = "EN_CURSO" | "CUMPLIDO" | "SUSPENDIDO";
export const CARE_PLAN_STATUS_LABELS: Record<CarePlanStatus, string> = {
  EN_CURSO: "En curso",
  CUMPLIDO: "Cumplido",
  SUSPENDIDO: "Suspendido",
};

export interface CaseCarePlanRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  professional_id: string | null;
  plan_date: string;
  jornada: string | null;
  tutor_name: string | null;
  diagnosis_summary: string;
  intervention_types: string; // JSON string[]
  actions: string; // JSON {accion, profesional, tiempo, observaciones}[]
  status: CarePlanStatus;
  created_at: string;
  updated_at: string;
}

export interface CaseCallLogRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  caller_id: string | null;
  call_date: string;
  contact_name: string | null;
  contact_relation: string | null;
  phone_number: string | null;
  reason: string;
  result: string | null;
  follow_up_needed: number;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface CaseCareFollowupRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  professional_id: string | null;
  intervention_type: string; // INDIVIDUAL/FAMILIAR/GRUPAL/CRISIS
  description: string;
  session_date: string;
  observations: string | null;
  created_at: string;
}

export interface CaseAdvisoryLogRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  professional_id: string | null;
  log_date: string;
  tutor_name: string;
  jornada: string | null;
  difficulty_detected: string;
  advice_given: string;
  created_at: string;
}

export interface ViolenceReportRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  report_number: string | null;
  report_date: string;
  dece_professional_name: string | null;
  representative_relationship: string | null;
  perpetrator_name: string | null;
  perpetrator_birth_date: string | null;
  perpetrator_age: string | null;
  perpetrator_document_id: string | null;
  perpetrator_gender: string | null;
  perpetrator_relationship: string | null;
  informant_name: string | null;
  informant_id_number: string | null;
  informant_role: string | null;
  incident_date: string | null;
  incident_place: string | null;
  violence_types: string; // JSON string[]
  violence_modalities: string; // JSON string[]
  violence_modality_other: string | null;
  summary: string | null;
  observations: string | null;
  analyst_name: string | null;
  analyst_role?: string | null;
  rectora_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocializationActRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  act_date: string;
  act_place: string | null;
  vulnerability_type: string;
  curricular_adaptation_grade: string | null;
  agreements: string; // JSON string[]
  normative_text: string | null;
  psychosocial_strategies: string | null;
  teacher_signatures: string; // JSON {asignatura, docente}[]
  prepared_by_name: string | null;
  approved_by_name: string | null;
  received_by_name: string | null;
  received_by_role: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthorityAdvisoryActRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  act_date: string;
  act_time: string | null;
  act_place: string | null;
  issuing_entity: string | null;
  standard_code: string | null;
  participants: string; // JSON {nombre, cargo, funcion}[]
  background: string; // JSON string[]
  measures: string; // JSON string[]
  advisory_scope: string; // JSON string[]
  conclusion: string | null;
  dece_professional_name: string | null;
  authority_name: string | null;
  authority_role: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyAttentionRow {
  id: string;
  institution_id: string;
  professional_id: string | null;
  case_file_id: string | null;
  attendee_type: string; // ESTUDIANTE / REPRESENTANTE / DOCENTE_AUTORIDAD
  attention_date: string;
  duration: string | null;
  student_name: string | null;
  student_grade: string | null;
  jornada: string | null;
  representative_name: string | null;
  attendee_name: string | null;
  reason: string;
  action_axis: string; // JSON string[]
  modality_tech: string | null;
  modality_signed: number;
  modality_phone: string | null;
  has_detection_sheet: string | null;
  observations: string | null;
  created_at: string;
}

export interface SituationalReportRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  report_number: string | null;
  report_date: string;
  responsible_name: string | null;
  responsible_role: string | null;
  responsible_phone: string | null;
  responsible_email: string | null;
  addressed_to_name: string | null;
  addressed_to_role: string | null;
  addressed_to_phone: string | null;
  addressed_to_email: string | null;
  situation_type: string;
  tema: string | null;
  tutor_name: string | null;
  scope_text: string | null;
  objective_text: string | null;
  eje_deteccion: string | null;
  eje_diagnostico_individual: string | null;
  eje_diagnostico_familiar: string | null;
  eje_diagnostico_institucional: string | null;
  eje_atencion_psicosocial: string | null;
  eje_derivacion: string | null;
  eje_seguimiento: string | null;
  eje_reparacion: string | null;
  methodology: string; // JSON string[]
  conclusions: string | null;
  recommendations: string | null;
  legal_basis: string | null;
  preparer_name: string | null;
  preparer_role: string | null;
  approver_name: string | null;
  approver_role: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseRestitutionPlanRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  school_year: string | null;
  elaboration_date: string;
  risk_factors: string | null;
  violence_types: string; // JSON string[]
  violence_modality: string; // JSON string[]
  violence_modality_other: string | null;
  perpetrator_relation: string | null;
  victims: string; // JSON {iniciales, cedula, edad, genero, nivel_instruccion}[]
  perpetrators: string; // JSON {nombre, edad, cargo_funcion}[]
  report_narrative: string | null;
  legal_instances: string; // JSON {instancia, fecha_denuncia, numero_denuncia, medidas, estado}[]
  accompaniment_actions: string; // JSON {categoria, ejecutor, num_personas, fecha_inicio, fecha_fin}[]
  prepared_by_name: string | null;
  prepared_by_email?: string | null;
  prepared_by_role?: string | null;
  prepared_date: string | null;
  reviewed_coordinator_name: string | null;
  reviewed_coordinator_date: string | null;
  reviewed_authority_name: string | null;
  reviewed_authority_date: string | null;
  approved_by_name: string | null;
  approved_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentRow {
  id: string;
  institution_id: string;
  student_id: string | null;
  case_file_id: string | null;
  professional_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string | null;
  attendee_type: string;
  location: string | null;
  status: AppointmentStatus;
  notes: string | null;
  requester_email: string | null;
  reminder_24h_sent: number;
  reminder_1h_sent: number;
  created_at: string;
  updated_at: string;
}

export type AppointmentRequestStatus = "PENDIENTE" | "CONFIRMADA" | "RECHAZADA" | "CANCELADA";
export type AppointmentRequesterRole = "ESTUDIANTE" | "REPRESENTANTE" | "DOCENTE" | "OTRO";

export interface AppointmentRequestRow {
  id: string;
  institution_id: string;
  requester_name: string;
  requester_role: AppointmentRequesterRole;
  requester_email: string;
  requester_phone: string | null;
  student_name: string | null;
  student_course: string | null;
  reason: string;
  preferred_date: string | null;
  preferred_time: string | null;
  professional_id: string | null;
  status: AppointmentRequestStatus;
  reject_reason: string | null;
  appointment_id: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ScheduleSlotRow {
  id: string;
  institution_id: string;
  professional_id: string;
  date: string;
  hour: string;
  available: number;
  activity_title: string | null;
  activity_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface ActivityRow {
  id: string;
  institution_id: string;
  title: string;
  axis: ActivityAxis;
  prevention_theme: string | null;
  description: string | null;
  target_audience: string | null;
  courses: string | null;
  date: string;
  responsible_id: string;
  participants_count: number | null;
  evidence_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingMinutesRow {
  id: string;
  institution_id: string;
  created_by_id: string | null;
  meeting_code: string | null;
  meeting_date: string | null;
  next_meeting_date: string | null;
  responsible_name: string | null;
  responsible_email: string | null;
  responsible_phone_ext: string | null;
  responsible_role: string | null;
  meeting_topic: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  thematic_background: string | null;
  attendees_json: string;
  agenda_json: string;
  signatories_json: string;
  additional_comments: string | null;
  title_suffix: string | null;
  desarrollo_narrativo: string | null;
  created_at: string;
  updated_at: string;
}

export interface EneisActaRow {
  id: string;
  institution_id: string;
  created_by_id: string | null;
  ciudad: string | null;
  meeting_date: string | null;
  tema: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
  desarrollo: string | null;
  participants_json: string;
  compromisos_json: string;
  created_at: string;
  updated_at: string;
}

export interface AlertIdentificationSessionRow {
  id: string;
  institution_id: string;
  created_by_id: string | null;
  curso: string | null;
  fecha: string | null;
  lugar: string | null;
  responsible_name: string | null;
  responsible_email: string | null;
  responsible_phone_ext: string | null;
  responsible_role: string | null;
  attendees_json: string;
  observaciones: string | null;
  access_code: string;
  status: "ABIERTA" | "CERRADA";
  created_at: string;
  updated_at: string;
}

export interface AlertIdentificationEntryRow {
  id: string;
  session_id: string;
  institution_id: string;
  student_name: string;
  risk_type: string;
  teacher_name: string;
  created_at: string;
}

export interface EneisInformeDeceRow {
  id: string;
  institution_id: string;
  created_by_id: string | null;
  periodo: string;
  actividades_json: string;
  created_at: string;
  updated_at: string;
}

export interface EneisDiagnosticoRow {
  id: string;
  institution_id: string;
  created_by_id: string | null;
  zona: string | null;
  distrito: string | null;
  fecha: string | null;
  antecedentes: string | null;
  objetivo_general: string | null;
  objetivos_especificos_json: string;
  actividades_json: string;
  resultados_json: string;
  conclusiones: string | null;
  recomendaciones: string | null;
  responsables_json: string;
  created_at: string;
  updated_at: string;
}

export interface EneisFichaTecnicaRow {
  id: string;
  institution_id: string;
  created_by_id: string | null;
  coordinacion_zonal_distrito: string | null;
  fecha_elaboracion: string | null;
  funcionarios_json: string;
  nivel_preparacion_index: number | null;
  temas_seleccionados_json: string;
  recursos_seleccionados_json: string;
  cronograma_json: string;
  avances_json: string;
  nudos_criticos: string | null;
  firmas_escolares_json: string;
  firmas_distritales_json: string;
  created_at: string;
  updated_at: string;
}

export interface TapasSessionRow {
  id: string;
  institution_id: string;
  created_by_id: string | null;
  school_year_id: string | null;
  title: string;
  course: string | null;
  parallel: string | null;
  jornada: string | null;
  access_code: string;
  status: "ABIERTA" | "CERRADA";
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TapasApplicationRow {
  id: string;
  session_id: string;
  institution_id: string;
  student_id: string | null;
  student_name: string;
  course_snapshot: string | null;
  parallel_snapshot: string | null;
  status: "EN_PROGRESO" | "FINALIZADA";
  classification_json: string;
  groups_json: string;
  reflection: string | null;
  future_letter: string | null;
  result_json: string | null;
  started_at: string;
  finished_at: string | null;
  updated_at: string;
}

export interface OvpSessionRow {
  id: string;
  institution_id: string;
  created_by_id: string | null;
  school_year_id: string | null;
  title: string;
  instrument: string;
  course: string | null;
  parallel: string | null;
  jornada: string | null;
  access_code: string;
  status: "ABIERTA" | "CERRADA";
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OvpApplicationRow {
  id: string;
  session_id: string;
  institution_id: string;
  student_id: string | null;
  student_name: string;
  course_snapshot: string | null;
  parallel_snapshot: string | null;
  gender: "FEMENINO" | "MASCULINO" | "OTRO";
  age: number | null;
  status: "EN_PROGRESO" | "FINALIZADA";
  survey_json: string;
  answers_json: string;
  result_json: string | null;
  started_at: string;
  finished_at: string | null;
  updated_at: string;
}

export interface RestorativeCircleFichaRow {
  id: string;
  institution_id: string;
  created_by_id: string | null;
  school_year_id: string | null;
  case_file_id: string | null;
  student_id: string | null;
  ficha_code: string | null;
  center_name: string | null;
  district_name: string | null;
  facilitator_name: string | null;
  circle_type: string | null;
  circle_modality: string | null;
  participants_count: string | null;
  participant_type: string | null;
  problematica: string | null;
  circle_date: string | null;
  circle_time: string | null;
  diagnostico: string | null;
  objetivos: string | null;
  declaracion_inicial: string | null;
  q_icebreaker: string | null;
  q_intro: string | null;
  q_develop: string | null;
  q_actions: string | null;
  declaracion_cierre: string | null;
  informe_circulo: string | null;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityReportRow {
  id: string;
  institution_id: string;
  activity_id: string | null;
  created_by_id: string | null;
  report_number: string | null;
  report_date: string;
  school_year_text: string | null;
  responsible_name: string | null;
  responsible_role: string | null;
  responsible_phone_ext: string | null;
  responsible_email: string | null;
  directed_to_name: string | null;
  directed_to_role: string | null;
  directed_to_phone_ext: string | null;
  directed_to_email: string | null;
  tema: string | null;
  legal_basis: string | null;
  scope_text: string | null;
  objective_general: string | null;
  objectives_specific: string | null;
  development_analysis: string | null;
  activity_name: string | null;
  activity_axis: string | null;
  activity_date: string | null;
  activity_responsible: string | null;
  activity_beneficiaries: string | null;
  participants_count: number | null;
  advances: string | null;
  critical_nodes: string | null;
  conclusions: string | null;
  recommendations: string | null;
  elaborated_by_name: string | null;
  elaborated_by_role: string | null;
  elaborated_date: string | null;
  approved_by_name: string | null;
  approved_by_role: string | null;
  approved_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseAccompanimentReportRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  created_by_id: string | null;
  report_number: string | null;
  report_date: string;
  professional_managing: string | null;
  professional_signing: string | null;
  signing_date: string | null;
  student_full_name: string | null;
  student_birth_day: string | null;
  student_birth_month: string | null;
  student_birth_year: string | null;
  student_age: string | null;
  student_nationality: string | null;
  student_document_id: string | null;
  student_grade: string | null;
  student_jornada: string | null;
  rep_full_name: string | null;
  rep_document_id: string | null;
  rep_relationship: string | null;
  rep_address: string | null;
  rep_phone_cell: string | null;
  rep_phone_landline: string | null;
  family_situation: string | null;
  indicators_json: string;
  risk_protection_json: string;
  academic_performance: string | null;
  accompaniment_actions: string | null;
  ext_referral_json: string;
  psychosocial_referral_json: string;
  restitution_plan_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherAlertRow {
  id: string;
  institution_id: string;
  student_id: string;
  reported_by_id: string;
  description: string;
  status: AlertStatus;
  case_file_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  institution_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  timestamp: string;
}

export interface RiskMatrixEntryRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  report_month: string; // 'YYYY-MM'
  case_type: string;
  knowledge_date: string | null;
  registered_by_name: string | null;
  registered_by_role: string | null;
  student_ethnicity: string | null;
  student_nationality: string | null;
  student_has_disability: string | null;
  student_disability_type: string | null;
  student_gender_diversity: string | null;
  student_other_conditions: string | null;
  file_lift_date: string | null;
  district_case_number: string | null;
  district_intake_date: string | null;
  protection_measures_institution: string | null;
  protection_measures_description: string | null;
  has_accompaniment_plan: string | null;
  fiscalia_complaint: string | null;
  fiscalia_date: string | null;
  fiscalia_number: string | null;
  jcpdna_complaint: string | null;
  jcpdna_date: string | null;
  case_current_status: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttachmentRow {
  id: string;
  institution_id: string | null;
  filename: string;
  path: string;
  mime_type: string | null;
  size: number | null;
  uploaded_at: string;
  uploaded_by_id: string | null;
  case_file_id: string | null;
  case_action_id: string | null;
  referral_id: string | null;
  presented_by_role?: string | null;
  presented_by_name?: string | null;
  document_type?: string | null;
  ocr_extracted_at?: string | null;
  checklist_item_id?: string | null;
}

export type PresenterRole =
  | "DOCENTE_TUTOR"
  | "REPRESENTANTE_LEGAL"
  | "AUTORIDAD"
  | "PROFESIONAL_DECE"
  | "ESTUDIANTE"
  | "EXTERNO";

export const PRESENTER_ROLE_LABELS: Record<PresenterRole, string> = {
  DOCENTE_TUTOR: "Docente tutor(a)",
  REPRESENTANTE_LEGAL: "Representante legal / Padre / Madre",
  AUTORIDAD: "Autoridad institucional (Rector/Inspector)",
  PROFESIONAL_DECE: "Profesional DECE",
  ESTUDIANTE: "Estudiante",
  EXTERNO: "Institución externa (MINEDUC / Dinapen / Salud)",
};
export type SchoolYearRegime = "COSTA_GALAPAGOS" | "SIERRA_AMAZONIA";
export const SCHOOL_YEAR_REGIME_LABELS: Record<string, string> = {
  COSTA_GALAPAGOS: "Costa - Galápagos",
  SIERRA_AMAZONIA: "Sierra - Amazonía",
};
export type ChatChannelType = "GENERAL" | "URGENCIAS" | "AI_ASSISTANT" | "DIRECT" | "GROUP" | "CASE";
export interface ChatChannelSummary {
  id: string;
  institution_id: string;
  type: ChatChannelType;
  name: string;
  description: string | null;
  case_file_id: string | null;
  case_code: string | null;
  last_message: {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
  } | null;
  unread_count: number;
  members_count: number;
  other_user: { id: string; name: string; email: string; role: Role; job_title?: string | null } | null;
}
export interface SchoolYearRow {
  id: string;
  institution_id: string;
  name: string;
  start_date: string;
  end_date: string;
  regime: SchoolYearRegime;
  is_active: number;
  created_at: string;
  updated_at: string;
}
export type StudentEnrollmentStatus = "MATRICULADO" | "PROMOVIDO" | "RETIRADO" | "DESERTADO";
export interface StudentEnrollmentRow {
  id: string;
  student_id: string;
  school_year_id: string;
  institution_id: string;
  course: string;
  parallel: string | null;
  jornada: string | null;
  education_level: string | null;
  specialty: string | null;
  status: StudentEnrollmentStatus;
  created_at: string;
  updated_at: string;
}

export interface BimonthlyProcessItem {
  id: string;
  process_name: string;
  executed_by: string;
  beneficiaries_count: string;
  start_date: string;
  end_date: string;
}

export interface BimonthlyReportRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  report_number?: string | null;
  school_year_id: string | null;
  school_year_text: string;
  period_months: string;
  institution_name: string;
  amie_code: string;
  victim_initials: string;
  processes_data: string; // JSON de BimonthlyProcessItem[]
  elaborated_by_name: string | null;
  elaborated_by_role: string;
  reviewed_by_name: string | null;
  reviewed_by_role: string;
  approved_by_name: string | null;
  approved_by_role: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeceReportSequenceRow {
  institution_id: string;
  school_year_code: string;
  last_number: number;
  updated_at: string;
}

export interface DeceIssuedReportRow {
  id: string;
  institution_id: string;
  school_year_code: string;
  sequence_number: number;
  report_number: string;
  report_type: string;
  record_id: string | null;
  case_file_id: string | null;
  student_id: string | null;
  professional_id: string | null;
  created_at: string;
}

export type ClosureType =
  | "FINALIZACION_ANO_LECTIVO"
  | "CIERRE_POR_GRADUACION"
  | "CIERRE_POR_TRASLADO";

export const CLOSURE_TYPE_LABELS: Record<ClosureType, string> = {
  FINALIZACION_ANO_LECTIVO: "Finalización del año lectivo",
  CIERRE_POR_GRADUACION: "Cierre por graduación",
  CIERRE_POR_TRASLADO: "Cierre y traslado de caso por cambio de institución educativa",
};

export interface CaseClosureReportRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  school_year_id: string | null;
  school_year_text: string;
  report_date: string;
  report_number: string;
  closure_type: ClosureType;
  dece_user_id: string | null;
  dece_name: string;
  dece_role: string;
  dece_phone_ext: string | null;
  dece_email: string | null;
  authority_name: string;
  authority_role: string;
  authority_phone_ext: string | null;
  authority_email: string | null;
  topic: string;
  closure_reasons: string;
  legal_framework: string;
  scope: string;
  objective: string;
  student_name: string;
  student_id_num: string | null;
  student_age: number | null;
  student_birth_date: string | null;
  student_grade: string;
  student_parallel: string | null;
  student_section: string | null;
  student_address: string | null;
  student_address_ref: string | null;
  rep_name: string | null;
  rep_id_num: string | null;
  rep_phone: string | null;
  activities_counseling: string | null;
  activities_prevention: string | null;
  activities_psychosocial: string | null;
  activities_inclusion: string | null;
  bimonthly_summary_json: string;
  methodology: string;
  conclusions: string;
  recommendations: string;
  elaborated_by_name: string;
  elaborated_by_role: string;
  elaborated_date: string;
  reviewed_by_name: string;
  reviewed_by_role: string;
  reviewed_date: string;
  approved_by_name: string;
  approved_by_role: string;
  approved_date: string;
  annexes_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionPlanItem {
  id: string;
  dimension: string;
  component: string;
  action: string;
  activities: string;
  target_population: string;
  expected_goal_standard: string;
  execution_term: string;
  supplies_inputs: string;
  responsible: string;
  observations: string;
}

export interface ActionPlanAnalyst {
  name: string;
  role: string;
}

export interface ActionPlanSignatory {
  name: string;
  role: string;
  date: string;
}

export interface ActionPlanRow {
  id: string;
  institution_id: string;
  school_year_id: string;
  school_year_text: string;
  students_count: number;
  coordinator_name: string;
  analysts_data: string; // JSON de ActionPlanAnalyst[]
  available_resources: string;
  items_data: string; // JSON de ActionPlanItem[]
  evaluation_notes: string;
  elaborated_by: string; // JSON de ActionPlanSignatory[]
  reviewed_by: string; // JSON de ActionPlanSignatory
  approved_by: string; // JSON de ActionPlanSignatory
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CorresponsibilityConflictType =
  | "CONVIVENCIA_AGRESIVIDAD"
  | "ASISTENCIA_ABANDONO"
  | "RENDIMIENTO_ACADEMICO"
  | "NEGLIGENCIA_DESUIDO"
  | "VIOLENCIA_VULNERACION"
  | "CONSUMO_SUSTANCIAS"
  | "APOYO_EXTERNO_DERIVACION"
  | "SALUD_MENTAL"
  | "VULNERABILIDAD_MEDICA"
  | "HURTOS"
  | "MAL_USO_UNIFORME"
  | "MAL_USO_REDES_SOCIALES"
  | "DISPOSITIVOS_NO_AUTORIZADOS"
  | "CONDUCTAS_INAPROPIADAS_AULA"
  | "OTRO";

export interface CaseCorresponsibilityActRow {
  id: string;
  case_file_id: string;
  institution_id: string;
  city: string;
  act_date: string;
  act_time: string | null;
  representative_name: string;
  representative_id_num: string | null;
  representative_relationship: string | null;
  representative_phone: string | null;
  representative_address: string | null;
  student_name: string;
  student_grade: string;
  student_parallel: string | null;
  jornada: string | null;
  dece_professional_name: string;
  dece_professional_id_num: string | null;
  tutor_authority_name: string | null;
  tutor_authority_role: string | null;
  conflict_type: CorresponsibilityConflictType;
  detected_difficulty: string;
  legal_framework: string;
  commitments_representative: string;
  commitments_dece: string;
  commitments_student: string | null;
  observations: string | null;
  agreements_and_commitments?: string | null;
  updated_by?: string | null;
  preview_image_path?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeceDistributivoRow {
  id: string;
  institution_id: string;
  school_year_id: string;
  school_year_text: string;
  title: string;
  coordinator_id: string;
  coordinator_name: string;
  is_active: number;
  elaborated_by_name: string | null;
  elaborated_by_role: string | null;
  approved_by_name: string | null;
  approved_by_role: string | null;
  general_observations: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeceDistributivoAssignmentRow {
  id: string;
  distributivo_id: string;
  user_id: string;
  user_name: string;
  user_role_label: string;
  jornada: string;
  subniveles: string; // JSON array string
  courses: string; // JSON array string
  parallels: string; // JSON array string
  estimated_students_count: number;
  specific_responsibilities: string | null;
  has_enlazada?: number;
  enlazada_name?: string | null;
  enlazada_dias?: string | null;
  lunch_schedule?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCoverage {
  isAllInstitutional: boolean;
  courses: string[];
  parallels: string[];
  jornadas: string[];
  assignment?: DeceDistributivoAssignmentRow;
}

export interface InstitutionCourseQuotaRow {
  id: string;
  institution_id: string;
  school_year_id: string;
  education_level: string;
  course: string;
  parallel: string;
  jornada: string;
  bachillerato_specialty: string | null;
  student_count: number;
  tutor_name?: string | null;
  created_at: string;
  updated_at: string;
}

export type Trimester = "1T" | "2T" | "3T";
export const TRIMESTER_LABELS: Record<Trimester, string> = {
  "1T": "Primer Trimestre",
  "2T": "Segundo Trimestre",
  "3T": "Tercer Trimestre",
};

export interface CourseBoardReportCaseItem {
  id: string;
  student_name: string;
  cedula?: string;
  student_id?: string;
  case_id?: string;
  case_code?: string;
  problematic: string;
  actions_taken: string;
  recommendations: {
    coordination?: string; // Comunicación y Coordinación
    academic?: string; // Académico / Ajustes Razonables (DUA)
    climate?: string; // Clima Escolar / Convivencia
    protocols?: string; // Protección y Protocolos
    general?: string;
  };
}

export interface CourseBoardReportRow {
  id: string;
  institution_id: string;
  school_year_id: string;
  school_year_text: string;
  user_id: string;
  user_name: string;
  user_role_label: string;
  user_contact?: string | null;
  user_email?: string | null;
  user_extension?: string | null;
  tutor_name: string;
  tutor_role_label?: string | null;
  tutor_contact?: string | null;
  tutor_email?: string | null;
  tutor_extension?: string | null;
  report_code: string;
  trimester: Trimester;
  course: string;
  parallel: string;
  jornada: string;
  report_date: string;
  antecedentes: string;
  alcance: string;
  objetivo: string;
  cases_json: string;
  general_actions?: string | null;
  conclusiones: string;
  recomendaciones: string;
  created_at: string;
  updated_at: string;
}

export type ManagementReportType = "DEPARTAMENTAL" | "INDIVIDUAL";

export interface ManagementReportRecipientItem {
  id?: string;
  name: string;
  cargo: string;
  extension?: string;
  email?: string;
}

export interface ManagementReportProfessionalItem {
  id?: string;
  user_id?: string;
  name: string;
  cargo: string;
  extension?: string;
  email?: string;
  coverage_students?: number;
  coverage_jornadas?: string;
  coverage_levels?: string;
  tenure_time?: string;
}

export interface CounselingStatRow {
  category: string;
  values_by_professional: Record<string, number>;
  total: number;
}

export interface CaseTypologyStatRow {
  typology: string;
  values_by_professional: Record<string, number>;
  total: number;
}

export interface ComparativeAnalysisRow {
  typology: string;
  previous_year_count: number;
  current_year_count: number;
  comparative_analysis: string;
}

export interface PreventionProjectRow {
  theme: string;
  activities_count: number;
  students_beneficiaries: number;
  families_beneficiaries: number;
  authorities_beneficiaries: number;
  teachers_beneficiaries: number;
}

export interface AnnexPhotoItem {
  id: string;
  title: string;
  date: string;
  image_url: string;
  description: string;
}

export interface ManagementReportSignatureItem {
  id?: string;
  name: string;
  cargo: string;
  date: string;
  type: "DESARROLLO" | "APROBACION";
}

export interface AnnualManagementReportRow {
  id: string;
  institution_id: string;
  school_year_id: string;
  school_year_text: string;
  user_id: string;
  user_name: string;
  user_role_label: string;
  report_type: ManagementReportType;
  report_code: string;
  report_date: string;
  title_topic: string;
  recipients_json: string;
  professionals_json: string;
  antecedentes_legal: string;
  situational_diagnosis: string;
  distributivo_summary_json: string;
  alcance: string;
  objetivos: string;
  counseling_stats_json: string;
  case_typologies_json: string;
  comparative_analysis_json: string;
  psychosocial_note: string;
  prevention_projects_json: string;
  pending_processes: string;
  achievements: string;
  critical_knots: string;
  conclusions_counseling: string;
  conclusions_prevention: string;
  conclusions_psychosocial: string;
  conclusions_inclusion: string;
  recommendations_institutional: string;
  recommendations_district: string;
  annexes_notes: string;
  annex_photos_json: string;
  signatures_json: string;
  created_at: string;
  updated_at: string;
}

export type InternType = "PASANTE" | "VOLUNTARIO";
export type InternStatus = "ACTIVO" | "INACTIVO" | "CULMINADO";
export type AttendanceStatus = "EN_CURSO" | "COMPLETADO" | "JUSTIFICADO";

export interface InternRow {
  id: string;
  institution_id: string;
  full_name: string;
  document_id: string;
  email: string | null;
  phone: string | null;
  type: InternType;
  university_or_origin: string;
  career_or_specialty: string | null;
  tutor_user_id: string | null;
  tutor_name: string | null;
  required_hours: number;
  start_date: string;
  end_date: string | null;
  schedule_type: string | null;
  schedule_details?: string | null;
  expected_entry_time?: string | null;
  expected_exit_time?: string | null;
  qr_token: string;
  device_id?: string | null;
  device_name?: string | null;
  device_linked_at?: string | null;
  pin_code?: string | null;
  status: InternStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InternAttendanceRow {
  id: string;
  institution_id: string;
  intern_id: string;
  date: string;
  check_in_time: string;
  check_out_time: string | null;
  total_minutes: number | null;
  total_hours: number | null;
  activity_notes: string | null;
  registered_via: string;
  ip_or_device: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_meters?: number | null;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface InternWithStats extends InternRow {
  completed_minutes: number;
  completed_hours: number;
  progress_percentage: number;
  active_today?: boolean;
  today_attendance?: InternAttendanceRow | null;
}

export interface RestorativeCircleConsentRow {
  id: string;
  institution_id: string;
  school_year_id?: string | null;
  case_file_id?: string | null;
  student_id?: string | null;
  student_name: string;
  course_parallel: string;
  course_parallel_full: string;
  course_parallel_short: string;
  shift: string;
  representative_phone?: string | null;
  consent_date: string;
  representative_name?: string | null;
  representative_ci?: string | null;
  dece_user_id?: string | null;
  dece_name: string;
  dece_role: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type UserSubscriptionStatus = "activo" | "en_prueba" | "suspendido" | "cancelado" | "demo";

export interface UserSubscriptionRow {
  id: string;
  user_id: string;
  status: UserSubscriptionStatus;
  package_id: string | null;
  package_name: string;
  billing_type: "paquete" | "prueba" | "demo" | "personalizado";
  frozen_price: number;
  frozen_duration_months: number;
  frozen_duration_days: number;
  start_date: string;
  end_date: string | null;
  trial_days: number;
  is_demo: number;
  last_renewed_at: string;
  last_renewed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSubscriptionHistoryRow {
  id: string;
  user_id: string;
  institution_id_snapshot: string | null;
  event_type:
    | "ALTA_INICIAL"
    | "ACTIVACION_PRUEBA"
    | "RENOVACION"
    | "SUSPENSION_MANUAL"
    | "SUSPENSION_AUTOMATICA"
    | "REACTIVACION"
    | "CAMBIO_FORZADO"
    | "CANCELACION"
    | "REUBICACION";
  billing_type: string;
  package_id: string | null;
  package_name: string;
  frozen_price: number;
  start_date: string;
  end_date: string | null;
  executed_by_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface UserWithSubscription {
  id: string;
  institution_id: string | null;
  institution_name: string | null;
  name: string;
  email: string;
  role: Role;
  active: number;
  deleted_at?: string | null;
  phone: string | null;
  created_at: string;
  subscription?: {
    id: string;
    status: UserSubscriptionStatus;
    package_id: string | null;
    package_name: string;
    billing_type: string;
    frozen_price: number;
    frozen_duration_months: number;
    start_date: string;
    end_date: string | null;
    days_left: number | null;
    is_overdue: boolean;
    is_demo: boolean;
    is_trial: boolean;
    is_read_only: boolean;
  } | null;
}

export interface CaseAlertNotificationRow {
  id: string;
  case_file_id: string;
  institution_id: string;

  student_name: string;
  student_id_num: string | null;
  student_birth_date: string | null;
  student_age: string | null;
  representative_name: string | null;
  representative_address: string | null;
  representative_phone: string | null;
  student_grade: string;
  student_parallel: string | null;
  jornada: string;
  docente_tutor: string | null;

  alerta_inestabilidad_emocional: number;
  alerta_hijo_ppl: number;
  alerta_trabajo_infantil: number;
  alerta_riesgo_psicosocial: number;
  alerta_movilidad_humana: number;
  alerta_conflictos_intrafamiliares: number;
  alerta_autolesiones_ideacion: number;
  alerta_hostigamiento_academico: number;
  alerta_embarazo_maternidad_paternidad: number;
  alerta_posible_dependencia_sustancias: number;
  alerta_vulneracion_derechos: number;
  alerta_otros: number;
  especificar_alerta: string | null;

  lugar_fecha_hechos: string | null;

  intervencion_pregunta_1: string | null;
  intervencion_pregunta_2: string | null;
  intervencion_pregunta_3: string | null;
  intervencion_pregunta_4: string | null;
  intervencion_pregunta_5: string | null;

  notificador_nombre: string;
  notificador_cargo: string;
  notificador_contacto: string | null;
  fecha_entrega_dece: string;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeceCitationSequenceRow {
  institution_id: string;
  school_year_code: string;
  last_number: number;
  updated_at: string;
}

export interface DeceEsquelaRow {
  id: string;
  institution_id: string;
  citation_number: string;
  sequence_number: number;
  school_year_code: string;
  case_file_id: string | null;
  student_id: string | null;
  student_name: string;
  student_id_number: string | null;
  course: string | null;
  parallel: string | null;
  jornada: string | null;
  representative_name: string;
  representative_id_number: string | null;
  representative_phone: string | null;
  citation_date: string;
  citation_time: string;
  citation_place: string | null;
  citation_reason: string;
  urgency_level: "ORDINARIA" | "URGENTE";
  professional_id: string | null;
  professional_name: string;
  professional_role: string | null;
  observations: string | null;
  talon_returned: number; // 0 o 1
  received_by_name: string | null;
  received_by_relation: string | null;
  received_by_id_number: string | null;
  received_date: string | null;
  talon_attended: number; // 0=pendiente, 1=asistió, 2=justificó, 3=injustificado
  talon_notes: string | null;
  created_at: string;
  updated_at: string;
}

