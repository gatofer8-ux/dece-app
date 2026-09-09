import nodemailer from "nodemailer";

// Envío de correo vía SMTP genérico (pensado para usarse con una cuenta de
// Gmail normal + "contraseña de aplicación", que es gratuita y no requiere
// contratar ningún servicio externo). Variables de entorno:
//   SMTP_HOST (opcional, por defecto smtp.gmail.com)
//   SMTP_PORT (opcional, por defecto 465)
//   SMTP_USER — la cuenta de correo que envía
//   SMTP_PASS — la contraseña de aplicación
//   SMTP_FROM (opcional) — nombre visible del remitente, por defecto SMTP_USER
//
// Si estas variables no están configuradas, sendEmail no falla: solo registra
// una advertencia en los logs, para que el resto de la app siga funcionando
// mientras el usuario termina de configurar el correo.

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== undefined) return transporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.warn("[email] SMTP_USER/SMTP_PASS no configurados — los correos no se enviarán (solo se registrarán en los logs).");
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  return transporter;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] (no enviado, SMTP sin configurar) Para: ${opts.to} — Asunto: ${opts.subject}`);
    return false;
  }
  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
    await t.sendMail({ from: `"Sistema de Gestión DECE" <${from}>`, to: opts.to, subject: opts.subject, html: opts.html });
    return true;
  } catch (err) {
    console.error("[email] Error al enviar:", err);
    return false;
  }
}

export function emailShell(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1e293b;">
    <div style="background:#1e3a5f;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
      <strong style="font-size:16px;">Sistema de Gestión DECE</strong>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
      <h2 style="font-size:16px;margin:0 0 12px 0;">${title}</h2>
      ${bodyHtml}
    </div>
    <p style="font-size:11px;color:#94a3b8;margin-top:12px;">Este es un mensaje automático del Departamento de Consejería Estudiantil.</p>
  </div>`;
}
