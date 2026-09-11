"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToastOnChange } from "@/components/Toast";
import {
  importCaseMatrixAction,
  deleteImportedCasesAction,
  type CaseImportActionState,
} from "./actions";

const initialState: CaseImportActionState = { error: null, result: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary disabled:opacity-60 flex items-center gap-2"
    >
      {pending ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Procesando matriz e importando casos...</span>
        </>
      ) : (
        <>
          <span>📥</span>
          <span>Subir matriz y abrir casos</span>
        </>
      )}
    </button>
  );
}

export default function ImportCasesForm() {
  const [state, formAction] = useFormState(importCaseMatrixAction, initialState);
  useToastOnChange(state.error, "error");
  const formRef = useRef<HTMLFormElement>(null);

  const [isDeleting, startDeleteTransition] = useTransition();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  const handleDeleteImported = () => {
    startDeleteTransition(async () => {
      const res = await deleteImportedCasesAction();
      setShowDeleteModal(false);
      if (res.error) {
        setDeleteFeedback(`⚠️ ${res.error}`);
      } else {
        setDeleteFeedback(
          `✓ Se eliminaron exitosamente ${res.deletedCount} casos importados y se limpiaron los registros erróneos.`
        );
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Paso 1: Descarga de plantilla */}
      <section className="card p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs">
                1
              </span>
              Descarga la Plantilla Oficial de la Matriz
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Utiliza esta plantilla basada en el Modelo de Gestión DECE de Ecuador. Incluye las columnas correctas,
              filas de ejemplo y la hoja de catálogo con las 11 tipologías oficiales de riesgo.
            </p>
          </div>
          <a
            href="/api/casos/plantilla"
            className="btn-secondary whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
          >
            <span>⬇</span>
            <span>Descargar plantilla (.xlsx)</span>
          </a>
        </div>
      </section>

      {/* Paso 2: Configuración y carga del archivo */}
      <section className="card p-6 border border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white text-xs">
            2
          </span>
          Configuración y Carga de la Matriz
        </h2>
        <p className="text-xs text-slate-600 mb-5 leading-relaxed">
          El sistema cuenta con un <strong>motor inteligente de detección</strong>: localiza automáticamente la fila
          de encabezados ignorando títulos institucionales o celdas combinadas, reconoce acrónimos oficiales (ej.{" "}
          <em>AS, VS</em> para Violencia Sexual, <em>PPL</em> para Vulneración de Derechos, <em>Cutting</em> para Salud
          Mental), filtra separadores de sección y conserva la información en la ficha del estudiante.
        </p>

        <form
          ref={formRef}
          action={async (fd: FormData) => {
            await formAction(fd);
          }}
          className="space-y-5"
        >
          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div className="font-medium">{state.error}</div>
            </div>
          )}

          {/* Opciones de apertura de casos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado inicial de los casos:
              </label>
              <select
                name="default_status"
                defaultValue="EN_SEGUIMIENTO"
                className="w-full select select-sm border border-slate-300 bg-white"
              >
                <option value="EN_SEGUIMIENTO">En seguimiento (Casos de años anteriores)</option>
                <option value="ABIERTO">Abierto (Nuevos expedientes activos)</option>
              </select>
              <span className="text-[11px] text-slate-500 block mt-1">
                Recomendado: &quot;En seguimiento&quot; para continuidad.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Prioridad predeterminada:
              </label>
              <select
                name="default_priority"
                defaultValue="MEDIA"
                className="w-full select select-sm border border-slate-300 bg-white"
              >
                <option value="MEDIA">Media (Estándar)</option>
                <option value="ALTA">Alta (Atención preferente)</option>
                <option value="BAJA">Baja</option>
              </select>
              <span className="text-[11px] text-slate-500 block mt-1">
                Violencia sexual y salud mental se asignan como ALTA automáticamente.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Eje de acción asignado:
              </label>
              <select
                name="default_axis"
                defaultValue="SEGUIMIENTO"
                className="w-full select select-sm border border-slate-300 bg-white"
              >
                <option value="SEGUIMIENTO">Seguimiento</option>
                <option value="ATENCION">Atención</option>
                <option value="PREVENCION">Prevención</option>
              </select>
              <span className="text-[11px] text-slate-500 block mt-1">
                Eje normativo del Modelo DECE.
              </span>
            </div>
          </div>

          {/* Campo de archivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Selecciona tu archivo Excel (.xlsx):
            </label>
            <input
              type="file"
              name="file"
              required
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="file-input file-input-bordered file-input-sm w-full max-w-lg text-xs"
            />
            <span className="text-[11px] text-slate-500 block mt-1">
              Admite libros de Excel institucionales (.xlsx) de hasta 15 MB.
            </span>
          </div>

          <div>
            <SubmitButton />
          </div>
        </form>
      </section>

      {/* Paso 3: Informe de resultados */}
      {state.result && (
        <section className="card p-6 border border-emerald-200 bg-white space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs">
                ✓
              </span>
              Resumen de la Importación Masiva ({state.result.sheetName})
            </h2>
            <Link href="/casos" className="btn-secondary btn-sm text-xs">
              Ver lista de casos ➔
            </Link>
          </div>

          {/* Tarjetas estadísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
              <span className="text-xl font-bold text-emerald-700 block">{state.result.createdCases}</span>
              <span className="text-[11px] text-emerald-800 font-medium">Casos aperturados con éxito</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950">
              <span className="text-xl font-bold text-blue-700 block">{state.result.createdStudents}</span>
              <span className="text-[11px] text-blue-800 font-medium">Estudiantes nuevos creados</span>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-950">
              <span className="text-xl font-bold text-purple-700 block">{state.result.linkedStudents}</span>
              <span className="text-[11px] text-purple-800 font-medium">Estudiantes existentes vinculados</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950">
              <span className="text-xl font-bold text-amber-700 block">{state.result.skipped.length}</span>
              <span className="text-[11px] text-amber-800 font-medium">Filas omitidas / avisos</span>
            </div>
          </div>

          {/* Tabla de casos creados */}
          {state.result.rows.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Casos aperturados en el sistema ({state.result.rows.length}):
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Estudiante</th>
                      <th className="py-2.5 px-3">Curso / Par.</th>
                      <th className="py-2.5 px-3">Tipología asignada</th>
                      <th className="py-2.5 px-3">Ficha de estudiante</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.result.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-violet-700">
                          {row.caseCode}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          {row.studentName}
                          {row.documentId && (
                            <span className="text-[11px] text-slate-400 block font-mono">
                              CI: {row.documentId}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {row.course} {row.parallel ? `"${row.parallel}"` : ""}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {row.riskTypeLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {row.isNewStudent ? (
                            <span className="text-emerald-700 font-medium">✨ Creado</span>
                          ) : (
                            <span className="text-purple-700 font-medium">🔗 Vinculado</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {row.caseId && (
                            <Link
                              href={`/casos/${row.caseId}`}
                              target="_blank"
                              className="text-violet-600 hover:text-violet-800 font-medium text-[11px] underline"
                            >
                              Ver expediente ↗
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de omitidos */}
          {state.result.skipped.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Filas omitidas ({state.result.skipped.length}):
              </h3>
              <div className="overflow-x-auto border border-amber-200 rounded-xl bg-amber-50/30 max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-100/60 text-amber-900 border-b border-amber-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Fila</th>
                      <th className="py-2.5 px-3">Identificación</th>
                      <th className="py-2.5 px-3">Motivo de omisión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {state.result.skipped.map((s, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 font-mono text-slate-500">{s.row}</td>
                        <td className="py-1.5 px-3 font-medium text-slate-800">{s.name}</td>
                        <td className="py-1.5 px-3 text-amber-900">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Herramienta de Limpieza y Reversión */}
      <section className="card p-6 border border-slate-200 bg-slate-50/60 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🧹</span>
              <span>Herramienta de Reversión y Limpieza</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              ¿Deseas corregir o eliminar los casos aperturados desde la matriz? Esta opción elimina exclusivamente
              los expedientes y estudiantes huérfanos creados mediante importación de matrices, protegiendo todos
              los casos creados manualmente por el equipo DECE.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
            className="btn-danger text-xs flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto shadow-xs"
          >
            <span>🗑️</span>
            <span>Eliminar casos importados</span>
          </button>
        </div>

        {deleteFeedback && (
          <div className="mt-4 p-3 rounded-xl text-xs bg-white border border-slate-200 shadow-xs font-medium text-slate-800">
            {deleteFeedback}
          </div>
        )}
      </section>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 text-lg">
                ⚠️
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ¿Confirmar eliminación de casos importados?
                </h3>
                <p className="text-xs text-slate-500">
                  Esta acción eliminará todos los casos aperturados desde matrices de importación.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Se revertirán las aperturas de caso y se eliminarán los estudiantes nuevos creados que no tengan otras
              atenciones ni citas en el sistema.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteImported}
                disabled={isDeleting}
                className="btn-danger text-xs flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Sí, eliminar casos importados</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
