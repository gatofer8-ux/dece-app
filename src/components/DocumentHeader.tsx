// Encabezado oficial estándar para los documentos impresos y PDF del DECE Ecuador
// Basado en la imagen corporativa oficial del Ministerio de Educación, Deporte y Cultura ("El Nuevo Ecuador")

import { currentSchoolYearSpaced } from "@/lib/schoolYearText";

export default function DocumentHeader({
  title,
  subtitle,
  institutionName,
  sealImage,
  schoolYear,
  compact = false,
  headerMode = "DUAL",
}: {
  title: string;
  subtitle?: string;
  institutionName?: string;
  sealImage?: string | null;
  schoolYear?: string;
  /** Encabezado más angosto para documentos que deben caber en una sola hoja. */
  compact?: boolean;
  /** DUAL: MinEduc + Colegio | MINEDUC: Solo Planta Central | INSTITUCIONAL: Solo Colegio */
  headerMode?: "DUAL" | "MINEDUC" | "INSTITUTIONAL";
}) {
  const showMineduc = headerMode === "DUAL" || headerMode === "MINEDUC";
  const showInstitutionSeal = headerMode === "DUAL" || headerMode === "INSTITUTIONAL";
  const displaySchoolYear = schoolYear && schoolYear.trim() ? schoolYear : currentSchoolYearSpaced();

  const defaultInst = "UNIDAD EDUCATIVA “SANTA ROSA” - 18H00313";
  const displayName = institutionName
    ? institutionName.includes("18H")
      ? institutionName
      : `${institutionName} - 18H00313`
    : defaultInst;

  return (
    <header className="mb-4">
      {/* Fila superior: Logo MinEduc ("El Nuevo Ecuador") - Membrete Central - Sello Institucional */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b-2 border-[#2F5496]">
        {/* Logo Ministerio de Educación / Planta Central (Izquierda) */}
        {showMineduc ? (
          <div className="w-48 sm:w-56 flex items-center justify-start shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mineduc-logo.png"
              alt="Ministerio de Educación, Deporte y Cultura — El Nuevo Ecuador"
              className={`object-contain ${compact ? "h-9 max-w-[170px]" : "h-11 sm:h-12 max-w-[210px]"}`}
            />
          </div>
        ) : (
          <div className="w-6 shrink-0" />
        )}

        {/* Membrete Central Oficial - Tipografía y posicionamiento exacto */}
        <div className="flex-1 text-center leading-tight space-y-0.5 px-1">
          <h1 className={`font-black uppercase tracking-tight text-[#475569] ${compact ? "text-xs" : "text-xs sm:text-[14px]"}`} style={{ fontFamily: "Britannic Bold, Arial, sans-serif" }}>
            {displayName}
          </h1>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#767171] uppercase tracking-wider" style={{ fontFamily: "Agency FB, Arial, sans-serif" }}>
            DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL
          </p>
          <p className="text-[9px] sm:text-[10px] font-bold text-[#767171] uppercase tracking-widest" style={{ fontFamily: "Agency FB, Arial, sans-serif" }}>
            AÑO LECTIVO {displaySchoolYear}
          </p>
        </div>

        {/* Sello / Escudo Institucional (Derecha) */}
        {showInstitutionSeal ? (
          <div className="w-20 sm:w-24 flex items-center justify-end shrink-0">
            {sealImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sealImage}
                alt="Sello institucional"
                className={`object-contain drop-shadow-xs ${compact ? "h-11 max-w-[60px]" : "h-13 sm:h-14 max-w-[70px]"}`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/institution-logo-default.png"
                alt="Sello institucional"
                className={`object-contain drop-shadow-xs ${compact ? "h-11 max-w-[60px]" : "h-13 sm:h-14 max-w-[70px]"}`}
              />
            )}
          </div>
        ) : (
          <div className="w-6 shrink-0" />
        )}
      </div>

      {/* Barra de Título Oficial con el color azul MinEduc (#2F5496) */}
      <div className="text-center mt-2.5 bg-[#2F5496] text-white py-1 px-3 rounded-xs shadow-xs">
        <h2 className={`font-bold uppercase tracking-wide ${compact ? "text-[11px]" : "text-xs sm:text-sm"}`}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-[10px] text-blue-100 font-medium tracking-normal mt-0.5 opacity-90">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
