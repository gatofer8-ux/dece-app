import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
  group: string;
}

export const NAV_ITEMS: NavItem[] = [
  // Global
  { href: "/superadmin", label: "Superadministrador", icon: "🛡️", roles: ["SUPERADMIN"], group: "Global" },
  { href: "/instituciones", label: "Instituciones", icon: "🏫", roles: ["SUPERADMIN", "DISTRITO"], group: "Global" },

  // Principal
  { href: "/dashboard", label: "Panel general", icon: "📊", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/chat", label: "Mensajería / Chat", icon: "💬", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DOCENTE"], group: "Principal" },
  { href: "/estudiantes", label: "Estudiantes", icon: "🎓", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/casos", label: "Casos y fichas", icon: "📁", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/alertas", label: "Alertas", icon: "🚩", roles: ["SUPERADMIN", "ADMIN", "DECE", "DOCENTE"], group: "Principal" },
  { href: "/citas", label: "Citas y agenda", icon: "📅", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/esquelas", label: "Esquelas de citación", icon: "📨", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/derivaciones", label: "Derivaciones", icon: "🔀", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },
  { href: "/atencion-diaria", label: "Atención diaria", icon: "📋", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Principal" },

  // Acompañamiento y prevención
  { href: "/actividades", label: "Promoción y prevención", icon: "🌱", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DOCENTE"], group: "Acompañamiento y prevención" },
  { href: "/talleres", label: "Talleres y guiones", icon: "📚", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DOCENTE"], group: "Acompañamiento y prevención" },
  { href: "/circulos-restaurativos", label: "Círculos restaurativos", icon: "⭕", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Acompañamiento y prevención" },
  { href: "/circulos-restaurativos/fichas", label: "Fichas de círculo restaurativo", icon: "🗒️", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Acompañamiento y prevención" },
  { href: "/actas-reunion", label: "Actas de reunión", icon: "📝", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Acompañamiento y prevención" },
  { href: "/plan-accion", label: "Plan de acción (POA)", icon: "🎯", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Acompañamiento y prevención" },

  // Orientación Vocacional y Profesional (OVP)
  { href: "/ovp", label: "Aplicaciones IPPJ", icon: "🧭", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Orientación Vocacional y Profesional (OVP)" },
  { href: "/ovp/cronograma", label: "Cronogramas de citas", icon: "🗓️", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Orientación Vocacional y Profesional (OVP)" },
  { href: "/tapas", label: "Juego de arquetipos (TaPas)", icon: "🃏", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Orientación Vocacional y Profesional (OVP)" },

  // ENEIS
  { href: "/eneis", label: "Fichas de Aplicación ENEIS", icon: "🧩", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "ENEIS" },
  { href: "/eneis/encuestas", label: "Encuestas de percepción", icon: "📊", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "ENEIS" },
  { href: "/eneis/informe", label: "Informe trimestral/semestral", icon: "📄", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "ENEIS" },
  { href: "/eneis/actas", label: "Actas de reunión ENEIS", icon: "📝", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "ENEIS" },
  { href: "/eneis/informe-dece", label: "Informe mensual de actividades DECE", icon: "📋", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "ENEIS" },
  { href: "/eneis/reporte-avances", label: "Reporte de avances por materia", icon: "📈", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "ENEIS" },

  // Informes
  { href: "/reportes", label: "Reportes", icon: "📈", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Informes" },
  { href: "/reportes/estadisticas", label: "Cuadros estadísticos", icon: "📊", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Informes" },
  { href: "/juntas-curso", label: "Juntas de curso", icon: "📑", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Informes" },
  { href: "/informe-gestion", label: "Informe de fin de gestión", icon: "📋", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DISTRITO"], group: "Informes" },


  // Administración
  { href: "/distributivo", label: "Distributivo DECE", icon: "👥", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Administración" },
  { href: "/anios-lectivos", label: "Años lectivos", icon: "🗓️", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Administración" },
  { href: "/pasantes", label: "Pasantes y voluntarios", icon: "🤝", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"], group: "Administración" },
  { href: "/usuarios", label: "Usuarios", icon: "👤", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Administración" },
  { href: "/institucion", label: "Mi institución", icon: "🏛️", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Administración" },
  { href: "/respaldos", label: "Copias de seguridad", icon: "💾", roles: ["SUPERADMIN", "ADMIN", "DECE"], group: "Administración" },
  { href: "/auditoria", label: "Auditoría", icon: "📜", roles: ["SUPERADMIN", "ADMIN", "DISTRITO"], group: "Administración" },

  // Cuenta
  { href: "/perfil", label: "Mi perfil", icon: "👤", roles: ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DOCENTE"], group: "Cuenta" },
];

export const GROUP_ORDER = [
  "Global",
  "Principal",
  "Acompañamiento y prevención",
  "Orientación Vocacional y Profesional (OVP)",
  "ENEIS",
  "Informes",
  "Administración",
  "Cuenta",
];

/** Devuelve los grupos con items visibles para el rol dado. */
export function navGroupsFor(role: Role): { name: string; items: NavItem[] }[] {
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));
  return GROUP_ORDER.map((g) => ({ name: g, items: items.filter((i) => i.group === g) })).filter(
    (g) => g.items.length > 0
  );
}
