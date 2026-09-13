import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import { getOvpProcessReportData } from "@/lib/ovp/ovpProcessReportData";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

function lines(t: string | null | undefined) {
  return (t || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

export default async function OvpProcessReportPage() {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const data = getOvpProcessReportData(institutionId);
  if (!data || !data.institution) notFound();

  const cell = "border border-slate-500 px-2 py-1 align-top text-[10.5pt]";
  const head = `${cell} bg-[#D9D9D9] font-bold text-center`;
  const secH = "text-[#17365D] font-bold text-[13pt] mt-4 mb-1";
  const subH = "text-[#2E74B5] font-bold text-[10.5pt] mt-2 mb-1";
  const p = "text-[10.5pt] text-justify leading-snug mb-1";

  return (
    <div className="max-w-4xl mx-auto bg-white space-y-4">
      {/* Barra superior sin impresión */}
      <div className="no-print p-3 bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-2 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/ovp"
            className="text-xs text-slate-600 font-bold hover:text-slate-900 flex items-center gap-1"
          >
            <span>←</span> Volver a OVP
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href="/ovp/consolidado"
            className="text-xs text-indigo-700 font-bold hover:text-indigo-900 flex items-center gap-1"
          >
            <span>🎓</span> Informes Vocacionales Consolidados
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/ovp/informe-proceso/export-word"
            className="btn-secondary text-xs flex items-center gap-1 font-bold text-blue-900 bg-blue-50 border-blue-200 hover:bg-blue-100"
          >
            <span>📥</span> Descargar Word (.docx)
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Documento Imprimible formato A4 Talleres */}
      <div id="printable-content" className="p-8 print:p-0 font-serif text-black border border-slate-200 print:border-0 rounded-2xl print:rounded-none shadow-sm print:shadow-none bg-white">
        <style>{`@media print { @page { size: A4; margin: 1.4cm; } }`}</style>
        
        <DocumentHeader
          title="Informe Técnico del Proceso Institucional de OVP"
          subtitle="Departamento de Consejería Estudiantil — DECE"
          institutionName={data.institution.name}
          sealImage={data.institution.seal_image}
          compact
        />

        {/* 1. DATOS GENERALES */}
        <table className="w-full border-collapse mt-3">
          <tbody>
            <tr>
              <td className={head} colSpan={4}>
                DATOS GENERALES
              </td>
            </tr>
            <tr>
              <td className={head}>Fecha de Informe</td>
              <td className={cell}>{fmt(data.reportDate)}</td>
              <td className={head}>No. De Informe</td>
              <td className={`${cell} font-semibold`}>{data.reportNumber}</td>
            </tr>
            <tr>
              <td className={head}>Funcionario Responsable de Informe</td>
              <td className={head}>Nombre</td>
              <td className={head}>Contacto</td>
              <td className={head}>Cargo</td>
            </tr>
            <tr>
              <td className={cell}></td>
              <td className={`${cell} font-semibold`}>
                {data.elaboratedByName}
              </td>
              <td className={cell}>
                {data.professional?.email || "—"}
              </td>
              <td className={cell}>{data.elaboratedByRole}</td>
            </tr>
            <tr>
              <td className={head}>Informe dirigido a</td>
              <td className={head}>Nombre</td>
              <td className={head}>Contacto</td>
              <td className={head}>Cargo</td>
            </tr>
            <tr>
              <td className={cell}></td>
              <td className={`${cell} font-semibold`}>
                {data.approvedByName}
              </td>
              <td className={cell}>
                {data.authority?.email || "—"}
              </td>
              <td className={cell}>{data.approvedByRole}</td>
            </tr>
          </tbody>
        </table>

        {/* TEMA */}
        <table className="w-full border-collapse mt-2">
          <tbody>
            <tr>
              <td className={head} style={{ width: "14%" }}>
                TEMA:
              </td>
              <td className={`${cell} font-semibold text-justify uppercase`}>
                {data.tema}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 1. ANTECEDENTES */}
        <h2 className={secH}>1. ANTECEDENTES</h2>
        <p className={subH}>1.1 ÁMBITO LEGAL</p>
        <p className={subH}>BASE LEGAL</p>
        {lines(data.legalBasis).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        <p className={subH}>ALCANCE</p>
        {lines(data.scopeText).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        <p className={subH}>OBJETIVOS</p>
        <p className="font-bold text-[10.5pt] mt-1">Objetivo General:</p>
        {lines(data.objectiveGeneral).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        <p className="font-bold text-[10.5pt] mt-2">Objetivos Específicos:</p>
        {lines(data.objectivesSpecific).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        {/* 2. DESARROLLO EN BASE A LOS TRES EJES */}
        <h2 className={secH}>2. DESARROLLO O ANÁLISIS EN BASE A LOS TRES EJES DE OVP</h2>
        {lines(data.developmentAnalysis).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        <h3 className={subH}>2.1 EJE DE AUTOCONOCIMIENTO (TALENTOS Y ARQUETIPOS VOCACIONALES)</h3>
        {lines(data.ejeAutoconocimiento).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        <h3 className={subH}>2.2 EJE DE INFORMACIÓN (OFERTA EDUCATIVA Y CAMPOS PROFESIONALES)</h3>
        {lines(data.ejeInformacion).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        <h3 className={subH}>2.3 EJE DE TOMA DE DECISIONES (PREFERENCIAS IPPJ Y PROYECTO DE VIDA)</h3>
        {lines(data.ejeTomaDecisiones).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        {/* 3. ACTIVIDADES REALIZADAS */}
        <h2 className={secH}>3. ACTIVIDADES REALIZADAS Y CRONOGRAMA</h2>
        <table className="w-full border-collapse mt-2">
          <thead>
            <tr>
              <th className={head} style={{ width: "6%" }}>No.</th>
              <th className={head} style={{ width: "34%" }}>Actividad Desarrollada</th>
              <th className={head} style={{ width: "20%" }}>Eje OVP</th>
              <th className={head} style={{ width: "12%" }}>Período</th>
              <th className={head} style={{ width: "14%" }}>Responsable</th>
              <th className={head} style={{ width: "14%" }}>Beneficiarios</th>
            </tr>
          </thead>
          <tbody>
            {data.activities.map((act, i) => (
              <tr key={i}>
                <td className={`${cell} text-center font-bold`}>{i + 1}</td>
                <td className={cell}>{act.name}</td>
                <td className={`${cell} text-xs font-semibold`}>{act.axis}</td>
                <td className={`${cell} text-center text-xs`}>{act.date}</td>
                <td className={`${cell} text-xs`}>{act.responsible}</td>
                <td className={`${cell} text-xs text-center`}>{act.beneficiaries}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 4. RESULTADOS Y COBERTURA */}
        <h2 className={secH}>4. RESULTADOS Y COBERTURA</h2>
        <table className="w-full border-collapse mt-2">
          <thead>
            <tr>
              <th className={head} style={{ width: "50%" }}>AVANCES Y COBERTURA REGISTRADA</th>
              <th className={head} style={{ width: "50%" }}>NUDOS CRÍTICOS / RETOS DETECTADOS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cell}>
                {lines(data.advances).map((l, i) => (
                  <p key={i} className={p}>{l}</p>
                ))}
              </td>
              <td className={cell}>
                {lines(data.criticalNodes).map((l, i) => (
                  <p key={i} className={p}>{l}</p>
                ))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 5. CONCLUSIONES */}
        <h2 className={secH}>5. CONCLUSIONES</h2>
        {lines(data.conclusions).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        {/* 6. RECOMENDACIONES */}
        <h2 className={secH}>6. RECOMENDACIONES</h2>
        {lines(data.recommendations).map((l, i) => (
          <p key={i} className={p}>
            {l}
          </p>
        ))}

        {/* TABLAS DE FIRMAS */}
        <div className="mt-8 space-y-4">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={head} colSpan={3}>
                  DESARROLLO DEL DOCUMENTO
                </td>
              </tr>
              <tr>
                <td className={head} style={{ width: "50%" }}>Nombre / Cargo</td>
                <td className={head} style={{ width: "30%" }}>Firma y Sello</td>
                <td className={head} style={{ width: "20%" }}>Fecha</td>
              </tr>
              <tr>
                <td className={cell}>
                  <p className="font-bold">{data.elaboratedByName}</p>
                  <p className="text-xs text-slate-600">{data.elaboratedByRole}</p>
                </td>
                <td className={`${cell} text-center h-20 align-bottom pb-2`}>
                  <span className="text-[9pt] italic text-slate-400">Firma y Sello Oficial</span>
                </td>
                <td className={`${cell} text-center align-middle`}>
                  {fmt(data.reportDate)}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={head} colSpan={3}>
                  APROBACIÓN DEL DOCUMENTO
                </td>
              </tr>
              <tr>
                <td className={head} style={{ width: "50%" }}>Nombre / Cargo</td>
                <td className={head} style={{ width: "30%" }}>Firma y Sello</td>
                <td className={head} style={{ width: "20%" }}>Fecha</td>
              </tr>
              <tr>
                <td className={cell}>
                  <p className="font-bold">{data.approvedByName}</p>
                  <p className="text-xs text-slate-600">{data.approvedByRole}</p>
                </td>
                <td className={`${cell} text-center h-20 align-bottom pb-2`}>
                  <span className="text-[9pt] italic text-slate-400">Firma y Sello Oficial</span>
                </td>
                <td className={`${cell} text-center align-middle`}>
                  {fmt(data.reportDate)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Cuadro de Custodia Física */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs text-justify text-slate-700 leading-relaxed">
            <span className="font-bold text-[#17365D]">RESGUARDO EN ARCHIVO FÍSICO Y AUDITORÍA MINISTERIAL: </span>
            El presente informe técnico del proceso de OVP, junto con las matrices consolidadas y esquelas de citación, reposa bajo custodia física en la carpeta DECE institucional para fines de control distrital y auditoría educativa.
          </div>
        </div>
      </div>
    </div>
  );
}
