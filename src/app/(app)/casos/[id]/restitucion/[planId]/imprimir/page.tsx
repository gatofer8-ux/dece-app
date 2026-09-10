import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import PrintButton from "@/components/PrintButton";
import type {
  CaseFileRow,
  StudentRow,
  CaseRestitutionPlanRow,
  InstitutionRow,
} from "@/lib/types";
import { ensureDefaultSchoolYear } from "@/lib/schoolYear";
import {
  parseJsonArray,
  type VictimEntry,
  type PerpetratorEntry,
  type LegalInstanceEntry,
  type AccompanimentActionEntry,
  NORMATIVE_TEXT,
  OBJECTIVE_GENERAL_TEXT,
  OBJECTIVES_SPECIFIC_TEXT,
  LEGAL_INSTANCE_CATEGORIES,
  ACCOMPANIMENT_ACTION_CATEGORIES,
} from "@/lib/restitutionPlan";
import { formatDate } from "@/components/ui";
import { formatStudentCourseFull } from "@/lib/studentCourse";

export default async function ImprimirPlanRestitucionPage({
  params,
}: {
  params: { id: string; planId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const plan = db
    .prepare("SELECT * FROM case_restitution_plans WHERE id = ? AND case_file_id = ?")
    .get(params.planId, caseFile.id) as CaseRestitutionPlanRow | undefined;
  if (!plan) notFound();

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;
  if (!student) notFound();

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as (InstitutionRow & {
      funding_type?: string;
      province?: string;
      canton?: string;
      parish?: string;
      phone?: string;
      rector_name?: string;
      rector_phone?: string;
      email?: string;
    }) | undefined;

  const activeYear = institutionId ? ensureDefaultSchoolYear(institutionId) : null;

  const violenceTypes = parseJsonArray<string>(plan.violence_types);
  const violenceModality = parseJsonArray<string>(plan.violence_modality);
  const victims = parseJsonArray<VictimEntry>(plan.victims);
  const perpetrators = parseJsonArray<PerpetratorEntry>(plan.perpetrators);
  const legalInstances = parseJsonArray<LegalInstanceEntry>(plan.legal_instances);
  const accompanimentActions = parseJsonArray<AccompanimentActionEntry>(plan.accompaniment_actions);

  const primaryVictim = victims[0] || {
    iniciales: student.full_name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + ".")
      .join(" "),
    cedula: student.document_id || "",
    edad: "",
    genero: student.gender || "",
    nivel_instruccion: `${formatStudentCourseFull(student)} - Jornada ${student.jornada || "Matutina"}`.trim(),
  };

  const primaryPerp = perpetrators[0] || {
    nombre: "Desconoce",
    edad: "Desconoce",
    sexo: "Masculino",
    cargo_funcion: "Docente",
  };

  const elabDateText = plan.elaboration_date ? formatDate(plan.elaboration_date) : "20 de febrero de 2026";
  const formattedElabDate = plan.elaboration_date ? plan.elaboration_date.split("-").reverse().join("/") : "20/02/2026";
  const isAnalista =
    Boolean(plan.reviewed_coordinator_name) ||
    (plan.prepared_by_role ? plan.prepared_by_role.toUpperCase().includes("ANALISTA") : true);

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-black font-sans">
      {/* Estilos estrictos de impresión A4 vertical al borde de la página (bleed 0) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 portrait;
          margin: 0 !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .print-header-fixed {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            z-index: 1000 !important;
            pointer-events: none !important;
          }
          .print-footer-fixed {
            display: block !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            z-index: 1000 !important;
            pointer-events: none !important;
          }
          .print-content {
            padding-top: 36mm !important;
            padding-bottom: 34mm !important;
            padding-left: 20mm !important;
            padding-right: 18mm !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `,
        }}
      />

      {/* Membrete oficial de cabecera fijo para impresión (de borde a borde superior e izquierdo/derecho) */}
      <div className="print-header-fixed hidden pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/plan_acomp_header.png"
          alt="Membrete Oficial Ministerio de Educación"
          className="w-full h-auto block"
        />
      </div>

      {/* Pie de página oficial fijo para impresión (de borde a borde inferior e izquierdo/derecho) */}
      <div className="print-footer-fixed hidden pointer-events-none bg-transparent">
        <div className="text-center text-[8.5px] text-slate-700 leading-tight mb-1 px-6">
          <p className="font-bold text-slate-800 text-[9.5px]">Ministerio de Educación</p>
          <p>Dirección: Av. Amazonas N34-451 y Av. Atahualpa. Código postal: 170507 / Quito-Ecuador</p>
          <p>Teléfono: 593-2-396-1300 / www.educacion.gob.ec</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/plan_acomp_footer.png"
          alt="Pie de Página Oficial"
          className="w-full h-auto block"
        />
      </div>

      {/* Barra superior de acciones (no imprimible) */}
      <div className="max-w-5xl mx-auto px-4 mb-4 no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg shadow-xs border border-slate-200">
        <div className="flex items-center gap-2">
          <Link href={`/casos/${caseFile.id}`} className="btn-secondary text-xs">
            ← Volver al caso
          </Link>
          <Link href={`/casos/${caseFile.id}/restitucion/${plan.id}/editar`} className="btn-secondary text-xs">
            ✏️ Editar datos
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón único oficial de descarga Word */}
          <a
            href={`/api/casos/${caseFile.id}/restitucion/${plan.id}/export-word`}
            className="btn-secondary flex items-center gap-1.5 text-xs font-semibold hover:bg-slate-50 border-slate-300"
          >
            <span>📥</span>
            <span>Descargar Word (.docx)</span>
          </a>

          {/* Botón de impresión / Guardar como PDF (sin botón de Word duplicado) */}
          <PrintButton hideWordButton={true} className="p-0 bg-transparent border-0" />
        </div>
      </div>

      {/* Hoja A4 con membrete oficial */}
      <div
        id="printable-content"
        className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none text-[11px] leading-tight font-sans relative print-sheet flex flex-col justify-between"
        style={{ fontFamily: "Calibri, Arial, sans-serif" }}
      >
        {/* Cabecera visible en pantalla (de borde a borde) */}
        <div className="no-print w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/plan_acomp_header.png"
            alt="Membrete Oficial"
            className="w-full h-auto block"
          />
        </div>

        {/* Contenido principal del documento */}
        <div className="px-6 md:px-12 py-3 print:p-0 print-content flex-1">
          {/* Título Oficial */}
          <div className="text-center mb-4 space-y-0.5">
            <h1 className="text-[13px] font-bold tracking-wide uppercase">
              PLAN DE ACOMPAÑAMIENTO Y RESTITUCIÓN
            </h1>
            <h2 className="text-[12px] font-bold tracking-wide">
              Año lectivo {plan.school_year || activeYear?.name || "2025-2026"}
            </h2>
            <p className="text-[11px] font-bold">
              Fecha de elaboración: {formattedElabDate}
            </p>
          </div>

          {/* TABLA 1: DIAGNÓSTICO Y ANÁLISIS */}
          <table className="w-full border-collapse border border-black text-[10.5px] mb-6">
            <tbody>
              {/* Header: DIAGNÓSTICO */}
              <tr style={{ backgroundColor: "#9CC2E5" }} className="bg-[#9CC2E5]">
                <td colSpan={11} className="border border-black px-2 py-1 font-bold text-center uppercase">
                  DIAGNÓSTICO
                </td>
              </tr>

              {/* Fila 2: Institución educativa & Código AMIE */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Institución educativa: </strong>
                  <span>{institution?.name || "Unidad Educativa Santa Rosa"}</span>
                  <span className="inline-block ml-8">
                    <strong>Código AMIE: </strong>
                    <span>{institution?.amie_code || "18H00313"}</span>
                  </span>
                </td>
              </tr>

              {/* Fila 3: Sostenimiento */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Tipo de sostenimiento de la IE: </strong>
                  <span>{institution?.funding_type || "Fiscal"}</span>
                </td>
              </tr>

              {/* Fila 4: Dirección */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Dirección institucional: </strong>
                  <span>{institution?.address || "Calle Rocafuerte Parroquia Santa Rosa"}</span>
                </td>
              </tr>

              {/* Fila 5: Provincia / cantón / parroquia / teléfono */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Provincia, cantón, parroquia: </strong>
                  <span>
                    {institution?.province || "Tungurahua"}/ {institution?.canton || "Ambato"}/ {institution?.parish || "Santa Rosa"}
                  </span>
                  <span className="inline-block ml-6">
                    <strong>No. de teléfono institucional: </strong>
                    <span>{institution?.phone || "032754073 - 032754097"}</span>
                  </span>
                </td>
              </tr>

              {/* Fila 6: Autoridad institucional / teléfono */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Nombre de la autoridad institucional: </strong>
                  <span>{plan.reviewed_authority_name || institution?.rector_name || "Diana Fernanda Manzano Villacís"}</span>
                  <span className="inline-block ml-6">
                    <strong>No. de teléfono de la autoridad: </strong>
                    <span>{institution?.rector_phone || "098306665"}</span>
                  </span>
                </td>
              </tr>

              {/* Fila 7: Correo electrónico */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Correo electrónico institucional: </strong>
                  <span>{plan.prepared_by_email || institution?.email || "marlon.jacome@educacion.gob.ec"}</span>
                </td>
              </tr>

              {/* Header: FACTORES DE RIESGO */}
              <tr style={{ backgroundColor: "#9CC2E5" }} className="bg-[#9CC2E5]">
                <td colSpan={11} className="border border-black px-2 py-1 font-bold text-left">
                  FACTORES DE RIESGO: Describir los factores de riesgo que refieran de acuerdo con la situación de violencia identificada, individual, familiar y comunitario.
                </td>
              </tr>

              {/* Fila 9: Factores de riesgo content */}
              <tr>
                <td colSpan={11} className="border border-black px-2.5 py-2 whitespace-pre-wrap leading-relaxed text-justify">
                  {plan.risk_factors || "No registrados."}
                </td>
              </tr>

              {/* Header: PRESUNTA SITUACIÓN DE VIOLENCIA */}
              <tr style={{ backgroundColor: "#9CC2E5" }} className="bg-[#9CC2E5]">
                <td colSpan={11} className="border border-black px-2 py-1 font-bold text-center uppercase">
                  PRESUNTA SITUACIÓN DE VIOLENCIA REPORTADA
                </td>
              </tr>

              {/* Fila 11: Tipo de violencia */}
              <tr>
                <td className="border border-black px-1.5 py-1 font-bold">Tipo de violencia:</td>
                <td className="border border-black px-1 py-1 text-center">Física</td>
                <td className="border border-black px-1 py-1 text-center font-bold">{violenceTypes.includes("FISICA") ? "X" : ""}</td>
                <td className="border border-black px-1 py-1 text-center">Psicológica</td>
                <td className="border border-black px-1 py-1 text-center font-bold">{violenceTypes.includes("PSICOLOGICA") ? "X" : ""}</td>
                <td className="border border-black px-1 py-1 text-center">Sexual</td>
                <td className="border border-black px-1 py-1 text-center font-bold">{violenceTypes.includes("SEXUAL") ? "X" : ""}</td>
                <td className="border border-black px-1 py-1 text-center">Negligencia</td>
                <td className="border border-black px-1 py-1 text-center font-bold">{violenceTypes.includes("NEGLIGENCIA") ? "X" : ""}</td>
                <td className="border border-black px-1 py-1 text-center">Virtual</td>
                <td className="border border-black px-1 py-1 text-center font-bold">{violenceTypes.includes("VIRTUAL") ? "X" : ""}</td>
              </tr>

              {/* Fila 12: Modalidad de violencia */}
              <tr>
                <td className="border border-black px-1.5 py-1 font-bold">Modalidad de violencia:</td>
                <td colSpan={2} className="border border-black px-1.5 py-1">
                  Institucional {violenceModality.includes("INSTITUCIONAL") ? "(X)" : "( )"}
                </td>
                <td colSpan={2} className="border border-black px-1.5 py-1">
                  Intrafamiliar {violenceModality.includes("INTRAFAMILIAR") ? "(X)" : "( )"}
                </td>
                <td colSpan={2} className="border border-black px-1.5 py-1">
                  Entre pares {violenceModality.includes("ENTRE_PARES") ? "(X)" : "( )"}
                </td>
                <td colSpan={4} className="border border-black px-1.5 py-1">
                  Otros {violenceModality.includes("OTROS") ? "(X)" : "( )"}{" "}
                  {plan.violence_modality_other ? `(${plan.violence_modality_other})` : ""}
                </td>
              </tr>

              {/* Fila 13: Relación presunta persona agresora */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1.5">
                  <strong>
                    Relación de la presunta persona agresora con quien sufrió la agresión (Por ejemplo: docente, autoridad de la IE, estudiante, personal de limpieza, familiar, pareja, etc.):{" "}
                  </strong>
                  <span>{plan.perpetrator_relation || "Docente"}</span>
                </td>
              </tr>

              {/* Header: N°- DE PRESUNTAS VÍCTIMAS */}
              <tr style={{ backgroundColor: "#9CC2E5" }} className="bg-[#9CC2E5]">
                <td colSpan={11} className="border border-black px-2 py-1 font-bold text-left leading-normal">
                  N°- DE PRESUNTAS VÍCTIMAS (Registrar únicamente con iniciales no nombres completos, por ningún motivo se debe de colocar nombres de los y las estudiantes vulnerados por el principio de confidencialidad). De acuerdo con la información obtenida a través de la persona denunciante, informe técnico del DECE (si existiere) o de la persona que conoció del hecho de violencia, se debe registrar el relato de los hechos identificados.
                </td>
              </tr>

              {/* Fila 15: Número total de presuntas víctimas y narrativa */}
              <tr>
                <td colSpan={11} className="border border-black px-2.5 py-2 leading-relaxed">
                  <p className="font-bold mb-1">
                    Número total de presuntas víctimas: <span className="font-normal">{victims.length || 1}</span>
                  </p>
                  <div className="whitespace-pre-wrap text-justify">
                    {plan.report_narrative || "Relato de los hechos conforme al informe institucional."}
                  </div>
                </td>
              </tr>

              {/* Fila 16: Datos de la víctima (ingresar solo las iniciales de la presunta víctima) y cédula */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Datos de la víctima (ingresar solo las iniciales de la presunta víctima): </strong>
                  <span className="font-bold">{primaryVictim.iniciales}</span>
                  <span className="inline-block ml-8">
                    <strong>CI. </strong>
                    <span>{primaryVictim.cedula || "No registra"}</span>
                  </span>
                </td>
              </tr>

              {/* Fila 17: Edad / Sexo */}
              <tr>
                <td colSpan={6} className="border border-black px-2 py-1">
                  <strong>Edad: </strong>
                  <span>{primaryVictim.edad || "15"} años</span>
                </td>
                <td colSpan={5} className="border border-black px-2 py-1">
                  <strong>Sexo: </strong>
                  <span>{primaryVictim.genero || "Mujer"}</span>
                </td>
              </tr>

              {/* Fila 18: Nivel de instrucción */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Nivel de instrucción de la víctima (consignar el grado escolar que cursa): </strong>
                  <span>{primaryVictim.nivel_instruccion || "Primer Año BGF “B” jornada matutina"}</span>
                </td>
              </tr>

              {/* Header: DATOS DE LA PRESUNTA PERSONA IMPLICADA */}
              <tr style={{ backgroundColor: "#9CC2E5" }} className="bg-[#9CC2E5]">
                <td colSpan={11} className="border border-black px-2 py-1 font-bold text-center uppercase leading-normal">
                  DATOS DE LA PRESUNTA PERSONA IMPLICADA (Si no se dispone de todos los datos solicitados registrar &quot;desconoce&quot;, si no existen nombres y apellidos registrar la información de referencia para su identificación)
                </td>
              </tr>

              {/* Fila 20: Nombres y apellidos presunto implicado */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Nombres y apellidos completos: </strong>
                  <span>{primaryPerp.nombre || "Desconoce"}</span>
                </td>
              </tr>

              {/* Fila 21: Edad / Sexo presunto implicado */}
              <tr>
                <td colSpan={6} className="border border-black px-2 py-1">
                  <strong>Edad: </strong>
                  <span>{primaryPerp.edad || "47"}</span>
                </td>
                <td colSpan={5} className="border border-black px-2 py-1">
                  <strong>Sexo: </strong>
                  <span>{primaryPerp.sexo || "Masculino"}</span>
                </td>
              </tr>

              {/* Fila 22: Cargo, función o actividad */}
              <tr>
                <td colSpan={11} className="border border-black px-2 py-1">
                  <strong>Cargo, función o actividad: </strong>
                  <span>{primaryPerp.cargo_funcion || "Docente"}</span>
                </td>
              </tr>

              {/* Header: 1.- PLAN DE ACOMPAÑAMIENTO Y RESTITUCIÓN */}
              <tr style={{ backgroundColor: "#9CC2E5" }} className="bg-[#9CC2E5]">
                <td colSpan={11} className="border border-black px-2 py-1 font-bold text-left uppercase">
                  1.- PLAN DE ACOMPAÑAMIENTO Y RESTITUCIÓN
                </td>
              </tr>

              {/* Fila 24: Aspecto normativo */}
              <tr>
                <td colSpan={11} className="border border-black px-2.5 py-2 leading-relaxed text-justify text-[10px]">
                  <strong>Aspecto normativo. – </strong>
                  <span className="whitespace-pre-wrap">{NORMATIVE_TEXT}</span>
                </td>
              </tr>

              {/* Fila 25: Objetivos y Alcance */}
              <tr>
                <td colSpan={11} className="border border-black px-2.5 py-2 leading-relaxed text-justify text-[10px] space-y-2">
                  <p>
                    <strong>Objetivo general. – </strong>
                    <span>{OBJECTIVE_GENERAL_TEXT}</span>
                  </p>
                  <div>
                    <strong>Objetivos específicos. – </strong>
                    <ul className="list-disc pl-5 space-y-0.5 mt-1">
                      {OBJECTIVES_SPECIFIC_TEXT.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="pt-1">
                    <strong>Alcance. – </strong>
                    <span>
                      A la Unidad Educativa &quot;{institution?.name || "Santa Rosa"}&quot;, autoridades, docentes, estudiantes y familias desde los Niveles de Educación Inicial hasta los Terceros Años de Bachillerato.
                    </span>
                  </p>
                </td>
              </tr>

              {/* Header: c.- Acompañamiento legal */}
              <tr style={{ backgroundColor: "#9CC2E5" }} className="bg-[#9CC2E5]">
                <td colSpan={11} className="border border-black px-2 py-1 font-bold text-left">
                  c.- Acompañamiento legal:
                </td>
              </tr>

              {/* Filas 27-31: Subtabla de 6 columnas de acompañamiento legal */}
              <tr>
                <td colSpan={11} className="p-0 border border-black">
                  <table className="w-full border-collapse text-[9.5px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th className="border border-black px-1.5 py-1 w-[26%]">INSTANCIAS ADMINISTRATIVAS Y JUDICIALES</th>
                        <th className="border border-black px-1.5 py-1 w-[16%]">FECHA DE LA DENUNCIA</th>
                        <th className="border border-black px-1.5 py-1 w-[20%]">N°- DE LA DENUNCIA</th>
                        <th className="border border-black px-1.5 py-1 w-[18%]">MEDIDAS ADOPTADAS</th>
                        <th className="border border-black px-1.5 py-1 w-[12%]">ESTADO ACTUAL DEL CASO</th>
                        <th className="border border-black px-1.5 py-1 w-[8%]">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {LEGAL_INSTANCE_CATEGORIES.map((cat) => {
                        const entry = legalInstances.find((e) => e.instancia === cat.value);
                        const hasData = entry && (entry.numero_denuncia || entry.fecha_denuncia);

                        return (
                          <tr key={cat.value}>
                            <td className="border border-black px-1.5 py-1 font-medium">{cat.label}</td>
                            <td className="border border-black px-1 py-1 text-center">
                              {entry?.fecha_denuncia ? (entry.fecha_denuncia.includes("-") ? entry.fecha_denuncia.split("-").reverse().join("-") : entry.fecha_denuncia) : (hasData ? "—" : "No aplica")}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center">
                              {entry?.numero_denuncia || (hasData ? "—" : "No aplica")}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center">
                              {entry?.medidas || (hasData ? "—" : "No aplica")}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center">
                              {entry?.estado || (hasData ? "—" : "No aplica")}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-bold">
                              {(entry as any)?.total || (hasData ? "1" : "No aplica")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABLA 2: ACCIONES DE ACOMPAÑAMIENTO Y RESTITUCIÓN */}
          <div className="mb-2">
            <p className="text-[11px] font-bold uppercase">
              2.- ACCIONES DE ACOMPAÑAMIENTO Y RESTITUCIÓN (describir brevemente los puntos señalados)
            </p>
          </div>

          <table className="w-full border-collapse border border-black text-[9.5px] mb-6">
            <thead>
              <tr style={{ backgroundColor: "#9CC2E5" }} className="bg-[#9CC2E5] font-bold text-center text-[9px] uppercase leading-tight">
                <th className="border border-black px-1.5 py-1.5 w-[26%]">PROCESO IMPLEMENTADO</th>
                <th className="border border-black px-1.5 py-1.5 w-[28%]">
                  ¿QUIÉNES EJECUTARÁN?<br />
                  <span className="text-[8px] font-normal lowercase">(mencione la institución que brindará el servicio)</span>
                </th>
                <th className="border border-black px-1.5 py-1.5 w-[16%]">
                  NÚMERO DE PERSONAS QUE RECIBIRÁN EL ACOMPAÑAMIENTO<br />
                  <span className="text-[8px] font-normal lowercase">(mencione el N° de personas que recibirán el servicio)</span>
                </th>
                <th className="border border-black px-1.5 py-1.5 w-[15%]">
                  FECHA DE INICIO DEL ACOMPAÑAMIENTO<br />
                  <span className="text-[8px] font-normal lowercase">(mencione la fecha de inicio del servicio)</span>
                </th>
                <th className="border border-black px-1.5 py-1.5 w-[15%]">
                  FECHA DE FINALIZACIÓN DEL ACOMPAÑAMIENTO<br />
                  <span className="text-[8px] font-normal lowercase">(mencione la fecha de finalización del servicio)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ACCOMPANIMENT_ACTION_CATEGORIES.map((cat) => {
                const entry = accompanimentActions.find((a) => a.categoria === cat.value) || {
                  categoria: cat.value,
                  ejecutor: "No aplica",
                  num_personas: "No aplica",
                  fecha_inicio: "No aplica",
                  fecha_fin: "No aplica",
                };

                return (
                  <tr key={cat.value}>
                    <td className="border border-black px-1.5 py-1 font-medium">{cat.label}</td>
                    <td className="border border-black px-1.5 py-1 whitespace-pre-wrap">{entry.ejecutor || "No aplica"}</td>
                    <td className="border border-black px-1 py-1 text-center">{entry.num_personas || "1"}</td>
                    <td className="border border-black px-1 py-1 text-center">{entry.fecha_inicio || "—"}</td>
                    <td className="border border-black px-1 py-1 text-center">{entry.fecha_fin || "—"}</td>
                  </tr>
                );
              })}

              {/* Filas de Firmas Oficiales */}
              {/* 1. Elaborado por */}
              <tr>
                <td className="border border-black px-2 py-2">
                  <p className="font-bold">
                    Elaborado por el DECE institucional
                  </p>
                  <p className="text-[9px] text-slate-700">
                    Fecha: {plan.prepared_date ? (plan.prepared_date.includes("-") ? plan.prepared_date.split("-").reverse().join("-") : plan.prepared_date) : "20-02-2026"}
                  </p>
                </td>
                <td className="border border-black px-2 py-2 text-center font-bold">Nombre</td>
                <td colSpan={2} className="border border-black px-2 py-2 font-semibold">
                  {plan.prepared_by_name || "Lic. Martha Punina"}
                </td>
                <td className="border border-black px-2 py-2">
                  <strong>Firma: </strong>
                </td>
              </tr>

              {/* 2. Revisado por Coordinador DECE (Si es Analista o si existe coordinador registrado) */}
              {isAnalista && (
                <tr>
                  <td className="border border-black px-2 py-2">
                    <p className="font-bold">Revisado por:</p>
                    <p className="font-bold">Coordinador/a DECE</p>
                    <p className="text-[9px] text-slate-700">
                      Fecha: {plan.reviewed_coordinator_date ? (plan.reviewed_coordinator_date.includes("-") ? plan.reviewed_coordinator_date.split("-").reverse().join("-") : plan.reviewed_coordinator_date) : "20-02-2026"}
                    </p>
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-bold">Nombre</td>
                  <td colSpan={2} className="border border-black px-2 py-2 font-semibold">
                    {plan.reviewed_coordinator_name || "Psic. Cl. Marlon Jácome"}
                  </td>
                  <td className="border border-black px-2 py-2">
                    <strong>Firma: </strong>
                  </td>
                </tr>
              )}

              {/* 3. Revisado por la Autoridad Educativa */}
              <tr>
                <td className="border border-black px-2 py-2">
                  <p className="font-bold">Revisado por la</p>
                  <p className="font-bold">Autoridad Educativa</p>
                  <p className="text-[9px] text-slate-700">
                    Fecha: {plan.reviewed_authority_date ? (plan.reviewed_authority_date.includes("-") ? plan.reviewed_authority_date.split("-").reverse().join("-") : plan.reviewed_authority_date) : "20-02-2026"}
                  </p>
                </td>
                <td className="border border-black px-2 py-2 text-center font-bold">Nombre</td>
                <td colSpan={2} className="border border-black px-2 py-2 font-semibold">
                  {plan.reviewed_authority_name || institution?.rector_name || "Mg. Diana Manzano"}
                </td>
                <td className="border border-black px-2 py-2">
                  <strong>Firma: </strong>
                </td>
              </tr>

              {/* 4. Aprobado por Profesional de Apoyo al DECE */}
              <tr>
                <td className="border border-black px-2 py-2">
                  <p className="font-bold">Aprobado por:</p>
                  <p className="font-bold">Profesional de Apoyo al DECE</p>
                  <p className="text-[9px] text-slate-700">
                    Fecha: {plan.approved_date ? (plan.approved_date.includes("-") ? plan.approved_date.split("-").reverse().join("-") : plan.approved_date) : "20-02-2026"}
                  </p>
                </td>
                <td className="border border-black px-2 py-2 text-center font-bold">Nombre</td>
                <td colSpan={2} className="border border-black px-2 py-2 font-semibold">
                  {plan.approved_by_name || "Psic. Ed. Fernando Pérez"}
                </td>
                <td className="border border-black px-2 py-2">
                  <strong>Firma: </strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Pie institucional de página en pantalla */}
          <div className="no-print mt-6 mb-2 text-center text-[8.5px] text-slate-600 leading-tight space-y-0.5">
            <p className="font-bold text-slate-800 text-[9.5px]">Ministerio de Educación</p>
            <p>Dirección: Av. Amazonas N34-451 y Av. Atahualpa. Código postal: 170507 / Quito-Ecuador</p>
            <p>Teléfono: 593-2-396-1300 / www.educacion.gob.ec</p>
          </div>
        </div>

        {/* Pie de página gráfico visible en pantalla (de borde a borde) */}
        <div className="no-print w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/plan_acomp_footer.png"
            alt="Pie de Página Oficial"
            className="w-full h-auto block"
          />
        </div>
      </div>
    </div>
  );
}
