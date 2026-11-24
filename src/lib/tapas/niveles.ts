/**
 * Instrumentos y niveles del Proyecto TaPas (Talentos + Pasiones).
 *
 * El «Manual de uso de las herramientas TaPas» (VVOB, 2021) define tres herramientas
 * básicas: Perfil de talentos (versión 1 y versión 2), Tarjetas de arquetipos y
 * Experimento de talento. El manual pide adaptar el lenguaje y la actividad a la edad
 * del grupo («dependiendo de la edad del grupo de estudiantes…»); aquí se concreta en
 * tres niveles: Inicial, Básica y Bachillerato (el comportamiento que ya tenía la app).
 */

import { ARCHETYPES } from "./archetypes";

export type TapasInstrument = "ARQUETIPOS" | "PERFIL_V1" | "PERFIL_V2" | "EXPERIMENTO";
export type TapasNivel = "INICIAL" | "BASICA" | "BACHILLERATO";

export const TAPAS_INSTRUMENT_KEYS: TapasInstrument[] = ["ARQUETIPOS", "PERFIL_V1", "PERFIL_V2", "EXPERIMENTO"];
export const TAPAS_NIVEL_KEYS: TapasNivel[] = ["INICIAL", "BASICA", "BACHILLERATO"];

export interface InstrumentInfo {
  key: TapasInstrument;
  label: string;
  emoji: string;
  manualPages: string;
  description: string;
  /** Título del informe individual. */
  reportTitle: string;
}

export const TAPAS_INSTRUMENTS: Record<TapasInstrument, InstrumentInfo> = {
  ARQUETIPOS: {
    key: "ARQUETIPOS",
    label: "Tarjetas de arquetipos",
    emoji: "🃏",
    manualPages: "pp. 24-43",
    description:
      "El estudiante clasifica las tarjetas («Me identifico», «Tengo dudas», «No me identifico»), arma grupos de talentos con nombre de verbo y los ordena del más fuerte al más débil.",
    reportTitle: "Perfil de Talentos — Tarjetas de Arquetipos (TaPas)",
  },
  PERFIL_V1: {
    key: "PERFIL_V1",
    label: "Perfil de talentos 1: Los talentos que me caracterizan",
    emoji: "🎯",
    manualPages: "pp. 18-19",
    description:
      "Escribe de 3 a 5 cosas que hace bien (y las que otra persona ve en él o ella) y las ubica en un plano según qué tan bien las hace y cuánto le gustan.",
    reportTitle: "Perfil de Talentos — Los talentos que me caracterizan (TaPas)",
  },
  PERFIL_V2: {
    key: "PERFIL_V2",
    label: "Perfil de talentos 2: Mis talentos en los estudios y en el tiempo libre",
    emoji: "📚",
    manualPages: "pp. 20-21",
    description:
      "Ubica en un plano sus asignaturas (resultados y gusto) y sus actividades de tiempo libre (qué tan bien las hace y cuánto le gustan), y relaciona ambos planos.",
    reportTitle: "Perfil de Talentos — Mis talentos en los estudios y en el tiempo libre (TaPas)",
  },
  EXPERIMENTO: {
    key: "EXPERIMENTO",
    label: "Experimento de talento",
    emoji: "🧪",
    manualPages: "pp. 44-49",
    description:
      "En dos sesiones: formula una pregunta sobre un talento y diseña cómo comprobarlo (sesión 1); una semana después registra qué pasó, sus desafíos y su mayor aprendizaje (sesión 2).",
    reportTitle: "Experimento de Talento (TaPas)",
  },
};

/** Instrumentos que usan el plano de coordenadas (talento × gusto). */
export const isProfileInstrument = (i: TapasInstrument) => i === "PERFIL_V1" || i === "PERFIL_V2";

// ---------------------------------------------------------------------------------------------
// Subconjuntos de arquetipos por nivel
// ---------------------------------------------------------------------------------------------

/** 16 roles concretos y cercanos para Educación Inicial. */
export const INICIAL_ARCHETYPE_KEYS = [
  "deportista", "bailarin", "musico", "pintor", "actor", "cuentacuentos", "chef", "jardinero",
  "protector_animales", "constructor", "carpintero", "medico", "docente", "piloto", "cientifico", "viajero",
];

/** 40 roles para Educación General Básica: se dejan fuera los más abstractos o de vida adulta. */
export const BASICA_ARCHETYPE_KEYS = [
  ...INICIAL_ARCHETYPE_KEYS,
  "artista", "comediante", "escritor", "poeta", "disenador", "inventor", "biologo", "detective",
  "geografo", "ambientalista", "reparador", "tecnico", "artesano", "cuidador", "mediador", "amigable",
  "empatico", "servicial", "lider", "valiente", "heroe", "salvavidas", "aventurero", "sonador",
];

/** Frases muy simples para leer en voz alta a niñas y niños de Inicial. */
export const INICIAL_MEANINGS: Record<string, string> = {
  deportista: "Juega y se mueve mucho. Hace deporte.",
  bailarin: "Baila y se mueve con la música.",
  musico: "Toca instrumentos y canta canciones.",
  pintor: "Pinta y dibuja cosas bonitas.",
  actor: "Hace de personajes en una obra.",
  cuentacuentos: "Cuenta cuentos a los demás.",
  chef: "Cocina cosas ricas.",
  jardinero: "Cuida las plantas y las flores.",
  protector_animales: "Cuida a los animales.",
  constructor: "Construye casas y edificios.",
  carpintero: "Hace cosas de madera.",
  medico: "Cuida a las personas cuando están enfermas.",
  docente: "Enseña cosas a los niños y niñas.",
  piloto: "Maneja aviones y vuela muy alto.",
  cientifico: "Hace experimentos para descubrir cosas.",
  viajero: "Viaja y conoce lugares nuevos.",
};

/** Pictogramas para el perfil de talentos en Inicial (el niño elige, no escribe). */
export const INICIAL_PICTOGRAMS: { key: string; emoji: string; label: string }[] = [
  { key: "jugar", emoji: "⚽", label: "Correr y jugar" },
  { key: "dibujar", emoji: "🎨", label: "Dibujar y pintar" },
  { key: "cantar", emoji: "🎤", label: "Cantar" },
  { key: "bailar", emoji: "💃", label: "Bailar" },
  { key: "cuentos", emoji: "📖", label: "Escuchar y contar cuentos" },
  { key: "cocinar", emoji: "🍳", label: "Ayudar a cocinar" },
  { key: "plantas", emoji: "🌱", label: "Cuidar las plantas" },
  { key: "animales", emoji: "🐶", label: "Cuidar a los animales" },
  { key: "construir", emoji: "🧱", label: "Construir con bloques" },
  { key: "ayudar", emoji: "🤝", label: "Ayudar a otros" },
  { key: "rompecabezas", emoji: "🧩", label: "Armar rompecabezas" },
  { key: "numeros", emoji: "🔢", label: "Contar y los números" },
  { key: "amigos", emoji: "👫", label: "Hacer amigos" },
  { key: "actuar", emoji: "🎭", label: "Actuar y disfrazarme" },
  { key: "musica", emoji: "🎵", label: "Tocar música" },
  { key: "bichos", emoji: "🐛", label: "Mirar bichitos" },
  { key: "escuchar", emoji: "👂", label: "Escuchar a los demás" },
  { key: "ordenar", emoji: "🧹", label: "Ordenar mis cosas" },
];

// ---------------------------------------------------------------------------------------------
// Configuración por nivel
// ---------------------------------------------------------------------------------------------

export interface NivelCopy {
  /** Pasos de introducción del juego de arquetipos. */
  intro: string[];
  clasificarPrompt: string;
  choiceLabels: { SI: string; DUDA: string; NO: string };
  ajusteHelp: string;
  agruparHelp: string;
  groupPlaceholder: string;
  ordenarHelp: string;
  favoritasHelp: string;
  cierreReflection: string;
  cierreLetter: string;
  /** Tono del perfil de talentos. */
  perfilIntro: string;
  experimentoIntro: string;
}

export interface NivelConfig {
  key: TapasNivel;
  label: string;
  cursos: string;
  edades: string;
  description: string;
  instruments: TapasInstrument[];
  /** null = las 74 tarjetas. */
  archetypeKeys: string[] | null;
  /** FAVORITAS: elige hasta 3 tarjetas favoritas (Inicial). COMPLETO: agrupar y ordenar (manual). */
  arquetiposFlow: "COMPLETO" | "FAVORITAS";
  twoChoices: boolean;
  readAloud: boolean;
  minIdentified: number;
  minGroups: number;
  maxGroups: number;
  /** Cantidad de características a anotar por perspectiva en el perfil de talentos. */
  profile: { min: number; max: number; pictograms: boolean };
  /** Mínimo de formas de verificar el experimento (manual: 3) y de desafíos. */
  experimento: { verifyMin: number; challengeMin: number };
  requireReflection: boolean;
  minutes: string;
  copy: NivelCopy;
}

const COPY_BACHILLERATO: NivelCopy = {
  intro: [
    "Vas a ver {n} tarjetas con distintas formas de ser y de hacer las cosas.",
    "En cada una elige: «Me identifico», «Tengo dudas» o «No me identifico». Hazlo rápido y con sinceridad, sin pensarlo demasiado.",
    "Con las tarjetas con las que te identificas armarás de 3 a 6 grupos de talentos y les pondrás un nombre.",
    "Al final ordenarás tus grupos del talento más fuerte al más débil y verás tu perfil.",
  ],
  clasificarPrompt: "¿Te identificas con esta forma de ser o de hacer las cosas?",
  choiceLabels: { SI: "Me identifico", DUDA: "Tengo dudas", NO: "No me identifico" },
  ajusteHelp: "Necesitas al menos {min} tarjetas con las que te identifiques (llevas {n}). De estas que marcaste con dudas, toca las que sí van contigo.",
  agruparHelp:
    "Junta las tarjetas que se parecen entre sí en {min} a {max} grupos. Elige un grupo y toca las tarjetas para agregarlas o quitarlas. Ponle a cada grupo un nombre que empiece con un verbo.",
  groupPlaceholder: "Ej. Proteger la justicia",
  ordenarHelp: "Del talento que sientes más fuerte (arriba) al menos fuerte (abajo).",
  favoritasHelp: "",
  cierreReflection: "¿Qué descubriste sobre ti con este juego? ¿Cómo se conecta con lo que quieres estudiar o hacer?",
  cierreLetter: "Una carta breve a tu yo del futuro (opcional)",
  perfilIntro:
    "Escribe lo que haces bien y ubícalo en el plano: qué tan bien lo haces y cuánto te gusta. No hay respuestas correctas o incorrectas; lo importante es la sinceridad.",
  experimentoIntro:
    "Vas a escoger uno de tus talentos y a ponerlo a prueba con un experimento. Esta actividad tiene dos sesiones: hoy lo planificas y, una semana después, registras qué pasó.",
};

const COPY_BASICA: NivelCopy = {
  intro: [
    "Vas a ver {n} tarjetas de personas con distintos talentos.",
    "En cada una elige: «Me identifico», «No sé» o «No me identifico». Responde rápido y con sinceridad.",
    "Con las que te identificas armarás {min} a {max} grupos de tarjetas que se parecen y les pondrás un nombre.",
    "Al final ordenarás tus grupos del que mejor haces al que menos y verás tu perfil de talentos.",
  ],
  clasificarPrompt: "¿Te pareces a esta persona? ¿Te gustaría hacer lo que ella hace?",
  choiceLabels: { SI: "Me identifico", DUDA: "No sé", NO: "No me identifico" },
  ajusteHelp: "Necesitas al menos {min} tarjetas con las que te identifiques (llevas {n}). Toca las que marcaste «No sé» y que sí van contigo.",
  agruparHelp:
    "Junta las tarjetas que se parecen entre sí en {min} a {max} grupos. Elige un grupo y toca las tarjetas para ponerlas o quitarlas. Dale a cada grupo un nombre que diga lo que haces (por ejemplo: «Cuidar animales»).",
  groupPlaceholder: "Ej. Cuidar a los animales",
  ordenarHelp: "Pon arriba el grupo que mejor haces y abajo el que menos.",
  favoritasHelp: "",
  cierreReflection: "¿Qué descubriste sobre ti? ¿Qué te gustaría ser o hacer cuando seas grande?",
  cierreLetter: "Escríbele una carta corta a ti mismo/a cuando seas grande (opcional)",
  perfilIntro:
    "Escribe cosas que haces bien. Después ubícalas en el plano: qué tan bien las haces y cuánto te gustan. No hay respuestas buenas o malas.",
  experimentoIntro:
    "Vas a escoger algo que haces bien y a probar cómo te sientes al hacerlo más veces. Tiene dos partes: hoy lo planificas y, en una semana, cuentas qué pasó.",
};

const COPY_INICIAL: NivelCopy = {
  intro: [
    "Vas a ver {n} tarjetas de personas que hacen cosas diferentes.",
    "Toca 🔊 para escuchar qué hace cada una.",
    "Si te gusta lo que hace, toca la cara feliz. Si no te gusta, toca la otra cara.",
    "Al final escoges tus 3 tarjetas favoritas.",
  ],
  clasificarPrompt: "¿Te gusta hacer lo que hace esta persona?",
  choiceLabels: { SI: "¡Me gusta!", DUDA: "No sé", NO: "No me gusta" },
  ajusteHelp: "",
  agruparHelp: "",
  groupPlaceholder: "",
  ordenarHelp: "",
  favoritasHelp: "Toca tus 3 tarjetas favoritas, la primera que toques es la que más te gusta.",
  cierreReflection: "¿Cómo te sentiste con el juego? Cuéntaselo a tu maestra o maestro.",
  cierreLetter: "",
  perfilIntro: "Toca los dibujos de las cosas que haces bien. Después dinos si te gusta hacerlas.",
  experimentoIntro: "",
};

export const TAPAS_NIVELES: Record<TapasNivel, NivelConfig> = {
  INICIAL: {
    key: "INICIAL",
    label: "Inicial",
    cursos: "Inicial 1 y 2",
    edades: "3 a 5 años",
    description:
      "Acompañado por la docente o el docente. Pocas tarjetas (16), con dibujos grandes, lectura en voz alta y solo dos opciones (me gusta / no me gusta). En lugar de agrupar, elige sus 3 tarjetas favoritas. El perfil de talentos se arma con dibujos, sin escribir.",
    instruments: ["ARQUETIPOS", "PERFIL_V1"],
    archetypeKeys: INICIAL_ARCHETYPE_KEYS,
    arquetiposFlow: "FAVORITAS",
    twoChoices: true,
    readAloud: true,
    minIdentified: 3,
    minGroups: 1,
    maxGroups: 3,
    profile: { min: 2, max: 3, pictograms: true },
    experimento: { verifyMin: 0, challengeMin: 0 },
    requireReflection: false,
    minutes: "10 a 15 min",
    copy: COPY_INICIAL,
  },
  BASICA: {
    key: "BASICA",
    label: "Básica",
    cursos: "2.º a 10.º EGB",
    edades: "6 a 14 años",
    description:
      "Lenguaje sencillo y 40 tarjetas más cercanas a su vida. Se pide menos (mínimo 5 tarjetas, de 2 a 4 grupos, de 2 a 3 características) y puede leerse en voz alta. Incluye todas las herramientas del manual con pasos más guiados.",
    instruments: ["ARQUETIPOS", "PERFIL_V1", "PERFIL_V2", "EXPERIMENTO"],
    archetypeKeys: BASICA_ARCHETYPE_KEYS,
    arquetiposFlow: "COMPLETO",
    twoChoices: false,
    readAloud: true,
    minIdentified: 5,
    minGroups: 2,
    maxGroups: 4,
    profile: { min: 2, max: 5, pictograms: false },
    experimento: { verifyMin: 2, challengeMin: 1 },
    requireReflection: true,
    minutes: "20 a 30 min",
    copy: COPY_BASICA,
  },
  BACHILLERATO: {
    key: "BACHILLERATO",
    label: "Bachillerato",
    cursos: "1.º a 3.º BGU",
    edades: "15 a 18 años",
    description:
      "Versión completa del manual: las 74 tarjetas, mínimo 10 con las que se identifica, de 3 a 6 grupos con nombre de verbo, de 3 a 5 características en el perfil y mínimo 3 formas de verificar el experimento. Se conecta con la elección de estudios o trabajo.",
    instruments: ["ARQUETIPOS", "PERFIL_V1", "PERFIL_V2", "EXPERIMENTO"],
    archetypeKeys: null,
    arquetiposFlow: "COMPLETO",
    twoChoices: false,
    readAloud: false,
    minIdentified: 10,
    minGroups: 3,
    maxGroups: 6,
    profile: { min: 3, max: 5, pictograms: false },
    experimento: { verifyMin: 3, challengeMin: 1 },
    requireReflection: true,
    minutes: "20 a 30 min",
    copy: COPY_BACHILLERATO,
  },
};

export function isTapasNivel(v: unknown): v is TapasNivel {
  return typeof v === "string" && (TAPAS_NIVEL_KEYS as string[]).includes(v);
}
export function isTapasInstrument(v: unknown): v is TapasInstrument {
  return typeof v === "string" && (TAPAS_INSTRUMENT_KEYS as string[]).includes(v);
}

/** Valida y normaliza el par instrumento + nivel; devuelve un error legible si no es una combinación válida. */
export function resolveInstrumentAndNivel(
  instrument: unknown,
  nivel: unknown
): { ok: true; instrument: TapasInstrument; nivel: TapasNivel } | { ok: false; error: string } {
  const i = isTapasInstrument(instrument) ? instrument : "ARQUETIPOS";
  const n = isTapasNivel(nivel) ? nivel : "BACHILLERATO";
  if (!TAPAS_NIVELES[n].instruments.includes(i)) {
    return {
      ok: false,
      error: `«${TAPAS_INSTRUMENTS[i].label}» no está disponible para el nivel ${TAPAS_NIVELES[n].label}.`,
    };
  }
  return { ok: true, instrument: i, nivel: n };
}

/** Arquetipos que se juegan en un nivel, en el orden del catálogo. */
export function archetypesForNivel(nivel: TapasNivel) {
  const keys = TAPAS_NIVELES[nivel].archetypeKeys;
  return keys ? ARCHETYPES.filter((a) => keys.includes(a.key)) : ARCHETYPES;
}

/** Reemplaza {n}, {min}, {max} en los textos. */
export function fillCopy(text: string, vars: Record<string, number | string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** Nivel sugerido según el nombre del curso (p. ej. «2º BGU», «8vo EGB», «Inicial 2»). */
export function suggestNivelFromCourse(course: string | null | undefined): TapasNivel | null {
  const c = (course || "").toLowerCase();
  if (!c) return null;
  if (/inicial|preparatoria|pre-?escolar/.test(c)) return "INICIAL";
  if (/bgu|bachillerato|bachiller|bt\b/.test(c)) return "BACHILLERATO";
  if (/egb|básica|basica|elemental|media|superior|\d+\s*(º|°|ro|do|er|to|vo|mo|no|\.º|mo)/.test(c)) {
    const m = c.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 3 && /bgu|bach/.test(c)) return "BACHILLERATO";
      if (n >= 1 && n <= 10) return "BASICA";
    }
    return "BASICA";
  }
  return null;
}
