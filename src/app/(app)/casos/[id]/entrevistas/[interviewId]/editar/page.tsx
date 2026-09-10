import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import { updateInterview } from "../../../../actions";
import type { CaseFileRow, StudentRow, CaseInterviewRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import Link from "next/link";

const EMOTIONAL_OPTIONS = ["Estable", "Inestable", "Llanto fácil", "Triste", "Alegre", "Agresivo", "Evasivo"];
const SOCIAL_OPTIONS = ["Sociable", "Aislado"];

export default async function EditarEntrevistaPage({ params }: { params: { id: string; interviewId: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();

  const interview = db
    .prepare("SELECT * FROM case_interviews WHERE id = ? AND case_file_id = ?")
    .get(params.interviewId, caseFile.id) as CaseInterviewRow | undefined;
  if (!interview) notFound();

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const defaults = getCaseDocumentDefaults(caseFile.id, session, institutionId);

  const boundUpdate = updateInterview.bind(null, caseFile.id, interview.id);

  const emotionalStates = (interview.emotional_state || "").split(",").map((s) => s.trim());
  const socialRelations = (interview.social_relations || "").split(",").map((s) => s.trim());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Editar Entrevista semiestructurada"
          description={`${student.full_name} — ${caseFile.code}`}
        />
        <Link
          href={`/casos/${caseFile.id}/entrevistas/${interview.id}/imprimir`}
          className="btn-secondary text-xs"
        >
          ← Volver a la ficha
        </Link>
      </div>

      <form action={boundUpdate} className="card p-6 space-y-5 max-w-3xl">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos personales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Nombres del entrevistado</label>
              <input name="full_name" required defaultValue={interview.interviewee_full_name || student.full_name} className="input" />
            </div>
            <div>
              <label className="label text-xs">Cédula</label>
              <input name="cedula" defaultValue={interview.interviewee_cedula || student.document_id || ""} className="input" />
            </div>
            <div>
              <label className="label text-xs">Curso</label>
              <input name="course" defaultValue={interview.course || `${student.course} ${student.parallel || ""}`.trim()} className="input" />
            </div>
            <div>
              <label className="label text-xs">Edad</label>
              <input name="age" defaultValue={interview.age || (defaults?.studentAge ? String(defaults.studentAge) : "")} className="input" />
            </div>
            <div>
              <label className="label text-xs">Fecha de aplicación</label>
              <input type="date" name="application_date" defaultValue={interview.application_date || new Date().toISOString().slice(0, 10)} className="input" />
            </div>
            <div>
              <label className="label text-xs">Nombre del representante</label>
              <input name="representative_name" defaultValue={interview.representative_name || student.representative || student.mother_name || student.father_name || ""} className="input" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">1. Resumen de lo tratado en la entrevista</h3>
            <div className="flex items-center gap-2">
              <VoiceDictationButton targetId="interview-summary" />
              <AIAssistButton targetId="interview-summary" caseId={caseFile.id} fieldLabel="Resumen de lo tratado en la entrevista semiestructurada" />
            </div>
          </div>
          <textarea
            id="interview-summary"
            name="summary"
            rows={5}
            defaultValue={interview.summary || ""}
            placeholder="Resumen de lo conversado..."
            className="textarea"
          />
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">2. Situación del estudiante</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Relación familiar</label>
              <select name="family_relation" className="select" defaultValue={interview.family_relation || ""}>
                <option value="">Seleccionar...</option>
                <option>Buena</option>
                <option>Regular</option>
                <option>Mala</option>
                <option>Ausentes</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Antecedentes académicos</label>
              <select name="academic_history" className="select" defaultValue={interview.academic_history || ""}>
                <option value="">Seleccionar...</option>
                <option>Bueno</option>
                <option>Regular</option>
                <option>Malo</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="label text-xs">Estado emocional (puedes marcar varios)</label>
            <div className="flex flex-wrap gap-3 text-sm">
              {EMOTIONAL_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="emotional_state"
                    value={opt}
                    defaultChecked={emotionalStates.includes(opt)}
                    className="rounded"
                  /> {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <label className="label text-xs">Relaciones sociales</label>
            <div className="flex flex-wrap gap-3 text-sm">
              {SOCIAL_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="social_relations"
                    value={opt}
                    defaultChecked={socialRelations.includes(opt)}
                    className="rounded"
                  /> {opt}
                </label>
              ))}
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="bullying_history"
                  value="1"
                  defaultChecked={Boolean(interview.bullying_history)}
                  className="rounded"
                /> Antecedentes de acoso escolar
              </label>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">3. Recomendaciones</h3>
            <div className="flex items-center gap-2">
              <VoiceDictationButton targetId="interview-recommendations" />
              <AIAssistButton targetId="interview-recommendations" caseId={caseFile.id} fieldLabel="Recomendaciones de la entrevista semiestructurada" />
            </div>
          </div>
          <textarea
            id="interview-recommendations"
            name="recommendations"
            rows={3}
            defaultValue={interview.recommendations || ""}
            placeholder="Recomendaciones..."
            className="textarea"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">4. Compromiso</h3>
            <div className="flex items-center gap-2">
              <VoiceDictationButton targetId="interview-commitment" />
              <AIAssistButton targetId="interview-commitment" caseId={caseFile.id} fieldLabel="Compromisos asumidos en la entrevista" />
            </div>
          </div>
          <textarea
            id="interview-commitment"
            name="commitment"
            rows={3}
            defaultValue={interview.commitment || ""}
            placeholder="Compromisos asumidos..."
            className="textarea"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/casos/${caseFile.id}/entrevistas/${interview.id}/imprimir`}
            className="btn-secondary"
          >
            Cancelar
          </Link>
          <button type="submit" className="btn-primary">
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
