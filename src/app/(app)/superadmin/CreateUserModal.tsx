"use client";

import { useState, useTransition } from "react";
import { createUserAction } from "./actions";
import { type Role } from "@/lib/types";

interface SubscriptionPackageOption {
  id: string;
  name: string;
  price: number;
  duration_months: number;
}

export default function CreateUserModal({
  institutions,
  packages = [],
}: {
  institutions: { id: string; name: string; active?: number }[];
  packages?: SubscriptionPackageOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<Role>("DECE");
  const [subscriptionType, setSubscriptionType] = useState<"prueba" | "paquete" | "ninguna">("prueba");
  
  const activeInstitutions = institutions.filter((i) => i.active !== 0);
  const inactiveInstitutions = institutions.filter((i) => i.active === 0);
  
  // Modificación manual de tiempo y precio para demo/prueba
  const [trialDays, setTrialDays] = useState<number>(30);
  const [trialPrice, setTrialPrice] = useState<number>(0);

  // Modificación manual para paquete comercial
  const [selectedPackageId, setSelectedPackageId] = useState<string>(packages[0]?.id || "pkg-anual");
  const [customPrice, setCustomPrice] = useState<number>(packages[0]?.price || 200);
  const [customMonths, setCustomMonths] = useState<number>(packages[0]?.duration_months || 12);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isInstitutional = ["ADMIN", "DECE", "AUTORIDAD", "DOCENTE"].includes(role);
  const isSuperadmin = role === "SUPERADMIN";

  const handlePackageChange = (id: string) => {
    setSelectedPackageId(id);
    const p = packages.find((pkg) => pkg.id === id);
    if (p) {
      setCustomPrice(p.price);
      setCustomMonths(p.duration_months);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("subscription_type", subscriptionType);
    formData.set("trial_days", String(trialDays));
    formData.set("trial_price", String(trialPrice));
    formData.set("package_id", selectedPackageId);
    formData.set("custom_price", String(customPrice));
    formData.set("custom_months", String(customMonths));

    setError(null);

    startTransition(async () => {
      const res = await createUserAction(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setError(null);
        }}
        className="btn-primary text-xs flex items-center gap-1.5"
      >
        <span>👤</span> + Nuevo Usuario
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>👤</span> Registrar Nuevo Usuario
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crea la cuenta del profesional y configura su ciclo de suscripción individual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  name="name"
                  required
                  placeholder="Ej. Lcda. María Gómez"
                  className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="maria.gomez@educacion.gob.ec"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol en el sistema *
                  </label>
                  <select
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                  >
                    <option value="DECE">DECE (Profesional)</option>
                    <option value="ADMIN">ADMIN (Coordinador Institucional)</option>
                    <option value="AUTORIDAD">AUTORIDAD (Rector/Director)</option>
                    <option value="DOCENTE">DOCENTE (Docente tutor)</option>
                    <option value="DISTRITO">DISTRITO (Técnico Distrital)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Superadministrador)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    name="phone"
                    placeholder="0991234567"
                    className="input text-xs w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado Inicial *
                  </label>
                  <select
                    name="active"
                    defaultValue="1"
                    className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                  >
                    <option value="1">🟢 Activo</option>
                    <option value="0">⏸️ Suspendido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institución asignada {isInstitutional && "*"}
                </label>
                <select
                  name="institution_id"
                  required={isInstitutional}
                  className="input text-xs w-full bg-white text-slate-900 border border-slate-300"
                >
                  <option value="">
                    {isInstitutional ? "-- Selecciona una institución --" : "(Ninguna - Nivel Central / Distrito)"}
                  </option>
                  {activeInstitutions.length > 0 && (
                    <optgroup label="🟢 Instituciones Activas / Operativas">
                      {activeInstitutions.map((i) => (
                        <option key={i.id} value={i.id}>
                          🟢 {i.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {inactiveInstitutions.length > 0 && (
                    <optgroup label="⏸️ Instituciones Suspendidas / Inactivas">
                      {inactiveInstitutions.map((i) => (
                        <option key={i.id} value={i.id}>
                          ⏸️ {i.name} (Suspendida)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {!isInstitutional && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Los roles DISTRITO y SUPERADMIN operan a nivel global sin estar atados a una institución única.
                  </p>
                )}
              </div>

              {/* SECCIÓN CRÍTICA: SUSCRIPCIÓN INDIVIDUAL CON PRECIO Y TIEMPO MANUALES */}
              {!isSuperadmin ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>💳</span> Suscripción Inicial Individual
                    </label>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded border border-indigo-100">
                      Tiempo & Precio Personalizables
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label
                      className={`flex flex-col p-2.5 rounded-lg border text-center cursor-pointer transition text-xs ${
                        subscriptionType === "prueba"
                          ? "bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sub_option"
                        checked={subscriptionType === "prueba"}
                        onChange={() => setSubscriptionType("prueba")}
                        className="sr-only"
                      />
                      <span>🎁 Demo / Prueba</span>
                      <span className="text-[10px] font-normal text-slate-500 mt-0.5">Días & Precio libre</span>
                    </label>

                    <label
                      className={`flex flex-col p-2.5 rounded-lg border text-center cursor-pointer transition text-xs ${
                        subscriptionType === "paquete"
                          ? "bg-indigo-50 border-indigo-400 text-indigo-900 font-bold shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sub_option"
                        checked={subscriptionType === "paquete"}
                        onChange={() => setSubscriptionType("paquete")}
                        className="sr-only"
                      />
                      <span>📦 Plan Comercial</span>
                      <span className="text-[10px] font-normal text-slate-500 mt-0.5">Tarifa congelada</span>
                    </label>

                    <label
                      className={`flex flex-col p-2.5 rounded-lg border text-center cursor-pointer transition text-xs ${
                        subscriptionType === "ninguna"
                          ? "bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sub_option"
                        checked={subscriptionType === "ninguna"}
                        onChange={() => setSubscriptionType("ninguna")}
                        className="sr-only"
                      />
                      <span>⏸️ Sin Plan</span>
                      <span className="text-[10px] font-normal text-slate-500 mt-0.5">Solo lectura</span>
                    </label>
                  </div>

                  {/* CONFIGURACIÓN MANUAL DEL TIEMPO Y PRECIO DE LA DEMO / PRUEBA */}
                  {subscriptionType === "prueba" && (
                    <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-950 font-bold flex items-center gap-1">
                          <span>⚙️</span> Parámetros Manuales de la Demo / Prueba
                        </span>
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold">
                          Editable
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* 1. TIEMPO DE LA DEMO (MANUAL) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Tiempo de Demo (Días) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={trialDays}
                            onChange={(e) => setTrialDays(Math.max(1, Number(e.target.value) || 1))}
                            className="input text-xs w-full font-mono font-bold bg-white text-slate-900 border border-slate-300"
                            placeholder="30"
                            required
                          />
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            {[7, 15, 30, 45, 60, 90].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setTrialDays(d)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition ${
                                  trialDays === d
                                    ? "bg-blue-600 text-white border-blue-600 font-bold"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {d}d
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. PRECIO DE LA DEMO (MANUAL) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Precio de la Demo ($ USD) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={trialPrice}
                            onChange={(e) => setTrialPrice(Math.max(0, Number(e.target.value) || 0))}
                            className="input text-xs w-full font-mono font-bold bg-white text-slate-900 border border-slate-300"
                            placeholder="0.00"
                            required
                          />
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            <button
                              type="button"
                              onClick={() => setTrialPrice(0)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition ${
                                trialPrice === 0
                                  ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              Gratis ($0)
                            </button>
                            {[5, 10, 20].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setTrialPrice(p)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition ${
                                  trialPrice === p
                                    ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                ${p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 bg-blue-50/70 rounded border border-blue-100 text-[11px] text-blue-900 flex items-center justify-between">
                        <span>Vencimiento programado:</span>
                        <span className="font-semibold">
                          {(() => {
                            const d = new Date();
                            d.setDate(d.getDate() + trialDays);
                            return d.toISOString().split("T")[0];
                          })()} ({trialDays} días · ${trialPrice.toFixed(2)} USD)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CONFIGURACIÓN MANUAL DEL PAQUETE COMERCIAL */}
                  {subscriptionType === "paquete" && (
                    <div className="p-3 bg-white rounded-lg border border-indigo-200 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Paquete base del catálogo:
                        </label>
                        <select
                          value={selectedPackageId}
                          onChange={(e) => handlePackageChange(e.target.value)}
                          className="input text-xs w-full py-1.5 bg-white text-slate-900 border border-slate-300"
                        >
                          {packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name} — ${pkg.price.toFixed(2)} USD ({pkg.duration_months} {pkg.duration_months === 1 ? "mes" : "meses"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Precio a Congelar ($ USD) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={customPrice}
                            onChange={(e) => setCustomPrice(Math.max(0, Number(e.target.value) || 0))}
                            className="input text-xs w-full font-mono font-bold bg-white text-slate-900 border border-slate-300"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Duración Manual (Meses) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={customMonths}
                            onChange={(e) => setCustomMonths(Math.max(1, Number(e.target.value) || 1))}
                            className="input text-xs w-full font-mono font-bold bg-white text-slate-900 border border-slate-300"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detalle si es ninguna */}
                  {subscriptionType === "ninguna" && (
                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                      El usuario se creará en estado <strong>suspendido</strong> y solo podrá consultar información en modo solo lectura hasta que se le active un plan o prueba.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 font-medium">
                  ⭐ Los usuarios con rol <strong>SUPERADMIN</strong> tienen acceso administrativo permanente sin límite de tiempo ni facturación.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs"
                >
                  {isPending ? "Guardando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
