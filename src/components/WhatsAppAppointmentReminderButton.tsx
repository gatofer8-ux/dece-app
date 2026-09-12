"use client";

import { useState } from "react";

export interface WhatsAppAppointmentReminderButtonProps {
  recipientPhone?: string | null;
  recipientName?: string | null;
  studentName?: string | null;
  studentCourse?: string | null;
  professionalName: string;
  institutionName?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  title: string;
  compact?: boolean;
}

export function formatEcuadorPhone(rawPhone: string): string {
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("09") && digits.length === 10) {
    digits = "593" + digits.slice(1);
  } else if (digits.startsWith("9") && digits.length === 9) {
    digits = "593" + digits;
  }
  return digits;
}

export function generateAppointmentWhatsAppMessage(opts: {
  recipientName?: string | null;
  studentName?: string | null;
  studentCourse?: string | null;
  professionalName: string;
  institutionName?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  title: string;
}): string {
  const repGreeting = opts.recipientName
    ? `Estimado/a *${opts.recipientName.trim()}*`
    : "Estimado/a *Representante / Familia*";

  const instNotice = opts.institutionName
    ? ` de la institución *${opts.institutionName.trim()}*`
    : "";

  const studentNotice = opts.studentName
    ? `su representado/a *${opts.studentName.trim()}*${opts.studentCourse ? ` (${opts.studentCourse})` : ""}`
    : "su representado/a";

  const timeRange = `${opts.startTime}${opts.endTime ? ` a ${opts.endTime}` : ""}`;
  const locText = opts.location && opts.location.trim().length > 0 ? opts.location.trim() : "Oficina DECE";

  const lines = [
    `${repGreeting}, le saludamos cordialmente del Departamento de Consejería Estudiantil (DECE)${instNotice}.`,
    "",
    `Le recordamos la cita programada para el acompañamiento y bienestar integral de ${studentNotice}:`,
    "",
    `📅 *Fecha:* ${opts.date}`,
    `⏰ *Hora:* ${timeRange}`,
    `👤 *Profesional DECE:* ${opts.professionalName}`,
    `📍 *Lugar / Aula / Bloque:* ${locText}`,
    `📌 *Motivo / Asunto:* ${opts.title}`,
    "",
    "⚠️ *Recomendaciones importantes para su visita:*",
    "• Por favor acudir con su documento de identidad (cédula original) para el registro de ingreso institucional.",
    "• Se solicita puntualidad estricta (presentarse 5 minutos antes de la hora fijada).",
    "• En caso de algún contratiempo o necesidad de reagendar, favor notificar con debida anticipación.",
    "",
    "Agradecemos su compromiso y colaboración activa con la comunidad educativa.",
  ];

  return lines.join("\n");
}

export default function WhatsAppAppointmentReminderButton({
  recipientPhone,
  recipientName,
  studentName,
  studentCourse,
  professionalName,
  institutionName,
  date,
  startTime,
  endTime,
  location,
  title,
  compact = false,
}: WhatsAppAppointmentReminderButtonProps) {
  const [customPhone, setCustomPhone] = useState(recipientPhone || "");
  const [showModal, setShowModal] = useState(false);

  const messageText = generateAppointmentWhatsAppMessage({
    recipientName,
    studentName,
    studentCourse,
    professionalName,
    institutionName,
    date,
    startTime,
    endTime,
    location,
    title,
  });

  const handleOpenWhatsApp = (phoneToUse: string) => {
    const cleanPhone = formatEcuadorPhone(phoneToUse);
    const encoded = encodeURIComponent(messageText);
    const url = cleanPhone.length >= 9
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = (customPhone || recipientPhone || "").trim();
    if (!phone || phone.length < 8) {
      setShowModal(true);
      return;
    }
    handleOpenWhatsApp(phone);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhone.trim()) return;
    setShowModal(false);
    handleOpenWhatsApp(customPhone.trim());
  };

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center justify-center gap-1 rounded-lg font-semibold transition-all duration-150 shadow-xs active:scale-[0.98] bg-[#25D366] hover:bg-[#20bd5a] text-white ${
            compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs"
          }`}
          title={
            recipientPhone
              ? `Enviar recordatorio por WhatsApp (${recipientPhone})`
              : "Enviar recordatorio por WhatsApp (ingresar número)"
          }
        >
          <span className="text-xs">💬</span>
          <span>{compact ? "WhatsApp" : "Recordatorio WhatsApp"}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          className="p-1 text-slate-400 hover:text-slate-600 rounded transition text-xs"
          title="Ver mensaje y configurar número de teléfono"
        >
          ⚙️
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="text-base">💬</span> Recordatorio de Cita por WhatsApp
              </h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Celular / WhatsApp del Representante
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">🇪🇨 +593</span>
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="0991234567"
                    className="input text-xs w-full pl-18 font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Puedes ingresar el celular con formato <code>09XXXXXXXX</code> o internacional.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vista Previa del Mensaje Oficial DECE
                </label>
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs text-slate-700 font-sans whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {messageText}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent flex items-center gap-1.5"
                >
                  <span>💬</span> Abrir en WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
