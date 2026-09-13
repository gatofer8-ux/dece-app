"use client";

import React, { useState } from "react";
import { BACKUP_QUESTIONS, FUN_FACTS, OFFICIAL_CREDIT } from "@/lib/parchis/parchisCatalog";

interface ParchisFacilitatorDrawerProps {
  isOpen: boolean;
  soundEnabled: boolean;
  onClose: () => void;
  onToggleSound: () => void;
  onResetGame: () => void;
  onForceNextTurn: () => void;
}

export const ParchisFacilitatorDrawer: React.FC<ParchisFacilitatorDrawerProps> = ({
  isOpen,
  soundEnabled,
  onClose,
  onToggleSound,
  onResetGame,
  onForceNextTurn,
}) => {
  const [activeTab, setActiveTab] = useState<"REGLAS" | "RESPALDO" | "CURIOSIDADES" | "HERRAMIENTAS">(
    "REGLAS"
  );
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        {/* Cabecera del Cajón */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧰</span>
            <h3 className="font-black text-lg">Caja de Herramientas del Facilitador</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("REGLAS")}
            className={`flex-1 py-3 text-center border-b-2 transition-all ${
              activeTab === "REGLAS"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📜 Reglas Oficiales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("RESPALDO")}
            className={`flex-1 py-3 text-center border-b-2 transition-all ${
              activeTab === "RESPALDO"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📖 Preguntas Respaldo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CURIOSIDADES")}
            className={`flex-1 py-3 text-center border-b-2 transition-all ${
              activeTab === "CURIOSIDADES"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            💡 Datos Curiosos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("HERRAMIENTAS")}
            className={`flex-1 py-3 text-center border-b-2 transition-all ${
              activeTab === "HERRAMIENTAS"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            ⚙️ Control
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "REGLAS" && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 font-medium">
                Metodología basada en los 4 ejes:
                <div className="grid grid-cols-2 gap-2 mt-2 font-bold">
                  <span className="text-amber-700">🪞 Identidad (Amarillo)</span>
                  <span className="text-emerald-700">🌱 Diversidad (Verde)</span>
                  <span className="text-purple-700">⚖️ Justicia (Violeta)</span>
                  <span className="text-sky-700">🌊 Cambio Social (Azul)</span>
                </div>
              </div>

              <ol className="space-y-3 list-decimal list-inside font-medium">
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Equipos y fichas:</strong> Hasta 4 equipos con 2 a 4 fichas, comenzando en el
                  casillero «Inicia el camino inclusivo».
                </li>
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Desempate inicial:</strong> Cada equipo lanza el dado al inicio; el número más
                  alto empieza la partida.
                </li>
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Avance y reto:</strong> Al llegar a un casillero, el equipo debe resolver la
                  pregunta o reto en conjunto. Si no lo resuelve, la ficha se queda donde estaba.
                </li>
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Regla del 5:</strong> Si se saca un 5, el equipo puede avanzar 5 casilleros o
                  colocar/reiniciar una ficha en el casillero de inicio.
                </li>
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Barrera contra la discriminación:</strong> Dos fichas del mismo equipo forman una
                  barrera infranqueable. Si otro equipo cae exactamente ahí, retrocede el valor de su dado.
                </li>
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Zonas Inclusivas:</strong> Casilleros de bienvenida (5, 22, 39, 56) y de ejes
                  inclusivos permiten la convivencia pacífica de fichas de distintos equipos sin comerse.
                </li>
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Identificación de acto discriminatorio (+15):</strong> Si una ficha cae sobre
                  otra en casillero NO inclusivo, avanza +15 casilleros y la ficha contraria regresa al
                  inicio a reflexionar.
                </li>
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Regla del 6 y Solidaridad:</strong> Sacar 6 otorga turno extra tras resolver el
                  reto. Un tercer 6 consecutivo se cede obligatoriamente al equipo en mayor desventaja.
                </li>
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Llegada a la meta (+10):</strong> Canto de barra inclusiva + elección de +10
                  casilleros a ficha propia o al equipo en desventaja.
                </li>
                <li className="p-2 rounded-lg bg-slate-50">
                  <strong>Victoria:</strong> El primer equipo en coronar todas sus fichas gana la dinámica.
                </li>
              </ol>
            </div>
          )}

          {activeTab === "RESPALDO" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Utiliza estas 11 preguntas oficiales cuando un equipo no entienda la de su casillero:
              </p>
              <div className="space-y-2">
                {BACKUP_QUESTIONS.map((q) => (
                  <div key={q.letter} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <strong className="text-blue-700 font-black">[{q.letter}]</strong>{" "}
                    <span className="text-slate-800 font-medium">{q.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "CURIOSIDADES" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Datos curiosos de apoyo pedagógico para compartir con el auditorio durante la dinámica:
              </p>
              <div className="space-y-3">
                {FUN_FACTS.map((f) => (
                  <div key={f.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-xs flex gap-3 items-start">
                    <span className="text-lg">💡</span>
                    <p className="text-amber-950 font-medium leading-relaxed">{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "HERRAMIENTAS" && (
            <div className="space-y-6 text-xs">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Controles Rápidos de Taller</h4>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span>Efectos de sonido (Web Audio):</span>
                  <button
                    type="button"
                    onClick={onToggleSound}
                    className={`px-3 py-1.5 rounded-lg font-bold ${
                      soundEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {soundEnabled ? "🔊 Activado" : "🔇 Silenciado"}
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span>Pasar turno manualmente:</span>
                  <button
                    type="button"
                    onClick={onForceNextTurn}
                    className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 font-bold hover:bg-blue-200"
                  >
                    ⏭️ Siguiente equipo
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 space-y-3">
                <h4 className="font-bold text-rose-900 text-sm">Reiniciar Partida</h4>
                <p className="text-rose-700">
                  Reinicia la partida actual para configurar nuevos equipos y participantes.
                </p>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700"
                  >
                    ⚠️ Reiniciar Partida
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmReset(false);
                        onResetGame();
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-700 text-white font-black hover:bg-rose-800"
                    >
                      Sí, reiniciar ahora
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie con crédito institucional oficial */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-2xs text-slate-500 leading-normal">
          {OFFICIAL_CREDIT}
        </div>
      </div>
    </div>
  );
};
