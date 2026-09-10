import { db } from "@/lib/db";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import { institutionAcronym } from "@/lib/codesShared";
import { buildMeetingCode } from "@/lib/meetingMinutes";

interface SessionLike {
  user: { id: string; institution_id: string | null; name?: string | null; email?: string | null };
}

export function getMeetingMinutesPrefill(session: SessionLike, institutionId: string): Record<string, string> {
  const sig = getSignatureDefaults(session as never, institutionId);
  const inst = db.prepare("SELECT acronym, name FROM institutions WHERE id = ?").get(institutionId) as
    | { acronym: string | null; name: string | null }
    | undefined;
  const year = new Date().getFullYear();
  const n = (
    db
      .prepare("SELECT COUNT(*) as c FROM meeting_minutes WHERE institution_id = ? AND meeting_code LIKE ?")
      .get(institutionId, `ACTA-DECE-%-${year}-%`) as { c: number }
  ).c;
  return {
    meeting_code: buildMeetingCode(institutionAcronym(inst), year, n + 1),
    meeting_date: new Date().toISOString().slice(0, 10),
    responsible_name: sig.deceProfessional.fullName || session.user.name || "",
    responsible_email: sig.deceProfessional.email || session.user.email || "",
    responsible_phone_ext: sig.deceProfessional.phoneExt || "",
    responsible_role: sig.deceProfessional.role || "ANALISTA DECE",
    location: "Oficina del DECE",
  };
}
