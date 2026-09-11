import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import {
  ENEIS_NIVELES_PREPARACION,
  ENEIS_TEMAS_EIS,
  ENEIS_RECURSOS_INSTITUCIONALES,
  parseFuncionarios,
  parseTemasSeleccionados,
  parseRecursosSeleccionados,
  parseCronograma,
  parseAvances,
  buildFirmas,
  ENEIS_FIRMAS_ESCOLARES_ROLES,
  ENEIS_FIRMAS_DISTRITALES_ROLES,
} from "@/lib/eneis/eneisFichaTecnica";
import type { EneisFichaTecnicaRow, InstitutionRow } from "@/lib/types";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

export default async function ImprimirEneisFichaTecnicaPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const f = db
    .prepare("SELECT * FROM eneis_fichas_tecnicas WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisFichaTecnicaRow | undefined;
  if (!f) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const funcionarios = parseFuncionarios(f.funcionarios_json);
  const temas = new Set(parseTemasSeleccionados(f.temas_seleccionados_json));
  const recursos = new Set(parseRecursosSeleccionados(f.recursos_seleccionados_json));
  const cronograma = parseCronograma(f.cronograma_json);
  const avances = parseAvances(f.avances_json);
  const firmasEscolares = buildFirmas(f.firmas_escolares_json, ENEIS_FIRMAS_ESCOLARES_ROLES);
  const firmasDistritales = buildFirmas(f.firmas_distritales_json, ENEIS_FIRMAS_DISTRITALES_ROLES);

  const cell = "border border-slate-800 px-2 py-1 align-top text-[9pt]";
  const title = `${cell} font-bold text-center`;

  return (
    <div className="max-w-4xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href="/eneis/ficha-tecnica" className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <Link href={`/eneis/ficha-tecnica/${params.id}/editar`} className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold">✏️ Editar</Link>
          <a href={`/api/eneis/ficha-tecnica/${params.id}/export-word`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">📥 Descargar Word</a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 text-black text-sm">
        <style>{`@media print { @page { size: A4; margin: 1.4cm; } }`}</style>

        <p className="text-center font-bold text-base">FICHA TÉCNICA DEL EQUIPO ESCOLAR</p>
        <p className="text-center font-semibold text-xs mb-3">Implementación de Educación Integral en Sexualidad en Instituciones Educativas</p>

        <p><strong>Coordinación zonal / Distrito:</strong> {f.coordinacion_zonal_distrito || "—"}</p>
        <p><strong>Nombre de la institución educativa:</strong> {institution.name}</p>
        <p className="mb-3"><strong>Fecha de elaboración:</strong> {fmt(f.fecha_elaboracion)}</p>

        <p className="font-bold mt-3 mb-1">Funcionarios que conforman el equipo escolar EIS</p>
        <table className="w-full border-collapse mb-3">
          <tbody>
            <tr><td className={title}>Nombre</td><td className={title}>Cargo</td></tr>
            {(funcionarios.length ? funcionarios : [{ nombre: "", cargo: "" }]).map((fu, i) => (
              <tr key={i}><td className={cell}>{fu.nombre || " "}</td><td className={cell}>{fu.cargo || " "}</td></tr>
            ))}
          </tbody>
        </table>

        <p className="font-bold mt-3 mb-1">Determinación del nivel de preparación de la comunidad educativa</p>
        <table className="w-full border-collapse mb-3">
          <tbody>
            <tr><td className={title}>Nivel de preparación</td><td className={title}>(X)</td><td className={title}>Objetivos</td></tr>
            {ENEIS_NIVELES_PREPARACION.map((n, i) => (
              <tr key={i}>
                <td className={cell}>{n.etapa}</td>
                <td className={`${cell} text-center font-bold`}>{f.nivel_preparacion_index === i ? "X" : ""}</td>
                <td className={cell}>{n.objetivo || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-bold mt-3 mb-1">Priorización de temas de trabajo</p>
        <table className="w-full border-collapse mb-3">
          <tbody>
            <tr><td className={title}>Conceptos clave</td><td className={title}>Temas</td><td className={title}>(X)</td></tr>
            {ENEIS_TEMAS_EIS.map((t) => (
              <tr key={t.id}>
                <td className={cell}>{t.concepto}</td>
                <td className={cell}>{t.id} {t.tema}</td>
                <td className={`${cell} text-center font-bold`}>{temas.has(t.id) ? "X" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-bold mt-3 mb-1">Selección de recursos institucionales</p>
        <table className="w-full border-collapse mb-3">
          <tbody>
            <tr><td className={title}>Nombre</td><td className={title}>Población objetiva / Espacio de implementación</td><td className={title}>(X)</td></tr>
            {ENEIS_RECURSOS_INSTITUCIONALES.map((rc, i) => (
              <tr key={i}>
                <td className={cell}>{rc.nombre}</td>
                <td className={cell}>{rc.poblacion}</td>
                <td className={`${cell} text-center font-bold`}>{recursos.has(i) ? "X" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-bold mt-3 mb-1">Planificación de actividades (cronograma)</p>
        <table className="w-full border-collapse mb-3">
          <tbody>
            <tr><td className={title}>Actividad / Herramienta</td><td className={title}>Población objetivo</td><td className={title}>Fechas</td><td className={title}>Responsable</td></tr>
            {(cronograma.length ? cronograma : [{ actividad: "", poblacion: "", fecha: "", responsable: "" }]).map((c, i) => (
              <tr key={i}>
                <td className={cell}>{c.actividad || " "}</td>
                <td className={cell}>{c.poblacion || " "}</td>
                <td className={cell}>{fmt(c.fecha)}</td>
                <td className={cell}>{c.responsable || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-bold mt-3 mb-1">Reporte de avances y resultados</p>
        <table className="w-full border-collapse mb-3">
          <tbody>
            <tr><td className={title}>Actividad / Herramienta</td><td className={title}>Estado</td><td className={title}>Población alcanzada</td></tr>
            {(avances.length ? avances : [{ actividad: "", estado: "", poblacion: "" }]).map((a, i) => (
              <tr key={i}>
                <td className={cell}>{a.actividad || " "}</td>
                <td className={cell}>{a.estado || " "}</td>
                <td className={cell}>{a.poblacion || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-bold mt-3 mb-1">Nudos críticos:</p>
        <p className="mb-3">{f.nudos_criticos || "—"}</p>

        <p className="font-bold mt-3 mb-2">Firmas de responsabilidad — Equipo Escolar de Educación Integral en Sexualidad</p>
        <table className="w-full border-collapse mb-3">
          <tbody>
            {firmasEscolares.map((fi, i) => (
              <tr key={i}>
                <td className={cell}>Firma: _______________________<br />Nombre: {fi.nombre || " "}</td>
                <td className={cell}>Cargo: {fi.role}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-bold mt-3 mb-2">Firmas de responsabilidad — Equipo Distrital de Educación Integral en Sexualidad</p>
        <table className="w-full border-collapse mb-3">
          <tbody>
            {firmasDistritales.map((fi, i) => (
              <tr key={i}>
                <td className={cell}>Firma: _______________________<br />Nombre: {fi.nombre || " "}</td>
                <td className={cell}>Cargo: {fi.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
