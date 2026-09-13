"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { draftOficio } from "@/lib/ai";
import type { OficioType } from "@/lib/types";

/**
 * Redacción asistida de un oficio institucional completo (asunto + párrafo de
 * encuadre + párrafo de contenido) a partir de las notas libres que el/la
 * profesional escribió o dictó.
 */
export async function generateOficioAiDraft(params: {
  oficioType: OficioType;
  institutionName: string;
  addresseeRole: string;
  studentsContext?: string;
  caseContext?: string;
  userDraftNotes: string;
  professionalName: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "No autorizado." };
  }

  return await draftOficio(params);
}
