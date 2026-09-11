"use client";

import UniversalAIAssistButton from "@/components/AIAssistButton";

export default function AIAssistButton({
  targetId,
  fieldLabel,
}: {
  targetId: string;
  fieldLabel: string;
}) {
  return (
    <UniversalAIAssistButton
      targetId={targetId}
      fieldLabel={fieldLabel}
      documentType="REGISTRO_ATENCION_DIARIA"
      sectionPurpose="Registro técnico de atención diaria del DECE (estudiante, docente o representante legal)"
    />
  );
}
