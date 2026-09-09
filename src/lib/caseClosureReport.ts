import type {
  ClosureType,
  BimonthlyProcessItem,
} from "@/lib/types";

export const DEFAULT_LEGAL_FRAMEWORK = `La Constitución de la República (2008) determina a Ecuador como un Estado constitucional de derechos y justicia social. Establece principios de aplicación de los derechos, reconoce los derechos individuales y colectivos de la ciudadanía, y define la organización del Estado y los mecanismos de protección de derechos. El Art. 44 establece: “El Estado, la sociedad y la familia promoverán de forma prioritaria el desarrollo integral de las niñas, niños y adolescentes, y asegurarán el ejercicio pleno de sus derechos; se atenderá al principio de su interés superior y sus derechos prevalecerán sobre los de las demás personas. Las niñas, niños y adolescentes tendrán derecho a su desarrollo integral, entendido como proceso de crecimiento, maduración y despliegue de su intelecto y de sus capacidades, potencialidades y aspiraciones, en un entorno familiar, escolar, social y comunitario de afectividad y seguridad. Este entorno permitirá la satisfacción de sus necesidades sociales, afectivo-emocionales y culturales, con el apoyo de políticas intersectoriales nacionales y locales”.

Código de la Niñez y Adolescencia, Art. 11.- El interés superior del niño.- El interés superior del niño es un principio que está orientado a satisfacer el ejercicio efectivo del conjunto de los derechos de los niños, niñas y adolescentes; e impone a todas las autoridades administrativas y judiciales y a las instituciones públicas y privadas, el deber de ajustar sus decisiones y acciones para su cumplimiento. Para apreciar el interés superior se considerará la necesidad de mantener un justo equilibrio entre los derechos y deberes de niños, niñas y adolescentes, en la forma que mejor convenga a la realización de sus derechos y garantías. Este principio prevalece sobre el principio de diversidad étnica y cultural. El interés superior del niño es un principio de interpretación de la presente Ley. Nadie podrá invocarlo contra norma expresa y sin escuchar previamente la opinión del niño, niña o adolescente involucrado, que esté en condiciones de expresarla.

Se considera ante el presente informe lo que refiere el Reglamento a la Ley Orgánica de Educación Intercultural en su Capítulo X Departamentos De Consejería Estudiantil Artículo 282.- Funciones. - Será responsabilidad de los profesionales de la educación que integran los Departamentos de Consejería Estudiantil, lo siguiente:
a. Dar cumplimiento a las atribuciones establecidas en la Ley Orgánica de Educación Intercultural;
b. Brindar acompañamiento y seguimiento psicosocial a estudiantes de instituciones educativas de modalidad presencial, semipresencial o a distancia, conforme a los parámetros que determine la Autoridad Educativa Nacional;
h. Asesorar a docentes y familiares sobre las diferentes problemáticas o situaciones de riesgo que pueden presentarse a lo largo del proceso educativo desde una perspectiva etaria, fomentando de esta forma buenas prácticas educativas y la corresponsabilidad en el bienestar del estudiante, bajo los enfoques de inclusión y de derechos;
k. Acompañar en el desarrollo de las acciones para atender a las necesidades de estudiantes que han sido víctimas de cualquier tipo de vulneración de derechos en el marco de la protección integral que contemple la detección, intervención, derivación y seguimiento;
l. Generar y articular, con el resto de los miembros de la comunidad educativa acciones que permitan que las y los estudiantes que se encuentran en una situación de vulnerabilidad o riesgo, reciban atención integral para reestablecer su estado de bienestar y su (re)integración a la institución educativa, en garantía de su integridad física y emocional favoreciendo a su permanencia, continuidad y culminación de su proceso educativo;
n. Otras funciones establecidas en la Ley Orgánica de Educación Intercultural y este Reglamento.

Y finalmente en el Modelo De Funcionamiento De Los Departamentos De Consejería Estudiantil 2023: EJECUCIÓN Y SEGUIMIENTO DE LA PLANIFICACIÓN DEL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL refiere “…Sobre la base de los plazos de ejecución que se han establecido para cada una de las acciones tanto de organización como de acompañamiento y seguimiento psicosocial a estudiantes, es necesario construir un cronograma que permita tanto a coordinadores como analistas, dar seguimiento a las actividades. Se recomienda que, al menos dos veces al año, se haga una revisión del avance de las actividades propuestas, esta acción es de responsabilidad de quienes coordinan el departamento. Para ello, junto con el resto del equipo, podrán determinar instrumentos de seguimiento que darán como resultado un informe que será remitido a la máxima autoridad institucional o la máxima autoridad educativa distrital, al finalizar cada período escolar…”`;

export const DEFAULT_METHODOLOGY = `1. Consentimiento informado suscrito por el representante legal para el acompañamiento y atención psicosocial integral.
2. Entrevistas dirigidas al estudiante, representante legal y docentes tutores.
3. Observación áulica y seguimiento del desenvolvimiento socioemocional y conductual.
4. Articulación interinstitucional y seguimiento bimensual conforme a rutas y protocolos ministeriales.
5. Elaboración de informes técnicos de caso e instrumentos de restitución de derechos.`;

export function buildDefaultTopic(
  closureType: ClosureType,
  victimIdent: string,
  grade: string,
  parallel: string,
  section: string
): string {
  const v = victimIdent || "LA ESTUDIANTE";
  const g = grade ? `${grade.toUpperCase()}` : "";
  const p = parallel ? ` PARALELO “${parallel.toUpperCase()}”` : "";
  const s = section ? `, SECCIÓN ${section.toUpperCase()}` : "";

  switch (closureType) {
    case "FINALIZACION_ANO_LECTIVO":
      return `INFORME TÉCNICO DE FINALIZACIÓN DEL AÑO LECTIVO Y CULMINACIÓN DEL PLAN DE ACOMPAÑAMIENTO DE ${v} DE ${g}${p}${s}.`;
    case "CIERRE_POR_GRADUACION":
      return `INFORME TÉCNICO DE CIERRE POR GRADUACIÓN Y CULMINACIÓN DEL PROCESO EDUCATIVO DE ${v} DE ${g}${p}${s}.`;
    case "CIERRE_POR_TRASLADO":
      return `INFORME TÉCNICO DE FINALIZACIÓN DEL AÑO LECTIVO, CIERRE Y TRASLADO DE CASO POR CAMBIO DE UNIDAD EDUCATIVA DE ${v} DE ${g}${p}${s}.`;
    default:
      return `INFORME TÉCNICO DE CIERRE DE CASO DE ${v} DE ${g}${p}${s}.`;
  }
}

export function buildDefaultClosureReasons(
  closureType: ClosureType,
  victimIdent: string,
  schoolYear: string
): string {
  switch (closureType) {
    case "FINALIZACION_ANO_LECTIVO":
      return `El presente informe técnico se elabora con motivo de la culminación del año lectivo ${schoolYear}. Durante este período escolar se brindó acompañamiento integral, seguimiento psicosocial y socioemocional continuo a favor de ${victimIdent}, garantizando su bienestar integral, permanencia en el sistema educativo y la restitución de sus derechos conforme a las rutas y protocolos ministeriales vigentes.`;
    case "CIERRE_POR_GRADUACION":
      return `El presente informe técnico se emite con motivo de la culminación del proceso educativo y graduación como Bachiller de la República de ${victimIdent} en el año lectivo ${schoolYear}. Se certifica el cumplimiento satisfactorio de su etapa escolar con estabilidad socioemocional, proyecto de vida orientado a la educación superior y sin alertas activas de vulneración.`;
    case "CIERRE_POR_TRASLADO":
      return `El presente informe técnico se emite en virtud de la solicitud de traslado institucional y cambio de unidad educativa de ${victimIdent} para el año lectivo ${schoolYear}, por motivo de cambio de domicilio familiar. Se remite el presente expediente y antecedentes a fin de que la institución educativa receptora continúe garantizando las medidas de acompañamiento y protección integral.`;
    default:
      return "";
  }
}

export function buildDefaultScope(closureType: ClosureType): string {
  if (closureType === "CIERRE_POR_TRASLADO") {
    return "De Analista DECE institucional a Rectorado de la Unidad Educativa\nCON COPIA A LA INSTITUCIÓN EDUCATIVA DE TRASLADO Y DISTRITO EDUCATIVO";
  }
  return "De Analista DECE institucional a Rectorado de la Unidad Educativa\nCON COPIA A LA DIRECCIÓN DISTRITAL DE EDUCACIÓN";
}

export function buildDefaultObjective(
  closureType: ClosureType,
  victimIdent: string
): string {
  return `Informar a la autoridad institucional y distrital sobre las actividades y procesos de acompañamiento realizados por el DECE Institucional ante el caso enunciado, mismas que han sido en beneficio de ${victimIdent} a fin de garantizar su estabilidad socioemocional, protección integral y permanencia en el sistema educativo.`;
}

export interface BimonthlyConsolidatedItem {
  id: string;
  period_months: string;
  school_year_text: string;
  created_at: string;
  processes: BimonthlyProcessItem[];
}

export function generateReportNumber(
  institutionName: string,
  schoolYearText: string
): string {
  const acronym = institutionName
    ? institutionName
        .split(" ")
        .filter((w) => w.length > 2)
        .map((w) => w[0].toUpperCase())
        .join("")
        .slice(0, 6)
    : "UE";

  const cleanYear = (schoolYearText || "2024-2025").replace(/\s+/g, "");
  const randNum = String(Math.floor(10 + Math.random() * 90));
  return `IT-DECE-${acronym}-${cleanYear}-${randNum}`;
}
