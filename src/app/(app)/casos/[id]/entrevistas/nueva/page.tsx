import { notFound } from "next/navigation";
import { studentGradeLabel } from "@/lib/studentCourse";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { createInterview } from "../../../actions";
import type { CaseFileRow, StudentRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import AppendAwarenessNoteButton from "@/components/AppendAwarenessNoteButton";
import { getDefaultInterviewCommitment } from "@/lib/interviewDefaults";

const EMOTIONAL_OPTIONS = ["Estable", "Inestable", "Llanto fácil", "Triste", "Alegre", "Agresivo", "Evasivo"];
const SOCIAL_OPTIONS = ["Sociable", "Aislado"];

export default async function NuevaEntrevistaPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const caseFile = db
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as CaseFileRow | undefined;
  if (!caseFile) notFound();
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  const boundCreate = createInterview.bind(null, caseFile.id);

  return (
    <div>
      <PageHeader
        title="Entrevista semiestructurada"
        description={`${student.full_name} — ${caseFile.code}`}
      />
      <form action={boundCreate} className="card p-6 space-y-5 max-w-3xl">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos personales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="full_name" required placeholder="Nombres y apellidos del entrevistado" defaultValue={student.full_name} className="input" />
            <input name="cedula" placeholder="Cédula" defaultValue={student.document_id || ""} className="input" />
            <input name="course" placeholder="Curso" defaultValue={`${student.course} ${student.parallel || ""}`.trim()} className="input" />
            <input name="age" placeholder="Edad" className="input" />
            <div>
              <label className="label text-xs">Fecha de aplicación</label>
              <input type="date" name="application_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
            </div>
            <input name="representative_name" placeholder="Nombre del representante (si aplica)" className="input" />
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
          <textarea id="interview-summary" name="summary" rows={4} placeholder="Resumen de lo conversado..." className="textarea" />
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">2. Situación del estudiante</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Relación familiar</label>
              <select name="family_relation" className="select" defaultValue="">
                <option value="">Seleccionar...</option>
                <option>Buena</option>
                <option>Regular</option>
                <option>Mala</option>
                <option>Ausentes</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Antecedentes académicos</label>
              <select name="academic_history" className="select" defaultValue="">
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
                  <input type="checkbox" name="emotional_state" value={opt} className="rounded" /> {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <label className="label text-xs">Relaciones sociales</label>
            <div className="flex flex-wrap gap-3 text-sm">
              {SOCIAL_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-1">
                  <input type="checkbox" name="social_relations" value={opt} className="rounded" /> {opt}
                </label>
              ))}
              <label className="flex items-center gap-1">
                <input type="checkbox" name="bullying_history" value="1" className="rounded" /> Antecedentes de acoso escolar
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
          <textarea id="interview-recommendations" name="recommendations" rows={3} placeholder="Recomendaciones..." className="textarea" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-slate-500 uppercase">4. Compromiso</h3>
            <div className="flex items-center gap-2">
              <AppendAwarenessNoteButton targetId="interview-commitment" />
              <VoiceDictationButton targetId="interview-commitment" />
              <AIAssistButton targetId="interview-commitment" caseId={caseFile.id} fieldLabel="Compromisos asumidos en la entrevista" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mb-1.5">
            Incluye acuerdos específicos y la constancia de toma de conocimiento y corresponsabilidad del representante.
          </p>
          <textarea
            id="interview-commitment"
            name="commitment"
            rows={7}
            defaultValue={getDefaultInterviewCommitment(student.full_name)}
            placeholder="Compromisos asumidos..."
            className="textarea text-xs leading-relaxed"
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Guardar entrevista</button>
        </div>
      </form>
    </div>
  );
}

