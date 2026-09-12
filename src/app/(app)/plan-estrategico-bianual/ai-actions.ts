"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { draftBianualPlanRow, draftAutonomousBianualPlan } from "@/lib/ai";
import type { StrategicBianualAxisItem } from "@/lib/types";

export async function generateBianualRowAiSuggestion(params: {
  axis: string;
  goal: string;
  institutionName: string;
  periodText: string;
  studentsCount: number;
  professionalsList: string[];
  availableResources: string;
  socioeconomicCondition: string;
  currentActions?: string;
  currentResponsible?: string;
  currentIndicator?: string;
  currentExecutionTerm?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "No autorizado." };
  }

  return await draftBianualPlanRow(params);
}

export async function generateAutonomousBianualPlanAiSuggestion(params: {
  institutionName: string;
  periodText: string;
  periodStartYear?: string;
  periodEndYear?: string;
  studentsCount: number;
  professionalsList: string[];
  availableResources: string;
  socioeconomicCondition: string;
  targetScope?: "PREVENCION" | "TODO";
  currentItems: StrategicBianualAxisItem[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "No autorizado." };
  }

  return await draftAutonomousBianualPlan(params);
}
