"use client";

import { useState } from "react";

export interface WhatsAppNotificationButtonProps {
  phoneNumber?: string | null;
  recipientName: string;
  studentName: string;
  citationNumber: string;
  date: string;
  time?: string | null;
  reason?: string | null;
  institutionName?: string | null;
  compact?: boolean;
}

export function formatEcuadorPhone(rawPhone: string): string {
  // Limpiar caracteres no numéricos
  let digits = rawPhone.replace(/\D/g, "");

  // Si empieza con 09... (típico móvil ecuatoriano), transformar a 5939...
  if (digits.startsWith("09") && digits.length === 10) {
    digits = "593" + digits.slice(1);
  } else if (digits.startsWith("9") && digits.length === 9) {
    digits = "593" + digits;
  }

  return digits;
}

export default function WhatsAppNotificationButton({
  phoneNumber,
  recipientName,
  studentName,
  citationNumber,
  date,
  time,
  reason,
  institutionName,
  compact = false,
}: WhatsAppNotificationButtonProps) {
  const [customPhone, setCustomPhone] = useState(phoneNumber || "");
  const [showPrompt, setShowPrompt] = useState(false);

  const generateWhatsAppUrl = (targetPhone: string) => {
    const cleanPhone = formatEcuadorPhone(targetPhone);

    const message = `Estimado/a *${recipientName}*, le saludamos cordialmente del Departamento de Consejería Estudiantil (DECE)${
      institutionName ? ` de la institución *${institutionName}*` : ""
    }.

Le convocamos cordialmente a una reunión formal respecto a su representado/a *${studentName}*:

📅 *Fecha:* ${date}
⏰ *Hora:* ${time || "Por definir"}
📌 *Convocatoria N°:* ${citationNumber}
${reason ? `📝 *Asunto/Motivo:* ${reason}\n` : ""}
Agradecemos confirmar su asistencia por este medio. Su presencia es fundamental para el bienestar integral de su representado/a.`;

    const encoded = encodeURIComponent(message.trim());
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  };

  const handleClick = () => {
    const phone = customPhone || phoneNumber;
    if (!phone || phone.trim().length < 8) {
      setShowPrompt(true);
      return;
    }

    const url = generateWhatsAppUrl(phone);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhone.trim()) return;
    setShowPrompt(false);
    const url = generateWhatsAppUrl(customPhone);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150 shadow-xs active:scale-[0.98] bg-[#25D366] hover:bg-[#20bd5a] text-white ${
          compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
        }`}
        title="Enviar citación formal al representante por WhatsApp"
      >
        <span className="text-sm">💬</span>
        <span>{compact ? "WhatsApp" : "Enviar Citación por WhatsApp"}</span>
      </button>

      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-toast-in">
          <div className="card w-full max-w-sm bg-white p-5 shadow-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span>💬</span> Número de WhatsApp
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Ingresa el número celular de WhatsApp para enviar la citación a <strong>{recipientName}</strong>:
            </p>

            <form onSubmit={handlePromptSubmit} className="space-y-3">
              <input
                type="tel"
                placeholder="ej. 0991234567"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="input text-sm w-full font-mono"
                autoFocus
                required
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPrompt(false)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white border-0"
                >
                  Abrir WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
