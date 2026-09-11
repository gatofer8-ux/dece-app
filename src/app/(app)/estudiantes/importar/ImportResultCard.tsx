import Link from "next/link";
import type { SkippedRow } from "./actions";

/** Resumen del resultado de una importación (Excel o IA/PDF): compartido por ambos flujos. */
export default function ImportResultCard({ result }: { result: { created: number; skipped: SkippedRow[] } }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Resultado de la importación</h2>
      <p className="text-sm mb-3">
        <span className="font-semibold text-green-700">{result.created}</span> estudiante(s) creado(s) correctamente.
        {result.skipped.length > 0 && (
          <>
            {" "}
            <span className="font-semibold text-amber-700">{result.skipped.length}</span> fila(s) omitida(s).
          </>
        )}
      </p>

      {result.skipped.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1 pr-3">Fila</th>
                <th className="py-1 pr-3">Nombre</th>
                <th className="py-1">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {result.skipped.map((s, i) => (
                <tr key={`${s.row}-${i}`} className="border-b border-slate-100">
                  <td className="py-1 pr-3 text-slate-400">{s.row}</td>
                  <td className="py-1 pr-3">{s.name}</td>
                  <td className="py-1 text-slate-600">{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.created > 0 && (
        <div className="mt-4">
          <Link href="/estudiantes" className="btn-secondary inline-block">
            Ver lista de estudiantes
          </Link>
        </div>
      )}
    </section>
  );
}
