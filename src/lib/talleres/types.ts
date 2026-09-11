export type WorkshopCategory = 
  | "PREVENCION_044A"
  | "PRIMEROS_AUXILIOS_PAP"
  | "DESARROLLO_SOCIOEMOCIONAL"
  | "FORMACION_DECE";

export type WorkshopTargetAudience = 
  | "DOCENTES"
  | "ESTUDIANTES_PRIMARIA"
  | "ESTUDIANTES_SECUNDARIA"
  | "COMUNIDAD_EDUCATIVA"
  | "PROFESIONALES_DECE"
  | "FAMILIAS";

export interface WorkshopPhase {
  number: number;
  title: string;
  durationMinutes: number;
  objective?: string;
  facilitatorScript: string;
  groupDynamics?: string;
  reflectionQuestions?: string[];
  materialsNeeded?: string[];
}

export interface WorkshopMaterial {
  id: string;
  title: string;
  description: string;
  type: "RECORTABLE" | "FICHA_TRABAJO" | "GUIA_BOLSILLO" | "MATRIZ_ANALISIS";
  targetUser: string;
  printInstructions: string;
  fileName: string;
}

export interface WorkshopItem {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  category: WorkshopCategory;
  categoryLabel: string;
  normativeBase: string; // ej. Acuerdo MINEDUC-044-A, LOEI Art. 73
  targetAudiences: WorkshopTargetAudience[];
  targetAudienceLabel: string;
  estimatedDuration: string; // ej. "60 minutos", "90 minutos"
  generalObjective: string;
  specificObjectives: string[];
  materialsGeneral: string[];
  preliminaryNotes: string;
  phases: WorkshopPhase[];
  downloadableMaterials: WorkshopMaterial[];
  relatedActionPlanTopic?: string; // Código del tema en el Plan de Acción / Informe de Taller
}
