import { getDocumentStandards, type DocumentKind, type DocumentStandardLine } from "@/lib/documentStandards";

/**
 * Codificación de Estándares de Calidad DECE para vistas de impresión que
 * tienen membrete propio (las que usan DocumentHeader la reciben ya incluida).
 */
export default function StandardsBlock({
  docKind,
  standards,
  className = "",
}: {
  docKind?: DocumentKind;
  /** Códigos explícitos; tienen prioridad sobre `docKind`. */
  standards?: DocumentStandardLine[];
  className?: string;
}) {
  const lines = standards ?? (docKind ? getDocumentStandards(docKind) : []);
  if (lines.length === 0) return null;
  return (
    <div className={`space-y-px text-[8px] leading-tight text-slate-600 ${className}`}>
      {lines.map((s) => (
        <p key={s.code}>
          <span className="font-bold">{s.code}</span> {s.text}
        </p>
      ))}
    </div>
  );
}
