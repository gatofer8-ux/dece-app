/**
 * Juego de Tarjetas de Arquetipos — Proyecto TaPas (Talentos + Pasiones).
 * Herramienta de Orientación Vocacional y Profesional de VVOB Education for
 * Development y TaPasCity, editada para el Ecuador (Manual de uso de las
 * herramientas TaPas, VVOB, 1.ª edición, 2021 — distribución gratuita).
 *
 * Adaptación digital para su aplicación en la plataforma del DECE. El juego
 * consiste en: (1) clasificar los 74 arquetipos en «Me identifico / Tengo
 * dudas / No me identifico», (2) agrupar los arquetipos con los que la
 * persona se identifica en 3 a 6 grupos afines, nombrar cada grupo con un
 * verbo o habilidad, y (3) ordenar los grupos del talento más fuerte al
 * más débil.
 *
 * Las «familias de talento» de abajo NO forman parte del instrumento
 * original: son una ayuda de lectura para el DECE que agrupa los arquetipos
 * por afinidad. El resultado real del juego son los grupos que arma cada
 * estudiante.
 */

export const TAPAS_SOURCE =
  "Juego de Tarjetas de Arquetipos — Proyecto TaPas (Talentos + Pasiones). VVOB Education for Development y TaPasCity. Manual de uso de las herramientas TaPas, VVOB, 1.ª edición, 2021. Distribución gratuita.";

export const TAPAS_FAMILIES = {
  CREAR: { label: "Crear y expresar", color: "#DB2777", emoji: "🎨" },
  INDAGAR: { label: "Indagar y comprender", color: "#2563EB", emoji: "🔬" },
  CONSTRUIR: { label: "Construir y hacer", color: "#EA580C", emoji: "🛠️" },
  CUIDAR: { label: "Cuidar y acompañar", color: "#16A34A", emoji: "🤝" },
  LIDERAR: { label: "Liderar y emprender", color: "#7C3AED", emoji: "🚀" },
  EXPLORAR: { label: "Explorar, proteger y arriesgar", color: "#DC2626", emoji: "🧭" },
} as const;

export type TapasFamily = keyof typeof TAPAS_FAMILIES;

export interface Archetype {
  key: string;
  name: string;
  meaning: string;
  familia: TapasFamily;
  emoji: string;
}

export const ARCHETYPES: Archetype[] = [
  { key: "abogado", name: "Abogada / abogado", emoji: "⚖️", familia: "LIDERAR", meaning: "Defiende a las personas y explica cómo funcionan las leyes." },
  { key: "acrobata", name: "Acróbata", emoji: "🤸", familia: "EXPLORAR", meaning: "Realiza hazañas arriesgadas, por ejemplo en el circo o en una película." },
  { key: "actor", name: "Actriz / actor", emoji: "🎭", familia: "CREAR", meaning: "Interpreta a otra persona delante de un público." },
  { key: "artesano", name: "Artesana / artesano", emoji: "🧵", familia: "CONSTRUIR", meaning: "Elabora objetos con distintos materiales." },
  { key: "artista", name: "Artista", emoji: "🖼️", familia: "CREAR", meaning: "Crea obras que sorprenden o emocionan a otras personas." },
  { key: "ambientalista", name: "Ambientalista", emoji: "🌳", familia: "EXPLORAR", meaning: "Defiende y cuida la naturaleza." },
  { key: "amigable", name: "Amigable", emoji: "🙂", familia: "CUIDAR", meaning: "Es una persona tranquila, agradable y abierta." },
  { key: "aventurero", name: "Aventurera / aventurero", emoji: "🏕️", familia: "EXPLORAR", meaning: "Va en busca de lo desconocido y disfruta las nuevas experiencias." },
  { key: "bailarin", name: "Bailarina / bailarín", emoji: "💃", familia: "CREAR", meaning: "Se mueve con armonía e inventa bailes." },
  { key: "biologo", name: "Bióloga / biólogo", emoji: "🌿", familia: "INDAGAR", meaning: "Sabe mucho sobre plantas y animales, cómo son y dónde viven." },
  { key: "buscador", name: "Buscadora / buscador", emoji: "🔎", familia: "INDAGAR", meaning: "Es excelente para observar y descubrir, y nunca se cansa de hacerlo." },
  { key: "capaz_ayudar", name: "Capaz de ayudar", emoji: "🫶", familia: "CUIDAR", meaning: "Se asegura de que otras personas puedan hacer mejor las cosas; a veces las hace por ellas." },
  { key: "capaz_completar", name: "Capaz de completar tareas", emoji: "✅", familia: "CONSTRUIR", meaning: "Cumple muy bien lo que otras personas le piden que haga." },
  { key: "capaz_conectar", name: "Capaz de conectar personas", emoji: "🔗", familia: "CUIDAR", meaning: "Vincula a las personas entre sí y logra que se lleven bien." },
  { key: "capaz_solucionar", name: "Capaz de solucionar", emoji: "🧩", familia: "INDAGAR", meaning: "Piensa cómo resolver situaciones complejas y encuentra soluciones." },
  { key: "capaz_riesgos", name: "Capaz de tomar riesgos", emoji: "🎲", familia: "EXPLORAR", meaning: "Inventa cosas atrevidas y disfruta llevarlas a la práctica." },
  { key: "capitan", name: "Capitana / capitán", emoji: "⚓", familia: "LIDERAR", meaning: "Ejerce el mando en un barco." },
  { key: "carpintero", name: "Carpintera / carpintero", emoji: "🪚", familia: "CONSTRUIR", meaning: "Construye objetos y muebles de madera." },
  { key: "chef", name: "Chef", emoji: "👨‍🍳", familia: "CONSTRUIR", meaning: "Disfruta cocinar y también comer bien." },
  { key: "cientifico", name: "Científica / científico", emoji: "🧪", familia: "INDAGAR", meaning: "Examina cómo es la realidad y experimenta para alcanzar nuevos conocimientos." },
  { key: "clarividente", name: "Clarividente", emoji: "🔮", familia: "CREAR", meaning: "Imagina y anticipa lo que podría pasar." },
  { key: "comediante", name: "Comediante", emoji: "🤡", familia: "CREAR", meaning: "Cuenta chistes y monta espectáculos con ellos." },
  { key: "comerciante", name: "Comerciante", emoji: "🛒", familia: "LIDERAR", meaning: "Es excelente para comprar y vender." },
  { key: "consejero", name: "Consejera / consejero", emoji: "💬", familia: "CUIDAR", meaning: "Sabe dar consejos a otras personas." },
  { key: "constructor", name: "Constructora / constructor", emoji: "🏗️", familia: "CONSTRUIR", meaning: "Levanta casas y edificios; también arma cosas pequeñas, como maquetas." },
  { key: "cuentacuentos", name: "Cuentacuentos", emoji: "📖", familia: "CREAR", meaning: "Conoce historias interesantes y las narra con pasión." },
  { key: "cuidador", name: "Cuidadora / cuidador", emoji: "🧑‍🦽", familia: "CUIDAR", meaning: "Atiende y facilita la vida de una persona que no puede cuidarse sola." },
  { key: "deportista", name: "Deportista", emoji: "🏅", familia: "EXPLORAR", meaning: "Se mantiene en actividad física y se pone retos, casi siempre para ganar." },
  { key: "detective", name: "Detective", emoji: "🕵️", familia: "INDAGAR", meaning: "Averigua qué pasó en una situación poco clara examinando huellas y pistas." },
  { key: "director_cine", name: "Directora / director de cine", emoji: "🎬", familia: "CREAR", meaning: "Decide cómo será una película o una obra de teatro e indica al elenco qué hacer." },
  { key: "disenador", name: "Diseñadora / diseñador", emoji: "✏️", familia: "CREAR", meaning: "Inventa objetos y dibuja cómo se ven y cómo funcionan." },
  { key: "docente", name: "Docente", emoji: "🧑‍🏫", familia: "CUIDAR", meaning: "Enseña a otras personas o les explica cómo funcionan las cosas." },
  { key: "empatico", name: "Empática / empático", emoji: "💗", familia: "CUIDAR", meaning: "Siente lo que sienten los demás y se pone en su lugar." },
  { key: "ermitano", name: "Ermitaña / ermitaño", emoji: "🏞️", familia: "INDAGAR", meaning: "Disfruta la soledad y no necesita de muchas cosas." },
  { key: "erudito", name: "Erudita / erudito", emoji: "📚", familia: "INDAGAR", meaning: "Sabe mucho e investiga cómo funciona todo." },
  { key: "escritor", name: "Escritora / escritor", emoji: "✍️", familia: "CREAR", meaning: "Escribe historias, poesía o textos." },
  { key: "especialista", name: "Especialista", emoji: "🎯", familia: "CONSTRUIR", meaning: "Domina muy bien una tarea determinada." },
  { key: "filosofo", name: "Filósofa / filósofo", emoji: "🤔", familia: "INDAGAR", meaning: "Reflexiona sobre el mundo y sabe explicarlo." },
  { key: "geografo", name: "Geógrafa / geógrafo", emoji: "🗺️", familia: "INDAGAR", meaning: "Sabe de países, montañas, ríos y mares: cómo se forman y dónde están." },
  { key: "guardaespaldas", name: "Guardaespaldas", emoji: "🛡️", familia: "EXPLORAR", meaning: "Quiere proteger y defender a otras personas." },
  { key: "guerrero", name: "Guerrera / guerrero", emoji: "⚔️", familia: "EXPLORAR", meaning: "Defiende a las demás personas dando la batalla por ellas." },
  { key: "guia", name: "Guía", emoji: "🧭", familia: "CUIDAR", meaning: "Conoce el camino y acompaña a la gente para que no se pierda." },
  { key: "guia_espiritual", name: "Guía espiritual", emoji: "🕊️", familia: "CUIDAR", meaning: "Acompaña la vida espiritual y reúne a una comunidad de fe." },
  { key: "heroe", name: "Heroína / héroe", emoji: "🦸", familia: "EXPLORAR", meaning: "Realiza hazañas admirables para ayudar a otras personas." },
  { key: "historiador", name: "Historiadora / historiador", emoji: "📜", familia: "INDAGAR", meaning: "Sabe mucho del pasado y quiere averiguarlo todo." },
  { key: "interprete", name: "Intérprete", emoji: "🗣️", familia: "INDAGAR", meaning: "Traduce un texto o un mensaje de un idioma a otro." },
  { key: "inventor", name: "Inventora / inventor", emoji: "💡", familia: "CREAR", meaning: "Descubre cosas nuevas que otras personas pueden usar." },
  { key: "jardinero", name: "Jardinera / jardinero", emoji: "🌻", familia: "CONSTRUIR", meaning: "Cuida flores y plantas y cultiva frutas y verduras." },
  { key: "jefe_tribu", name: "Jefa / jefe de tribu", emoji: "🪶", familia: "LIDERAR", meaning: "Dirige a una tribu o a un grupo de personas." },
  { key: "juez", name: "Jueza / juez", emoji: "👨‍⚖️", familia: "LIDERAR", meaning: "Decide quién ha incumplido la ley y qué sanción corresponde." },
  { key: "laboratorista", name: "Laboratorista", emoji: "⚗️", familia: "INDAGAR", meaning: "Hace pruebas con sustancias o trabaja con microscopios." },
  { key: "lider", name: "Líder", emoji: "📣", familia: "LIDERAR", meaning: "Actúa como guía de un grupo e influye en las demás personas." },
  { key: "mama", name: "Mamá", emoji: "👩‍👧", familia: "CUIDAR", meaning: "Es una mujer que tiene hijas e hijos y los cuida." },
  { key: "mediador", name: "Mediadora / mediador", emoji: "🤲", familia: "CUIDAR", meaning: "Ayuda a resolver peleas o disputas entre otras personas." },
  { key: "medico", name: "Médica / médico", emoji: "🩺", familia: "CUIDAR", meaning: "Devuelve la salud a las personas." },
  { key: "musico", name: "Música / músico", emoji: "🎸", familia: "CREAR", meaning: "Compone o interpreta canciones y obras musicales." },
  { key: "papa", name: "Papá", emoji: "👨‍👦", familia: "CUIDAR", meaning: "Es un hombre que tiene hijas e hijos y los cuida." },
  { key: "piloto", name: "Piloto", emoji: "✈️", familia: "EXPLORAR", meaning: "Conduce un avión o un globo aerostático." },
  { key: "pintor", name: "Pintora / pintor", emoji: "🎨", familia: "CREAR", meaning: "Hace obras de arte con pintura y pinceles." },
  { key: "pionero", name: "Pionera / pionero", emoji: "🚩", familia: "EXPLORAR", meaning: "Descubre algo o llega a un lugar al que nadie había ido antes." },
  { key: "poeta", name: "Poeta", emoji: "🪶", familia: "CREAR", meaning: "Juega con las palabras: escribe poesía e inventa rimas." },
  { key: "presidente", name: "Presidenta / presidente", emoji: "🏛️", familia: "LIDERAR", meaning: "Lidera un país." },
  { key: "protector_animales", name: "Protectora / protector de animales", emoji: "🐾", familia: "CUIDAR", meaning: "Cuida y rescata animales en problemas o emergencias." },
  { key: "quimico", name: "Química / químico", emoji: "🧫", familia: "INDAGAR", meaning: "Sabe sobre sustancias y productos y cómo reaccionan entre sí." },
  { key: "rebelde", name: "Rebelde", emoji: "🤘", familia: "EXPLORAR", meaning: "Hace las cosas de otra manera; a veces mueve un poco lo establecido." },
  { key: "reparador", name: "Reparadora / reparador", emoji: "🔧", familia: "CONSTRUIR", meaning: "Arregla cosas rotas o dañadas." },
  { key: "romantico", name: "Romántica / romántico", emoji: "🌹", familia: "CREAR", meaning: "Habla mucho del amor y sueña despierta." },
  { key: "salvavidas", name: "Salvavidas", emoji: "🛟", familia: "EXPLORAR", meaning: "Saca a las personas de situaciones peligrosas y de emergencia." },
  { key: "sabio", name: "Sabia / sabio", emoji: "🦉", familia: "CUIDAR", meaning: "Tiene experiencia de vida y la comparte con otras personas." },
  { key: "servicial", name: "Servicial", emoji: "🧑‍🍽️", familia: "CUIDAR", meaning: "Ayuda a otras personas y logra que se sientan a gusto." },
  { key: "sonador", name: "Soñadora / soñador", emoji: "☁️", familia: "CREAR", meaning: "Imagina cosas que todavía no existen." },
  { key: "tecnico", name: "Técnica / técnico", emoji: "⚙️", familia: "CONSTRUIR", meaning: "Repara o fabrica máquinas y aparatos eléctricos." },
  { key: "valiente", name: "Valiente", emoji: "🦁", familia: "EXPLORAR", meaning: "Es una persona valerosa que sale a ayudar y a defender a otras." },
  { key: "viajero", name: "Viajera / viajero", emoji: "🧳", familia: "EXPLORAR", meaning: "Va de un lugar a otro para conocer y descubrir." },
];

export const ARCHETYPE_COUNT = ARCHETYPES.length; // 74

export const ARCHETYPE_MAP: Record<string, Archetype> = Object.fromEntries(
  ARCHETYPES.map((a) => [a.key, a])
);

export type TapasChoice = "SI" | "DUDA" | "NO";

export const TAPAS_CHOICES: { value: TapasChoice; label: string; emoji: string; color: string }[] = [
  { value: "SI", label: "Me identifico", emoji: "😊", color: "#16A34A" },
  { value: "DUDA", label: "Tengo dudas", emoji: "🤔", color: "#EAB308" },
  { value: "NO", label: "No me identifico", emoji: "😐", color: "#DC2626" },
];

export const MIN_IDENTIFIED = 10;
export const MIN_GROUPS = 3;
export const MAX_GROUPS = 6;

export interface TalentGroup {
  name: string;
  archetypes: string[]; // keys
}

export const TAPAS_INTRO_STEPS = [
  "Vas a ver 74 tarjetas con distintas formas de ser y de hacer las cosas.",
  "En cada una elige: «Me identifico», «Tengo dudas» o «No me identifico». Hazlo rápido y con sinceridad, sin pensarlo demasiado.",
  "Con las tarjetas con las que te identificas armarás de 3 a 6 grupos de talentos y les pondrás un nombre.",
  "Al final ordenarás tus grupos del talento más fuerte al más débil y verás tu perfil.",
];

export const TAPAS_AI_GROUP_LABEL =
  "Nombre de un grupo de talentos para el juego de arquetipos TaPas: una frase corta que empiece con un verbo en infinitivo y describa la habilidad común de esas tarjetas (por ejemplo «Proteger la justicia», «Crear e imaginar», «Cuidar a las personas»). Devuelve solo la frase, sin comillas.";
