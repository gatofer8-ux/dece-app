import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/pasantes";
import type { InstitutionRow } from "@/lib/types";
import PrintButton from "@/components/PrintButton";

export default async function PrintQrPosterPage() {
  const session = await getSession();
  if (!session || !session.user || !session.user.institution_id) {
    redirect("/login");
  }

  const institutionId = session.user.institution_id;
  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const hostUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://dece-app-production.up.railway.app";

  const qrUrl = `${hostUrl}/pasantes/marcar?inst=${institutionId}`;
  const qrImage = await generateQrDataUrl(qrUrl);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 font-sans p-4 sm:p-8 flex flex-col items-center justify-center">
      {/* BARRA DE ACCIÓN WEB */}
      <div className="no-print mb-6 p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between w-full max-w-xl shadow-xs">
        <Link
          href="/pasantes"
          className="text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          ← Volver a Pasantes
        </Link>
        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {/* PÓSTER CARTEL TAMAÑO A4 */}
      <div className="w-full max-w-xl bg-white border-2 border-slate-900 p-8 sm:p-12 rounded-3xl shadow-xl print:shadow-none print:border-2 print:border-black text-center flex flex-col items-center justify-between space-y-6">
        {/* ENCABEZADO INSTITUCIONAL */}
        <div className="space-y-2 border-b-2 border-slate-900 pb-5 w-full">
          {institution?.seal_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={institution.seal_image}
              alt="Sello Institucional"
              className="h-20 mx-auto object-contain mb-2"
            />
          )}
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {institution?.name || "UNIDAD EDUCATIVA"}
          </h1>
          <div className="inline-block px-4 py-1 rounded-full bg-indigo-900 text-white font-extrabold text-xs tracking-widest uppercase">
            DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)
          </div>
        </div>

        {/* TÍTULO DEL CARTEL */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wide">
            PUNTO DE REGISTRO QR
          </h2>
          <p className="text-sm font-bold text-indigo-700 uppercase tracking-wider">
            ENTRADA Y SALIDA · PASANTES Y VOLUNTARIOS
          </p>
        </div>

        {/* CÓDIGO QR GIGANTE */}
        <div className="p-5 bg-white border-4 border-slate-900 rounded-3xl shadow-md inline-block">
          {qrImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrImage}
              alt="Código QR Asistencia DECE"
              className="w-64 h-64 mx-auto rounded-xl"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-sm font-bold text-slate-400">
              Generando QR...
            </div>
          )}
        </div>

        {/* INSTRUCCIONES EN 3 PASOS */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5">
          <div className="text-xs font-black uppercase text-slate-800 tracking-wider text-center mb-1">
            Instrucciones para marcar tu asistencia:
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-700">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              1
            </span>
            <span>Abre la cámara de tu teléfono celular y apunta a este código QR.</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-700">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              2
            </span>
            <span>Toca el enlace que aparecerá en tu pantalla.</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-700">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              3
            </span>
            <span>
              Verifica tu nombre y presiona{" "}
              <strong className="text-emerald-700">"REGISTRAR ENTRADA"</strong> o{" "}
              <strong className="text-red-700">"REGISTRAR SALIDA"</strong>.
            </span>
          </div>
        </div>

        {/* PIE DEL CARTEL */}
        <div className="pt-2 text-[11px] text-slate-500 font-medium">
          Departamento de Consejería Estudiantil (DECE) · Control de Prácticas y Vinculación
        </div>
      </div>
    </div>
  );
}
