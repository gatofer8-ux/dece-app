"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getInstitutionImpact,
  getUserImpact,
  deleteInstitutionSecure,
  deleteUserSecure,
} from "./actions";

interface SecureDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "institution" | "user";
  targetId: string;
  targetName: string;
  onDeleted?: () => void;
}

export default function SecureDeleteModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  onDeleted,
}: SecureDeleteModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [impactData, setImpactData] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen || !targetId) return;

    setPassword("");
    setError(null);
    setLoadingImpact(true);

    if (targetType === "institution") {
      getInstitutionImpact(targetId)
        .then((data) => {
          setImpactData(data);
          setLoadingImpact(false);
        })
        .catch((err) => {
          setError(err.message || "No se pudo cargar el impacto.");
          setLoadingImpact(false);
        });
    } else {
      getUserImpact(targetId)
        .then((data) => {
          setImpactData(data);
          setLoadingImpact(false);
        })
        .catch((err) => {
          setError(err.message || "No se pudo cargar el impacto.");
          setLoadingImpact(false);
        });
    }
  }, [isOpen, targetId, targetType]);

  if (!isOpen) return null;

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Debes ingresar tu contraseña de superadministrador.");
      return;
    }

    startTransition(async () => {
      setError(null);
      let res;
      if (targetType === "institution") {
        res = await deleteInstitutionSecure({ institutionId: targetId, password });
      } else {
        res = await deleteUserSecure({ userId: targetId, password });
      }

      if (res.success) {
        onClose();
        if (onDeleted) onDeleted();
      } else {
        setError(res.error || "Error al eliminar el registro.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-red-200">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="h-10 w-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xl shrink-0">
            ⚠️
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Eliminar {targetType === "institution" ? "Institución" : "Usuario"}
            </h3>
            <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{targetName}</p>
          </div>
        </div>

        {loadingImpact ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Calculando impacto del borrado en cascada...
          </div>
        ) : (
          <div className="space-y-3">
            {targetType === "institution" ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-900">
                <div className="font-bold text-red-800 flex items-center gap-1.5">
                  <span>🚨</span> Impacto irreversible del borrado en cascada:
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div className="p-2 bg-white/80 rounded border border-red-100">
                    <span className="font-bold text-slate-900 text-sm block">
                      {impactData?.studentsCount ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500">Estudiantes</span>
                  </div>
                  <div className="p-2 bg-white/80 rounded border border-red-100">
                    <span className="font-bold text-slate-900 text-sm block">
                      {impactData?.casesCount ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Casos ({impactData?.openCasesCount ?? 0} activos)
                    </span>
                  </div>
                  <div className="p-2 bg-white/80 rounded border border-red-100">
                    <span className="font-bold text-slate-900 text-sm block">
                      {impactData?.usersCount ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500">Usuarios del personal</span>
                  </div>
                  <div className="p-2 bg-white/80 rounded border border-red-100">
                    <span className="font-bold text-slate-900 text-sm block">
                      {impactData?.alertsCount ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500">Alertas docentes</span>
                  </div>
                </div>
                <p className="text-[11px] text-red-700 leading-tight">
                  Toda la información académica, expedientes clínicos DECE, intervenciones, citas y cuentas asociadas a esta institución se eliminarán permanentemente.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                <div className="font-bold text-amber-800 flex items-center gap-1.5">
                  <span>ℹ️</span> Impacto del borrado de usuario:
                </div>
                <div className="space-y-1 text-slate-700">
                  <div><strong>Rol:</strong> {impactData?.userRole}</div>
                  <div><strong>Institución:</strong> {impactData?.institutionName}</div>
                  <div><strong>Casos abiertos:</strong> {impactData?.casesOpened ?? 0}</div>
                  <div><strong>Casos asignados:</strong> {impactData?.casesAssigned ?? 0}</div>
                </div>
                <p className="text-[11px] text-amber-800 leading-tight">
                  El usuario será eliminado. Los expedientes abiertos serán reasignados al superadministrador para no perder información de los estudiantes.
                </p>
              </div>
            )}

            {error && (
              <div className="p-2.5 bg-red-100 border border-red-300 rounded-lg text-xs text-red-800 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleDelete} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Confirma tu contraseña de Superadministrador *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  required
                  autoFocus
                  className="input text-xs w-full border-red-300 focus:border-red-500 focus:ring-red-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !password}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {isPending ? "Eliminando..." : "Eliminar Definitivamente"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
