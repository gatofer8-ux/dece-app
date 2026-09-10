import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { createOvpSession } from "../actions";

export default async function NuevaOvpSessionPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const courses = (
    db
      .prepare("SELECT DISTINCT course FROM students WHERE institution_id = ? AND active = 1 AND course <> '' ORDER BY course")
      .all(institutionId) as { course: string }[]
  ).map((r) => r.course);
  const parallels = (
    db
      .prepare("SELECT DISTINCT parallel FROM students WHERE institution_id = ? AND active = 1 AND parallel IS NOT NULL AND parallel <> '' ORDER BY parallel")
      .all(institutionId) as { parallel: string }[]
  ).map((r) => r.parallel);

  return (
    <div>
      <PageHeader
        title="Nueva aplicación del IPPJ"
        description="Se genera un código y un enlace para que los estudiantes del curso respondan el inventario."
      />
      <form action={createOvpSession} className="card p-6 space-y-5 max-w-2xl">
        <div>
          <label className="label text-xs">Título / referencia</label>
          <input name="title" defaultValue="Aplicación IPPJ" className="input text-sm" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Curso</label>
            <input name="course" list="ovp-courses" className="input text-sm" placeholder="Ej. 2º BGU" />
            <datalist id="ovp-courses">
              {courses.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label text-xs">Paralelo</label>
            <input name="parallel" list="ovp-parallels" className="input text-sm" placeholder="Ej. A" />
            <datalist id="ovp-parallels">
              {parallels.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label text-xs">Jornada</label>
            <select name="jornada" defaultValue="" className="select text-sm">
              <option value="">—</option>
              <option value="Matutina">Matutina</option>
              <option value="Vespertina">Vespertina</option>
              <option value="Nocturna">Nocturna</option>
            </select>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Si dejas curso y paralelo en blanco, el estudiante escribirá sus datos al empezar. Si los defines, podrá elegir su nombre de la lista del curso.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Disponible desde (opcional)</label>
            <input type="date" name="opens_at" className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">Disponible hasta (opcional)</label>
            <input type="date" name="closes_at" className="input text-sm" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Crear y obtener enlace</button>
        </div>
      </form>
    </div>
  );
}
