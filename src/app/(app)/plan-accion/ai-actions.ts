"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { draftActionPlanItem, draftActionPlanGlobal, draftAutonomousActionPlan } from "@/lib/ai";
import { requireInstitutionId } from "@/lib/session";
import { getBianualContextForInstitution } from "@/lib/strategicPlanBianualDb";
import type { ActionPlanItem } from "@/lib/types";

export async function generateActionPlanAiSuggestion(params: {
  dimension: string;
  component: string;
  action: string;
  expected_goal_standard: string;
  institutionName: string;
  studentsCount: number;
  availableResources: string;
  professionalsList: string[];
  currentActivities?: string;
  currentTargetPopulation?: string;
  currentSupplies?: string;
  currentExecutionTerm?: string;
  currentResponsible?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "No autorizado." };
  }

  return await draftActionPlanItem(params);
}

export async function generateActionPlanGlobalAiSuggestion(params: {
  institutionName: string;
  schoolYear: string;
  studentsCount: number;
  availableResources: string;
  professionalsList: string[];
  coordinatorName: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "No autorizado." };
  }

  return await draftActionPlanGlobal(params);
}

export async function generateAutonomousPlanAiSuggestion(params: {
  institutionName: string;
  schoolYear: string;
  studentsCount: number;
  professionalsList: string[];
  availableResources: string;
  targetScope: "PREVENCION" | "TODO";
  currentItems: ActionPlanItem[];
  /**
   * Contexto del Plan Estratégico Bianual. Normalmente se omite y se resuelve
   * aquí mismo desde la base; el parámetro queda disponible por si el llamador
   * ya lo tiene armado.
   */
  bianualContext?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "No autorizado." };
  }

  // El Plan de Acción Anual se desprende del Plan Estratégico Bianual: si la
  // institución tiene uno vigente, sus objetivos y metas por eje se inyectan
  // como contexto de la generación. Es opcional, para no romper a las
  // instituciones que todavía no usan el módulo bianual.
  let bianualContext = params.bianualContext?.trim() || "";
  if (!bianualContext) {
    try {
      const institutionId = requireInstitutionId(session);
      bianualContext = getBianualContextForInstitution(institutionId);
    } catch {
      bianualContext = "";
    }
  }

  return await draftAutonomousActionPlan({ ...params, bianualContext });
}
