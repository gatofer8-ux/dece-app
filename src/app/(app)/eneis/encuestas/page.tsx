import Link from "next/link";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { PageHeader, EmptyState, formatDate, Badge } from "@/components/ui";
import { listSurveySessions, countSurveyResponses } from "@/lib/eneis/eneisSurveySessions";
import { instrumentLabel } from "@/lib/eneis/eneisSurveyInstrument";

export default async function EneisEncuestasPage() {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);
  const canManage = canManageStudents(session.user.role);

  const sessions = listSurveySessions(institutionId);
  const counts = new Map(sessions.map((s) => [s.id, countSurveyResponses(s.id)]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="ENEIS — Encuestas de percepción"
        description="Encuestas anónimas a estudiantes, docentes y padres de familia sobre la implementación del ENEIS. Se responden por un enlace, sin cuenta, y los resultados se tabulan solos."
        action={
          canManage ? (
            <Link href="/eneis/encuestas/nueva" className="btn-primary flex items-center gap-1.5">
              <span>➕</span> Nueva encuesta
            </Link>
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon="📊"
          title="Todavía no hay encuestas creadas"
          description="Crea una encuesta (a estudiantes, docentes o padres de familia), comparte el enlace o el código, y mira los resultados tabulados en tiempo real."
          action={
            canManage ? (
              <Link href="/eneis/encuestas/nueva" className="btn-primary mt-2">+ Nueva encuesta</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Encuesta</th>
                  <th>Instrumento</th>
                  <th>Código</th>
                  <th>Estado</th>
                  <th>Respuestas</th>
                  <th>Creada</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="text-sm font-semibold text-slate-900">
                      <Link href={`/eneis/encuestas/${s.id}`} className="hover:underline text-brand-700">
                        {s.title}
                      </Link>
                    </td>
                    <td className="text-xs text-slate-600">{instrumentLabel(s.instrument)}</td>
                    <td>
                      <span className="font-mono text-sm font-bold tracking-wider">{s.access_code}</span>
                    </td>
                    <td>
                      {s.status === "ABIERTA" ? <Badge color="green">Abierta</Badge> : <Badge color="slate">Cerrada</Badge>}
                    </td>
                    <td className="text-xs text-slate-600">{counts.get(s.id) ?? 0}</td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(s.created_at)}</td>
                    <td className="text-right">
                      <Link
                        href={`/eneis/encuestas/${s.id}`}
                        className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200"
                      >
                        Ver resultados
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
