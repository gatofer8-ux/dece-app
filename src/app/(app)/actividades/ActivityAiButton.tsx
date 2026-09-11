"use client";

import UniversalAIAssistButton from "@/components/AIAssistButton";

export default function ActivityAiButton({
  fieldKey,
  targetId,
}: {
  fieldKey: "description" | "evidence_notes";
  targetId: string;
}) {
  const isDesc = fieldKey === "description";
  const label = isDesc ? "Descripción de la actividad" : "Evidencias u observaciones";
  const purpose = isDesc
    ? "Descripción pedagógica y metodológica de la actividad de promoción/prevención (objetivo, dinámicas participativas y desarrollo formativo conforme al Modelo de Gestión DECE)"
    : "Evidencias y observaciones técnicas (medios de verificación como registros firmados o material fotográfico, nivel de acogida y compromisos)";

  return (
    <UniversalAIAssistButton
      targetId={targetId}
      fieldLabel={label}
      documentType="ACTIVIDAD_PREVENCION_PROMOCION"
      sectionPurpose={purpose}
      relatedFieldIds={["act-title", "act-axis", "act-theme", "act-target", "act-courses"]}
      institutionalRules={[
        isDesc
          ? "Si el campo está vacío, redacta un único párrafo conciso y directo (3 a 5 oraciones) que resuma lo principal de la actividad. Si ya tiene texto, pule y mejora la redacción en un único párrafo sin alterar los hechos provistos."
          : "Si el campo está vacío, propón un esquema pequeñísimo de 3 a 4 líneas directas con respaldos y observaciones recomendadas. Si ya tiene texto, pule y mejora las evidencias provistas.",
      ]}
    />
  );
}
