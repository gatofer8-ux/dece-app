import { db } from "@/lib/db";
import type { InstitutionRow, UserRow } from "@/lib/types";

export interface OvpProcessReportData {
  institution: InstitutionRow;
  professional: UserRow | null;
  authority: UserRow | null;
  reportNumber: string;
  reportDate: string;
  tema: string;
  legalBasis: string;
  scopeText: string;
  objectiveGeneral: string;
  objectivesSpecific: string;
  developmentAnalysis: string;
  ejeAutoconocimiento: string;
  ejeInformacion: string;
  ejeTomaDecisiones: string;
  activities: {
    name: string;
    axis: string;
    date: string;
    responsible: string;
    beneficiaries: string;
  }[];
  participantsCount: number;
  advances: string;
  criticalNodes: string;
  conclusions: string;
  recommendations: string;
  elaboratedByName: string;
  elaboratedByRole: string;
  approvedByName: string;
  approvedByRole: string;
}

export function getOvpProcessReportData(institutionId: string): OvpProcessReportData {
  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow;

  const deceUser = db
    .prepare(
      "SELECT * FROM users WHERE institution_id = ? AND role IN ('DECE', 'ADMIN') AND active = 1 ORDER BY name ASC LIMIT 1"
    )
    .get(institutionId) as UserRow | undefined;

  const authorityUser = db
    .prepare(
      "SELECT * FROM users WHERE institution_id = ? AND role IN ('AUTORIDAD', 'ADMIN') AND active = 1 ORDER BY role DESC, name ASC LIMIT 1"
    )
    .get(institutionId) as UserRow | undefined;

  // Estadísticas institucionales
  const tapasAppsCount = (
    db
      .prepare(
        "SELECT COUNT(*) as n FROM tapas_applications WHERE institution_id = ? AND status = 'FINALIZADA'"
      )
      .get(institutionId) as { n: number }
  )?.n || 0;

  const ippjAppsCount = (
    db
      .prepare(
        "SELECT COUNT(*) as n FROM ovp_applications WHERE institution_id = ? AND status = 'FINALIZADA'"
      )
      .get(institutionId) as { n: number }
  )?.n || 0;

  const studentsCount = (
    db
      .prepare(
        "SELECT COUNT(*) as n FROM students WHERE institution_id = ? AND active = 1 AND (course LIKE '%Bachillerato%' OR course LIKE '%BGU%' OR course LIKE '%10mo%')"
      )
      .get(institutionId) as { n: number }
  )?.n || 0;

  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().slice(0, 10);
  const reportNumber = `INF-OVP-${currentYear}-001`;

  const totalEvaluations = tapasAppsCount + ippjAppsCount;

  return {
    institution,
    professional: deceUser || null,
    authority: authorityUser || null,
    reportNumber,
    reportDate: todayStr,
    tema: "INFORME TÉCNICO DEL PROCESO INSTITUCIONAL DE ORIENTACIÓN VOCACIONAL Y PROFESIONAL (OVP) Y PROYECTO DE VIDA",
    legalBasis:
      "• Constitución de la República del Ecuador (Art. 26, 27 y 347, garantía del derecho integral a la educación).\n" +
      "• Ley Orgánica de Educación Intercultural - LOEI (Art. 56 y 58, funciones del Departamento de Consejería Estudiantil).\n" +
      "• Reglamento General a la LOEI (Art. 60 y disposiciones relativas al acompañamiento integral estudiantil).\n" +
      "• Acuerdo Ministerial MINEDUC-2023-00067-A (Normativa para la implementación de los Departamentos de Consejería Estudiantil).\n" +
      "• Modelo de Orientación Vocacional y Profesional (OVP) para el Sistema Nacional de Educación del Ministerio de Educación del Ecuador.",
    scopeText:
      `El proceso de Orientación Vocacional y Profesional fue ejecutado con los y las estudiantes de Educación General Básica Superior (10mo EGB) y de Primero, Segundo y Tercero de Bachillerato General Unificado y Técnico de la institución educativa ${institution?.name || "institucional"}, con la participación activa de los docentes tutores y representantes legales.`,
    objectiveGeneral:
      "Implementar de forma sistemática y contextualizada el proceso de Orientación Vocacional y Profesional (OVP) articulado en sus tres ejes rectores: Autoconocimiento, Información y Toma de Decisiones, brindando a las y los estudiantes las herramientas psicopedagógicas necesarias para la formulación autónoma, responsable y reflexiva de su Proyecto de Vida y la transición armónica hacia la educación superior o el ámbito laboral.",
    objectivesSpecific:
      "1. Promover el autoconocimiento y la introspección vocacional en los estudiantes mediante la aplicación del Juego de Arquetipos y Talentos (TaPas) y actividades de proyecto de vida.\n" +
      "2. Proveer información técnica actualizada, veraz y oportuna sobre la oferta formativa universitaria, tecnológica (SENESCYT) y el mercado ocupacional ecuatoriano.\n" +
      "3. Asesorar y acompañar a los estudiantes y sus familias en la toma de decisiones informadas mediante la aplicación del Inventario de Preferencias Profesionales (IPPJ), entrevistas individuales y la emisión de informes vocacionales consolidados para 3ro de Bachillerato.",
    developmentAnalysis:
      "El Departamento de Consejería Estudiantil (DECE) planificó y ejecutó el proceso de Orientación Vocacional y Profesional durante el presente período lectivo, asegurando el cumplimiento de los lineamientos ministeriales y el acompañamiento permanente al estudiantado en las etapas críticas de transición formativa.",
    ejeAutoconocimiento:
      `En el Eje de Autoconocimiento se priorizó la exploración reflexiva de la propia identidad, capacidades, talentos intrínsecos y valores personales. Se aplicó el Juego de Tarjetas de Arquetipos de Talentos y Pasiones (TaPas - VVOB), registrando un total de ${tapasAppsCount} aplicaciones finalizadas. A través de este instrumento, los estudiantes identificaron sus grupos de talentos del más prioritario al más débil, reconociendo fortalezas en familias de indagación científica, expresión creativa, liderazgo social y construcción práctica. Asimismo, se realizaron reflexiones autobiográficas y cartas al futuro que fortalecieron el autoconcepto positivo y la autoeficacia académica.`,
    ejeInformacion:
      "En el Eje de Información se democratizó el acceso al conocimiento sobre las distintas opciones académicas y ocupacionales existentes a nivel local, regional y nacional. Se organizaron charlas informativas sobre el sistema de acceso a la educación superior pública liderado por la SENESCYT, ferias vocacionales con stands universitarios e institutos superiores tecnológicos acreditados, y talleres de análisis de mallas curriculares, perfiles de egreso y campos de inserción profesional. Se enfatizó en la revalorización de las carreras técnicas y tecnológicas de nivel superior como rutas de rápida inserción laboral y alta demanda productiva.",
    ejeTomaDecisiones:
      `En el Eje de Toma de Decisiones se acompañó el discernimiento vocacional crítico de los estudiantes de 3ro de Bachillerato. Se aplicó el Inventario de Preferencias Profesionales para Jóvenes (IPPJ - MINEDUC), alcanzando ${ippjAppsCount} cuestionarios evaluados, cuyos códigos tipológicos de Holland (RIASEC) fueron contrastados con los arquetipos de talentos TaPas. Para cada estudiante se generó el Informe Psicopedagógico Vocacional Consolidado y se desarrollaron entrevistas individuales y familiares para acordar compromisos, evaluar factores de viabilidad económica y acompañar la inscripción en las plataformas oficiales de admisión universitaria.`,
    activities: [
      {
        name: "Aplicación del Juego de Arquetipos de Talentos (TaPas)",
        axis: "AUTOCONOCIMIENTO",
        date: "Inicio del Año Lectivo",
        responsible: "Equipo DECE",
        beneficiaries: `Estudiantes de Bachillerato (${tapasAppsCount} evaluados)`,
      },
      {
        name: "Taller 'Quién Soy y Mi Proyecto de Vida'",
        axis: "AUTOCONOCIMIENTO",
        date: "Primer Trimestre",
        responsible: "Profesionales DECE y Tutores",
        beneficiaries: "Estudiantes de 10mo EGB y Bachillerato",
      },
      {
        name: "Feria Vocacional Institucional y Casas Abiertas",
        axis: "INFORMACIÓN",
        date: "Segundo Trimestre",
        responsible: "Equipo DECE y Universidades Invitadas",
        beneficiaries: "Comunidad Educativa y Familias",
      },
      {
        name: "Socialización del Acceso a Educación Superior (SENESCYT)",
        axis: "INFORMACIÓN",
        date: "Segundo Trimestre",
        responsible: "Equipo DECE",
        beneficiaries: "Estudiantes de 3ro de Bachillerato",
      },
      {
        name: "Aplicación del Inventario de Preferencias Profesionales (IPPJ)",
        axis: "TOMA DE DECISIONES",
        date: "Tercer Trimestre",
        responsible: "Equipo DECE",
        beneficiaries: `Estudiantes de 3ro de Bachillerato (${ippjAppsCount} evaluados)`,
      },
      {
        name: "Entrega de Informes Vocacionales Consolidados a Familias",
        axis: "TOMA DE DECISIONES",
        date: "Fase Final del Año",
        responsible: "Equipo DECE y Representantes",
        beneficiaries: "Estudiantes de 3ro Bachillerato y Familias",
      },
    ],
    participantsCount: totalEvaluations || studentsCount || 120,
    advances:
      "• Cobertura masiva en la aplicación digital de instrumentos estandarizados (TaPas e IPPJ) sin consumo de papel.\n" +
      "• Articulación de informes consolidados de entrega formal a representantes legales para 3ro de Bachillerato.\n" +
      "• Mayor claridad vocacional y disminución de la indecisión frente a la oferta de educación superior.\n" +
      "• Alta participación de las familias en las entrevistas de cierre y corresponsabilidad educativa.",
    criticalNodes:
      "• Dificultades de conectividad domiciliaria en ciertos estudiantes para el llenado autónomo de instrumentos.\n" +
      "• Desconocimiento en algunos hogares sobre los calendarios y requisitos del proceso nacional de admisión.\n" +
      "• Expectativas familiares divergentes con respecto a la vocación real expresada por el estudiante.",
    conclusions:
      "1. El proceso de Orientación Vocacional y Profesional se ejecutó de forma integral, cumpliendo a cabalidad con los lineamientos técnicos del Modelo Nacional DECE y articulando con éxito los tres ejes de formación.\n" +
      "2. La integración de los resultados de talentos (TaPas) e intereses profesionales (IPPJ) permitió dotar a los estudiantes de 3ro de Bachillerato de un diagnóstico vocacional sólido y realista.\n" +
      "3. La intervención oportuna del DECE previno elecciones formativas apresuradas y fomentó la corresponsabilidad familiar en el apoyo al Proyecto de Vida.",
    recommendations:
      "1. A Directivos y Rectorado: Continuar respaldando las alianzas interinstitucionales con universidades, institutos técnicos y empresas para ampliar la oferta de casas abiertas y visitas guiadas.\n" +
      "2. A Docentes Tutores: Fortalecer la transversalización de la orientación vocacional en las asignaturas académicas y proyectos interdisciplinarios.\n" +
      "3. A Padres y Representantes: Mantener un acompañamiento basado en el respeto a la autonomía del estudiante, dialogando oportunamente sobre las opciones de financiamiento y becas.\n" +
      "4. Al Equipo DECE: Mantener la custodia física y digital de los informes consolidados en los expedientes de los estudiantes para los procesos de auditoría distrital.",
    elaboratedByName: deceUser?.name || "Profesional DECE Responsable",
    elaboratedByRole: deceUser?.job_title || "PROFESIONAL DECE",
    approvedByName: authorityUser?.name || "Rector/a Institucional",
    approvedByRole: authorityUser?.job_title || "RECTORADO / MÁXIMA AUTORIDAD",
  };
}
