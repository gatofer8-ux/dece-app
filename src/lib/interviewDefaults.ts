/**
 * Nota formal y técnica de toma de conocimiento y corresponsabilidad del representante legal
 * en la entrevista semiestructurada e intervención institucional del DECE (Ecuador).
 * Redactada con enfoque de derechos y lenguaje accesible y transparente para las familias.
 */
export const REPRESENTATIVE_AWARENESS_NOTE =
  "NOTA DE CONOCIMIENTO Y CORRESPONSABILIDAD:\n" +
  "En mi calidad de madre, padre y/o representante legal, declaro que he sido informado/a de manera clara, oportuna y comprensible sobre la situación psicosocial y pedagógica de mi representado/a durante esta entrevista e intervención del DECE. Manifiesto mi plena toma de conocimiento, conformidad y corresponsabilidad con los compromisos aquí acordados, asumiendo el deber de acompañar su cumplimiento para salvaguardar el bienestar integral, desarrollo socioemocional y permanencia escolar del/la estudiante.";

/**
 * Genera el compromiso precargado por defecto para una entrevista semiestructurada,
 * incluyendo acuerdos iniciales del representante y del DECE, junto con la nota
 * técnica de toma de conocimiento y corresponsabilidad.
 */
export function getDefaultInterviewCommitment(studentName?: string): string {
  const target = studentName ? ` del/la estudiante ${studentName}` : " del/la estudiante";
  return (
    `1. El/la representante legal se compromete a brindar el acompañamiento afectivo, formativo y pedagógico en el hogar, supervisar el cumplimiento de actividades escolares y mantener una comunicación constante y abierta con el personal docente y el DECE.\n` +
    `2. El Departamento de Consejería Estudiantil (DECE) y el equipo docente coordinarán acciones preventivas y de seguimiento periódico para fortalecer el desenvolvimiento y estabilidad socioemocional${target}.\n\n` +
    REPRESENTATIVE_AWARENESS_NOTE
  );
}
