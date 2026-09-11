"use server";

import { redirect } from "next/navigation";
import { str, int } from "@/lib/formData";
import { getEneisSessionByCode, isSessionOpen, createEneisFicha } from "@/lib/eneis/eneisSessions";

export type FichaActionState = { error: string | null };

export async function submitEneisFichaAction(
  code: string,
  _prev: FichaActionState,
  formData: FormData
): Promise<FichaActionState> {
  const s = getEneisSessionByCode(code);
  if (!s || !isSessionOpen(s)) {
    return { error: "Esta convocatoria no está disponible en este momento. Consulta con el DECE de tu institución." };
  }

  const docenteNombre = str(formData, "docente_nombre");
  const asignatura = str(formData, "asignatura");
  if (!docenteNombre) return { error: "Escribe tu nombre completo." };
  if (!asignatura) return { error: "Indica la asignatura." };

  try {
    createEneisFicha({
      sessionId: s.id,
      institutionId: s.institution_id,
      docenteNombre,
      asignatura,
      subnivel: str(formData, "subnivel"),
      curso: str(formData, "curso"),
      paralelo: str(formData, "paralelo"),
      fechaDesde: str(formData, "fecha_desde"),
      fechaHasta: str(formData, "fecha_hasta"),
      nombreFicha: str(formData, "nombre_ficha"),
      objetivoCurricular: str(formData, "objetivo_curricular"),
      objetivoEis: str(formData, "objetivo_eis"),
      destrezas: str(formData, "destrezas"),
      orientacionConceptual: str(formData, "orientacion_conceptual"),
      recursos: str(formData, "recursos"),
      anticipacion: str(formData, "anticipacion"),
      conceptualizacion: str(formData, "conceptualizacion"),
      consolidacion: str(formData, "consolidacion"),
      indicadoresEvaluacion: str(formData, "indicadores_evaluacion"),
      numEstudiantesCapacitados: int(formData, "num_estudiantes_capacitados"),
      observaciones: str(formData, "observaciones"),
    });
  } catch (err: any) {
    return { error: err?.message || "Ocurrió un error al guardar la ficha. Intenta de nuevo." };
  }

  redirect(`/f/${code}/gracias`);
}
