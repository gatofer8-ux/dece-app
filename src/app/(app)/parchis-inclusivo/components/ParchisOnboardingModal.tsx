"use client";

import React, { useState } from "react";

interface ParchisOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  highlights: { title: string; desc: string; icon: string }[];
}

const TOUR_STEPS: TourStep[] = [
  {
    badge: "Paso 1 de 4: Metodología",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    icon: "🤝",
    title: "Parchís Inclusivo — Respiramos Inclusión",
    subtitle: "Herramienta pedagógica vivencial desarrollada por World Vision Ecuador y ACNUR",
    description:
      "Diseñado para talleres DECE y ferias educativas masivas. Promueve la empatía, la resolución pacífica de conflictos y la convivencia armónica a través del juego colaborativo proyectado en pantalla gigante o tablet.",
    highlights: [
      {
        icon: "👥",
        title: "Dinámica en Equipos",
        desc: "Cada equipo representa a un grupo de estudiantes, docentes o familias que dialogan antes de responder.",
      },
      {
        icon: "🗣️",
        title: "Facilitador / Conductor",
        desc: "El facilitador guía los tiempos, lee las preguntas y valida las respuestas consensuadas.",
      },
      {
        icon: "🕊️",
        title: "Espacio Seguro",
        desc: "No hay eliminación punitiva: los errores son oportunidades de aprendizaje restaurativo.",
      },
    ],
  },
  {
    badge: "Paso 2 de 4: Los 4 Ejes Temáticos",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    icon: "🧭",
    title: "El Circuito de 68 Casilleros",
    subtitle: "Cada cuadrante del tablero clásico aborda una dimensión fundamental de la inclusión",
    description:
      "El tablero perimetral estilo Monopolio recorre 4 colores clave. Al caer en un casillero, el equipo reflexiona sobre la temática correspondiente:",
    highlights: [
      {
        icon: "🟡",
        title: "Amarillo: Identidad (1 al 17)",
        desc: "Autoestima, raíces culturales, autoconocimiento y valoración personal.",
      },
      {
        icon: "🟢",
        title: "Verde: Diversidad (18 al 34)",
        desc: "Respeto a las diferencias, interculturalidad, inclusión de personas en movilidad y NEE.",
      },
      {
        icon: "🟣",
        title: "Violeta: Justicia y Derechos (35 al 51)",
        desc: "Equidad de género, prevención de violencia, derechos de la niñez y no discriminación.",
      },
      {
        icon: "🔵",
        title: "Azul: Cambio Social (52 al 68)",
        desc: "Participación estudiantil, liderazgo transformador, ciudadanía activa y paz.",
      },
    ],
  },
  {
    badge: "Paso 3 de 4: Dinámica de Juego",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    icon: "🎲",
    title: "Lanzamiento y Movimiento de Fichas",
    subtitle: "Reglas oficiales adaptadas para dinámicas grupales ágiles",
    description:
      "El flujo de juego sigue 3 momentos claros: Tirar el dado, Mover la ficha casilla por casilla, y Resolver el reto pedagógico en equipo.",
    highlights: [
      {
        icon: "5️⃣",
        title: "Regla del 5",
        desc: "Al sacar 5, una ficha en base puede entrar al circuito, o una ficha en juego puede avanzar 5 casillas o reubicarse en Inicio.",
      },
      {
        icon: "6️⃣",
        title: "Regla del 6 y Repetición",
        desc: "Al sacar 6, el equipo repite el tiro. ¡Atención! Si se sacan 3 seis consecutivos, por solidaridad cede 6 casilleros al equipo en desventaja.",
      },
      {
        icon: "🏃",
        title: "Salto Visible en Arco",
        desc: "Las fichas rebotan casilla por casilla con sonido y animación física, permitiendo a todo el auditorio seguir la jugada.",
      },
    ],
  },
  {
    badge: "Paso 4 de 4: Convivencia y Retos",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    icon: "🏆",
    title: "Zonas Inclusivas, Barreras y Metas",
    subtitle: "Mecánicas diseñadas para educar en empatía y solidaridad",
    description:
      "El tablero fomenta la cooperación entre todos los participantes para lograr una meta comunitaria colectiva:",
    highlights: [
      {
        icon: "🛡️",
        title: "Casillas Seguras e Inclusivas",
        desc: "En casillas seguras (★) pueden convivir fichas de distintos equipos sin bloquearse ni capturarse.",
      },
      {
        icon: "🚧",
        title: "Barreras de Convivencia",
        desc: "Dos fichas del mismo equipo forman una barrera que detiene el paso hasta que se abran.",
      },
      {
        icon: "🎉",
        title: "Celebración y Bono de +10",
        desc: "Al coronar una ficha en la Meta, el equipo canta su barra inclusiva y otorga un bono solidario de +10 a otro equipo.",
      },
    ],
  },
];

export const ParchisOnboardingModal: React.FC<ParchisOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sadex_parchis_tour_completed", "true");
      } catch (e) {
        // Ignorar en caso de storage restringido
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border-2 border-amber-400/60 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Fondo decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado con badge y botón cerrar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full font-black border uppercase tracking-wider ${step.badgeColor}`}
            >
              {step.badge}
            </span>
          </div>
          <button
            type="button"
            onClick={handleComplete}
            className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-all"
            title="Saltar e iniciar"
          >
            ✕
          </button>
        </div>

        {/* Contenido del paso actual */}
        <div className="py-5 overflow-y-auto flex-1 relative z-10 space-y-4">
          <div className="flex items-start gap-4">
            <span className="text-4xl sm:text-5xl p-3 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-inner flex-shrink-0">
              {step.icon}
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {step.title}
              </h2>
              <p className="text-xs sm:text-sm text-amber-300/90 font-medium mt-1">
                {step.subtitle}
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            {step.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {step.highlights.map((h, i) => (
              <div
                key={i}
                className="bg-slate-800/70 border border-slate-700/80 p-3 rounded-2xl space-y-1 hover:border-amber-400/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{h.icon}</span>
                  <h4 className="text-xs font-black text-amber-200 leading-tight">{h.title}</h4>
                </div>
                <p className="text-2xs text-slate-400 leading-snug">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer con indicadores de paso y controles */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          {/* Indicadores de bolitas */}
          <div className="flex items-center gap-2">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Ir al paso ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  idx === currentStep
                    ? "w-8 bg-amber-400 shadow-lg shadow-amber-500/40"
                    : "w-2.5 bg-slate-700 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>

          {/* Botones de navegación */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
              >
                ← Anterior
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all"
              >
                Saltar Guía
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>{currentStep === TOUR_STEPS.length - 1 ? "¡Comenzar Taller! 🚀" : "Siguiente →"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
