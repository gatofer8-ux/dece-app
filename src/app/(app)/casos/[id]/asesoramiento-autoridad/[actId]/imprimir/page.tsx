import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate, formatDateTime } from "@/components/ui";
import type { CaseFileRow, AuthorityAdvisoryActRow, InstitutionRow } from "@/lib/types";
import { parseJsonArray, ordinalWord, type ParticipantEntry } from "@/lib/authorityAdvisory";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

export default async function ImprimirActaAsesoramientoAutoridadPage({
  params,
}: {
  params: { id: string; actId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const act = db
    .prepare("SELECT * FROM authority_advisory_acts WHERE id = ? AND case_file_id = ?")
    .get(params.actId, caseFile.id) as AuthorityAdvisoryActRow | undefined;
  if (!act) notFound();

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const participants = parseJsonArray<ParticipantEntry>(act.participants);
  const background = parseJsonArray<string>(act.background);
  const measures = parseJsonArray<string>(act.measures);
  const advisoryScope = parseJsonArray<string>(act.advisory_scope);

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Barra superior de acciones no imprimible */}
      <div className="no-print flex items-center justify-between bg-slate-100 p-3 rounded-t-lg border-b border-slate-200">
        <div className="flex items-center gap-3">
          <a
            href={`/casos/${caseFile.id}`}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
          >
            ← Volver al caso
          </a>
          <span className="text-slate-300">|</span>
          <a
            href={`/casos/${caseFile.id}/asesoramiento-autoridad/${act.id}/editar`}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
          >
            ✏️ Editar Acta
          </a>
        </div>
        <PrintButton hideWordButton={true} className="p-0 bg-transparent border-0" />
      </div>
      <div id="printable-content" className="p-8 print:p-0 text-sm">
        <DocumentHeader
          title="Acta de Asesoramiento a la Máxima Autoridad Institucional"
          subtitle={act.issuing_entity ? `Sobre disposiciones de: ${act.issuing_entity}` : "Departamento de Consejería Estudiantil"}
          institutionName={institution.name}
          sealImage={institution.seal_image}
        />
        {act.standard_code && (
          <p className="text-center text-xs text-slate-500 mb-4">Estándar de Calidad DECE: {act.standard_code}</p>
        )}

        <section className="mb-4">
          <h2 className="font-semibold uppercase text-xs bg-[#2F5496] text-white px-2.5 py-1 border border-[#2F5496] border-b-0">
            1. Datos generales
          </h2>
          <div className="border border-slate-800 p-2">
            <p>
              En la ciudad de ___, siendo las {act.act_time || "___"} del día {formatDate(act.act_date)}, en las
              instalaciones de la {institution.name}
              {act.act_place ? `, ${act.act_place}` : ""}, se reúnen las personas que se detallan a continuación con
              el objeto de dejar constancia del asesoramiento brindado a la máxima autoridad institucional.
            </p>
          </div>
          {participants.length === 0 ? (
            <p className="text-slate-400 border border-slate-300 border-t-0 p-2">Sin registrar.</p>
          ) : (
            <table className="w-full text-xs border border-slate-300 border-collapse border-t-0">
              <thead>
                <tr className="bg-[#2F5496] text-white">
                  <th className="border border-slate-300 px-2 py-1 text-left">Nombre</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Cargo/Rol</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Función en el asesoramiento</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-2 py-1">{p.nombre}</td>
                    <td className="border border-slate-300 px-2 py-1">{p.cargo || "—"}</td>
                    <td className="border border-slate-300 px-2 py-1">{p.funcion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mb-4">
          <h2 className="font-semibold uppercase text-xs bg-[#2F5496] text-white px-2.5 py-1 border border-[#2F5496] border-b-0">
            2. Antecedentes
          </h2>
          <div className="border border-slate-800 p-2 space-y-2">
            {background.length === 0 ? (
              <p className="text-slate-400">Sin registrar.</p>
            ) : (
              background.map((b, i) => (
                <p key={i}>
                  2.{i + 1}. {b}
                </p>
              ))
            )}
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-semibold uppercase text-xs bg-[#2F5496] text-white px-2.5 py-1 border border-[#2F5496] border-b-0">
            3. Medidas de protección dispuestas{act.issuing_entity ? ` por ${act.issuing_entity.toUpperCase()}` : ""}
          </h2>
          <div className="border border-slate-800 p-2 space-y-2">
            {measures.length === 0 ? (
              <p className="text-slate-400">Sin registrar.</p>
            ) : (
              measures.map((m, i) => (
                <p key={i}>
                  <strong>{ordinalWord(i)}.</strong> {m}
                </p>
              ))
            )}
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-semibold uppercase text-xs bg-[#2F5496] text-white px-2.5 py-1 border border-[#2F5496] border-b-0">
            4. Alcance del asesoramiento brindado
          </h2>
          <div className="border border-slate-800 p-2 space-y-2">
            {advisoryScope.length === 0 ? (
              <p className="text-slate-400">Sin registrar.</p>
            ) : (
              advisoryScope.map((s, i) => (
                <p key={i}>
                  4.{i + 1}. {s}
                </p>
              ))
            )}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold uppercase text-xs bg-[#2F5496] text-white px-2.5 py-1 border border-[#2F5496] border-b-0">
            5. Conclusión
          </h2>
          <div className="border border-slate-800 p-2 space-y-2">
            <p className="whitespace-pre-wrap">{act.conclusion || "—"}</p>
            <p>
              {act.standard_code
                ? `En cumplimiento del Estándar de Calidad DECE ${act.standard_code}. Para constancia, firman los comparecientes.`
                : "Para constancia, firman los comparecientes."}
            </p>
          </div>
        </section>

        <table className="w-full text-xs border border-slate-800 border-collapse mb-6">
          <thead>
            <tr className="bg-[#2F5496] text-white">
              <th className="border border-slate-400 px-2 py-1 text-left">Rol</th>
              <th className="border border-slate-400 px-2 py-1 text-left">Nombre</th>
              <th className="border border-slate-400 px-2 py-1 text-left">Firma</th>
              <th className="border border-slate-400 px-2 py-1 text-left">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-medium">Profesional DECE</td>
              <td className="border border-slate-400 px-2 py-1">{act.dece_professional_name || "—"}</td>
              <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
              <td className="border border-slate-400 px-2 py-1">{formatDate(act.act_date)}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-medium">
                Máxima autoridad institucional
                <br />
                <span className="text-slate-400 font-normal">{act.authority_role || "Rector/a"}</span>
              </td>
              <td className="border border-slate-400 px-2 py-1">{act.authority_name || "—"}</td>
              <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
              <td className="border border-slate-400 px-2 py-1">{formatDate(act.act_date)}</td>
            </tr>
          </tbody>
        </table>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
