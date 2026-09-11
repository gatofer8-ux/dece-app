import Link from "next/link";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import type { StudentRow, InstitutionRow } from "@/lib/types";
import { formatDocumentId } from "@/lib/documentId";

export const dynamic = "force-dynamic";

export default async function EstudiantesCarnetsPage({
  searchParams,
}: {
  searchParams: { curso?: string; jornada?: string; id?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  let query = "SELECT * FROM students WHERE institution_id = ? AND active = 1";
  const params: any[] = [institutionId];

  if (searchParams.id) {
    query += " AND id = ?";
    params.push(searchParams.id);
  } else {
    if (searchParams.curso) {
      query += " AND course = ?";
      params.push(searchParams.curso);
    }
    if (searchParams.jornada) {
      query += " AND jornada = ?";
      params.push(searchParams.jornada);
    }
    query += " ORDER BY course ASC, parallel ASC, full_name ASC LIMIT 100";
  }

  const students = db.prepare(query).all(...params) as StudentRow[];

  // Lista de cursos disponibles para filtro
  const courses = db
    .prepare("SELECT DISTINCT course FROM students WHERE institution_id = ? AND course IS NOT NULL AND active = 1 ORDER BY course ASC")
    .all(institutionId) as { course: string }[];

  // Generar QR para cada estudiante
  const studentsWithQr = await Promise.all(
    students.map(async (st) => {
      const payload = JSON.stringify({
        id: st.id,
        cedula: st.document_id || "",
        nombre: st.full_name,
        curso: `${st.course || ""} ${st.parallel || ""}`.trim(),
      });
      const qrDataUrl = await QRCode.toDataURL(payload, {
        margin: 1,
        width: 130,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      return { ...st, qrDataUrl };
    })
  );

  return (
    <div className="space-y-6">
      {/* Controles de Filtro e Impresión (Ocultos en impresión) */}
      <div className="no-print space-y-4">
        <PageHeader
          title="Generador de Carnets Estudiantiles con QR"
          description="Emisión de credenciales oficiales del DECE con código QR para escaneo rápido de asistencias, citas y expedientes."
          action={
            <div className="flex items-center gap-2">
              <Link href="/estudiantes" className="btn-secondary text-xs">
                ← Volver a Estudiantes
              </Link>
              <button
                onClick={() => {}}
                className="btn-primary text-xs flex items-center gap-1.5 shadow-sm bg-brand-700 hover:bg-brand-800"
                // @ts-ignore
                onclick="window.print()"
              >
                <span>🖨️</span> Imprimir Credenciales
              </button>
            </div>
          }
        />

        {/* Barra de Filtros */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3 bg-white/90">
          <form className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 mr-2">Curso:</label>
              <select
                name="curso"
                defaultValue={searchParams.curso || ""}
                className="select text-xs py-1.5"
              >
                <option value="">Todos los cursos</option>
                {courses.map((c) => (
                  <option key={c.course} value={c.course}>
                    {c.course}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 mr-2">Jornada:</label>
              <select
                name="jornada"
                defaultValue={searchParams.jornada || ""}
                className="select text-xs py-1.5"
              >
                <option value="">Todas</option>
                <option value="MATUTINA">Matutina</option>
                <option value="VESPERTINA">Vespertina</option>
                <option value="NOCTURNA">Nocturna</option>
              </select>
            </div>

            <button type="submit" className="btn-primary text-xs py-1.5 px-3">
              Filtrar
            </button>
            {(searchParams.curso || searchParams.jornada || searchParams.id) && (
              <Link href="/estudiantes/carnets" className="btn-secondary text-xs py-1.5 px-3">
                Limpiar
              </Link>
            )}
          </form>

          <div className="text-xs text-slate-500 font-medium">
            Mostrando <strong>{students.length}</strong> credencial(es) lista(s) para imprimir
          </div>
        </div>
      </div>

      {/* Grid de Carnets */}
      {students.length === 0 ? (
        <div className="card p-12 text-center bg-white">
          <div className="text-4xl mb-2">🪪</div>
          <h3 className="font-semibold text-slate-800">No se encontraron estudiantes para los filtros seleccionados</h3>
          <p className="text-xs text-slate-500 mt-1">Selecciona otro curso o borra los filtros para generar carnets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:m-0">
          {studentsWithQr.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border-2 border-slate-300 shadow-sm overflow-hidden flex flex-col justify-between print:border-dashed print:border-slate-400 print:shadow-none print:break-inside-avoid print:h-[220px]"
              style={{ minHeight: "235px", maxWidth: "380px" }}
            >
              {/* Encabezado Institucional */}
              <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  {institution?.seal_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={institution.seal_image}
                      alt="Sello"
                      className="h-7 w-7 rounded object-contain bg-white/10 p-0.5 shrink-0"
                    />
                  ) : (
                    <span className="text-base shrink-0">🏛️</span>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-[11px] leading-tight truncate uppercase tracking-wider text-slate-100">
                      {institution?.name || "Unidad Educativa"}
                    </div>
                    <div className="text-[9px] text-brand-300 font-semibold tracking-widest uppercase">
                      CONSEJERÍA ESTUDIANTIL · DECE
                    </div>
                  </div>
                </div>
                <div className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/15 text-slate-200 uppercase shrink-0">
                  {s.jornada || "MAT."}
                </div>
              </div>

              {/* Cuerpo del Carnet */}
              <div className="p-3.5 flex items-center justify-between gap-3 bg-white flex-1">
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Estudiante
                  </div>
                  <div className="font-bold text-sm text-slate-900 leading-tight uppercase line-clamp-2">
                    {s.full_name}
                  </div>

                  <div className="pt-1 space-y-0.5 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 font-medium">Cédula: </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatDocumentId(s.document_id, s.document_type) || "S/N"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Curso: </span>
                      <span className="font-semibold text-slate-800">
                        {s.course || "No asignado"} {s.parallel ? `"${s.parallel}"` : ""}
                      </span>
                    </div>

                    {s.representative && (
                      <div className="text-[11px] text-slate-500 truncate">
                        <span className="text-slate-400">Rep: </span>
                        {s.representative} {s.rep_phone && `(${s.rep_phone})`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Código QR */}
                <div className="flex flex-col items-center justify-center shrink-0 p-1 bg-slate-50 rounded-lg border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.qrDataUrl}
                    alt={`QR de ${s.full_name}`}
                    className="h-20 w-20 object-contain rounded"
                  />
                  <span className="text-[8px] font-mono text-slate-400 mt-0.5">ESCANEAR DECE</span>
                </div>
              </div>

              {/* Pie del Carnet */}
              <div className="bg-slate-100 px-3.5 py-1 text-[9px] text-slate-500 font-medium flex items-center justify-between border-t border-slate-200">
                <span>Ministerio de Educación del Ecuador</span>
                <span>Válido {new Date().getFullYear()}-{new Date().getFullYear() + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
