import Link from "next/link";
import { db } from "@/lib/db";
import type { InstitutionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function SolicitarCitaIndexPage() {
  const institutions = db
    .prepare("SELECT * FROM institutions WHERE active = 1 ORDER BY name ASC")
    .all() as InstitutionRow[];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
            Agendamiento de Citas DECE
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
            Por favor, selecciona tu instituci\u00F3n educativa para agendar una cita con el Departamento de Consejer\u00EDa Estudiantil.
          </p>
        </div>

        {institutions.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-100">
            <p className="text-slate-500">No hay instituciones habilitadas en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {institutions.map((inst) => (
              <Link
                key={inst.id}
                href={`/solicitar-cita/${inst.id}`}
                className="group relative bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-500 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {inst.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Agendar cita &rarr;
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
