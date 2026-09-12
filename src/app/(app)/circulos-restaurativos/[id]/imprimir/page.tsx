import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { getCircleConsentById } from "@/lib/restorativeCircleConsent";
import PrintButton from "@/components/PrintButton";

export default async function ImprimirCirculoConsentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);

  const consent = await getCircleConsentById(params.id, institutionId);
  if (!consent) notFound();

  let signaturesData: {
    rep?: any;
    dece?: any;
  } = {};
  if (consent.signatures_json) {
    try {
      const parsed = JSON.parse(consent.signatures_json);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        signaturesData = parsed;
      } else if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.roleKey) signaturesData[item.roleKey as "rep" | "dece"] = item;
        }
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900">
      {/* Barra de herramientas no imprimible */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200 no-print">
        <div className="flex items-center gap-2">
          <Link
            href={consent.case_file_id ? `/casos/${consent.case_file_id}` : "/circulos-restaurativos"}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            ← Volver
          </Link>
          <span className="text-xs font-semibold text-slate-500">
            Consentimiento Informado: {consent.student_name || "Formato de Aula"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/circulos-restaurativos/${consent.id}/editar`}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            ✏️ Editar datos
          </Link>

          <a
            href={`/api/circulos-restaurativos/${consent.id}/export-word`}
            className="btn-secondary text-xs flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
          >
            <span>📥</span> Descargar Word (.docx)
          </a>

          <PrintButton hideWordButton={true} className="p-0 bg-transparent border-none" />
        </div>
      </div>

      {/* Contenedor de la hoja A4 para calca fiel */}
      <div
        className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-[15mm] md:p-[20mm] print:p-0 rounded-sm"
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          color: "#000000",
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 18mm 20mm;
            }
            body {
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}} />

        {/* Encabezado fiel al modelo */}
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/circulo_header.png"
            alt="Departamento de Consejería Estudiantil - DECE"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Tabla principal unificada */}
        <table className="w-full border-collapse border border-black text-[13px] leading-[1.35]">
          <tbody>
            {/* Fila 1: Título Principal */}
            <tr>
              <td
                colSpan={2}
                className="border border-black py-2 px-3 text-center font-bold tracking-wide text-[13.5px]"
                style={{ backgroundColor: "#D9E2F3" }}
              >
                CONSENTIMIENTO INFORMADO PARA LA ATENCIÓN PSICOSOCIAL
              </td>
            </tr>

            {/* Fila 2: Subtítulo */}
            <tr>
              <td
                colSpan={2}
                className="border border-black py-1.5 px-3 text-center font-bold text-[13px]"
              >
                DATOS INFORMATIVOS GENERALES
              </td>
            </tr>

            {/* Fila 3: Nombre del estudiante */}
            <tr>
              <td colSpan={2} className="border border-black py-1.5 px-3">
                <span className="font-bold">Nombre del/la estudiante:</span>{" "}
                <span>
                  {consent.student_name || "__________________________________________________________________"}
                </span>
              </td>
            </tr>

            {/* Fila 4: Curso y paralelo / Jornada */}
            <tr>
              <td colSpan={2} className="border border-black py-1.5 px-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold">Curso y paralelo:</span>{" "}
                    <span>{consent.course_parallel || "____________________"}</span>
                  </div>
                  <div className="pr-12">
                    <span className="font-bold">Jornada:</span>{" "}
                    <span>{consent.shift || "Matutina"}</span>
                  </div>
                </div>
              </td>
            </tr>

            {/* Fila 5: Teléfono / Fecha */}
            <tr>
              <td colSpan={2} className="border border-black py-1.5 px-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold">Teléfono de representante:</span>{" "}
                    <span>{consent.representative_phone || "____________________"}</span>
                  </div>
                  <div className="pr-12">
                    <span className="font-bold">Fecha:</span>{" "}
                    <span>{consent.consent_date || "____________________"}</span>
                  </div>
                </div>
              </td>
            </tr>

            {/* Fila 6: Consentimiento informado */}
            <tr>
              <td
                colSpan={2}
                className="border border-black py-2 px-3 text-center font-bold text-[13px]"
              >
                Consentimiento informado
              </td>
            </tr>

            {/* Fila 7: Cuerpo del documento */}
            <tr>
              <td
                colSpan={2}
                className="border border-black p-3.5 text-justify space-y-3"
              >
                {/* 1. Finalidad */}
                <div>
                  <div className="font-bold mb-1">1. Finalidad del Círculo Restaurativo</div>
                  <p>
                    El Departamento de Consejería Estudiantil (DECE), en cumplimiento de sus
                    funciones de prevención, acompañamiento y promoción de la convivencia armónica,
                    desarrollará un <span className="font-bold">Círculo Restaurativo</span> con los
                    estudiantes del{" "}
                    <span className="font-bold">
                      {consent.course_parallel_full || consent.course_parallel || "1° Año de Bachillerato en Ciencias, paralelo “B”"}
                    </span>{" "}
                    con el propósito de facilitar el diálogo, promover la reflexión sobre situaciones
                    que afectan la convivencia, reparar daños emocionales o relacionales, y
                    fortalecer la responsabilidad y cohesión grupal.
                  </p>
                </div>

                {/* 2. Naturaleza */}
                <div>
                  <div className="font-bold mb-1">2. Naturaleza de la Participación</div>
                  <div className="space-y-1 pl-4">
                    <p>
                      • <span className="font-bold">Voluntaria:</span> La participación es libre y no
                      afecta el proceso académico del estudiante.
                    </p>
                    <p>
                      • <span className="font-bold">Confidencial:</span> El contenido dialogado será
                      manejado con reserva profesional, salvo casos de riesgo o vulneración de
                      derechos.
                    </p>
                    <p>
                      • <span className="font-bold">Colaborativa:</span> Requiere escucha activa,
                      respeto y disposición al diálogo.
                    </p>
                  </div>
                </div>

                {/* 3. Procedimiento */}
                <div>
                  <div className="font-bold mb-1">3. Procedimiento del Círculo Restaurativo</div>
                  <p className="mb-1">El encuentro se desarrollará en:</p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-4">
                    <li>Establecimiento de acuerdos de convivencia.</li>
                    <li>Diálogo guiado sobre la situación a tratar.</li>
                    <li>Identificación de necesidades y perspectivas.</li>
                    <li>Construcción de compromisos restaurativos.</li>
                    <li>Cierre y evaluación del encuentro.</li>
                  </ol>
                </div>

                {/* 4. Consentimiento del Estudiante */}
                <div>
                  <div className="font-bold mb-1">4. Consentimiento del Estudiante</div>
                  <p className="mb-2">
                    Yo,{" "}
                    <span>
                      {consent.student_name ? consent.student_name : "_________________________________________"}
                    </span>{" "}
                    estudiante de{" "}
                    <span>{consent.course_parallel_short || consent.course_parallel || "1° BGU “B”"}</span>
                    , declaro haber recibido información clara sobre los objetivos, metodología y
                    condiciones del Círculo Restaurativo. Comprendo que mi participación es
                    voluntaria y autorizo mi inclusión en dicho espacio.
                  </p>
                  <p>
                    <span className="font-bold">Firma del estudiante:</span>{" "}
                    <span>_____________________________________</span>
                  </p>
                </div>

                {/* 5. Consentimiento del Representante Legal */}
                <div>
                  <div className="font-bold mb-1">5. Consentimiento del Representante Legal</div>
                  <p className="mb-2">
                    Yo,{" "}
                    <span>
                      {consent.representative_name || "____________________________________________________________"}
                    </span>
                    , con C.I.:{" "}
                    <span>
                      {consent.representative_ci || "_______________________________"}
                    </span>
                    , en calidad de representante de el/la estudiante{" "}
                    <span>
                      {consent.student_name || "______________________________________________________________________"}
                    </span>
                    , una vez que he conocido en qué consiste el proceso de atención psicosocial y
                    la metodología de intervención restaurativa que ejecuta el personal del
                    Departamento de Consejería Estudiantil de la institución educativa,{" "}
                    <span className="font-bold">
                      AUTORIZO la participación de mi representado/a en el Círculo Restaurativo
                    </span>{" "}
                    descrito en este documento.
                  </p>
                  <p>
                    Asimismo, manifiesto que se me ha informado sobre los objetivos, beneficios,
                    posibles incomodidades y la confidencialidad del proceso, comprendiendo que se
                    trata de una estrategia formativa orientada a mejorar la convivencia escolar y
                    el manejo constructivo de conflictos.
                  </p>
                </div>
              </td>
            </tr>

            {/* Fila 8: Título Firmas */}
            <tr>
              <td
                colSpan={2}
                className="border border-black py-1.5 px-3 text-center font-bold text-[13px]"
              >
                Firmas
              </td>
            </tr>

            {/* Fila 9: Espacio de firmas */}
            <tr>
              <td className="border border-black w-1/2 pt-4 pb-2 px-3 text-center align-bottom min-h-[90px]">
                {signaturesData.dece?.tipo === "digital" && signaturesData.dece.firma_data_url ? (
                  <div className="flex flex-col items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signaturesData.dece.firma_data_url}
                      alt="Firma Digital DECE"
                      className="h-14 max-w-[170px] object-contain mb-1"
                    />
                    <span className="text-[10px] text-emerald-800 font-mono">
                      ✓ FIRMADO DIGITALMENTE
                    </span>
                  </div>
                ) : signaturesData.dece?.tipo === "fisica" ? (
                  <div className="pt-6 text-center">
                    <div className="border-b border-dashed border-black w-3/4 mx-auto mb-1"></div>
                    <span className="text-[10px] text-slate-700 italic block">
                      Firma física / Manuscrita {signaturesData.dece.referencia_fisica ? `· ${signaturesData.dece.referencia_fisica}` : ""}
                    </span>
                  </div>
                ) : (
                  <div className="pt-10"></div>
                )}
                <div className="font-bold mt-1">Profesional DECE</div>
              </td>
              <td className="border border-black w-1/2 pt-4 pb-2 px-3 text-center align-bottom min-h-[90px]">
                {signaturesData.rep?.tipo === "digital" && signaturesData.rep.firma_data_url ? (
                  <div className="flex flex-col items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signaturesData.rep.firma_data_url}
                      alt="Firma Digital Representante"
                      className="h-14 max-w-[170px] object-contain mb-1"
                    />
                    <span className="text-[10px] text-emerald-800 font-mono">
                      ✓ FIRMADO DIGITALMENTE
                    </span>
                  </div>
                ) : signaturesData.rep?.tipo === "fisica" ? (
                  <div className="pt-6 text-center">
                    <div className="border-b border-dashed border-black w-3/4 mx-auto mb-1"></div>
                    <span className="text-[10px] text-slate-700 italic block">
                      Firma física / Manuscrita {signaturesData.rep.referencia_fisica ? `· ${signaturesData.rep.referencia_fisica}` : ""}
                    </span>
                  </div>
                ) : (
                  <div className="pt-10"></div>
                )}
                <div className="font-bold mt-1">Padre/madre/representante legal</div>
              </td>
            </tr>

            {/* Fila 10: Nombres de los firmantes */}
            <tr>
              <td className="border border-black py-1.5 px-3">
                <span className="font-bold">Nombre:</span> {consent.dece_name}
              </td>
              <td className="border border-black py-1.5 px-3">
                <span className="font-bold">Nombre:</span> {consent.representative_name || ""}
              </td>
            </tr>

            {/* Fila 11: Nota de confidencialidad */}
            <tr>
              <td
                colSpan={2}
                className="border border-black py-2 px-3 font-bold text-[12px]"
              >
                *La información registrada en este documento es confidencial y de uso exclusivo del
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Departamento de Consejería Estudiantil
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Anexo de Auditoría Distrital si existe respaldo físico escaneado o referencia */}
      {(consent.physical_evidence_url || consent.physical_file_ref) && (
        <div className="print:break-before-page p-6 sm:p-8 bg-white border-2 border-dashed border-slate-300 print:border-slate-400 mt-6 max-w-[210mm] mx-auto w-full shadow-sm print:shadow-none">
          <div className="text-center pb-3 border-b border-slate-300">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              ANEXO DE AUDITORÍA DISTRITAL: RESPALDO DE CONSENTIMIENTO FÍSICO
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Constancia oficial de respaldo documental físico según normativa de archivo y gestión DECE
            </p>
          </div>

          <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
            <p><span className="font-semibold text-slate-700">Ubicación en Archivo Físico:</span> {consent.physical_file_ref || "Carpeta DECE Institucional"}</p>
            <p><span className="font-semibold text-slate-700">Modalidad de Suscripción:</span> {consent.signature_type || "FÍSICA"}</p>
            <p><span className="font-semibold text-slate-700">Estudiante:</span> {consent.student_name} &bull; <span className="font-semibold text-slate-700">Representante:</span> {consent.representative_name}</p>
          </div>

          {consent.physical_evidence_url && (
            <div className="mt-4 flex flex-col items-center">
              <p className="text-xs text-slate-500 mb-2 font-medium">Documento Físico Firmado y Digitalizado:</p>
              {consent.physical_evidence_url.startsWith("data:image/") || consent.physical_evidence_url.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={consent.physical_evidence_url}
                  alt="Consentimiento Físico Digitalizado"
                  className="max-w-full max-h-[820px] object-contain border border-slate-300 rounded shadow-xs"
                />
              ) : (
                <div className="p-6 border-2 border-dashed border-slate-300 rounded text-center w-full">
                  <span className="text-3xl block mb-2">📄</span>
                  <p className="text-xs font-semibold text-slate-700">Archivo digital adjunto (PDF / Documento)</p>
                  <a
                    href={consent.physical_evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 underline font-medium mt-1 inline-block"
                  >
                    Ver archivo original adjunto
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
