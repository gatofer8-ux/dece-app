import { db } from "@/lib/db";
import { currentSchoolYearSpaced } from "@/lib/schoolYearText";
import type { CaseFileRow, StudentRow, InstitutionRow, SchoolYearRow } from "@/lib/types";

/**
 * Datos que deben precargarse en TODOS los documentos de un caso.
 *
 * En vez de que cada formulario vuelva a preguntar el nombre del rector, la
 * cédula del profesional, la extensión, etc., estos datos se llenan una sola
 * vez (institución → Configuración; profesional → Mi perfil) y este helper los
 * reúne para que la página del formulario los pase como valores por defecto.
 */

export interface DeceProfessionalDefaults {
  /** Nombre tal cual, sin título. */
  name: string;
  /** Título académico (Msc., Lcda., Psic. Cl.). */
  title: string;
  /** Nombre con título antepuesto, listo para firmas. */
  fullName: string;
  /** Cargo (ANALISTA DECE, COORDINADOR/A DECE, TRABAJADOR/A SOCIAL…). */
  role: string;
  email: string;
  phone: string;
  phoneExt: string;
  documentId: string;
}

export interface AuthorityDefaults {
  name: string;
  title: string;
  fullName: string;
  role: string;
}

export interface CaseDocumentDefaults {
  caseFile: CaseFileRow;
  student: StudentRow;
  studentAge: number | null;
  institution: InstitutionRow;
  schoolYear: SchoolYearRow | null;
  schoolYearText: string;
  deceProfessional: DeceProfessionalDefaults;
  authority: AuthorityDefaults;
  deceCoordinator: AuthorityDefaults;
}

function ageFrom(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const t = new Date(birthDate).getTime();
  if (Number.isNaN(t)) return null;
  const age = Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
  return age >= 0 && age < 120 ? age : null;
}

function withTitle(title?: string | null, name?: string | null): string {
  return [title?.trim(), name?.trim()].filter(Boolean).join(" ");
}

export interface SignatureDefaults {
  institution: InstitutionRow;
  schoolYear: SchoolYearRow | null;
  schoolYearText: string;
  deceProfessional: DeceProfessionalDefaults;
  authority: AuthorityDefaults;
  deceCoordinator: AuthorityDefaults;
}

type SessionLike = {
  user: { id: string; institution_id: string | null; name?: string | null; email?: string | null };
};

/**
 * Datos de firma (profesional + autoridad + coordinación + institución) que se
 * precargan en cualquier documento, tenga o no un caso asociado.
 */
export function getSignatureDefaults(session: SessionLike, institutionId: string): SignatureDefaults {
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const inst = institution as any;

  const schoolYear =
    (db
      .prepare("SELECT * FROM school_years WHERE institution_id = ? AND is_active = 1")
      .get(institutionId) as SchoolYearRow | undefined) ?? null;

  const me = db
    .prepare("SELECT name, email, phone, job_title, document_id, title_prefix, phone_ext FROM users WHERE id = ?")
    .get(session.user.id) as
    | {
        name: string;
        email: string | null;
        phone: string | null;
        job_title: string | null;
        document_id: string | null;
        title_prefix: string | null;
        phone_ext: string | null;
      }
    | undefined;

  const proName = me?.name || session.user.name || "";
  const proTitle = me?.title_prefix || "";

  const deceProfessional: DeceProfessionalDefaults = {
    name: proName,
    title: proTitle,
    fullName: withTitle(proTitle, proName) || proName,
    role: me?.job_title || "PROFESIONAL DECE INSTITUCIONAL",
    email: me?.email || session.user.email || "",
    phone: me?.phone || "",
    phoneExt: me?.phone_ext || "",
    documentId: me?.document_id || "",
  };

  const authority: AuthorityDefaults = {
    name: inst?.rector_name || "",
    title: inst?.rector_title || "",
    fullName: withTitle(inst?.rector_title, inst?.rector_name),
    role: inst?.rector_role || "RECTOR(A) DE LA UNIDAD EDUCATIVA",
  };

  const deceCoordinator: AuthorityDefaults = {
    name: inst?.dece_coordinator_name || "",
    title: inst?.dece_coordinator_title || "",
    fullName: withTitle(inst?.dece_coordinator_title, inst?.dece_coordinator_name),
    role: "COORDINADOR/A DECE INSTITUCIONAL",
  };

  return {
    institution,
    schoolYear,
    schoolYearText: schoolYear?.name || currentSchoolYearSpaced(),
    deceProfessional,
    authority,
    deceCoordinator,
  };
}

/**
 * Reúne los valores por defecto para un documento del caso `caseId`.
 * Devuelve `null` si el caso o el estudiante no existen en la institución.
 */
export function getCaseDocumentDefaults(
  caseId: string,
  session: SessionLike,
  institutionId: string
): CaseDocumentDefaults | null {
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(caseId, institutionId) as CaseFileRow | undefined;
  if (!caseFile) return null;

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as
    | StudentRow
    | undefined;
  if (!student) return null;

  const sig = getSignatureDefaults(session, institutionId);

  return {
    caseFile,
    student,
    studentAge: ageFrom(student.birth_date),
    institution: sig.institution,
    schoolYear: sig.schoolYear,
    schoolYearText: sig.schoolYearText,
    deceProfessional: sig.deceProfessional,
    authority: sig.authority,
    deceCoordinator: sig.deceCoordinator,
  };
}
