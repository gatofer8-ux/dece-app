import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOvpSessionByCode, isSessionOpen } from "@/lib/ovp/ovpSessions";
import type { OvpApplicationRow } from "@/lib/types";
import RQuestionnaire from "./RQuestionnaire";

export const metadata = { title: "IPPJ — Cuestionario" };

export default function RQuestionnairePage({ params }: { params: { code: string; appId: string } }) {
  const s = getOvpSessionByCode(params.code);
  if (!s) notFound();

  const app = db
    .prepare("SELECT * FROM ovp_applications WHERE id = ? AND session_id = ?")
    .get(params.appId, s.id) as OvpApplicationRow | undefined;
  if (!app) notFound();

  if (app.status === "FINALIZADA") {
    redirect(`/r/${params.code}/${params.appId}/gracias`);
  }
  if (!isSessionOpen(s)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-600 text-sm">Esta evaluación está cerrada. Consulta con el DECE.</p>
      </div>
    );
  }

  let survey: Record<string, string | string[]> = {};
  let answers: Record<string, number> = {};
  try {
    survey = JSON.parse(app.survey_json || "{}");
  } catch {
    survey = {};
  }
  try {
    answers = JSON.parse(app.answers_json || "{}");
  } catch {
    answers = {};
  }

  return (
    <RQuestionnaire
      code={params.code}
      appId={params.appId}
      studentName={app.student_name}
      initialSurvey={survey}
      initialAnswers={answers}
    />
  );
}
