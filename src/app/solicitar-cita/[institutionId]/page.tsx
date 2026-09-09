import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { InstitutionRow, UserRow } from "@/lib/types";
import { STANDARD_ECUADOR_COURSES } from "@/lib/coverage";
import PublicBookingClient from "./PublicBookingClient";

export const dynamic = "force-dynamic";

export default async function SolicitarCitaPage({
  params,
  searchParams,
}: {
  params: { institutionId: string };
  searchParams: { enviado?: string };
}) {
  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ? AND active = 1")
    .get(params.institutionId) as InstitutionRow | undefined;
  if (!institution) notFound();

  const sent = searchParams.enviado === "1";

  const professionals = db
    .prepare("SELECT * FROM users WHERE institution_id = ? AND role IN ('DECE','ADMIN') AND active = 1 ORDER BY name ASC")
    .all(institution.id) as (UserRow & { coverage_courses?: string | null; job_title?: string | null })[];

  // Obtener cursos existentes en la institución para el autocompletado
  const dbCourses = db
    .prepare("SELECT DISTINCT course FROM students WHERE institution_id = ? AND active = 1 AND course IS NOT NULL")
    .all(institution.id) as { course: string }[];

  const combinedCourses = Array.from(
    new Set([...dbCourses.map((c) => c.course), ...STANDARD_ECUADOR_COURSES])
  ).filter(Boolean);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const initialDate = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          {institution.seal_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={institution.seal_image}
              alt={institution.name}
              className="h-16 w-16 object-contain mx-auto mb-3 bg-white rounded-xl p-1 shadow-md"
            />
          ) : (
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white text-2xl font-bold mb-4">
              DECE
            </div>
          )}
          <h1 className="text-xl font-extrabold text-white">{institution.name}</h1>
          <p className="text-brand-100 mt-1 text-sm font-medium">
            Agendamiento de Citas con el Departamento de Consejería Estudiantil (DECE)
          </p>
        </div>

        <div className="card p-6 shadow-xl">
          {sent ? (
            <div className="text-center py-8 space-y-3">
              <div className="text-4xl">✅</div>
              <h2 className="text-lg font-bold text-slate-800">¡Solicitud de Cita Enviada!</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                El equipo DECE de la institución ha recibido tu solicitud. Te contactaremos al correo electrónico ingresado para la confirmación de la cita.
              </p>
              <div className="pt-4">
                <a
                  href={`/solicitar-cita/${institution.id}`}
                  className="btn-secondary text-xs inline-block"
                >
                  Solicitar otra cita
                </a>
              </div>
            </div>
          ) : professionals.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Esta institución educativa no tiene actualmente profesionales DECE asignados para agendamiento en línea.
            </div>
          ) : (
            <PublicBookingClient
              institution={institution}
              professionals={professionals}
              courses={combinedCourses}
              initialDate={initialDate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
