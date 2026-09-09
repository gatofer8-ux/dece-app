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
              <td className="border border-black w-1/2 pt-14 pb-2 px-3 text-center">
                <div className="font-bold">Profesional DECE</div>
              </td>
              <td className="border border-black w-1/2 pt-14 pb-2 px-3 text-center">
                <div className="font-bold">Padre/madre/representante legal</div>
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
    </div>
  );
}
