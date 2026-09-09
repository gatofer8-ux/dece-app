"use client";

import { useState } from "react";
import Link from "next/link";
import { saveDistributivo, saveCourseQuotasAction, loadCourseQuotasAction, clearCourseQuotasAction, deleteDistributivo } from "./actions";
import { loadDesktopTutorsAction, uploadTutorsFileAction } from "./tutors-actions";
import {
  OFFICIAL_TECHNICAL_FIGURES,
  EDUCATION_LEVEL_PRESETS,
} from "@/lib/technicalCatalog";
import type {
  DeceDistributivoRow,
  DeceDistributivoAssignmentRow,
  SchoolYearRow,
  UserRow,
} from "@/lib/types";
import { compareCoursesDescending, compareCoursesAscending } from "@/lib/courseOrder";

interface CourseSummary {
  course: string;
  totalStudents: number;
  parallels: string[];
  jornadas: string[];
}

interface ProfessionalAssignmentState {
  userId: string;
  userName: string;
  userRoleLabel: string;
  jornada: string; // MATUTINA, VESPERTINA, NOCTURNA, COMPLETA
  subniveles: string[];
  courses: string[];
  parallels: string[];
  estimatedStudentsCount: number;
  specificResponsibilities: string;
  hasEnlazada: boolean;
  enlazadaName: string;
  enlazadaDias: string;
  lunchSchedule: string;
  color: string;
}

interface ParallelItem {
  id: string;
  parallel: string;
  student_count: number;
  tutor_name?: string;
}

interface CourseConfigItem {
  id: string;
  courseName: string;
  education_level: string;
  bachillerato_specialty: string;
  matutinaActive: boolean;
  matutinaParallels: ParallelItem[];
  vespertinaActive: boolean;
  vespertinaParallels: ParallelItem[];
  nocturnaActive: boolean;
  nocturnaParallels: ParallelItem[];
}

export default function DistributivoForm({
  distributivo,
  existingAssignments,
  schoolYears,
  selectedYearId,
  deceTeam,
  courseSummaries: initialCourseSummaries,
  totalStudents: initialTotalStudents,
  currentUserName,
}: {
  distributivo?: DeceDistributivoRow;
  existingAssignments?: DeceDistributivoAssignmentRow[];
  schoolYears: SchoolYearRow[];
  selectedYearId?: string;
  deceTeam: UserRow[];
  courseSummaries: CourseSummary[];
  totalStudents: number;
  currentUserName?: string;
}) {
  const [schoolYearId, setSchoolYearId] = useState(
    distributivo?.school_year_id || selectedYearId || schoolYears[0]?.id || ""
  );
  const [title, setTitle] = useState(
    distributivo?.title || "Distributivo Institucional de Cobertura DECE"
  );
  const [coordinatorName, setCoordinatorName] = useState(
    distributivo?.coordinator_name || currentUserName || "Coordinador/a DECE"
  );
  const [elaboratedByName, setElaboratedByName] = useState(
    distributivo?.elaborated_by_name || currentUserName || ""
  );
  const [elaboratedByRole, setElaboratedByRole] = useState(
    distributivo?.elaborated_by_role || "Coordinador/a DECE"
  );
  const [approvedByName, setApprovedByName] = useState(
    distributivo?.approved_by_name || ""
  );
  const [approvedByRole, setApprovedByRole] = useState(
    distributivo?.approved_by_role || "Rector/a Institucional"
  );
  const [generalObservations, setGeneralObservations] = useState(
    distributivo?.general_observations || ""
  );

  // Cursos y numéricos dinámicos (ordenados descendentemente)
  const [courseSummaries, setCourseSummaries] = useState<CourseSummary[]>(() =>
    [...initialCourseSummaries].sort((a, b) => compareCoursesDescending(a.course, b.course))
  );
  const [totalStudents, setTotalStudents] = useState<number>(initialTotalStudents);

  // Selector de vista: Tarjetas con Bloques vs Tabla con Selector Directo
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  // Modal de numéricos y cursos técnicos
  const [showQuotasModal, setShowQuotasModal] = useState(false);

  // Banners y avisos
  const [distributionNotice, setDistributionNotice] = useState<string | null>(null);
  const [quotasNotice, setQuotasNotice] = useState<string | null>(null);
  const [techNotice, setTechNotice] = useState<string | null>(null);

  // Asignación masiva por turno
  const [bulkShiftSelect, setBulkShiftSelect] = useState<"MATUTINA" | "VESPERTINA" | "NOCTURNA">("MATUTINA");
  const [bulkShiftTarget, setBulkShiftTarget] = useState<string>(deceTeam[0]?.id || "");

  // Jornadas institucionales activas
  const [activeJornadas, setActiveJornadas] = useState<{ matutina: boolean; vespertina: boolean; nocturna: boolean }>({
    matutina: true,
    vespertina: initialCourseSummaries.some((c) => c.course.includes("Vespertina") || c.jornadas.includes("VESPERTINA")),
    nocturna: initialCourseSummaries.some((c) => c.course.includes("Nocturna") || c.jornadas.includes("NOCTURNA")),
  });

  // Selector de especialidad técnica o manual para Bachillerato
  const [selectedTechSpecialty, setSelectedTechSpecialty] = useState(OFFICIAL_TECHNICAL_FIGURES[0].name);
  const [techSpecialtySearch, setTechSpecialtySearch] = useState("");
  const [isManualTechSpecialty, setIsManualTechSpecialty] = useState(false);
  const [manualTechSpecialty, setManualTechSpecialty] = useState("");
  const [manualBachilleratoType, setManualBachilleratoType] = useState<"TECNICO" | "GENERAL">("TECNICO");

  // Selectores para añadir cursos regulares y personalizados
  const [selectedSingleCourse, setSelectedSingleCourse] = useState<string>("1.° BGU Ciencias");
  const [customCourseName, setCustomCourseName] = useState<string>("");
  const [newCourseJornada, setNewCourseJornada] = useState<"MATUTINA" | "VESPERTINA" | "NOCTURNA">("MATUTINA");
  const [courseSortOrder, setCourseSortOrder] = useState<"DESC" | "ASC">("DESC");
  const [loadingTutors, setLoadingTutors] = useState(false);

  // Lista de cursos configurables en modal
  const [courseConfigs, setCourseConfigs] = useState<CourseConfigItem[]>([]);
  const [savingQuotas, setSavingQuotas] = useState(false);

  // Paleta oficial de colores por profesional (Amarillo Marlon, Celeste Santiago, Verde Gabriel)
  const defaultColors = ["#FEF08A", "#BAE6FD", "#BBF7D0", "#FED7AA", "#E9D5FF"];

  // Estado de asignaciones
  const [assignments, setAssignments] = useState<ProfessionalAssignmentState[]>(() => {
    return deceTeam.map((user, idx) => {
      const existing = existingAssignments?.find((a) => a.user_id === user.id);
      let parsedCourses: string[] = [];
      let parsedParallels: string[] = [];
      let parsedSubniveles: string[] = [];

      if (existing) {
        try {
          parsedCourses = JSON.parse(existing.courses || "[]");
        } catch {}
        try {
          parsedParallels = JSON.parse(existing.parallels || "[]");
        } catch {}
        try {
          parsedSubniveles = JSON.parse(existing.subniveles || "[]");
        } catch {}
      }

      const defaultColor = defaultColors[idx % defaultColors.length];

      return {
        userId: user.id,
        userName: user.name,
        userRoleLabel: user.role === "ADMIN" ? "Coordinador/a DECE" : "Analista DECE",
        jornada: existing?.jornada || "MATUTINA",
        subniveles: parsedSubniveles,
        courses: parsedCourses,
        parallels: parsedParallels,
        estimatedStudentsCount: existing?.estimated_students_count || 0,
        specificResponsibilities: existing?.specific_responsibilities || "",
        hasEnlazada: existing?.has_enlazada === 1 || Boolean(existing?.enlazada_name),
        enlazadaName: existing?.enlazada_name || "",
        enlazadaDias: existing?.enlazada_dias || "",
        lunchSchedule: existing?.lunch_schedule || (idx === 2 ? "12H00 A 13H00" : "13H00 A 14H00"),
        color: existing?.color || defaultColor,
      };
    });
  });

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Métricas
  const numProfessionals = deceTeam.length;
  const targetPerAnalyst = numProfessionals > 0 ? Math.round(totalStudents / numProfessionals) : 0;
  const isSingleProfessional = numProfessionals === 1;

  const calculateStudentsForCourses = (selectedCourses: string[], summaries = courseSummaries) => {
    return summaries
      .filter((c) => selectedCourses.includes(c.course))
      .reduce((sum, c) => sum + c.totalStudents, 0);
  };

  const inferSubnivelesForCourses = (courses: string[]): string[] => {
    const subniveles = new Set<string>();
    courses.forEach((c) => {
      const lower = c.toLowerCase();
      if (lower.includes("inicial") || lower.includes("preparatoria") || lower.includes("1.°")) {
        subniveles.add("Inicial / Prep.");
      }
      if (lower.includes("2.°") || lower.includes("3.°") || lower.includes("4.°")) {
        subniveles.add("Básica Elemental");
      }
      if (lower.includes("5.°") || lower.includes("6.°") || lower.includes("7.°")) {
        subniveles.add("Básica Media");
      }
      if (lower.includes("8.°") || lower.includes("9.°") || lower.includes("10.°")) {
        subniveles.add("Básica Superior");
      }
      if (lower.includes("bachillerato") || lower.includes("bgu") || lower.includes("técnico")) {
        subniveles.add("Bachillerato");
      }
    });
    return Array.from(subniveles);
  };

  // ---------------------------------------------------------------------------
  // 1. ASIGNACIÓN RÁPIDA POR BLOQUES (EVITA ESTAR SEÑALANDO CURSO POR CURSO)
  // ---------------------------------------------------------------------------
  const assignBlockToUser = (
    userId: string,
    blockType: "MATUTINA" | "VESPERTINA" | "NOCTURNA" | "ELEMENTAL" | "MEDIA" | "SUPERIOR" | "BACHILLERATO" | "ALL"
  ) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.userId !== userId) return a;

        let matchingCourses: string[] = [];
        if (blockType === "ALL") {
          matchingCourses = courseSummaries.map((c) => c.course);
        } else if (blockType === "MATUTINA") {
          matchingCourses = courseSummaries
            .filter((c) => c.course.includes("(Matutina)") || c.jornadas.includes("MATUTINA"))
            .map((c) => c.course);
        } else if (blockType === "VESPERTINA") {
          matchingCourses = courseSummaries
            .filter((c) => c.course.includes("(Vespertina)") || c.jornadas.includes("VESPERTINA"))
            .map((c) => c.course);
        } else if (blockType === "NOCTURNA") {
          matchingCourses = courseSummaries
            .filter((c) => c.course.includes("(Nocturna)") || c.jornadas.includes("NOCTURNA"))
            .map((c) => c.course);
        } else if (blockType === "ELEMENTAL") {
          matchingCourses = courseSummaries
            .filter((c) => c.course.includes("2.°") || c.course.includes("3.°") || c.course.includes("4.°"))
            .map((c) => c.course);
        } else if (blockType === "MEDIA") {
          matchingCourses = courseSummaries
            .filter((c) => c.course.includes("5.°") || c.course.includes("6.°") || c.course.includes("7.°"))
            .map((c) => c.course);
        } else if (blockType === "SUPERIOR") {
          matchingCourses = courseSummaries
            .filter((c) => c.course.includes("8.°") || c.course.includes("9.°") || c.course.includes("10.°"))
            .map((c) => c.course);
        } else if (blockType === "BACHILLERATO") {
          matchingCourses = courseSummaries
            .filter(
              (c) =>
                c.course.toLowerCase().includes("bachillerato") ||
                c.course.toLowerCase().includes("bgu") ||
                c.course.toLowerCase().includes("técnico")
            )
            .map((c) => c.course);
        }

        const nextCourses = Array.from(new Set([...a.courses, ...matchingCourses]));
        const count = calculateStudentsForCourses(nextCourses);
        return {
          ...a,
          courses: nextCourses,
          estimatedStudentsCount: count,
          subniveles: inferSubnivelesForCourses(nextCourses),
        };
      })
    );

    setDistributionNotice("✓ Bloque asignado exitosamente al profesional.");
    setTimeout(() => setDistributionNotice(null), 4000);
  };

  const clearCoursesForUser = (userId: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.userId === userId
          ? { ...a, courses: [], estimatedStudentsCount: 0, subniveles: [] }
          : a
      )
    );
  };

  const assignCourseToUserDirectly = (courseName: string, targetUserId: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.userId === targetUserId) {
          const nextCourses = a.courses.includes(courseName) ? a.courses : [...a.courses, courseName];
          return {
            ...a,
            courses: nextCourses,
            estimatedStudentsCount: calculateStudentsForCourses(nextCourses),
            subniveles: inferSubnivelesForCourses(nextCourses),
          };
        } else {
          if (a.courses.includes(courseName)) {
            const nextCourses = a.courses.filter((c) => c !== courseName);
            return {
              ...a,
              courses: nextCourses,
              estimatedStudentsCount: calculateStudentsForCourses(nextCourses),
              subniveles: inferSubnivelesForCourses(nextCourses),
            };
          }
          return a;
        }
      })
    );
  };

  const handleBulkShiftAssign = () => {
    if (!bulkShiftTarget) return;
    assignBlockToUser(bulkShiftTarget, bulkShiftSelect);
  };

  const toggleCourseForUser = (userId: string, courseName: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.userId !== userId) return a;
        const exists = a.courses.includes(courseName);
        const nextCourses = exists
          ? a.courses.filter((c) => c !== courseName)
          : [...a.courses, courseName];
        const nextCount = calculateStudentsForCourses(nextCourses);
        return {
          ...a,
          courses: nextCourses,
          estimatedStudentsCount: nextCount,
          subniveles: inferSubnivelesForCourses(nextCourses),
        };
      })
    );
  };

  const toggleSubnivelForUser = (userId: string, subnivel: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.userId !== userId) return a;
        const exists = a.subniveles.includes(subnivel);
        return {
          ...a,
          subniveles: exists
            ? a.subniveles.filter((s) => s !== subnivel)
            : [...a.subniveles, subnivel],
        };
      })
    );
  };

  const updateAssignmentField = (
    userId: string,
    field:
      | "userRoleLabel"
      | "jornada"
      | "specificResponsibilities"
      | "hasEnlazada"
      | "enlazadaName"
      | "enlazadaDias"
      | "lunchSchedule"
      | "color",
    value: any
  ) => {
    setAssignments((prev) =>
      prev.map((a) => (a.userId === userId ? { ...a, [field]: value } : a))
    );
  };

  // ---------------------------------------------------------------------------
  // 2. DISTRIBUCIÓN AUTOMÁTICA EN 1 CLIC
  // ---------------------------------------------------------------------------
  const executeAutoDistribution = (strategy: "TODAS" | "JORNADA" | "CICLOS" | "TRANSVERSAL") => {
    if (courseSummaries.length === 0) {
      alert("No hay cursos registrados para distribuir. Haz clic en 'Configurar Oferta y Numéricos' para agregarlos.");
      return;
    }

    if (isSingleProfessional) {
      const allCourseNames = courseSummaries.map((c) => c.course);
      const totalCount = courseSummaries.reduce((sum, c) => sum + c.totalStudents, 0);

      setAssignments((prev) => [
        {
          ...prev[0],
          userId: prev[0]?.userId || deceTeam[0]?.id,
          userName: prev[0]?.userName || deceTeam[0]?.name,
          courses: allCourseNames,
          estimatedStudentsCount: totalCount,
          subniveles: EDUCATION_LEVEL_PRESETS.map((p) => p.shortLabel),
          specificResponsibilities:
            "Cobertura Unipersonal Integral: El profesional asume la atención de la totalidad de estudiantes de la institución.",
        },
      ]);

      if (!generalObservations) {
        setGeneralObservations(
          `La institución educativa opera con un único profesional DECE, brindando cobertura integral a una matrícula total de ${totalCount} estudiantes. Se evidencia una sobredemanda respecto al parámetro referencial ministerial de 450 estudiantes (ratio real: ${totalCount} estudiantes / profesional), justificando la solicitud formal al Distrito Educativo para el incremento de analistas de apoyo.`
        );
      }
      setDistributionNotice("✓ ¡100% de la cobertura asignada automáticamente al profesional único!");
      setTimeout(() => setDistributionNotice(null), 5000);
      return;
    }

    const updatedAssignments = deceTeam.map((u, i) => ({
      ...assignments[i],
      userId: u.id,
      userName: u.name,
      userRoleLabel: assignments[i]?.userRoleLabel || (u.role === "ADMIN" ? "Coordinador/a DECE" : "Analista DECE"),
      jornada: assignments[i]?.jornada || "MATUTINA",
      courses: [] as string[],
      estimatedStudentsCount: 0,
      subniveles: [] as string[],
    }));

    if (strategy === "JORNADA") {
      const matutinaCourses = courseSummaries.filter(
        (c) => c.course.includes("(Matutina)") || c.jornadas.includes("MATUTINA")
      );
      const vespertinaCourses = courseSummaries.filter(
        (c) => c.course.includes("(Vespertina)") || c.jornadas.includes("VESPERTINA")
      );
      const nocturnaCourses = courseSummaries.filter(
        (c) => c.course.includes("(Nocturna)") || c.jornadas.includes("NOCTURNA")
      );

      const matutinaAnalysts = updatedAssignments.filter((a) => a.jornada === "MATUTINA");
      const vespertinaAnalysts = updatedAssignments.filter((a) => a.jornada === "VESPERTINA");
      const nocturnaAnalysts = updatedAssignments.filter((a) => a.jornada === "NOCTURNA");
      const generalAnalysts = updatedAssignments.filter(
        (a) => a.jornada === "COMPLETA" || a.jornada === "TODAS"
      );

      const distributeSubset = (coursesSubset: CourseSummary[], analystsSubset: typeof updatedAssignments) => {
        if (analystsSubset.length === 0 || coursesSubset.length === 0) return;
        const totalSubsetStudents = coursesSubset.reduce((sum, c) => sum + c.totalStudents, 0);
        const targetPerSubsetAnalyst = Math.round(totalSubsetStudents / analystsSubset.length);

        let aIdx = 0;
        for (const c of coursesSubset) {
          const currentA = analystsSubset[aIdx];
          const isLast = aIdx === analystsSubset.length - 1;

          currentA.courses.push(c.course);
          currentA.estimatedStudentsCount += c.totalStudents;

          if (!isLast && currentA.estimatedStudentsCount >= targetPerSubsetAnalyst - 20) {
            aIdx++;
          }
        }
      };

      distributeSubset(matutinaCourses, matutinaAnalysts.length > 0 ? matutinaAnalysts : generalAnalysts);
      distributeSubset(vespertinaCourses, vespertinaAnalysts.length > 0 ? vespertinaAnalysts : generalAnalysts);
      distributeSubset(nocturnaCourses, nocturnaAnalysts.length > 0 ? nocturnaAnalysts : generalAnalysts);

      const unassignedCourses = courseSummaries.filter(
        (c) => !updatedAssignments.some((a) => a.courses.includes(c.course))
      );
      if (unassignedCourses.length > 0) {
        distributeSubset(unassignedCourses, updatedAssignments);
      }
      setDistributionNotice("✓ ¡Distribución por Jornadas completada automáticamente en 1 clic!");
    } else if (strategy === "TRANSVERSAL") {
      // Estrategia Transversal: Escuela (Inicial a 7mo) + Bachillerato (8vo a 3ro BGU) para todos
      const isEscuela = (courseName: string) => {
        const lower = courseName.toLowerCase();
        return (
          lower.includes("inicial") ||
          lower.includes("preparatoria") ||
          lower.includes("1.°") ||
          lower.includes("2.°") ||
          lower.includes("3.°") ||
          lower.includes("4.°") ||
          lower.includes("5.°") ||
          lower.includes("6.°") ||
          lower.includes("7.°")
        );
      };

      const escuelaCourses = courseSummaries.filter((c) => isEscuela(c.course));
      const bachilleratoCourses = courseSummaries.filter((c) => !isEscuela(c.course));

      // 1. Distribuir Escuela equitativamente
      let aIdx = 0;
      for (const c of escuelaCourses) {
        const currentA = updatedAssignments[aIdx % numProfessionals];
        currentA.courses.push(c.course);
        currentA.estimatedStudentsCount += c.totalStudents;
        aIdx++;
      }

      // 2. Distribuir Bachillerato asignando al que tenga menor carga actual
      for (const c of bachilleratoCourses) {
        let minAnalyst = updatedAssignments[0];
        for (const a of updatedAssignments) {
          if (a.estimatedStudentsCount < minAnalyst.estimatedStudentsCount) {
            minAnalyst = a;
          }
        }
        minAnalyst.courses.push(c.course);
        minAnalyst.estimatedStudentsCount += c.totalStudents;
      }

      setDistributionNotice(
        `✓ ¡Distribución Transversal Escuela + Bachillerato completada (~${targetPerAnalyst} est. por profesional)!`
      );
    } else if (strategy === "TODAS") {
      let currentAnalystIdx = 0;
      for (const course of courseSummaries) {
        const currentAnalyst = updatedAssignments[currentAnalystIdx];
        const isLastAnalyst = currentAnalystIdx === numProfessionals - 1;

        currentAnalyst.courses.push(course.course);
        currentAnalyst.estimatedStudentsCount += course.totalStudents;

        if (!isLastAnalyst && currentAnalyst.estimatedStudentsCount >= targetPerAnalyst - 25) {
          currentAnalystIdx++;
        }
      }
      setDistributionNotice(
        `✓ ¡Distribución equitativa generada en 1 clic (~ ${targetPerAnalyst} estudiantes por profesional)!`
      );
    } else {
      courseSummaries.forEach((c) => {
        const name = c.course.toLowerCase();
        let targetIdx = 0;

        if (numProfessionals === 2) {
          if (
            name.includes("inicial") ||
            name.includes("1.°") ||
            name.includes("2.°") ||
            name.includes("3.°") ||
            name.includes("4.°")
          ) {
            targetIdx = 0;
          } else {
            targetIdx = 1;
          }
        } else {
          if (
            name.includes("inicial") ||
            name.includes("1.°") ||
            name.includes("2.°") ||
            name.includes("3.°") ||
            name.includes("4.°")
          ) {
            targetIdx = 0;
          } else if (
            name.includes("5.°") ||
            name.includes("6.°") ||
            name.includes("7.°") ||
            name.includes("8.°") ||
            name.includes("9.°") ||
            name.includes("10.°")
          ) {
            targetIdx = 1;
          } else {
            targetIdx = Math.min(2, numProfessionals - 1);
          }
        }

        updatedAssignments[targetIdx].courses.push(c.course);
        updatedAssignments[targetIdx].estimatedStudentsCount += c.totalStudents;
      });
      setDistributionNotice("✓ ¡Distribución por Niveles Educativos completada en 1 clic!");
    }

    updatedAssignments.forEach((a) => {
      a.subniveles = inferSubnivelesForCourses(a.courses);
    });

    setAssignments(updatedAssignments);
    setTimeout(() => setDistributionNotice(null), 5000);
  };

  const clearAllAssignments = () => {
    if (confirm("¿Deseas reiniciar y limpiar todos los cursos asignados a los profesionales?")) {
      setAssignments((prev) =>
        prev.map((a) => ({
          ...a,
          courses: [],
          estimatedStudentsCount: 0,
          subniveles: [],
        }))
      );
      setDistributionNotice("✓ Se han limpiado las asignaciones de todos los profesionales.");
      setTimeout(() => setDistributionNotice(null), 4000);
    }
  };

  // Botón maestro para limpiar TODO cuando algo se construyó mal o se necesita reiniciar desde cero
  const handleResetAllDistributivo = async () => {
    const ok = confirm(
      "⚠️ ¿DESEAS LIMPIAR Y REINICIAR TODO EL DISTRIBUTIVO?\n\n" +
        "Esta acción limpiará por completo:\n" +
        "1. Todos los cursos asignados a los profesionales.\n" +
        "2. La oferta de cursos y numéricos cargados en pantalla.\n" +
        "3. Los registros guardados en la base de datos para este año lectivo.\n\n" +
        "¿Confirmas que deseas reiniciar todo para empezar desde cero?"
    );
    if (!ok) return;

    try {
      // 1. Limpiar asignaciones en pantalla
      setAssignments((prev) =>
        prev.map((a) => ({
          ...a,
          courses: [],
          estimatedStudentsCount: 0,
          subniveles: [],
        }))
      );

      // 2. Limpiar numéricos y cursos en pantalla
      setCourseConfigs([]);
      setCourseSummaries([]);
      setTotalStudents(0);

      // 3. Borrar cuotas guardadas en base de datos
      if (schoolYearId) {
        await clearCourseQuotasAction(schoolYearId);
      }

      setDistributionNotice("✓ Se ha limpiado y reiniciado todo el distributivo con éxito. Todo ha quedado en blanco.");
      setTimeout(() => setDistributionNotice(null), 6000);
    } catch (err: any) {
      alert("Error al limpiar distributivo: " + (err?.message || err));
    }
  };

  // Limpiar/vaciar cursos dentro del modal de numéricos
  const handleClearAllCourseConfigs = async () => {
    const ok = confirm(
      "¿Deseas vaciar y borrar todos los cursos y numéricos de esta lista?\n\n" +
        "Se limpiarán todos los cursos cargados y podrás volver a subir el archivo Excel limpio o agregarlos manualmente."
    );
    if (!ok) return;

    setCourseConfigs([]);
    setCourseSummaries([]);
    setTotalStudents(0);
    if (schoolYearId) {
      await clearCourseQuotasAction(schoolYearId);
    }
    setQuotasNotice("✓ Se han vaciado todos los cursos del catálogo. Puedes volver a cargarlos.");
    setTimeout(() => setQuotasNotice(null), 4000);
  };

  // ---------------------------------------------------------------------------
  // 3. OFERTA, CURSOS Y NUMÉRICOS INSTITUCIONALES
  // ---------------------------------------------------------------------------

  // A. Añadir Nivel Educativo Completo (Inicial, Preparatoria, Elemental, Media, Superior, BGU Ciencias)
  const addEducationLevelDirectly = (levelId: string) => {
    const preset = EDUCATION_LEVEL_PRESETS.find((p) => p.id === levelId);
    if (!preset) return;

    const newItems: CourseConfigItem[] = preset.defaultCourses.map((cName, idx) => {
      const isBgu = preset.isBachillerato;
      const defCount = isBgu ? 30 : 32;
      return {
        id: `level_${levelId}_${Date.now()}_${idx}`,
        courseName: cName,
        education_level: levelId,
        bachillerato_specialty: "",
        matutinaActive: activeJornadas.matutina,
        matutinaParallels: [
          { id: `mat_A_${Date.now()}_${idx}`, parallel: "A", student_count: defCount },
          { id: `mat_B_${Date.now()}_${idx}`, parallel: "B", student_count: Math.max(15, defCount - 2) },
        ],
        vespertinaActive: activeJornadas.vespertina,
        vespertinaParallels: activeJornadas.vespertina
          ? [{ id: `vesp_A_${Date.now()}_${idx}`, parallel: "A", student_count: Math.max(15, defCount - 5) }]
          : [],
        nocturnaActive: activeJornadas.nocturna,
        nocturnaParallels: activeJornadas.nocturna
          ? [{ id: `noc_A_${Date.now()}_${idx}`, parallel: "A", student_count: 20 }]
          : [],
      };
    });

    // Helper para ordenar cursos de forma descendente (3.° Bachillerato -> Inicial)
    const sortCourseConfigsDescending = (items: CourseConfigItem[]): CourseConfigItem[] => {
      return [...items].sort((a, b) => compareCoursesDescending(a.courseName, b.courseName));
    };

    setCourseConfigs((prev) => {
      const existingNames = new Set(prev.map((c) => c.courseName.toLowerCase().trim()));
      const toAdd = newItems.filter((item) => !existingNames.has(item.courseName.toLowerCase().trim()));
      return sortCourseConfigsDescending([...prev, ...(toAdd.length > 0 ? toAdd : newItems)]);
    });

    setTechNotice(`¡Añadido nivel completo: ${preset.label} (orden descendente)!`);
    setTimeout(() => setTechNotice(null), 4000);
  };

  // Helper reutilizable para ordenar configs descendentemente
  const sortCourseConfigsDescending = (items: CourseConfigItem[]): CourseConfigItem[] => {
    return [...items].sort((a, b) => compareCoursesDescending(a.courseName, b.courseName));
  };

  // B. Añadir Curso Individual o Personalizado
  const addSingleCourseDirectly = () => {
    const name = (customCourseName.trim() || selectedSingleCourse).trim();
    if (!name) return;

    const lower = name.toLowerCase();
    let inferredLevel = "BASICA_MEDIA";
    if (lower.includes("inicial")) inferredLevel = "INICIAL";
    else if (lower.includes("1.° egb") || lower.includes("preparatoria")) inferredLevel = "BASICA_PREPARATORIA";
    else if (lower.includes("2.°") || lower.includes("3.°") || lower.includes("4.°")) inferredLevel = "BASICA_ELEMENTAL";
    else if (lower.includes("5.°") || lower.includes("6.°") || lower.includes("7.°")) inferredLevel = "BASICA_MEDIA";
    else if (lower.includes("8.°") || lower.includes("9.°") || lower.includes("10.°")) inferredLevel = "BASICA_SUPERIOR";
    else if (lower.includes("bgu") || lower.includes("ciencias")) inferredLevel = "BACHILLERATO_CIENCIAS";
    else if (lower.includes("técnico") || lower.includes("tecnico")) inferredLevel = "BACHILLERATO_TECNICO";

    const isMat = newCourseJornada === "MATUTINA" || activeJornadas.matutina;
    const isVesp = newCourseJornada === "VESPERTINA" || (activeJornadas.vespertina && newCourseJornada !== "MATUTINA");
    const isNoc = newCourseJornada === "NOCTURNA";

    const newItem: CourseConfigItem = {
      id: `single_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      courseName: name,
      education_level: inferredLevel,
      bachillerato_specialty: "",
      matutinaActive: isMat,
      matutinaParallels: [
        { id: `mat_A_${Date.now()}`, parallel: "A", student_count: 30 },
        { id: `mat_B_${Date.now()}`, parallel: "B", student_count: 28 },
      ],
      vespertinaActive: isVesp,
      vespertinaParallels: isVesp ? [{ id: `vesp_A_${Date.now()}`, parallel: "A", student_count: 25 }] : [],
      nocturnaActive: isNoc,
      nocturnaParallels: isNoc ? [{ id: `noc_A_${Date.now()}`, parallel: "A", student_count: 20 }] : [],
    };

    setCourseConfigs((prev) => sortCourseConfigsDescending([...prev, newItem]));
    setCustomCourseName("");
    setTechNotice(`¡Añadido curso "${name}" (orden descendente)!`);
    setTimeout(() => setTechNotice(null), 4000);
  };

  // C. Añadir Especialidad Técnica o Manual (Bachillerato)
  const addTechnicalCoursesDirectly = () => {
    const isManual = isManualTechSpecialty || selectedTechSpecialty === "OTRA_MANUAL";
    const specialty = (isManual ? manualTechSpecialty.trim() : selectedTechSpecialty).trim();
    if (!specialty) {
      alert("Por favor escribe el nombre de la especialidad del Bachillerato.");
      return;
    }

    const prefix = manualBachilleratoType === "GENERAL" ? "Bachillerato" : "Bachillerato Técnico";

    const technicalYears = [
      { name: `3.° ${prefix} - ${specialty}`, defaultStudents: 24 },
      { name: `2.° ${prefix} - ${specialty}`, defaultStudents: 26 },
      { name: `1.° ${prefix} - ${specialty}`, defaultStudents: 28 },
    ];

    const newItems: CourseConfigItem[] = technicalYears.map((tech, idx) => ({
      id: `tech_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      courseName: tech.name,
      education_level: manualBachilleratoType === "GENERAL" ? "BACHILLERATO_CIENCIAS" : "BACHILLERATO_TECNICO",
      bachillerato_specialty: specialty,
      matutinaActive: activeJornadas.matutina,
      matutinaParallels: [
        { id: `t_mat_A_${Date.now()}_${idx}`, parallel: "A", student_count: tech.defaultStudents },
      ],
      vespertinaActive: activeJornadas.vespertina,
      vespertinaParallels: activeJornadas.vespertina
        ? [{ id: `t_vesp_A_${Date.now()}_${idx}`, parallel: "A", student_count: Math.max(15, tech.defaultStudents - 4) }]
        : [],
      nocturnaActive: false,
      nocturnaParallels: [],
    }));

    setCourseConfigs((prev) => {
      const existingNames = new Set(prev.map((c) => c.courseName.toLowerCase().trim()));
      const toAdd = newItems.filter((item) => !existingNames.has(item.courseName.toLowerCase().trim()));
      return sortCourseConfigsDescending([...prev, ...(toAdd.length > 0 ? toAdd : newItems)]);
    });

    if (isManual) {
      setManualTechSpecialty("");
    }
    setTechNotice(`¡Añadidos 3.°, 2.° y 1.° de ${specialty} (orden descendente)!`);
    setTimeout(() => setTechNotice(null), 4000);
  };

  // D. Añadir Paralelo a un Curso
  const addParallelToCourse = (courseId: string, shift: "matutina" | "vespertina" | "nocturna") => {
    setCourseConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const prop =
          shift === "matutina"
            ? "matutinaParallels"
            : shift === "vespertina"
            ? "vespertinaParallels"
            : "nocturnaParallels";
        const currentList = c[prop];
        const nextCharCode = 65 + currentList.length;
        const nextLetter = String.fromCharCode(nextCharCode <= 90 ? nextCharCode : 65);
        const defaultCount = currentList.length > 0 ? currentList[currentList.length - 1].student_count : 30;
        const newParallel: ParallelItem = {
          id: `par_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          parallel: nextLetter,
          student_count: defaultCount,
        };
        return {
          ...c,
          [prop]: [...currentList, newParallel],
        };
      })
    );
  };

  // E. Eliminar Paralelo de un Curso
  const removeParallelFromCourse = (
    courseId: string,
    shift: "matutina" | "vespertina" | "nocturna",
    parallelId: string
  ) => {
    setCourseConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const prop =
          shift === "matutina"
            ? "matutinaParallels"
            : shift === "vespertina"
            ? "vespertinaParallels"
            : "nocturnaParallels";
        return {
          ...c,
          [prop]: c[prop].filter((p) => p.id !== parallelId),
        };
      })
    );
  };

  // F. Cargar Numéricos al Abrir Modal
  const openQuotasSetup = async () => {
    if (courseConfigs.length > 0) {
      setShowQuotasModal(true);
      return;
    }

    // 1. Intentar cargar cuotas guardadas de la base de datos
    try {
      const res = await loadCourseQuotasAction(schoolYearId);
      if (res && res.success && res.quotas && res.quotas.length > 0) {
        const grouped = new Map<string, CourseConfigItem>();
        res.quotas.forEach((q: any) => {
          let item = grouped.get(q.course);
          if (!item) {
            item = {
              id: `q_${q.course}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              courseName: q.course,
              education_level: q.education_level || "BASICA_MEDIA",
              bachillerato_specialty: q.bachillerato_specialty || "",
              matutinaActive: false,
              matutinaParallels: [],
              vespertinaActive: false,
              vespertinaParallels: [],
              nocturnaActive: false,
              nocturnaParallels: [],
            };
            grouped.set(q.course, item);
          }
          const j = (q.jornada || "MATUTINA").toUpperCase();
          const parItem: ParallelItem = {
            id: `par_db_${q.id || Math.random()}`,
            parallel: q.parallel || "A",
            student_count: Number(q.student_count) || 0,
            tutor_name: q.tutor_name || "",
          };
          if (j === "MATUTINA") {
            item.matutinaActive = true;
            item.matutinaParallels.push(parItem);
          } else if (j === "VESPERTINA") {
            item.vespertinaActive = true;
            item.vespertinaParallels.push(parItem);
          } else if (j === "NOCTURNA") {
            item.nocturnaActive = true;
            item.nocturnaParallels.push(parItem);
          }
        });
        setCourseConfigs(sortCourseConfigsDescending(Array.from(grouped.values())));
        setShowQuotasModal(true);
        return;
      }
    } catch (e) {
      console.error("Error cargando cuotas:", e);
    }

    // 2. Si no hay cuotas en BD, cargar desde courseSummaries de la institución
    if (courseSummaries.length > 0) {
      const itemsFromSummary: CourseConfigItem[] = courseSummaries.map((cs, idx) => {
        const rawName = cs.course.replace(/\s*\((Matutina|Vespertina|Nocturna)\)\s*$/i, "").trim();
        const isVesp = cs.course.toLowerCase().includes("vespertina") || cs.jornadas.includes("VESPERTINA");
        const isNoc = cs.course.toLowerCase().includes("nocturna") || cs.jornadas.includes("NOCTURNA");
        const isMat = !isVesp && !isNoc ? true : cs.jornadas.includes("MATUTINA");

        const pars = cs.parallels.length > 0 ? cs.parallels : ["A", "B"];
        const avgCount = Math.round(cs.totalStudents / pars.length) || 30;

        const matPars: ParallelItem[] = isMat
          ? pars.map((p, pIdx) => ({ id: `mat_${idx}_${pIdx}`, parallel: p, student_count: avgCount }))
          : [{ id: `mat_${idx}_0`, parallel: "A", student_count: 30 }];
        const vespPars: ParallelItem[] = isVesp
          ? pars.map((p, pIdx) => ({ id: `vesp_${idx}_${pIdx}`, parallel: p, student_count: avgCount }))
          : [];

        return {
          id: `cs_${idx}_${Date.now()}`,
          courseName: rawName,
          education_level: inferSubnivelesForCourses([rawName])[0] || "BASICA_MEDIA",
          bachillerato_specialty: "",
          matutinaActive: isMat,
          matutinaParallels: matPars,
          vespertinaActive: isVesp,
          vespertinaParallels: vespPars,
          nocturnaActive: isNoc,
          nocturnaParallels: [],
        };
      });
      setCourseConfigs(sortCourseConfigsDescending(itemsFromSummary));
      setShowQuotasModal(true);
      return;
    }

    // 3. Fallback: Inicial, Preparatoria, Elemental, Media, Superior y BGU Ciencias
    const defaultLevels = [
      "INICIAL",
      "BASICA_PREPARATORIA",
      "BASICA_ELEMENTAL",
      "BASICA_MEDIA",
      "BASICA_SUPERIOR",
      "BACHILLERATO_CIENCIAS",
    ];
    const initialItems: CourseConfigItem[] = [];

    defaultLevels.forEach((levelId) => {
      const preset = EDUCATION_LEVEL_PRESETS.find((p) => p.id === levelId);
      if (!preset) return;
      preset.defaultCourses.forEach((cName, idx) => {
        initialItems.push({
          id: `init_${levelId}_${idx}`,
          courseName: cName,
          education_level: levelId,
          bachillerato_specialty: "",
          matutinaActive: true,
          matutinaParallels: [
            { id: `init_mat_A_${idx}`, parallel: "A", student_count: 32 },
            { id: `init_mat_B_${idx}`, parallel: "B", student_count: 30 },
          ],
          vespertinaActive: activeJornadas.vespertina,
          vespertinaParallels: activeJornadas.vespertina
            ? [{ id: `init_vesp_A_${idx}`, parallel: "A", student_count: 26 }]
            : [],
          nocturnaActive: false,
          nocturnaParallels: [],
        });
      });
    });

    setCourseConfigs(sortCourseConfigsDescending(initialItems));
    setShowQuotasModal(true);
  };

  const sortCourseConfigsAscending = (items: CourseConfigItem[]): CourseConfigItem[] => {
    return [...items].sort((a, b) => compareCoursesAscending(a.courseName, b.courseName));
  };

  const toggleSortOrder = (order: "DESC" | "ASC") => {
    setCourseSortOrder(order);
    setCourseConfigs((prev) =>
      order === "DESC" ? sortCourseConfigsDescending(prev) : sortCourseConfigsAscending(prev)
    );
    setCourseSummaries((prev) =>
      [...prev].sort((a, b) =>
        order === "DESC"
          ? compareCoursesDescending(a.course, b.course)
          : compareCoursesAscending(a.course, b.course)
      )
    );
  };

  const handleLoadDesktopTutors = async () => {
    setLoadingTutors(true);
    try {
      const res = await loadDesktopTutorsAction();
      if (res.success && res.data) {
        const grouped = new Map<string, CourseConfigItem>();
        const sumMap = new Map<string, { totalStudents: number; parallels: Set<string>; jornadas: Set<string> }>();
        const distinctJornadas = Array.from(new Set(res.data.map((q: any) => q.jornada).filter(Boolean)));
        const hasMultipleJornadas = distinctJornadas.length > 1;

        res.data.forEach((q: any) => {
          let item = grouped.get(q.course);
          if (!item) {
            item = {
              id: `q_${q.course}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              courseName: q.course,
              education_level: q.education_level || "BASICA_MEDIA",
              bachillerato_specialty: q.bachillerato_specialty || "",
              matutinaActive: false,
              matutinaParallels: [],
              vespertinaActive: false,
              vespertinaParallels: [],
              nocturnaActive: false,
              nocturnaParallels: [],
            };
            grouped.set(q.course, item);
          }
          const j = (q.jornada || "MATUTINA").toUpperCase();
          const parItem: ParallelItem = {
            id: `par_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            parallel: q.parallel || "A",
            student_count: Number(q.student_count) || 0,
            tutor_name: q.tutor_name || "",
          };
          if (j === "MATUTINA") {
            item.matutinaActive = true;
            item.matutinaParallels.push(parItem);
          } else if (j === "VESPERTINA") {
            item.vespertinaActive = true;
            item.vespertinaParallels.push(parItem);
          } else if (j === "NOCTURNA") {
            item.nocturnaActive = true;
            item.nocturnaParallels.push(parItem);
          }

          const jClean = q.jornada === "MATUTINA" ? "Matutina" : q.jornada === "VESPERTINA" ? "Vespertina" : q.jornada === "NOCTURNA" ? "Nocturna" : q.jornada;
          const courseKey = hasMultipleJornadas && q.jornada ? `${q.course} (${jClean})` : q.course;
          let s = sumMap.get(courseKey);
          if (!s) {
            s = { totalStudents: 0, parallels: new Set(), jornadas: new Set() };
            sumMap.set(courseKey, s);
          }
          s.totalStudents += Number(q.student_count) || 0;
          if (q.parallel) s.parallels.add(q.parallel);
          if (q.jornada) s.jornadas.add(q.jornada);
        });

        const configsList =
          courseSortOrder === "DESC"
            ? sortCourseConfigsDescending(Array.from(grouped.values()))
            : sortCourseConfigsAscending(Array.from(grouped.values()));
        setCourseConfigs(configsList);

        const builtSummaries: CourseSummary[] = Array.from(sumMap.entries()).map(([course, val]) => ({
          course,
          totalStudents: val.totalStudents,
          parallels: Array.from(val.parallels).sort(),
          jornadas: Array.from(val.jornadas),
        }));
        const sortedSummaries =
          courseSortOrder === "DESC"
            ? [...builtSummaries].sort((a, b) => compareCoursesDescending(a.course, b.course))
            : [...builtSummaries].sort((a, b) => compareCoursesAscending(a.course, b.course));
        setCourseSummaries(sortedSummaries);

        const totalCalculated = res.data.reduce((sum: number, q: any) => sum + (Number(q.student_count) || 0), 0);
        setTotalStudents(totalCalculated);

        setQuotasNotice(res.message || `✓ ¡Cargados ${res.data.length} registros y tutores desde Carpeta Desktop exitosamente!`);
        setTimeout(() => setQuotasNotice(null), 5000);
      } else {
        alert("No se pudo cargar desde Desktop: " + (res.message || "Archivo no encontrado"));
      }
    } catch (err: any) {
      alert("Error al cargar numérico de tutores: " + err.message);
    } finally {
      setLoadingTutors(false);
    }
  };

  const handleUploadTutorsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingTutors(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadTutorsFileAction(fd);
      if (res.success && res.data) {
        const grouped = new Map<string, CourseConfigItem>();
        const sumMap = new Map<string, { totalStudents: number; parallels: Set<string>; jornadas: Set<string> }>();
        const distinctJornadas = Array.from(new Set(res.data.map((q: any) => q.jornada).filter(Boolean)));
        const hasMultipleJornadas = distinctJornadas.length > 1;

        res.data.forEach((q: any) => {
          let item = grouped.get(q.course);
          if (!item) {
            item = {
              id: `q_${q.course}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              courseName: q.course,
              education_level: q.education_level || "BASICA_MEDIA",
              bachillerato_specialty: q.bachillerato_specialty || "",
              matutinaActive: false,
              matutinaParallels: [],
              vespertinaActive: false,
              vespertinaParallels: [],
              nocturnaActive: false,
              nocturnaParallels: [],
            };
            grouped.set(q.course, item);
          }
          const j = (q.jornada || "MATUTINA").toUpperCase();
          const parItem: ParallelItem = {
            id: `par_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            parallel: q.parallel || "A",
            student_count: Number(q.student_count) || 0,
            tutor_name: q.tutor_name || "",
          };
          if (j === "MATUTINA") {
            item.matutinaActive = true;
            item.matutinaParallels.push(parItem);
          } else if (j === "VESPERTINA") {
            item.vespertinaActive = true;
            item.vespertinaParallels.push(parItem);
          } else if (j === "NOCTURNA") {
            item.nocturnaActive = true;
            item.nocturnaParallels.push(parItem);
          }

          const jClean = q.jornada === "MATUTINA" ? "Matutina" : q.jornada === "VESPERTINA" ? "Vespertina" : q.jornada === "NOCTURNA" ? "Nocturna" : q.jornada;
          const courseKey = hasMultipleJornadas && q.jornada ? `${q.course} (${jClean})` : q.course;
          let s = sumMap.get(courseKey);
          if (!s) {
            s = { totalStudents: 0, parallels: new Set(), jornadas: new Set() };
            sumMap.set(courseKey, s);
          }
          s.totalStudents += Number(q.student_count) || 0;
          if (q.parallel) s.parallels.add(q.parallel);
          if (q.jornada) s.jornadas.add(q.jornada);
        });

        const configsList =
          courseSortOrder === "DESC"
            ? sortCourseConfigsDescending(Array.from(grouped.values()))
            : sortCourseConfigsAscending(Array.from(grouped.values()));
        setCourseConfigs(configsList);

        const builtSummaries: CourseSummary[] = Array.from(sumMap.entries()).map(([course, val]) => ({
          course,
          totalStudents: val.totalStudents,
          parallels: Array.from(val.parallels).sort(),
          jornadas: Array.from(val.jornadas),
        }));
        const sortedSummaries =
          courseSortOrder === "DESC"
            ? [...builtSummaries].sort((a, b) => compareCoursesDescending(a.course, b.course))
            : [...builtSummaries].sort((a, b) => compareCoursesAscending(a.course, b.course));
        setCourseSummaries(sortedSummaries);

        const totalCalculated = res.data.reduce((sum: number, q: any) => sum + (Number(q.student_count) || 0), 0);
        setTotalStudents(totalCalculated);

        setQuotasNotice(res.message || `✓ ¡Archivo "${file.name}" procesado con éxito (${res.data.length} registros y tutores)!`);
        setTimeout(() => setQuotasNotice(null), 5000);
      } else {
        alert("Error al procesar archivo: " + (res.message || "Formato no válido"));
      }
    } catch (err: any) {
      alert("Error al subir archivo: " + err.message);
    } finally {
      setLoadingTutors(false);
    }
  };

  const handleSaveQuotas = async () => {
    setSavingQuotas(true);
    setQuotasNotice(null);

    const flatQuotas: Array<{
      education_level: string;
      course: string;
      parallel: string;
      jornada: string;
      bachillerato_specialty?: string | null;
      student_count: number;
      tutor_name?: string | null;
    }> = [];

    courseConfigs.forEach((c) => {
      if (c.matutinaActive) {
        c.matutinaParallels.forEach((p) => {
          flatQuotas.push({
            education_level: c.education_level,
            course: c.courseName,
            parallel: p.parallel,
            jornada: "MATUTINA",
            bachillerato_specialty: c.bachillerato_specialty || null,
            student_count: Number(p.student_count) || 0,
            tutor_name: p.tutor_name || null,
          });
        });
      }
      if (c.vespertinaActive) {
        c.vespertinaParallels.forEach((p) => {
          flatQuotas.push({
            education_level: c.education_level,
            course: c.courseName,
            parallel: p.parallel,
            jornada: "VESPERTINA",
            bachillerato_specialty: c.bachillerato_specialty || null,
            student_count: Number(p.student_count) || 0,
            tutor_name: p.tutor_name || null,
          });
        });
      }
      if (c.nocturnaActive) {
        c.nocturnaParallels.forEach((p) => {
          flatQuotas.push({
            education_level: c.education_level,
            course: c.courseName,
            parallel: p.parallel,
            jornada: "NOCTURNA",
            bachillerato_specialty: c.bachillerato_specialty || null,
            student_count: Number(p.student_count) || 0,
            tutor_name: p.tutor_name || null,
          });
        });
      }
    });

    const res = await saveCourseQuotasAction(schoolYearId, flatQuotas);
    setSavingQuotas(false);

    if (res.success && res.updatedCourses) {
      const sorted = [...res.updatedCourses].sort((a, b) =>
        courseSortOrder === "DESC"
          ? compareCoursesDescending(a.course, b.course)
          : compareCoursesAscending(a.course, b.course)
      );
      setCourseSummaries(sorted);
      if (typeof res.totalStudents === "number") {
        setTotalStudents(res.totalStudents);
      }
      setShowQuotasModal(false);
      setQuotasNotice("¡Oferta, cursos técnicos y numéricos actualizados exitosamente!");
      setTimeout(() => setQuotasNotice(null), 5000);
    } else {
      alert("Error al guardar numéricos: " + (res.error || "Ocurrió un error"));
    }
  };

  const filteredTechnicalFigures = OFFICIAL_TECHNICAL_FIGURES.filter((f) =>
    f.name.toLowerCase().includes(techSpecialtySearch.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // RENDER PRINCIPAL
  // ---------------------------------------------------------------------------
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrorMessage(null);

        const formData = new FormData();
        formData.append("school_year_id", schoolYearId);
        formData.append("title", title);
        formData.append("coordinator_name", coordinatorName);
        formData.append("elaborated_by_name", elaboratedByName);
        formData.append("elaborated_by_role", elaboratedByRole);
        formData.append("approved_by_name", approvedByName);
        formData.append("approved_by_role", approvedByRole);
        formData.append("general_observations", generalObservations);

        const payload = assignments.map((a, idx) => {
          const actualUserId = a.userId || deceTeam[idx]?.id || deceTeam[0]?.id;
          const actualUserName = a.userName || deceTeam[idx]?.name || deceTeam[0]?.name;
          const actualRoleLabel = a.userRoleLabel || (deceTeam[idx]?.role === "ADMIN" ? "Coordinador/a DECE" : "Analista DECE");

          const assignedParallels = Array.from(
            new Set(
              courseSummaries
                .filter((c) => a.courses.includes(c.course))
                .flatMap((c) => c.parallels)
            )
          );

          return {
            user_id: actualUserId,
            userId: actualUserId,
            user_name: actualUserName,
            userName: actualUserName,
            user_role_label: actualRoleLabel,
            userRoleLabel: actualRoleLabel,
            jornada: a.jornada || "MATUTINA",
            subniveles: a.subniveles || [],
            courses: a.courses || [],
            parallels: assignedParallels,
            estimated_students_count: Number(a.estimatedStudentsCount) || 0,
            estimatedStudentsCount: Number(a.estimatedStudentsCount) || 0,
            specific_responsibilities: a.specificResponsibilities || "",
            specificResponsibilities: a.specificResponsibilities || "",
            has_enlazada: a.hasEnlazada ? 1 : 0,
            hasEnlazada: a.hasEnlazada,
            enlazada_name: a.hasEnlazada ? a.enlazadaName || "" : "",
            enlazadaName: a.hasEnlazada ? a.enlazadaName || "" : "",
            enlazada_dias: a.hasEnlazada ? a.enlazadaDias || "" : "",
            enlazadaDias: a.hasEnlazada ? a.enlazadaDias || "" : "",
            lunch_schedule: a.lunchSchedule || (idx === 2 ? "12H00 A 13H00" : "13H00 A 14H00"),
            lunchSchedule: a.lunchSchedule || (idx === 2 ? "12H00 A 13H00" : "13H00 A 14H00"),
            color: a.color || defaultColors[idx % defaultColors.length],
          };
        });

        formData.set("assignments_json", JSON.stringify(payload));

        try {
          const res = await saveDistributivo(distributivo?.id || null, {}, formData);
          if (res?.error) {
            setErrorMessage(res.error);
            setSaving(false);
            return;
          }
          if (res?.success) {
            window.location.href = "/distributivo";
            return;
          }
        } catch (err: any) {
          setErrorMessage(err?.message || "Ocurrió un error al guardar el distributivo");
          setSaving(false);
        }
      }}
      className="space-y-6"
    >
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-bold text-rose-600 hover:text-rose-800"
          >
            ✕
          </button>
        </div>
      )}

      {distributionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-lg font-bold flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <span className="text-base">✨</span>
          <span>{distributionNotice}</span>
        </div>
      )}

      {quotasNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{quotasNotice}</span>
        </div>
      )}

      {/* 1. Metadatos Institucionales */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
          1. Datos Institucionales del Distributivo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Año Lectivo Oficial</label>
            <select
              value={schoolYearId}
              onChange={(e) => setSchoolYearId(e.target.value)}
              className="input"
              required
            >
              {schoolYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_active ? "(Vigente)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label">Título del Documento Oficial</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>
      </div>

      {/* 2. Matrícula y Numéricos */}
      <div className="card p-5 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border-indigo-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
              Matrícula Institucional y Numéricos
            </span>
            <div className="flex items-baseline gap-3 mt-1.5">
              <span className="text-3xl font-black text-slate-900">{totalStudents}</span>
              <span className="text-sm font-medium text-slate-600">
                estudiantes en {courseSummaries.length} cursos registrados
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Equipo DECE: <strong className="text-slate-800">{numProfessionals} profesional(es)</strong> •{" "}
              Cuota de balance:{" "}
              <strong className="text-indigo-700 font-bold">~{targetPerAnalyst} estudiantes / analista</strong>{" "}
              (Estándar MINEDUC: ~450).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openQuotasSetup}
              className="btn-secondary text-xs flex items-center gap-1.5 shadow-sm bg-white"
            >
              <span>⚙️</span>
              <span>Oferta, Cursos Técnicos y Numéricos</span>
            </button>
            <button
              type="button"
              onClick={handleResetAllDistributivo}
              className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
              title="Limpia todas las asignaciones y cursos cargados si algo se construyó mal"
            >
              <span>🗑️</span>
              <span>Limpiar Todo</span>
            </button>
          </div>
        </div>

        {isSingleProfessional ? (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <span className="text-base">📌</span>
            <div>
              <strong>Institución con Profesional Único:</strong> Se asigna automáticamente el 100% de la matrícula institucional y se genera la justificación técnica de sobrecarga para el Distrito.
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-start gap-2">
            <span className="text-base">💡</span>
            <div>
              <strong>Equilibrio Automático:</strong> Meta equitativa calculada: <strong>~{targetPerAnalyst} estudiantes por profesional</strong>.
            </div>
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* BARRA DE DISTRIBUCIÓN DIRECTA EN 1 CLIC (SOLUCIÓN A "ESTAR SEÑALANDO")   */}
      {/* ======================================================================= */}
      <div className="card p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span>⚡</span>
              <span>Distribución Rápida en 1 Clic (Sin señalar curso por curso)</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Presiona cualquiera de los botones y el sistema asignará todos los cursos de forma automática e inmediata:
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearAllAssignments}
              className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
              title="Limpia solo los cursos asignados a los profesionales"
            >
              ✕ Limpiar asignaciones
            </button>
            <button
              type="button"
              onClick={handleResetAllDistributivo}
              className="text-xs text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 px-3 py-1 rounded-lg border border-rose-700 hover:border-rose-500 font-bold transition-all shadow-xs flex items-center gap-1.5"
              title="Limpia todo el distributivo y numéricos si algo se construyó mal"
            >
              <span>🗑️</span>
              <span>Limpiar / Reiniciar Todo</span>
            </button>
          </div>
        </div>

        {/* Botones de acción directa 1-clic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <button
            type="button"
            onClick={() => executeAutoDistribution("TODAS")}
            className="p-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/40 text-left transition-all hover:scale-[1.01] shadow-sm flex flex-col justify-between"
          >
            <div className="font-black text-xs text-white flex items-center gap-1.5">
              <span>⚖️</span>
              <span>Distribuir Equitativamente</span>
            </div>
            <p className="text-[11px] text-indigo-200 mt-1">
              Reparte todos los cursos institucionalmente en partes iguales (~{targetPerAnalyst} alumnos/analista) con 1 solo clic.
            </p>
          </button>

          <button
            type="button"
            onClick={() => executeAutoDistribution("TRANSVERSAL")}
            className="p-3.5 rounded-lg bg-teal-700 hover:bg-teal-600 border border-teal-400/40 text-left transition-all hover:scale-[1.01] shadow-sm flex flex-col justify-between"
          >
            <div className="font-black text-xs text-white flex items-center gap-1.5">
              <span>⚡</span>
              <span>Transversal Escuela + Bach.</span>
            </div>
            <p className="text-[11px] text-teal-200 mt-1">
              Asigna tanto cursos de escuela como de bachillerato a cada analista de forma equitativa (~{targetPerAnalyst} alumnos c/u).
            </p>
          </button>

          <button
            type="button"
            onClick={() => executeAutoDistribution("JORNADA")}
            className="p-3.5 rounded-lg bg-sky-700 hover:bg-sky-600 border border-sky-400/40 text-left transition-all hover:scale-[1.01] shadow-sm flex flex-col justify-between"
          >
            <div className="font-black text-xs text-white flex items-center gap-1.5">
              <span>☀️/🌤️</span>
              <span>Distribuir por Jornadas</span>
            </div>
            <p className="text-[11px] text-sky-200 mt-1">
              Asigna la mañana a los analistas matutinos y la tarde a los vespertinos automáticamente.
            </p>
          </button>

          <button
            type="button"
            onClick={() => executeAutoDistribution("CICLOS")}
            className="p-3.5 rounded-lg bg-purple-700 hover:bg-purple-600 border border-purple-400/40 text-left transition-all hover:scale-[1.01] shadow-sm flex flex-col justify-between"
          >
            <div className="font-black text-xs text-white flex items-center gap-1.5">
              <span>🎓</span>
              <span>Distribuir por Ciclos</span>
            </div>
            <p className="text-[11px] text-purple-200 mt-1">
              Asigna Básica Elemental a un analista, Superior a otro, y Bachillerato al siguiente.
            </p>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SELECTOR DE VISTA: TARJETAS CON BLOQUES vs TABLA CON SELECTOR            */}
      {/* ======================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          2. Cobertura Asignada por Profesional
        </h2>

        {/* Toggle de Modo de Asignación */}
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 text-xs shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("CARDS")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              viewMode === "CARDS"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>👤</span>
            <span>Vista por Profesionales (Bloques Rápidos)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TABLE")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              viewMode === "TABLE"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📋</span>
            <span>Tabla de Cursos (Selector Directo)</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODO 1: TARJETAS CON ASIGNACIÓN DE BLOQUES COMPLETOS (1 CLIC)           */}
      {/* ======================================================================= */}
      {viewMode === "CARDS" && (
        <div className="grid grid-cols-1 gap-5">
          {assignments.map((assignment, idx) => {
            const deviation = assignment.estimatedStudentsCount - targetPerAnalyst;
            const percentage =
              totalStudents > 0
                ? Math.round((assignment.estimatedStudentsCount / totalStudents) * 100)
                : 0;

            return (
              <div
                key={assignment.userId}
                style={{ borderTopColor: assignment.color || "#6366F1" }}
                className="card p-5 border-t-4 space-y-4 shadow-sm"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {assignment.userName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <select
                          value={assignment.userRoleLabel}
                          onChange={(e) =>
                            updateAssignmentField(assignment.userId, "userRoleLabel", e.target.value)
                          }
                          className="text-xs py-0.5 px-2 bg-slate-100 rounded border border-slate-200 font-medium text-slate-700"
                        >
                          <option value="Coordinador/a DECE">Coordinador/a DECE</option>
                          <option value="Analista DECE">Analista DECE</option>
                          <option value="Profesional de Apoyo DECE">Profesional de Apoyo DECE</option>
                        </select>
                        <select
                          value={assignment.jornada}
                          onChange={(e) =>
                            updateAssignmentField(assignment.userId, "jornada", e.target.value)
                          }
                          className="text-xs py-0.5 px-2 bg-slate-100 rounded border border-slate-200 font-semibold text-slate-700"
                        >
                          <option value="MATUTINA">☀️ Jornada Matutina</option>
                          <option value="VESPERTINA">🌤️ Jornada Vespertina</option>
                          <option value="NOCTURNA">🌙 Jornada Nocturna</option>
                          <option value="COMPLETA">🌐 Cobertura en Todas las Jornadas</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Medidor de carga */}
                  <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Carga Asignada
                      </span>
                      <span className="font-black text-slate-900 text-base">
                        {assignment.estimatedStudentsCount}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          alumnos ({percentage}%)
                        </span>
                      </span>
                    </div>

                    <div className="text-xs font-semibold pl-2 border-l border-slate-200">
                      {isSingleProfessional ? (
                        <span className="text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200 block text-center">
                          Cobertura Unipersonal
                        </span>
                      ) : Math.abs(deviation) <= 40 ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 block text-center">
                          ✓ Balance Óptimo
                        </span>
                      ) : deviation > 40 ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 block text-center">
                          +{deviation} sobre cuota
                        </span>
                      ) : (
                        <span className="text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200 block text-center">
                          {deviation} bajo cuota
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOTONES DE ASIGNACIÓN RÁPIDA POR BLOQUE (SIN ESTAR SEÑALANDO) */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>Asignar Bloque Completo a este Profesional (1 Clic):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => clearCoursesForUser(assignment.userId)}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      ✕ Quitar todos sus cursos
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => assignBlockToUser(assignment.userId, "MATUTINA")}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-amber-100/70 hover:bg-amber-100 text-amber-900 border border-amber-300"
                    >
                      ☀️ + Toda la Mañana
                    </button>
                    <button
                      type="button"
                      onClick={() => assignBlockToUser(assignment.userId, "VESPERTINA")}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-sky-100/70 hover:bg-sky-100 text-sky-900 border border-sky-300"
                    >
                      🌤️ + Toda la Tarde
                    </button>
                    <button
                      type="button"
                      onClick={() => assignBlockToUser(assignment.userId, "ELEMENTAL")}
                      className="px-2 py-1 rounded text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                    >
                      📘 + Básica Elemental (2.°-4.°)
                    </button>
                    <button
                      type="button"
                      onClick={() => assignBlockToUser(assignment.userId, "MEDIA")}
                      className="px-2 py-1 rounded text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                    >
                      📗 + Básica Media (5.°-7.°)
                    </button>
                    <button
                      type="button"
                      onClick={() => assignBlockToUser(assignment.userId, "SUPERIOR")}
                      className="px-2 py-1 rounded text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                    >
                      📙 + Básica Superior (8.°-10.°)
                    </button>
                    <button
                      type="button"
                      onClick={() => assignBlockToUser(assignment.userId, "BACHILLERATO")}
                      className="px-2 py-1 rounded text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200"
                    >
                      🎓 + Todo Bachillerato
                    </button>
                  </div>
                </div>

                {/* Cursos Asignados */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Cursos Asignados ({assignment.courses.length} seleccionados):
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Haz clic en un curso para alternarlo individualmente
                    </span>
                  </div>

                  {courseSummaries.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
                      No hay cursos registrados. Haz clic en <strong>"Oferta, Cursos Técnicos y Numéricos"</strong> para agregarlos.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {courseSummaries.map((c) => {
                        const isSelected = assignment.courses.includes(c.course);
                        const assignedToOther = assignments.find(
                          (other) => other.userId !== assignment.userId && other.courses.includes(c.course)
                        );

                        return (
                          <button
                            key={c.course}
                            type="button"
                            onClick={() => toggleCourseForUser(assignment.userId, c.course)}
                            className={`px-2.5 py-1.5 rounded text-xs font-medium text-left border transition-all flex items-center gap-2 ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                                : assignedToOther
                                ? "bg-slate-100 text-slate-400 border-slate-200 opacity-60 hover:opacity-100"
                                : "bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30"
                            }`}
                          >
                            <span>{isSelected ? "✓" : "+"}</span>
                            <span>{c.course}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded ${
                                isSelected
                                  ? "bg-indigo-700 text-indigo-100"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {c.totalStudents} est. ({c.parallels.join(",")})
                            </span>
                            {assignedToOther && !isSelected && (
                              <span className="text-[9px] italic text-slate-400">
                                ({assignedToOther.userName.split(" ")[0]})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Subniveles Tags */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                    Subniveles atendidos:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {EDUCATION_LEVEL_PRESETS.map((preset) => {
                      const isSelected = assignment.subniveles.includes(preset.shortLabel);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => toggleSubnivelForUser(assignment.userId, preset.shortLabel)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                            isSelected
                              ? "bg-purple-100 text-purple-800 border-purple-300"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {preset.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PARÁMETROS OPERATIVOS: COLOR, ALMUERZO Y ENLAZADA */}
                <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>Configuración Operativa: Color, Horario y Cobertura Enlazada</span>
                    </span>
                    {/* Selector de Color */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] font-medium text-slate-500">Color distintivo:</span>
                      <div className="flex items-center gap-1">
                        {defaultColors.map((cHex) => (
                          <button
                            key={cHex}
                            type="button"
                            onClick={() => updateAssignmentField(assignment.userId, "color", cHex)}
                            style={{ backgroundColor: cHex }}
                            className={`w-5 h-5 rounded-full border transition-transform ${
                              assignment.color === cHex
                                ? "border-slate-800 ring-2 ring-indigo-500 scale-110"
                                : "border-slate-300 hover:scale-105"
                            }`}
                            title={`Elegir color ${cHex}`}
                          />
                        ))}
                        <input
                          type="color"
                          value={assignment.color || "#FEF08A"}
                          onChange={(e) => updateAssignmentField(assignment.userId, "color", e.target.value)}
                          className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer ml-1"
                          title="Color personalizado"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Horario de Almuerzo */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        🍱 Horario de Almuerzo (Lunes a Viernes):
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. 12H00 A 13H00 o 13H00 A 14H00"
                        value={assignment.lunchSchedule}
                        onChange={(e) =>
                          updateAssignmentField(assignment.userId, "lunchSchedule", e.target.value)
                        }
                        className="input text-xs py-1.5 bg-white font-medium"
                      />
                    </div>

                    {/* Institución Enlazada */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <span>🏫</span>
                          <span>Institución Educativa Enlazada:</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-[10.5px] font-semibold text-indigo-700">
                          <input
                            type="checkbox"
                            checked={assignment.hasEnlazada}
                            onChange={(e) =>
                              updateAssignmentField(assignment.userId, "hasEnlazada", e.target.checked)
                            }
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Tiene Enlazada</span>
                        </label>
                      </div>

                      {assignment.hasEnlazada ? (
                        <div className="space-y-1.5 bg-white p-2.5 rounded-md border border-indigo-200">
                          <input
                            type="text"
                            placeholder="Nombre de la Institución Enlazada..."
                            value={assignment.enlazadaName}
                            onChange={(e) =>
                              updateAssignmentField(assignment.userId, "enlazadaName", e.target.value)
                            }
                            className="input text-xs py-1"
                          />
                          <input
                            type="text"
                            placeholder="Días y frecuencia (ej. Martes 1 vez a la semana)..."
                            value={assignment.enlazadaDias}
                            onChange={(e) =>
                              updateAssignmentField(assignment.userId, "enlazadaDias", e.target.value)
                            }
                            className="input text-xs py-1"
                          />
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
                          <span>✓</span>
                          <span>Sin institución enlazada (Atención 100% Sede Matriz).</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Responsabilidades */}
                <div>
                  <label className="label text-xs">
                    Responsabilidades Específicas / Programas a Cargo (opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Líder de Protocolos de Violencia, Coordinación con UDAFE..."
                    value={assignment.specificResponsibilities}
                    onChange={(e) =>
                      updateAssignmentField(
                        assignment.userId,
                        "specificResponsibilities",
                        e.target.value
                      )
                    }
                    className="input text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODO 2: TABLA DE ASIGNACIÓN RÁPIDA POR CURSO (CON DESPLEGABLE DIRECTO)  */}
      {/* ======================================================================= */}
      {viewMode === "TABLE" && (
        <div className="card overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Asignación Masiva por Turno:
              </span>
              <p className="text-[11px] text-slate-500">
                Asigna todos los cursos de una jornada a un profesional con 1 clic:
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkShiftSelect}
                onChange={(e: any) => setBulkShiftSelect(e.target.value)}
                className="input text-xs py-1.5 font-semibold"
              >
                <option value="MATUTINA">☀️ Toda la Jornada Matutina</option>
                <option value="VESPERTINA">🌤️ Toda la Jornada Vespertina</option>
                <option value="NOCTURNA">🌙 Toda la Jornada Nocturna</option>
              </select>
              <span className="text-xs text-slate-500 font-medium">a:</span>
              <select
                value={bulkShiftTarget}
                onChange={(e) => setBulkShiftTarget(e.target.value)}
                className="input text-xs py-1.5 font-semibold"
              >
                {deceTeam.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkShiftAssign}
                className="btn-primary text-xs py-1.5 px-3"
              >
                Asignar Turno Completo
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase text-[11px] font-bold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-4">Curso / Oferta</th>
                  <th className="py-2.5 px-3">Jornada</th>
                  <th className="py-2.5 px-3">Paralelos</th>
                  <th className="py-2.5 px-3 text-center">N.° Alumnos</th>
                  <th className="py-2.5 px-4">Asignado a: (Selector Directo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courseSummaries.map((c, idx) => {
                  const assignedAnalyst = assignments.find((a) => a.courses.includes(c.course));

                  return (
                    <tr key={c.course} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-4 font-semibold text-slate-800">
                        {c.course}
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {c.jornadas.join(", ") || "General"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {c.parallels.join(", ")}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">
                        {c.totalStudents}
                      </td>
                      <td className="py-2 px-4">
                        <select
                          value={assignedAnalyst?.userId || ""}
                          onChange={(e) => assignCourseToUserDirectly(c.course, e.target.value)}
                          className={`input text-xs py-1 font-semibold ${
                            assignedAnalyst
                              ? "bg-indigo-50/80 border-indigo-300 text-indigo-900"
                              : "bg-white text-slate-500 border-slate-200"
                          }`}
                        >
                          <option value="">-- Sin Asignar --</option>
                          {deceTeam.map((u) => {
                            const userAssignment = assignments.find((a) => a.userId === u.id);
                            return (
                              <option key={u.id} value={u.id}>
                                {u.name} ({userAssignment?.jornada || "DECE"} • {userAssignment?.estimatedStudentsCount || 0} est.)
                              </option>
                            );
                          })}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Observaciones y Firmas */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
          3. Observaciones Técnicas Institucionales y Firmas de Legalización
        </h2>

        <div>
          <label className="label">
            Observaciones Técnicas de Distribución
          </label>
          <textarea
            rows={3}
            value={generalObservations}
            onChange={(e) => setGeneralObservations(e.target.value)}
            placeholder="Observaciones técnicas para la asignación equitativa, cobertura psicosocial o justificación de sobrecarga ante el Distrito Educativo..."
            className="input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-700 block uppercase">
              Elaborado por (Coordinación DECE)
            </span>
            <input
              type="text"
              value={elaboratedByName}
              onChange={(e) => setElaboratedByName(e.target.value)}
              placeholder="Nombre del Coordinador/a DECE"
              className="input text-xs"
              required
            />
            <input
              type="text"
              value={elaboratedByRole}
              onChange={(e) => setElaboratedByRole(e.target.value)}
              className="input text-xs"
              required
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-700 block uppercase">
              Aprobado por (Máxima Autoridad Institucional)
            </span>
            <input
              type="text"
              value={approvedByName}
              onChange={(e) => setApprovedByName(e.target.value)}
              placeholder="Nombre del Rector(a) / Director(a) (Opcional)"
              className="input text-xs"
            />
            <input
              type="text"
              value={approvedByRole}
              onChange={(e) => setApprovedByRole(e.target.value)}
              placeholder="Cargo (ej. Rector/a Institucional)"
              className="input text-xs"
            />
          </div>
        </div>
      </div>

      {/* Form Action Buttons with Delete */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <div>
          {distributivo?.id && (
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                if (
                  window.confirm(
                    "¿Estás seguro de que deseas eliminar este Distributivo DECE institucional? Esta acción eliminará permanentemente la asignación de cursos para este período lectivo."
                  )
                ) {
                  setSaving(true);
                  try {
                    const res = await deleteDistributivo(distributivo.id);
                    if (res && res.error) {
                      setErrorMessage(res.error);
                      setSaving(false);
                    } else {
                      window.location.href = "/distributivo";
                    }
                  } catch (err: any) {
                    setErrorMessage(err?.message || "Error al eliminar el distributivo");
                    setSaving(false);
                  }
                }
              }}
              className="btn-secondary text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 w-full sm:w-auto"
            >
              <span>🗑️</span>
              <span>Eliminar este Distributivo</span>
            </button>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          <Link href="/distributivo" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" disabled={saving} className="btn-primary px-6">
            {saving ? "Guardando Distributivo..." : "Guardar Distributivo Institucional"}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------ */}
      {/* MODAL 1: OFERTA, CURSOS TÉCNICOS Y NUMÉRICOS POR JORNADA                 */}
      {/* ------------------------------------------------------------------------ */}
      {showQuotasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span>📊</span>
                  <span>Configuración de Oferta, Cursos Técnicos y Numéricos</span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Agrega especialidades oficiales del MINEDUC y define el número real de alumnos por paralelo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuotasModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* SECCIÓN 1: AÑADIR CURSOS Y NIVELES EDUCATIVOS */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase text-xs flex items-center gap-1.5">
                    <span>➕</span>
                    <span>1. Aumentar Cursos a la Institución</span>
                  </span>
                  {techNotice && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300 animate-pulse">
                      {techNotice}
                    </span>
                  )}
                </div>

                {/* Opción A: Niveles completos con 1 clic */}
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Añadir Nivel Educativo Completo (con 1 solo clic):
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => addEducationLevelDirectly("INICIAL")}
                      className="px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <span>👶</span>
                      <span>+ Inicial (1 y 2)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addEducationLevelDirectly("BASICA_PREPARATORIA")}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <span>✏️</span>
                      <span>+ Preparatoria (1.° EGB)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addEducationLevelDirectly("BASICA_ELEMENTAL")}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <span>🎒</span>
                      <span>+ Básica Elemental (2.°, 3.°, 4.°)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addEducationLevelDirectly("BASICA_MEDIA")}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <span>📘</span>
                      <span>+ Básica Media (5.°, 6.°, 7.°)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addEducationLevelDirectly("BASICA_SUPERIOR")}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <span>📐</span>
                      <span>+ Básica Superior (8.°, 9.°, 10.°)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addEducationLevelDirectly("BACHILLERATO_CIENCIAS")}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs flex items-center gap-1 transition"
                    >
                      <span>🔬</span>
                      <span>+ BGU Ciencias (1.°, 2.°, 3.°)</span>
                    </button>
                  </div>
                </div>

                {/* Opción B: Añadir curso individual o personalizado */}
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Añadir Curso Individual o Personalizado:
                  </span>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                    <select
                      value={selectedSingleCourse}
                      onChange={(e) => {
                        setSelectedSingleCourse(e.target.value);
                        if (e.target.value !== "OTRO") setCustomCourseName("");
                      }}
                      className="input text-xs py-1.5 sm:w-60 font-medium"
                    >
                      <optgroup label="Educación Inicial y Básica">
                        <option value="Inicial 1 (3 años)">Inicial 1 (3 años)</option>
                        <option value="Inicial 2 (4 años)">Inicial 2 (4 años)</option>
                        <option value="1.° EGB">1.° EGB (Preparatoria)</option>
                        <option value="2.° EGB">2.° EGB (Elemental)</option>
                        <option value="3.° EGB">3.° EGB (Elemental)</option>
                        <option value="4.° EGB">4.° EGB (Elemental)</option>
                        <option value="5.° EGB">5.° EGB (Media)</option>
                        <option value="6.° EGB">6.° EGB (Media)</option>
                        <option value="7.° EGB">7.° EGB (Media)</option>
                        <option value="8.° EGB">8.° EGB (Superior)</option>
                        <option value="9.° EGB">9.° EGB (Superior)</option>
                        <option value="10.° EGB">10.° EGB (Superior)</option>
                      </optgroup>
                      <optgroup label="Bachillerato General Unificado (BGU)">
                        <option value="1.° BGU Ciencias">1.° BGU Ciencias</option>
                        <option value="2.° BGU Ciencias">2.° BGU Ciencias</option>
                        <option value="3.° BGU Ciencias">3.° BGU Ciencias</option>
                      </optgroup>
                      <option value="OTRO">✏️ Otro curso / Personalizado...</option>
                    </select>

                    {selectedSingleCourse === "OTRO" && (
                      <input
                        type="text"
                        placeholder="Escribe el nombre del curso..."
                        value={customCourseName}
                        onChange={(e) => setCustomCourseName(e.target.value)}
                        className="input text-xs py-1.5 flex-1"
                      />
                    )}

                    <select
                      value={newCourseJornada}
                      onChange={(e) => setNewCourseJornada(e.target.value as any)}
                      className="input text-xs py-1.5 sm:w-36 font-medium text-slate-700"
                    >
                      <option value="MATUTINA">☀️ Matutina</option>
                      <option value="VESPERTINA">🌤️ Vespertina</option>
                      <option value="NOCTURNA">🌙 Nocturna</option>
                    </select>

                    <button
                      type="button"
                      onClick={addSingleCourseDirectly}
                      className="btn-primary text-xs py-1.5 px-4 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-1 shadow-xs"
                    >
                      <span>➕</span>
                      <span>Añadir Curso</span>
                    </button>
                  </div>
                </div>

                {/* Opción C: Añadir Bachillerato (Técnico, Ciencias o Especialidad Oficial / Manual) */}
                <div className="space-y-2.5 bg-gradient-to-r from-amber-50 to-orange-50/70 p-3.5 rounded-lg border border-amber-300 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11.5px] font-bold text-amber-950 flex items-center gap-1.5">
                      <span>🎓</span>
                      <span>Añadir Bachillerato (Técnico, Ciencias o Especialidad):</span>
                    </span>
                    <div className="flex items-center gap-1 bg-amber-200/70 p-0.5 rounded text-[10.5px] font-bold">
                      <button
                        type="button"
                        onClick={() => setIsManualTechSpecialty(false)}
                        className={`px-2.5 py-1 rounded transition ${
                          !isManualTechSpecialty
                            ? "bg-amber-700 text-white shadow-xs"
                            : "text-amber-900 hover:bg-amber-100"
                        }`}
                      >
                        📋 Catálogo MINEDUC
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsManualTechSpecialty(true)}
                        className={`px-2.5 py-1 rounded transition ${
                          isManualTechSpecialty
                            ? "bg-amber-700 text-white shadow-xs"
                            : "text-amber-900 hover:bg-amber-100"
                        }`}
                      >
                        ✏️ Escribir Manualmente
                      </button>
                    </div>
                  </div>

                  {!isManualTechSpecialty ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          placeholder="Buscar especialidad en catálogo MINEDUC (ej. Contabilidad, Informática...)"
                          value={techSpecialtySearch}
                          onChange={(e) => setTechSpecialtySearch(e.target.value)}
                          className="input text-xs py-1 bg-white"
                        />
                        <select
                          value={selectedTechSpecialty}
                          onChange={(e) => {
                            if (e.target.value === "OTRA_MANUAL") {
                              setIsManualTechSpecialty(true);
                            } else {
                              setSelectedTechSpecialty(e.target.value);
                            }
                          }}
                          className="input text-xs py-1 font-bold text-amber-900 bg-white"
                        >
                          <option value="OTRA_MANUAL">✏️ [Escribir otra especialidad que no esté en la lista...]</option>
                          {filteredTechnicalFigures.map((f) => (
                            <option key={f.id} value={f.name}>
                              {f.name} ({f.area})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={addTechnicalCoursesDirectly}
                        className="btn-primary text-xs py-2 px-4 whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span>➕</span>
                        <span>Añadir 3.°, 2.° y 1.°</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <select
                            value={manualBachilleratoType}
                            onChange={(e) => setManualBachilleratoType(e.target.value as "TECNICO" | "GENERAL")}
                            className="input text-xs py-1 w-48 font-semibold text-slate-800 bg-white"
                          >
                            <option value="TECNICO">Bachillerato Técnico</option>
                            <option value="GENERAL">Bachillerato General / Especialidad</option>
                          </select>
                          <span className="text-[10px] text-amber-900 font-medium">
                            Se crearán automáticamente 3.°, 2.° y 1.° en orden descendente
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Escribe el nombre de la especialidad (ej. Producción Agropecuaria, Mecatrónica, Arte...)"
                          value={manualTechSpecialty}
                          onChange={(e) => setManualTechSpecialty(e.target.value)}
                          className="input text-xs py-1.5 font-bold text-amber-950 bg-white border-amber-400 focus:ring-amber-500"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addTechnicalCoursesDirectly}
                        className="btn-primary text-xs py-2 px-4 whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span>➕</span>
                        <span>Añadir 3.°, 2.° y 1.°</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 2: LISTA DE CURSOS Y EDICIÓN DE NUMÉRICOS POR PARALELO */}
              <div className="space-y-3">
                {/* BANNER DE CARGA INTELIGENTE Y TUTORES DESDE DESKTOP / ARCHIVO */}
                <div className="p-3.5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🤖</span>
                      <span className="font-black text-xs uppercase tracking-wide text-indigo-200">
                        Carga Inteligente de Numérico y Tutores (IA & Excel)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Detecta automáticamente los cursos, paralelos, número de estudiantes y tutores asignados.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={loadingTutors}
                      onClick={handleLoadDesktopTutors}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                      title="Lee directamente desde C:\Users\USER\Desktop\Numérico estudiantes\TUTORES 2026-2027.xlsx"
                    >
                      <span>📂</span>
                      <span>{loadingTutors ? "Detectando..." : "Detectar de Carpeta Desktop"}</span>
                    </button>

                    <label className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer">
                      <span>📤</span>
                      <span>Subir Excel / CSV</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleUploadTutorsFile}
                      />
                    </label>

                    {/* Selector de Orden Visual */}
                    <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => toggleSortOrder("DESC")}
                        className={`px-2 py-1 rounded transition ${
                          courseSortOrder === "DESC"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title="Orden descendente: 3.° Bachillerato ➔ Inicial"
                      >
                        🔽 Descendente
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSortOrder("ASC")}
                        className={`px-2 py-1 rounded transition ${
                          courseSortOrder === "ASC"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title="Orden ascendente: Inicial ➔ 3.° Bachillerato"
                      >
                        🔼 Ascendente
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 uppercase text-xs">
                      2. Matriz de Cursos, Paralelos y Numérico de Estudiantes ({courseConfigs.length} cursos):
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                      Edita el numérico de cada paralelo o agrega con (+ Paralelo)
                    </span>
                    {courseConfigs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllCourseConfigs}
                        className="px-2.5 py-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition shadow-2xs"
                        title="Vaciar todos los cursos si se cargó o configuró mal"
                      >
                        <span>🗑️</span>
                        <span>Vaciar Cursos</span>
                      </button>
                    )}
                  </div>
                </div>

                {courseConfigs.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                    No hay cursos agregados todavía. Utiliza los botones superiores para agregar niveles o cursos individuales.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
                    {courseConfigs.map((c) => {
                      const matTotal = c.matutinaActive
                        ? c.matutinaParallels.reduce((acc, p) => acc + (Number(p.student_count) || 0), 0)
                        : 0;
                      const vespTotal = c.vespertinaActive
                        ? c.vespertinaParallels.reduce((acc, p) => acc + (Number(p.student_count) || 0), 0)
                        : 0;
                      const nocTotal = c.nocturnaActive
                        ? c.nocturnaParallels.reduce((acc, p) => acc + (Number(p.student_count) || 0), 0)
                        : 0;
                      const courseTotal = matTotal + vespTotal + nocTotal;

                      return (
                        <div
                          key={c.id}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5 hover:border-slate-300 transition"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">{c.courseName}</span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {c.bachillerato_specialty || c.education_level.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                Total: {courseTotal} alumnos
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Checkboxes de Jornadas */}
                              <div className="flex items-center gap-2 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={c.matutinaActive}
                                    onChange={(e) =>
                                      setCourseConfigs((prev) =>
                                        prev.map((item) =>
                                          item.id === c.id
                                            ? {
                                                ...item,
                                                matutinaActive: e.target.checked,
                                                matutinaParallels:
                                                  e.target.checked && item.matutinaParallels.length === 0
                                                    ? [{ id: `mat_${Date.now()}`, parallel: "A", student_count: 30 }]
                                                    : item.matutinaParallels,
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="text-[11px] text-slate-700">☀️ Mat</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={c.vespertinaActive}
                                    onChange={(e) =>
                                      setCourseConfigs((prev) =>
                                        prev.map((item) =>
                                          item.id === c.id
                                            ? {
                                                ...item,
                                                vespertinaActive: e.target.checked,
                                                vespertinaParallels:
                                                  e.target.checked && item.vespertinaParallels.length === 0
                                                    ? [{ id: `vesp_${Date.now()}`, parallel: "A", student_count: 26 }]
                                                    : item.vespertinaParallels,
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="text-[11px] text-slate-700">🌤️ Vesp</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={c.nocturnaActive}
                                    onChange={(e) =>
                                      setCourseConfigs((prev) =>
                                        prev.map((item) =>
                                          item.id === c.id
                                            ? {
                                                ...item,
                                                nocturnaActive: e.target.checked,
                                                nocturnaParallels:
                                                  e.target.checked && item.nocturnaParallels.length === 0
                                                    ? [{ id: `noc_${Date.now()}`, parallel: "A", student_count: 20 }]
                                                    : item.nocturnaParallels,
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="text-[11px] text-slate-700">🌙 Noc</span>
                                </label>
                              </div>

                              <button
                                type="button"
                                onClick={() => setCourseConfigs((prev) => prev.filter((item) => item.id !== c.id))}
                                className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-50 transition"
                              >
                                ✕ Eliminar
                              </button>
                            </div>
                          </div>

                          {/* Paralelos Matutina */}
                          {c.matutinaActive && (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                ☀️ Matutina ({matTotal} est.):
                              </span>
                              {c.matutinaParallels.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex flex-col sm:flex-row sm:items-center gap-1.5 bg-slate-50 hover:bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs transition"
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-800">{p.parallel}:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={p.student_count}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setCourseConfigs((prev) =>
                                          prev.map((item) =>
                                            item.id === c.id
                                              ? {
                                                  ...item,
                                                  matutinaParallels: item.matutinaParallels.map((par) =>
                                                    par.id === p.id ? { ...par, student_count: val } : par
                                                  ),
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                      className="w-12 text-center py-0.5 px-1 border border-slate-300 rounded font-bold text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                                      title="Número de estudiantes"
                                    />
                                    <span className="text-[10px] text-slate-400">al.</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder="Tutor/a..."
                                      value={p.tutor_name || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCourseConfigs((prev) =>
                                          prev.map((item) =>
                                            item.id === c.id
                                              ? {
                                                  ...item,
                                                  matutinaParallels: item.matutinaParallels.map((par) =>
                                                    par.id === p.id ? { ...par, tutor_name: val } : par
                                                  ),
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                      className="w-36 py-0.5 px-1.5 border border-slate-300 rounded text-slate-700 text-xs bg-white"
                                      title="Nombre del docente tutor"
                                    />
                                    {c.matutinaParallels.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeParallelFromCourse(c.id, "matutina", p.id)}
                                        className="text-slate-300 hover:text-rose-500 font-bold px-1 text-xs"
                                        title="Eliminar este paralelo"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addParallelToCourse(c.id, "matutina")}
                                className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200 transition flex items-center gap-1"
                              >
                                <span>➕</span>
                                <span>Paralelo</span>
                              </button>
                            </div>
                          )}

                          {/* Paralelos Vespertina */}
                          {c.vespertinaActive && (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                🌤️ Vespertina ({vespTotal} est.):
                              </span>
                              {c.vespertinaParallels.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex flex-col sm:flex-row sm:items-center gap-1.5 bg-slate-50 hover:bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs transition"
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-800">{p.parallel}:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={p.student_count}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setCourseConfigs((prev) =>
                                          prev.map((item) =>
                                            item.id === c.id
                                              ? {
                                                  ...item,
                                                  vespertinaParallels: item.vespertinaParallels.map((par) =>
                                                    par.id === p.id ? { ...par, student_count: val } : par
                                                  ),
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                      className="w-12 text-center py-0.5 px-1 border border-slate-300 rounded font-bold text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                                      title="Número de estudiantes"
                                    />
                                    <span className="text-[10px] text-slate-400">al.</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder="Tutor/a..."
                                      value={p.tutor_name || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCourseConfigs((prev) =>
                                          prev.map((item) =>
                                            item.id === c.id
                                              ? {
                                                  ...item,
                                                  vespertinaParallels: item.vespertinaParallels.map((par) =>
                                                    par.id === p.id ? { ...par, tutor_name: val } : par
                                                  ),
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                      className="w-36 py-0.5 px-1.5 border border-slate-300 rounded text-slate-700 text-xs bg-white"
                                      title="Nombre del docente tutor"
                                    />
                                    {c.vespertinaParallels.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeParallelFromCourse(c.id, "vespertina", p.id)}
                                        className="text-slate-300 hover:text-rose-500 font-bold px-1 text-xs"
                                        title="Eliminar este paralelo"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addParallelToCourse(c.id, "vespertina")}
                                className="text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded border border-sky-200 transition flex items-center gap-1"
                              >
                                <span>➕</span>
                                <span>Paralelo</span>
                              </button>
                            </div>
                          )}

                          {/* Paralelos Nocturna */}
                          {c.nocturnaActive && (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                🌙 Nocturna ({nocTotal} est.):
                              </span>
                              {c.nocturnaParallels.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex flex-col sm:flex-row sm:items-center gap-1.5 bg-slate-50 hover:bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs transition"
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-800">{p.parallel}:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={p.student_count}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setCourseConfigs((prev) =>
                                          prev.map((item) =>
                                            item.id === c.id
                                              ? {
                                                  ...item,
                                                  nocturnaParallels: item.nocturnaParallels.map((par) =>
                                                    par.id === p.id ? { ...par, student_count: val } : par
                                                  ),
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                      className="w-12 text-center py-0.5 px-1 border border-slate-300 rounded font-bold text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                                      title="Número de estudiantes"
                                    />
                                    <span className="text-[10px] text-slate-400">al.</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      placeholder="Tutor/a..."
                                      value={p.tutor_name || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCourseConfigs((prev) =>
                                          prev.map((item) =>
                                            item.id === c.id
                                              ? {
                                                  ...item,
                                                  nocturnaParallels: item.nocturnaParallels.map((par) =>
                                                    par.id === p.id ? { ...par, tutor_name: val } : par
                                                  ),
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                      className="w-36 py-0.5 px-1.5 border border-slate-300 rounded text-slate-700 text-xs bg-white"
                                      title="Nombre del docente tutor"
                                    />
                                    {c.nocturnaParallels.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeParallelFromCourse(c.id, "nocturna", p.id)}
                                        className="text-slate-300 hover:text-rose-500 font-bold px-1 text-xs"
                                        title="Eliminar este paralelo"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addParallelToCourse(c.id, "nocturna")}
                                className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded border border-purple-200 transition flex items-center gap-1"
                              >
                                <span>➕</span>
                                <span>Paralelo</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-700">
                Total Institucional:{" "}
                <span className="text-indigo-700 font-black text-sm">
                  {courseConfigs.reduce((acc, c) => {
                    const m = c.matutinaActive ? c.matutinaParallels.reduce((s, p) => s + (Number(p.student_count) || 0), 0) : 0;
                    const v = c.vespertinaActive ? c.vespertinaParallels.reduce((s, p) => s + (Number(p.student_count) || 0), 0) : 0;
                    const n = c.nocturnaActive ? c.nocturnaParallels.reduce((s, p) => s + (Number(p.student_count) || 0), 0) : 0;
                    return acc + m + v + n;
                  }, 0)}
                </span>{" "}
                estudiantes en {courseConfigs.length} cursos configurados
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuotasModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={savingQuotas}
                  onClick={handleSaveQuotas}
                  className="btn-primary text-xs px-5 py-2 shadow-sm font-bold"
                >
                  {savingQuotas ? "Guardando..." : "Guardar Numéricos Institucionales"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
