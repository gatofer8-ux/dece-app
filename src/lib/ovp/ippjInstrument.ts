/**
 * MINEDUC — Inventario de Preferencias Profesionales para Jóvenes (IPPJ).
 * Adaptación virtual del test editado por el Ministerio de Educación del Ecuador,
 * basado en el instrumento del Ph.D. Mariusz Wołończej. Modelo RIASEC de Holland.
 *
 * Módulo puro (sin base de datos). El banco de ítems y los baremos NO deben
 * exponerse en crudo al estudiante ni descargarse: se responden dentro de la
 * plataforma y el sistema califica automáticamente.
 *
 * 60 ítems, escala Likert 1–5. 6 tipos de 10 ítems cada uno, en patrón cíclico:
 * ítem n -> tipo (n-1) mod 6.
 */

export const IPPJ_SCALES = [
  "REALISTA",
  "INVESTIGADORA",
  "ARTISTICA",
  "SOCIAL",
  "EMPRENDEDORA",
  "CONVENCIONAL",
] as const;

export type IppjScale = (typeof IPPJ_SCALES)[number];

export const IPPJ_SCALE_META: Record<
  IppjScale,
  { letter: "R" | "I" | "A" | "S" | "E" | "C"; label: string; short: string; description: string }
> = {
  REALISTA: {
    letter: "R",
    label: "Realista",
    short: "Técnica y manual",
    description:
      "Prefiere el trabajo con máquinas, herramientas, objetos y actividades físicas o al aire libre. Aprende haciendo; valora lo práctico y concreto.",
  },
  INVESTIGADORA: {
    letter: "I",
    label: "Investigadora",
    short: "Científica y analítica",
    description:
      "Le atrae observar, investigar, analizar y resolver problemas. Curiosidad intelectual, ciencia, tecnología y experimentación.",
  },
  ARTISTICA: {
    letter: "A",
    label: "Artística",
    short: "Creativa y expresiva",
    description:
      "Se orienta a la creación y la expresión: arte, música, literatura, diseño, escenario. Valora la originalidad y la sensibilidad estética.",
  },
  SOCIAL: {
    letter: "S",
    label: "Social",
    short: "Ayuda y servicio a las personas",
    description:
      "Disfruta enseñar, orientar, cuidar y acompañar a otras personas. Empatía, trabajo comunitario y relaciones humanas.",
  },
  EMPRENDEDORA: {
    letter: "E",
    label: "Emprendedora",
    short: "Liderazgo y gestión",
    description:
      "Le motiva dirigir, persuadir, organizar equipos y emprender. Iniciativa, liderazgo, comunicación y toma de decisiones.",
  },
  CONVENCIONAL: {
    letter: "C",
    label: "Convencional",
    short: "Orden y organización",
    description:
      "Prefiere tareas estructuradas, con reglas claras, datos, registros y planificación. Orden, precisión y método.",
  },
};

/** Devuelve el tipo RIASEC al que aporta el ítem (1-based). */
export function scaleForItem(itemNumber: number): IppjScale {
  return IPPJ_SCALES[(itemNumber - 1) % 6];
}

export interface IppjItem {
  n: number;
  text: string;
  scale: IppjScale;
}

const ITEM_TEXTS: string[] = [
  "Me gusta realizar pequeñas reparaciones de equipos electrodomésticos.",
  "El trabajo científico me parece muy interesante.",
  "Sé tocar un instrumento musical o me gustaría aprender.",
  "Me gustaría cuidar personas con enfermedades mentales.",
  "Me siento bien y me las arreglo cuando tengo que organizar el trabajo de mis compañeros y compañeras. Fijarles tareas y comprobar si han sido realizadas.",
  "Me gusta llevar mis cuadernos de manera ordenada y limpia.",
  "Me gustaría trabajar en el servicio técnico de una empresa.",
  "Me gustaría trabajar en un centro de investigación o en un laboratorio.",
  "En el futuro me gustaría escribir poemas, guiones de películas o de juegos de video.",
  "Me gusta mucho participar en organizaciones no gubernamentales como la Cruz Roja o una organización de jóvenes exploradores.",
  "A veces en la escuela soluciono conflictos de mis compañeros y compañeras.",
  "En mi puesto de trabajo me gustaría trabajar según normas estrictamente definidas.",
  "Me interesan los aspectos técnicos de la industria automotriz.",
  "Me interesan los descubrimientos científicos y las nuevas invenciones.",
  "Me gusta ver exposiciones de esculturas, pintura o fotografía.",
  "Me gusta participar en labores sociales.",
  "En las actividades de grupo, fomento el liderazgo y la coordinación.",
  "Me gustaría tener un trabajo donde tenga que realizar tareas muy precisas.",
  "Dibujar esquemas o proyectos de equipos es una tarea interesante y agradable para mí.",
  "Me gusta hacer experimentos y observar cómo se hacen.",
  "Me gusta participar en clases de arte, música o de literatura.",
  "Me sentiría bien ayudando a las demás personas a comprenderse.",
  "Me gusta tomar la palabra en diferentes discusiones y convencer a la gente.",
  "Me gusta respetar y cumplir las fechas límites.",
  "En el futuro me gustaría trabajar con herramientas y equipos técnicos.",
  "Me gusta ver los programas de televisión dedicados a las novedades científicas.",
  "Me interesan las revistas dedicadas al arte, a los muebles y a la arquitectura.",
  "Con muchas ganas y gran dedicación enseñaría a jóvenes cómo evitar ciertas adicciones.",
  "Me gustaría liderar un grupo de mis compañeros y compañeras para organizar una fiesta escolar.",
  "Me gustaría tener un trabajo tranquilo, con reglas o instrucciones claras.",
  "Conozco el diseño y el funcionamiento del computador.",
  "Cuando paseo en las montañas o en un bosque me detengo para ver de cerca plantas y árboles que no conozco.",
  "Me gustaría tocar en un grupo musical o en una orquesta.",
  "En el futuro me gustaría trabajar con niños y niñas.",
  "Sé dar instrucciones y consejos claros a las demás personas.",
  "Por las tardes me gusta planear el trabajo que tengo que hacer al día siguiente.",
  "Me gustaría trabajar en un taller de mecánica automotriz.",
  "Me interesan nuevas ramas de la ciencia, como la genética o la biotecnología.",
  "Me gustaría crear o componer algún tipo de música.",
  "Me gustaría ayudar a la gente a resolver sus problemas sociales.",
  "Me gustaría desempeñar la presidencia de mi clase.",
  "En mi mesa de estudios me gusta tener todo perfectamente ordenado.",
  "Me gustaría aprender a hacer dibujos técnicos.",
  "Me gustaría realizar estudios y descubrir la vacuna contra una enfermedad grave.",
  "Me gustaría hacer dibujos para libros o crear carteles.",
  "En mi futuro trabajo me gustaría ayudar a personas con discapacidades.",
  "Me gustaría tener un trabajo donde pudiera tomar decisiones y planear acciones para otras personas.",
  "Me gusta planificar y controlar bien mis gastos.",
  "Me gusta aprender cómo funcionan los equipos técnicos.",
  "Me gustaría realizar estudios sobre el funcionamiento del cerebro.",
  "En el futuro me gustaría expresarme mediante una actividad creativa como: la pintura, el dibujo, la escultura, el baile o el canto.",
  "Me gustaría trabajar en un centro de ayuda telefónica para jóvenes.",
  "Me gustaría aprender a liderar a la gente para gestionar sus acciones.",
  "Me gusta tener ordenada mi habitación y mi mesa de estudios.",
  "Me gustaría diseñar o arreglar máquinas y equipos modernos.",
  "Me interesan nuevas ramas de la ciencia y la tecnología.",
  "Me gustaría actuar en un escenario: bailar, cantar e interpretar papeles.",
  "Me sentiría bien ayudando a personas nerviosas o tristes por algún motivo.",
  "Me gusta dirigir el trabajo de las demás personas.",
  "Me gusta organizar mi trabajo día a día y para la semana.",
];

export const IPPJ_ITEMS: IppjItem[] = ITEM_TEXTS.map((text, i) => ({
  n: i + 1,
  text,
  scale: scaleForItem(i + 1),
}));

export const IPPJ_LIKERT_OPTIONS = [
  { value: 1, label: "Totalmente en desacuerdo" },
  { value: 2, label: "En desacuerdo" },
  { value: 3, label: "Es difícil decidir" },
  { value: 4, label: "De acuerdo" },
  { value: 5, label: "Totalmente de acuerdo" },
] as const;

/**
 * ENCUESTA previa (cualitativa). No puntúa; da contexto para la lectura del
 * perfil y la entrevista de orientación.
 */
export const IPPJ_SURVEY_QUESTIONS = [
  { key: "carreras_pref", type: "list3", text: "¿Cuáles son tus tres profesiones de mayor preferencia? Escríbelas en orden de preferencia." },
  { key: "carreras_menos", type: "list3", text: "¿Cuáles son las tres profesiones de menor preferencia? Escríbelas en orden." },
  { key: "madre_estudios", type: "select_estudios", text: "¿Cuál es el nivel de estudios de tu madre o cuidadora principal?" },
  { key: "madre_profesion", type: "text", text: "¿Qué profesión ejerce tu madre o cuidadora principal?" },
  { key: "padre_estudios", type: "select_estudios", text: "¿Cuál es el nivel de estudios de tu padre o cuidador principal?" },
  { key: "padre_profesion", type: "text", text: "¿Qué profesión ejerce tu padre o cuidador principal?" },
  { key: "tiempo_libre", type: "list3", text: "¿Qué tipo de actividades realizas en tu tiempo libre? Escribe tres en orden de preferencia." },
  { key: "exito_caracteristicas", type: "list3", text: "¿Qué es para ti el éxito profesional? Escribe tres características de una persona exitosa en su vida laboral." },
  { key: "exito_importancia", type: "text", text: "¿Qué tan importante es para ti lograr el éxito en tus estudios y en tu vida laboral? ¿Por qué?" },
  { key: "decision_carrera", type: "select_decision", text: "¿Qué tan decidido/a estás sobre la carrera o el camino que quieres seguir?" },
] as const;

export const ESTUDIOS_OPTIONS = [
  "Educación Básica",
  "Bachillerato",
  "Tercer nivel (tecnología, licenciatura o ingeniería)",
  "Cuarto nivel (maestría, doctorado, post-doctorado)",
  "No lo sé",
] as const;

export const DECISION_OPTIONS = [
  "Totalmente decidido/a",
  "Es a lo que más me inclino, pero tengo algunas dudas",
  "No estoy muy seguro/a",
  "Tengo muchas dudas",
  "No lo sé",
] as const;

export const IPPJ_ITEM_COUNT = 60;
export const IPPJ_DISCLAIMER =
  "Adaptación virtual del test “Inventario de Preferencias Profesionales para Jóvenes”, versión editada por el Ministerio de Educación del Ecuador, basada en el test elaborado por Ph.D. Mariusz Wołończej.";
