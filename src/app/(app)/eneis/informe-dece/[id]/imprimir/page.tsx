import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import {
  ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS,
  parseEneisInformeDeceActividades,
  formatPeriodoDece,
} from "@/lib/eneis/eneisInformeDece";
import { getEneisInformeDeceNumero } from "@/lib/eneis/eneisInformeDeceNumero";
import type { EneisInformeDeceRow, InstitutionRow } from "@/lib/types";

function fmt(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "—";
}

export default async function ImprimirEneisInformeDecePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const informe = db
    .prepare("SELECT * FROM eneis_informes_dece WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisInformeDeceRow | undefined;
  if (!informe) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const sig = getSignatureDefaults(session as never, institutionId);
  const numero = getEneisInformeDeceNumero(institutionId, informe.id);
  const actividades = parseEneisInformeDeceActividades(informe.actividades_json);

  const cell = "border border-slate-800 px-2 py-1 align-top text-[9.5pt]";
  const title = `${cell} font-bold text-center`;

  return (
    <div className="max-w-4xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href="/eneis/informe-dece" className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <Link href={`/eneis/informe-dece/${params.id}/editar`} className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold">✏️ Editar</Link>
          <a href={`/api/eneis/informe-dece/${params.id}/export-word`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">📥 Descargar Word</a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 text-black">
        <style>{`@media print { @page { size: A4 landscape; margin: 1.2cm; } }`}</style>

        <p className="text-sm font-bold">INFORME DE ACTIVIDADES Nº {numero}</p>
        <p className="text-sm font-bold">INSTITUCIÓN EDUCATIVA: {institution.name}</p>
        <p className="text-sm font-bold">CODIGO AMIE: {institution.amie_code || "—"}</p>
        <p className="text-sm font-bold mb-3">MES Y AÑO: {formatPeriodoDece(informe.periodo)}</p>

        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={title} style={{ width: "28%" }}>Actividad Requerida</td>
              <td className={title} style={{ width: "24%" }}>Actividad ejecutada</td>
              <td className={title} style={{ width: "10%" }}>Fecha</td>
              <td className={title} style={{ width: "14%" }}>Nº de beneficiados</td>
              <td className={title}>Registro Fotográfico (sólo 1 fotografía, no collage, por cada ítem)</td>
            </tr>
            {ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS.map((req, i) => {
              const a = actividades[i];
              return (
                <tr key={i}>
                  <td className={`${cell} text-justify`}>{req}</td>
                  <td className={cell}>{a?.ejecutada || " "}</td>
                  <td className={cell}>{fmt(a?.fecha)}</td>
                  <td className={cell}>{a?.beneficiarios || " "}</td>
                  <td className={`${cell} text-center`}>
                    {a?.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.foto} alt="Registro fotográfico" className="inline-block max-h-20" />
                    ) : (
                      " "
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-8 text-sm">
          <p>Firma:</p>
          <p className="mt-6">_______________________</p>
          <p className="font-semibold">{sig.deceProfessional.fullName}</p>
          <p>{sig.deceProfessional.role}</p>
        </div>
      </div>
    </div>
  );
}
