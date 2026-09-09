// Catálogo y textos fijos para el Informe Técnico Situacional, transcrito de
// la plantilla institucional "INFORME TÉCNICO SITUACIONAL" del DECE.

// Catálogo fijo de métodos usados (sección "METODOLOGÍA" de la plantilla).
export const METHODOLOGY_OPTIONS = [
  "Convocatoria a Representantes",
  "Diálogo con representante",
  "Diálogo con estudiante",
  "Diálogo con docente tutor",
  "Llamadas telefónicas",
  "Diálogo con máxima autoridad institucional",
  "Diálogo con vicerrectorado",
  "Talleres de prevención",
  "Socialización del caso a docentes",
];

// Base legal fija citada en el ámbito legal del informe (transcrita verbatim de la plantilla oficial).
export const LEGAL_BASIS_TEXT = `BASE LEGAL

CONSTITUCIÓN DEL ECUADOR.
Art. 3 numeral 1 y 3.- “Garantizar sin discriminación alguna el efectivo goce de los derechos establecidos en la Constitución y en los instrumentos internacionales, en particular la educación, la salud, la alimentación, la seguridad social y el agua para sus habitantes”, así como “Garantizar a sus habitantes el derecho a una cultura de paz, a la seguridad integral y a vivir en una sociedad democrática y libre de corrupción”.

En su artículo 32, establece: La salud es un derecho que garantiza el Estado, cuya realización se vincula al ejercicio de otros derechos, entre ellos el derecho al agua, la alimentación, la educación, la cultura física, el trabajo, la seguridad social, los ambientes sanos y otros que sustentan el buen vivir.

Así también, la constitución indica en su artículo 35 que “Las personas adultas mayores, niñas, niños y adolescentes, mujeres embarazadas, personas con discapacidad, personas privadas de libertad y quienes adolezcan de enfermedades catastróficas o de alta complejidad, recibirán atención prioritaria y especializada en los ámbitos público y privado (…)”.

En el mismo marco, el artículo 44 indica: “El Estado, la sociedad y la familia promoverán de forma prioritaria el desarrollo integral de niños, niñas y adolescentes, y asegurarán el ejercicio pleno de sus derechos; se atenderá al principio de su interés superior y sus derechos prevalecerán sobre los de las demás personas. Niños, niñas y adolescentes tendrán derecho a su desarrollo integral, entendido como proceso de crecimiento, maduración y despliegue de su intelecto y de sus capacidades, potencialidades y aspiraciones, en un entorno familiar, escolar, social y comunitario de afectividad y seguridad. Este entorno permitirá la satisfacción de sus necesidades sociales, afectivo-emocionales y culturales, con el apoyo de políticas intersectoriales nacionales y locales”.

Finalmente, la constitución del Ecuador indica según el Art. 45.- Niños, niñas y adolescentes gozarán de los derechos comunes del ser humano, además de los específicos de su edad. El Estado reconocerá y garantizará la vida, el derecho a la integridad física y psíquica; su identidad, nombre y ciudadanía; salud integral y nutrición; a la educación y cultura, al deporte y recreación; a la seguridad social; a tener una familia y disfrutar de la convivencia familiar y comunitaria (…).

CÓDIGO DE LA NIÑEZ Y ADOLESCENCIA
Artículo 27 señala que los niños, niñas y adolescentes tienen derecho a disfrutar del más alto nivel de salud física, mental, psicológica y sexual. Este derecho comprende, entre otros aspectos, el acceso gratuito a los programas y acciones de salud públicos, el acceso permanente e ininterrumpido a los servicios de salud públicos, para la prevención, tratamiento de las enfermedades y la rehabilitación de la salud, información y educación sobre los principios básicos de prevención en materia de salud, saneamiento ambiental, primeros auxilios; el vivir y desarrollarse en un ambiente estable y afectivo que les permitan un adecuado desarrollo emocional; el acceso a servicios que fortalezcan el vínculo afectivo entre el niño o niña y su madre y padre.

MODELO DE FUNCIONAMIENTO DEL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (Pág. 49)
EJES DE ACCIÓN DEL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL:

• EJE DE CONSEJERÍA: La consejería es la acción de acompañar, orientar y brindar un asesoramiento a toda la comunidad educativa con el objetivo de articular las acciones para la consolidación de la convivencia armónica y la construcción de proyectos de vida integrales de la población estudiantil.

• EJE DE PROMOCIÓN Y PREVENCIÓN: Son las acciones orientadas a generar las condiciones para que la población estudiantil ejerza plenamente sus derechos e identifique problemáticas psicosociales que afecten su desarrollo integral.
La promoción es el proceso informativo y sensibilizador que permite conocer la importancia del respeto, ejercicio, exigibilidad y garantía de los derechos humanos.
La prevención es la identificación de los potenciales factores de riesgos psicosociales a los cuales la población estudiantil puede estar expuesta y la identificación de los factores de protección para potenciarlos. Las acciones de promoción y prevención deben enmarcarse en las especificidades de los diferentes grupos que conforman la población estudiantil en el sistema educativo nacional.

• EJE DE ATENCIÓN PSICOSOCIAL: Son las acciones para la detección, intervención, derivación, seguimiento y reparación, dirigidas a estudiantes que se encuentren atravesando por situaciones como: inestabilidad emocional, conflictos (individual, escolar, familiar, social, adaptativo), desastre natural, vulneración de derechos, o de riesgo psicosocial que pueda afectar su desarrollo integral.
En este contexto, el Departamento de Consejería es clave en la dinámica institucional de manera que, oportunamente, pueda identificar, con el apoyo de los demás profesionales de la educación, situaciones que no contribuyan al desarrollo integral de la población estudiantil y se constituyan en riesgos psicosociales.

• EJE DE INCLUSIÓN SOCIOEDUCATIVA: Son las acciones que realiza el DECE como aporte a los procesos de inclusión educativa correspondientes a todo el personal de la institución.
Es importante considerar que los procesos de inclusión socioeducativa tienen como finalidad garantizar que las personas ejerzan plenamente su derecho a la educación, garantizando su acceso, permanencia, continuidad y culminación educativa en un entorno de bienestar que promueva la inclusión social en el contexto educativo. Esto implica la comprensión y atención ante las situaciones de vulnerabilidad, así como su atención inmediata.`;

export function parseStringList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Genera el título/TEMA por defecto siguiendo el patrón institucional, editable por el usuario.
export function buildDefaultTema(situationType: string, course: string, parallel: string, jornada: string): string {
  const partes = [
    "INFORME TÉCNICO SITUACIONAL SOBRE",
    situationType ? `PRESUNTO ${situationType.toUpperCase()}` : "PRESUNTA SITUACIÓN DE RIESGO",
    course ? `AL ${course.toUpperCase()}` : "",
    parallel ? `PARALELO “${parallel.toUpperCase()}”` : "",
    jornada ? `JORNADA ${jornada.toUpperCase()}` : "",
  ].filter(Boolean);
  return partes.join(" ");
}
