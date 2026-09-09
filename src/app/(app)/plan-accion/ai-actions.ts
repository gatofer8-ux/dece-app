"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { draftActionPlanItem, draftActionPlanGlobal } from "@/lib/ai";

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
