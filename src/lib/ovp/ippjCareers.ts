/**
 * Orientación de áreas y campos ocupacionales a partir del perfil RIASEC del IPPJ.
 *
 * Fase 1: catálogo general (no regionalizado). El catálogo con instituciones
 * cercanas, costos y becas por distrito/provincia es una fase posterior.
 */

import type { IppjScale } from "./ippjInstrument";

export interface CareerArea {
  /** Campo amplio del conocimiento (referencia SENESCYT / clasificación CINE). */
  area: string;
  /** Carreras y figuras profesionales de ejemplo (3.er nivel y técnico/tecnológico). */
  ejemplos: string[];
  /** Bachillerato técnico o pista de BGU relacionada. */
  bachillerato: string;
}

export const IPPJ_CAREER_MAP: Record<IppjScale, CareerArea[]> = {
  REALISTA: [
    {
      area: "Ingeniería, industria y construcción",
      ejemplos: ["Mecánica automotriz", "Electricidad y electrónica", "Ingeniería mecánica", "Ingeniería civil", "Mantenimiento industrial"],
      bachillerato: "Bachillerato Técnico (Electromecánica, Mecanizado, Electrónica, Instalaciones eléctricas)",
    },
    {
      area: "Agropecuaria, ambiente y recursos naturales",
      ejemplos: ["Agropecuaria", "Producción agrícola", "Zootecnia", "Manejo ambiental", "Forestal"],
      bachillerato: "Bachillerato Técnico Agropecuario",
    },
    {
      area: "Tecnologías, informática de hardware y redes",
      ejemplos: ["Redes y telecomunicaciones", "Soporte técnico de equipos informáticos", "Electrónica"],
      bachillerato: "Bachillerato Técnico en Informática / Electrónica",
    },
  ],
  INVESTIGADORA: [
    {
      area: "Ciencias naturales, exactas y de la vida",
      ejemplos: ["Biología", "Química", "Física", "Matemática", "Bioquímica y farmacia", "Biotecnología"],
      bachillerato: "BGU — énfasis Químico-Biólogo o Físico-Matemático",
    },
    {
      area: "Salud",
      ejemplos: ["Medicina", "Enfermería", "Laboratorio clínico", "Nutrición", "Odontología"],
      bachillerato: "BGU — énfasis Químico-Biólogo",
    },
    {
      area: "Tecnologías de la información (desarrollo y datos)",
      ejemplos: ["Desarrollo de software", "Ciencia de datos", "Ingeniería en sistemas"],
      bachillerato: "Bachillerato Técnico en Informática / BGU Físico-Matemático",
    },
  ],
  ARTISTICA: [
    {
      area: "Artes y humanidades",
      ejemplos: ["Artes visuales", "Música", "Artes escénicas", "Literatura", "Diseño gráfico"],
      bachillerato: "Bachillerato en Artes / BGU Ciencias Sociales",
    },
    {
      area: "Diseño, comunicación y multimedia",
      ejemplos: ["Diseño de modas", "Diseño industrial", "Comunicación audiovisual", "Publicidad", "Animación digital"],
      bachillerato: "Bachillerato Técnico (Diseño gráfico) / BGU",
    },
    {
      area: "Arquitectura y urbanismo",
      ejemplos: ["Arquitectura", "Diseño de interiores"],
      bachillerato: "BGU — énfasis Físico-Matemático",
    },
  ],
  SOCIAL: [
    {
      area: "Educación",
      ejemplos: ["Educación inicial", "Educación básica", "Pedagogía", "Psicopedagogía", "Educación especial"],
      bachillerato: "BGU Ciencias Sociales / Bachillerato Internacional",
    },
    {
      area: "Ciencias sociales y del comportamiento",
      ejemplos: ["Psicología", "Trabajo social", "Sociología", "Terapia ocupacional / lenguaje"],
      bachillerato: "BGU Ciencias Sociales",
    },
    {
      area: "Salud y bienestar comunitario",
      ejemplos: ["Enfermería", "Fisioterapia", "Promoción de la salud", "Gerontología"],
      bachillerato: "BGU Químico-Biólogo",
    },
  ],
  EMPRENDEDORA: [
    {
      area: "Administración y negocios",
      ejemplos: ["Administración de empresas", "Marketing", "Comercio exterior", "Emprendimiento", "Gestión de talento humano"],
      bachillerato: "Bachillerato Técnico (Comercialización y ventas) / BGU",
    },
    {
      area: "Derecho y ciencias políticas",
      ejemplos: ["Derecho", "Relaciones internacionales", "Ciencias políticas", "Gestión pública"],
      bachillerato: "BGU Ciencias Sociales",
    },
    {
      area: "Turismo, hotelería y gastronomía",
      ejemplos: ["Turismo", "Hotelería", "Gastronomía", "Organización de eventos"],
      bachillerato: "Bachillerato Técnico en Servicios (Gastronomía, Turismo)",
    },
  ],
  CONVENCIONAL: [
    {
      area: "Contabilidad, finanzas y auditoría",
      ejemplos: ["Contabilidad y auditoría", "Finanzas", "Tributación", "Banca y seguros"],
      bachillerato: "Bachillerato Técnico en Contabilidad",
    },
    {
      area: "Gestión de la información y administración",
      ejemplos: ["Gestión documental y archivo", "Secretariado ejecutivo", "Logística", "Administración pública"],
      bachillerato: "Bachillerato Técnico (Administración de sistemas, Contabilidad)",
    },
    {
      area: "Tecnologías de la información (soporte y gestión)",
      ejemplos: ["Análisis de sistemas", "Bases de datos", "Gestión de proyectos TI"],
      bachillerato: "Bachillerato Técnico en Informática",
    },
  ],
};

/** Devuelve las áreas sugeridas para los tipos dominantes (sin repetir). */
export function suggestedAreasFor(topTypes: IppjScale[]): { fromType: IppjScale; area: CareerArea }[] {
  const seen = new Set<string>();
  const out: { fromType: IppjScale; area: CareerArea }[] = [];
  for (const t of topTypes) {
    for (const area of IPPJ_CAREER_MAP[t]) {
      if (seen.has(area.area)) continue;
      seen.add(area.area);
      out.push({ fromType: t, area });
    }
  }
  return out;
}
