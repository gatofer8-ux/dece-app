/* eslint-disable @next/next/no-img-element */
import React from "react";

interface SadexLogoProps {
  className?: string;
  variant?: "full" | "compact" | "horizontal" | "icon";
  theme?: "dark" | "light";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
}

export default function SadexLogo({
  className = "",
  variant = "horizontal",
  theme = "dark",
  size = "md",
  showSubtitle = true,
}: SadexLogoProps) {
  const isLight = theme === "light";

  // Tamaños del icono
  const iconSizeClasses = {
    xs: "h-7 w-7 rounded-lg",
    sm: "h-9 w-9 rounded-xl",
    md: "h-11 w-11 rounded-xl",
    lg: "h-16 w-16 rounded-2xl",
    xl: "h-24 w-24 rounded-2xl",
  }[size];

  // Tamaños de tipografía
  const titleSizeClasses = {
    xs: "text-sm",
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl",
  }[size];

  const subtitleSizeClasses = {
    xs: "text-[9px]",
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
    xl: "text-base",
  }[size];

  const iconElement = (
    <div
      className={`relative ${iconSizeClasses} shrink-0 overflow-hidden shadow-md border ${
        isLight ? "border-brand-200 bg-brand-900/5 shadow-brand-500/10" : "border-white/20 bg-brand-950 shadow-black/40 ring-1 ring-white/10"
      } flex items-center justify-center`}
    >
      <img
        src="/sadex-logo.png"
        alt="SADEX Logo - Sasho & Darky"
        className="w-full h-full object-cover"
      />
    </div>
  );

  if (variant === "icon") {
    return <div className={`inline-flex items-center ${className}`}>{iconElement}</div>;
  }

  if (variant === "full") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div className="mb-3">{iconElement}</div>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-wider uppercase font-sans ${titleSizeClasses} ${
              isLight ? "text-brand-900" : "text-white"
            }`}
          >
            SADEX
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            DECE
          </span>
        </div>
        {showSubtitle && (
          <p
            className={`${subtitleSizeClasses} ${
              isLight ? "text-slate-500" : "text-brand-200/90"
            } tracking-tight mt-0.5 max-w-[260px]`}
          >
            Sistema de Acompañamiento, DECE y Expedientes
          </p>
        )}
      </div>
    );
  }

  // Horizontal (para Sidebar y Header)
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {iconElement}
      <div className="min-w-0 flex flex-col justify-center text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-black tracking-wider uppercase font-sans ${titleSizeClasses} ${
              isLight ? "text-brand-900" : "text-white"
            }`}
          >
            SADEX
          </span>
          <span className="px-1 py-0.2 rounded-sm text-[9px] font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            DECE
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`${subtitleSizeClasses} ${
              isLight ? "text-slate-500" : "text-brand-200/90"
            } truncate leading-tight font-medium mt-0.5`}
          >
            Sistema de Acompañamiento
          </span>
        )}
      </div>
    </div>
  );
}
