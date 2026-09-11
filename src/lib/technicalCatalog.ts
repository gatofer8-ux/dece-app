/**
 * Catálogo Oficial de Figuras Profesionales del Bachillerato Técnico (MINEDUC Ecuador)
 * Normativa: Acuerdo Ministerial Nro. MINEDUC-MINEDUC-2024-00065-A, reforma MINEDUC-2025-00051-A
 * y catálogo histórico consolidado vigente.
 */

export interface TechnicalFigure {
  id: string;
  name: string;
  family: string;
  area: string;
}

export const OFFICIAL_TECHNICAL_FIGURES: TechnicalFigure[] = [
  // Gestión Administrativa y Financiera / Servicios
  {
    id: "contabilidad",
    name: "Contabilidad (Gestión Administrativa y Financiera)",
    family: "Administrativa y Financiera",
    area: "Técnica",
  },
  {
    id: "gestion-administrativa",
    name: "Gestión Administrativa",
    family: "Administrativa y Financiera",
    area: "Técnica",
  },
  {
    id: "comercializacion-ventas",
    name: "Comercialización y Ventas",
    family: "Administrativa y Financiera",
    area: "Técnica",
  },
  {
    id: "comercio-exterior",
    name: "Comercio Exterior",
    family: "Administrativa y Financiera",
    area: "Técnica",
  },

  // Tecnologías de la Información y Comunicación (TIC)
  {
    id: "informatica",
    name: "Informática (Desarrollo y Soporte Tecnológico)",
    family: "Tecnologías (TIC)",
    area: "Técnica",
  },
  {
    id: "programacion-software",
    name: "Programación de Software",
    family: "Tecnologías (TIC)",
    area: "Técnica",
  },
  {
    id: "dispositivos-conectividad",
    name: "Dispositivos y Conectividad (Redes y Telecomunicaciones)",
    family: "Tecnologías (TIC)",
    area: "Técnica",
  },
  {
    id: "soporte-tecnico",
    name: "Soporte Técnico de Equipos Informáticos",
    family: "Tecnologías (TIC)",
    area: "Técnica",
  },

  // Industrial y Mecánica
  {
    id: "electromecanica-automotriz",
    name: "Electromecánica Automotriz",
    family: "Industrial",
    area: "Técnica",
  },
  {
    id: "mecanica-industrial",
    name: "Mecánica Industrial / Mecanizado y Construcciones Metálicas",
    family: "Industrial",
    area: "Técnica",
  },
  {
    id: "mecatronica",
    name: "Mecatrónica",
    family: "Industrial",
    area: "Técnica",
  },
  {
    id: "instalaciones-electricas",
    name: "Instalaciones, Equipos y Máquinas Eléctricas",
    family: "Industrial",
    area: "Técnica",
  },
  {
    id: "electronica-consumo",
    name: "Electricidad y Electrónica de Consumo",
    family: "Industrial",
    area: "Técnica",
  },
  {
    id: "climatizacion",
    name: "Refrigeración y Climatización",
    family: "Industrial",
    area: "Técnica",
  },
  {
    id: "confeccion-calzado",
    name: "Industria de la Confección y Calzado (Confección Textil / Marroquinería)",
    family: "Industrial",
    area: "Técnica",
  },
  {
    id: "fabricacion-muebles",
    name: "Fabricación y Montaje de Muebles (Madera)",
    family: "Industrial",
    area: "Técnica",
  },
  {
    id: "mecanica-naval",
    name: "Mecánica Naval",
    family: "Industrial",
    area: "Técnica",
  },

  // Agropecuaria y Recursos Naturales
  {
    id: "produccion-agropecuaria",
    name: "Producción Agropecuaria",
    family: "Agropecuaria",
    area: "Técnica",
  },
  {
    id: "produccion-agroecologica",
    name: "Producción Agroecológica",
    family: "Agropecuaria",
    area: "Técnica",
  },
  {
    id: "industrializacion-alimentos",
    name: "Industrialización de Productos Alimenticios",
    family: "Agropecuaria",
    area: "Técnica",
  },
  {
    id: "acuicultura",
    name: "Cultivo de Peces, Moluscos y Crustáceos (Acuicultura)",
    family: "Agropecuaria",
    area: "Técnica",
  },
  {
    id: "recursos-naturales",
    name: "Conservación y Manejo de Recursos Naturales",
    family: "Ambiente",
    area: "Técnica",
  },

  // Turismo, Hotelería y Gastronomía
  {
    id: "servicios-hoteleros",
    name: "Servicios Hoteleros",
    family: "Turismo y Hotelería",
    area: "Técnica",
  },
  {
    id: "ventas-informacion-turistica",
    name: "Ventas e Información Turística / Guianza",
    family: "Turismo y Hotelería",
    area: "Técnica",
  },
  {
    id: "gastronomia",
    name: "Gastronomía / Alimentos y Bebidas",
    family: "Turismo y Hotelería",
    area: "Técnica",
  },

  // Construcción
  {
    id: "construcciones-civiles",
    name: "Construcciones Civiles",
    family: "Construcción Sostenible",
    area: "Técnica",
  },
  {
    id: "instalaciones-hidrosanitarias",
    name: "Instalaciones Hidrosanitarias",
    family: "Construcción Sostenible",
    area: "Técnica",
  },

  // Artística y Diseño
  {
    id: "diseno-grafico",
    name: "Diseño Gráfico y Multimedia",
    family: "Artes y Diseño",
    area: "Artística",
  },
  {
    id: "musica",
    name: "Música",
    family: "Artes y Diseño",
    area: "Artística",
  },
  {
    id: "artes-plasticas",
    name: "Pintura, Cerámica y Escultura",
    family: "Artes y Diseño",
    area: "Artística",
  },
  {
    id: "danza",
    name: "Danza y Expresión Corporal",
    family: "Artes y Diseño",
    area: "Artística",
  },
  {
    id: "teatro",
    name: "Teatro y Artes Escénicas",
    family: "Artes y Diseño",
    area: "Artística",
  },

  // Deportes y Salud
  {
    id: "entrenamiento-deportivo",
    name: "Entrenamiento Deportivo / Animación de Eventos",
    family: "Deportes",
    area: "Deportes y Salud",
  },
  {
    id: "servicios-salud",
    name: "Asistencia en Servicios de Salud / Salud y Servicio",
    family: "Salud y Servicio",
    area: "Deportes y Salud",
  },
];

/**
 * Catálogo de Subniveles y Niveles Educativos en Ecuador
 * Permite a las instituciones seleccionar exactamente lo que ofertan
 * (respetando que Escuelas de Educación Básica - EEB no tienen bachillerato).
 */
export interface EducationLevelPreset {
  id: string;
  label: string;
  shortLabel: string;
  isBachillerato: boolean;
  defaultCourses: string[];
}

export const EDUCATION_LEVEL_PRESETS: EducationLevelPreset[] = [
  {
    id: "INICIAL",
    label: "Educación Inicial (3 a 4 años)",
    shortLabel: "Inicial",
    isBachillerato: false,
    defaultCourses: ["Inicial I (3 años)", "Inicial II (4 años)"],
  },
  {
    id: "BASICA_PREPARATORIA",
    label: "Básica Preparatoria (1.° EGB - 5 años)",
    shortLabel: "Preparatoria",
    isBachillerato: false,
    defaultCourses: ["1.° EGB"],
  },
  {
    id: "BASICA_ELEMENTAL",
    label: "Básica Elemental (2.°, 3.°, 4.° EGB)",
    shortLabel: "Elemental",
    isBachillerato: false,
    defaultCourses: ["2.° EGB", "3.° EGB", "4.° EGB"],
  },
  {
    id: "BASICA_MEDIA",
    label: "Básica Media (5.°, 6.°, 7.° EGB)",
    shortLabel: "Media",
    isBachillerato: false,
    defaultCourses: ["5.° EGB", "6.° EGB", "7.° EGB"],
  },
  {
    id: "BASICA_SUPERIOR",
    label: "Básica Superior (8.°, 9.°, 10.° EGB)",
    shortLabel: "Superior",
    isBachillerato: false,
    defaultCourses: ["8.° EGB", "9.° EGB", "10.° EGB"],
  },
  {
    id: "BACHILLERATO_CIENCIAS",
    label: "Bachillerato General Unificado en Ciencias (BGU)",
    shortLabel: "BGU Ciencias",
    isBachillerato: true,
    defaultCourses: ["1.° BGU Ciencias", "2.° BGU Ciencias", "3.° BGU Ciencias"],
  },
  {
    id: "BACHILLERATO_TECNICO",
    label: "Bachillerato Técnico (BT con Figuras Profesionales)",
    shortLabel: "Bachillerato Técnico",
    isBachillerato: true,
    defaultCourses: ["1.° Bachillerato Técnico", "2.° Bachillerato Técnico", "3.° Bachillerato Técnico"],
  },
];

export function getAllTechnicalFigures(): TechnicalFigure[] {
  return OFFICIAL_TECHNICAL_FIGURES;
}

export function searchTechnicalFigures(query: string): TechnicalFigure[] {
  const q = query.toLowerCase().trim();
  if (!q) return OFFICIAL_TECHNICAL_FIGURES;
  return OFFICIAL_TECHNICAL_FIGURES.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.family.toLowerCase().includes(q) ||
      f.area.toLowerCase().includes(q)
  );
}
