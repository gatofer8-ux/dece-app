"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  verifyDeviceAndGetInternAction,
  getMobileInternDataAction,
  getInstitutionActiveInternsAction,
  linkDeviceAction,
  secureAttendanceAction,
} from "../actions";

interface Props {
  initialToken?: string;
  initialInstId?: string;
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "dece_bound_device_id_v1";
  try {
    let id = window.localStorage ? window.localStorage.getItem(KEY) : null;
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
      try {
        window.localStorage.setItem(KEY, id);
      } catch {}
    }
    return id;
  } catch {
    try {
      const match = document.cookie.match(new RegExp("(^| )" + KEY + "=([^;]+)"));
      if (match) return match[2];
      const fallbackId = "dev_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
      document.cookie = `${KEY}=${fallbackId}; path=/; max-age=315360000; SameSite=Lax`;
      return fallbackId;
    } catch {
      if (!(window as any).__dece_dev_id) {
        (window as any).__dece_dev_id =
          "dev_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
      }
      return (window as any).__dece_dev_id;
    }
  }
}

function getDeviceName(): string {
  if (typeof window === "undefined") return "Móvil Personal";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s+([\d.]+)/);
    const version = match ? match[1] : "";
    return `Android ${version}`.trim();
  }
  return "Celular Personal";
}

function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation access warning:", error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      }
    );
  });
}

export default function MobileCheckInClient({ initialToken, initialInstId }: Props) {
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceName, setDeviceName] = useState<string>("");

  const [institutionId, setInstitutionId] = useState<string>(initialInstId || "");
  const [institutionName, setInstitutionName] = useState<string>("UNIDAD EDUCATIVA");
  const [institutionConfig, setInstitutionConfig] = useState<any>(null);

  // Estado principal de carga y reconocimiento
  const [loading, setLoading] = useState<boolean>(true);
  const [isBound, setIsBound] = useState<boolean>(false);
  const [internData, setInternData] = useState<any>(null);

  // Reloj digital en tiempo real
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // Formulario de marcaje (PIN y notas)
  const [pinInput, setPinInput] = useState<string>("");
  const [activityNotes, setActivityNotes] = useState<string>("");
  const [rememberPin, setRememberPin] = useState<boolean>(true);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Estado para vinculación de nuevo dispositivo
  const [availableInterns, setAvailableInterns] = useState<any[]>([]);
  const [selectedInternToLink, setSelectedInternToLink] = useState<any | null>(null);
  const [documentInput, setDocumentInput] = useState<string>("");
  const [newPinInput, setNewPinInput] = useState<string>("");
  const [newPinConfirm, setNewPinConfirm] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Feedback de alertas y resultados
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  // 1. Reloj digital en vivo
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const dateStr = now.toLocaleDateString("es-EC", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      setCurrentTime(timeStr);
      setCurrentDate(dateStr.charAt(0).toUpperCase() + dateStr.slice(1));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Inicialización del dispositivo y reconocimiento del QR
  useEffect(() => {
    async function initAndCheckDevice() {
      setLoading(true);
      setErrorMessage(null);

      const devId = getOrCreateDeviceId();
      const devName = getDeviceName();
      setDeviceId(devId);
      setDeviceName(devName);

      // Recuperar PIN guardado si el pasante eligió recordarlo
      try {
        const savedPin = localStorage.getItem(`dece_pin_${devId}`);
        if (savedPin) {
          setPinInput(savedPin);
        }
      } catch {}

      // Leer parámetros tanto de props como de window.location.search (por compatibilidad con navegadores móviles)
      let inst = initialInstId || "";
      let token = initialToken || "";

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (!inst) inst = urlParams.get("inst") || "";
        if (!token) token = urlParams.get("token") || "";
        if (!inst) {
          try {
            inst = localStorage.getItem("dece_last_inst_id") || "";
          } catch {}
        }
      }

      if (inst) {
        setInstitutionId(inst);
      }

      try {
        // CASO A: Escaneo de QR Individual de Pasante (?token=pas_...)
        if (token) {
          const tokenRes = await getMobileInternDataAction(token);
          if (tokenRes.success && tokenRes.intern) {
            const intern = tokenRes.intern;
            if (intern.institution_id) {
              setInstitutionId(intern.institution_id);
              try {
                localStorage.setItem("dece_last_inst_id", intern.institution_id);
              } catch {}
            }
            if (intern.institution_name) {
              setInstitutionName(intern.institution_name);
            }

            // ¿Este celular ya es el dispositivo vinculado a este pasante?
            if (intern.has_device_linked && intern.device_id === devId) {
              setIsBound(true);
              setInternData({
                ...intern,
                active_attendance: tokenRes.active_attendance,
              });
              setLoading(false);
              return;
            }

            // Si el pasante aún NO tiene celular vinculado, seleccionarlo DIRECTAMENTE
            if (!intern.has_device_linked) {
              setSelectedInternToLink(intern);
              setIsBound(false);
              setLoading(false);
              return;
            } else {
              setErrorMessage(
                `⛔ Este pasante ya tiene un teléfono celular registrado (${intern.device_name || "Móvil registrado"}). Si cambiaste de equipo, solicita a tu tutor DECE desvincular el anterior.`
              );
              setIsBound(false);
              setLoading(false);
              return;
            }
          } else if (tokenRes.error) {
            setErrorMessage(tokenRes.error);
            setLoading(false);
            return;
          }
        }

        // CASO B: Verificar si este celular ya está registrado a algún pasante en el DECE
        const res = await verifyDeviceAndGetInternAction(inst, devId);

        if (res.institution_config) {
          setInstitutionConfig(res.institution_config);
        }

        if (res.is_bound && res.intern) {
          setIsBound(true);
          setInternData({
            ...res.intern,
            active_attendance: res.active_attendance,
          });
          if (res.intern.institution_name) {
            setInstitutionName(res.intern.institution_name);
          }
        } else {
          setIsBound(false);
          setInternData(null);

          // Cargar lista de pasantes activos para que pueda vincular su teléfono
          const listRes = await getInstitutionActiveInternsAction(inst);
          if (listRes.success && listRes.interns) {
            setAvailableInterns(listRes.interns);
            if (listRes.institution_name) {
              setInstitutionName(listRes.institution_name);
            }
            if (inst) {
              try {
                localStorage.setItem("dece_last_inst_id", inst);
              } catch {}
            }
          } else if (listRes.error) {
            setErrorMessage(listRes.error);
          }
        }
      } catch (err) {
        console.error("Error al inicializar dispositivo:", err);
        setErrorMessage("Error de conexión al verificar el dispositivo. Por favor recarga la página.");
      } finally {
        setLoading(false);
      }
    }

    initAndCheckDevice();
  }, [initialToken, initialInstId]);

  // 3. Vincular este teléfono al pasante seleccionado
  const handleLinkDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInternToLink || !documentInput.trim()) return;

    if (newPinInput !== newPinConfirm) {
      setErrorMessage("Los dos códigos PIN ingresados no coinciden.");
      return;
    }

    if (!/^\d{4}$/.test(newPinInput)) {
      setErrorMessage("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const res = await linkDeviceAction({
        institutionId: selectedInternToLink.institution_id || institutionId,
        internId: selectedInternToLink.id,
        documentId: documentInput.trim(),
        deviceId,
        deviceName,
        pinCode: newPinInput.trim(),
      });

      if (res.success && res.intern) {
        setIsBound(true);
        setInternData({
          ...res.intern,
          active_attendance: res.active_attendance,
        });
        setPinInput(newPinInput.trim());
        if (rememberPin && typeof window !== "undefined") {
          try {
            localStorage.setItem(`dece_pin_${deviceId}`, newPinInput.trim());
          } catch {}
        }
        setSuccessResult({
          type: "LINK_SUCCESS",
          message: "¡Teléfono celular vinculado como tu dispositivo oficial de marcaje!",
        });
        setSelectedInternToLink(null);
      } else {
        setErrorMessage(res.error || "No se pudo vincular el dispositivo.");
      }
    });
  };

  // 4. Registrar Entrada (con validación de dispositivo + PIN + GPS Geofencing)
  const handleCheckIn = () => {
    if (!internData?.id || !deviceId) return;
    if (!pinInput || pinInput.length !== 4) {
      setErrorMessage("Por favor ingresa tu PIN de 4 dígitos para confirmar tu entrada.");
      return;
    }

    setErrorMessage(null);
    setGpsLoading(true);

    startTransition(async () => {
      let coords: { latitude: number; longitude: number } | null = null;
      try {
        coords = await getCurrentLocation();
      } catch (err) {
        console.warn("GPS error:", err);
      } finally {
        setGpsLoading(false);
      }

      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }

      const res = await secureAttendanceAction({
        internId: internData.id,
        deviceId,
        pinCode: pinInput.trim(),
        actionType: "CHECK_IN",
        activityNotes: activityNotes || "Entrada de jornada",
        deviceInfo: deviceName,
        clientLat: coords?.latitude ?? null,
        clientLon: coords?.longitude ?? null,
      });

      if (res.success) {
        if (rememberPin && typeof window !== "undefined") {
          try {
            localStorage.setItem(`dece_pin_${deviceId}`, pinInput.trim());
          } catch {}
        }
        setSuccessResult({
          type: "CHECK_IN",
          time: res.time,
          message: res.message,
          completed_hours: res.completed_hours,
          required_hours: res.required_hours,
          distance_meters: res.distance_meters,
        });
        setInternData((prev: any) => ({
          ...prev,
          active_attendance: res.attendance,
          completed_hours: res.completed_hours,
        }));
        setActivityNotes("");
      } else {
        setErrorMessage(res.error || "Error al registrar la entrada.");
      }
    });
  };

  // 5. Registrar Salida (con validación de dispositivo + PIN + GPS Geofencing)
  const handleCheckOut = () => {
    if (!internData?.id || !deviceId) return;
    if (!pinInput || pinInput.length !== 4) {
      setErrorMessage("Por favor ingresa tu PIN de 4 dígitos para confirmar tu salida.");
      return;
    }

    setErrorMessage(null);
    setGpsLoading(true);

    startTransition(async () => {
      let coords: { latitude: number; longitude: number } | null = null;
      try {
        coords = await getCurrentLocation();
      } catch (err) {
        console.warn("GPS error:", err);
      } finally {
        setGpsLoading(false);
      }

      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([150, 80, 150]);
        } catch {}
      }

      const res = await secureAttendanceAction({
        internId: internData.id,
        deviceId,
        pinCode: pinInput.trim(),
        actionType: "CHECK_OUT",
        activityNotes,
        deviceInfo: deviceName,
        clientLat: coords?.latitude ?? null,
        clientLon: coords?.longitude ?? null,
      });

      if (res.success) {
        if (rememberPin && typeof window !== "undefined") {
          try {
            localStorage.setItem(`dece_pin_${deviceId}`, pinInput.trim());
          } catch {}
        }
        setSuccessResult({
          type: "CHECK_OUT",
          time: res.time,
          message: res.message,
          completed_hours: res.completed_hours,
          required_hours: res.required_hours,
          distance_meters: res.distance_meters,
        });
        setInternData((prev: any) => ({
          ...prev,
          active_attendance: null,
          completed_hours: res.completed_hours,
        }));
        setActivityNotes("");
      } else {
        setErrorMessage(res.error || "Error al registrar la salida.");
      }
    });
  };

  // Filtrado de lista para vincular
  const filteredAvailable = availableInterns.filter((i) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      i.full_name?.toLowerCase().includes(term) ||
      i.document_id?.includes(term) ||
      i.university_or_origin?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col items-center justify-start p-4 sm:p-6">
      {/* HEADER MÓVIL INSTITUCIONAL */}
      <div className="w-full max-w-md flex flex-col items-center text-center mt-2 mb-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg mb-2">
          <span className="text-3xl">🤝</span>
        </div>
        <span className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase">
          DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL
        </span>
        <h1 className="text-lg font-extrabold text-white tracking-tight">
          Control de Asistencia QR
        </h1>
        <p className="text-xs text-indigo-200 mt-0.5 font-medium">
          {institutionName}
        </p>
      </div>

      {/* RELOJ DIGITAL EN VIVO SINCRONIZADO */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/15 rounded-2xl p-4 shadow-xl text-center mb-3">
        <div className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider mb-0.5">
          {currentDate || "Ecuador (UTC-5)"}
        </div>
        <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-wider drop-shadow-md">
          {currentTime || "--:--:--"}
        </div>
        <div className="text-[10px] text-emerald-400 font-medium mt-1 flex items-center justify-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Hora Oficial en Tiempo Real</span>
        </div>
      </div>

      {/* BADGE DE GEOFENCING / SEGURIDAD PRESENCIAL */}
      {institutionConfig?.has_geofence && (
        <div className="w-full max-w-md mb-3 px-3 py-2 bg-indigo-950/70 border border-indigo-500/30 rounded-xl flex items-center justify-between text-[11px] text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="text-sm">🛡️</span>
            <span>Presencia obligatoria por <strong>GPS Institucional</strong> ({institutionConfig.geofence_radius}m)</span>
          </div>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Geofencing Activo" />
        </div>
      )}

      {/* INDICADOR DE OBTENCIÓN DE GPS */}
      {gpsLoading && (
        <div className="w-full max-w-md mb-3 px-3.5 py-2.5 bg-blue-900/40 border border-blue-400/40 rounded-xl text-blue-200 text-xs font-medium flex items-center justify-center gap-2 animate-pulse">
          <span className="w-3.5 h-3.5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
          <span>Certificando tu ubicación GPS en la institución...</span>
        </div>
      )}

      {/* ALERTAS DE ERROR */}
      {errorMessage && (
        <div className="w-full max-w-md mb-4 p-3.5 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <span className="text-lg shrink-0">⚠️</span>
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* ALERTAS DE ÉXITO */}
      {successResult && (
        <div className="w-full max-w-md mb-4 p-4 bg-emerald-600/30 border border-emerald-400/50 rounded-2xl text-center shadow-lg animate-in fade-in zoom-in duration-200">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 text-white text-2xl font-bold mb-2 shadow-md">
            ✓
          </div>
          <h2 className="text-sm font-bold text-emerald-200 uppercase tracking-wide">
            {successResult.type === "CHECK_IN"
              ? "¡Entrada Confirmada!"
              : successResult.type === "CHECK_OUT"
              ? "¡Salida Confirmada!"
              : "¡Dispositivo Vinculado!"}
          </h2>
          {successResult.time && (
            <p className="text-2xl font-mono font-black text-white mt-1">
              {successResult.time}
            </p>
          )}
          <p className="text-xs text-emerald-100 mt-1">{successResult.message}</p>
          {successResult.distance_meters != null && (
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-medium border border-emerald-400/30">
              <span>📍</span> Presencia verificada a {successResult.distance_meters}m del DECE
            </div>
          )}
          {successResult.completed_hours !== undefined && (
            <div className="mt-3 pt-3 border-t border-emerald-400/30 text-xs text-emerald-200 flex justify-between">
              <span>Horas acumuladas:</span>
              <span className="font-bold text-white">
                {successResult.completed_hours}h / {successResult.required_hours}h
              </span>
            </div>
          )}
        </div>
      )}

      {/* CARGANDO */}
      {loading && (
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-300 font-medium">
            Verificando dispositivo móvil...
          </p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CASO 1: CELULAR RECONOCIDO Y VINCULADO (FLUJO DIARIO DEL PASANTE)      */}
      {/* ===================================================================== */}
      {!loading && isBound && internData && (
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl space-y-4">
          {/* TARJETA CON NOMBRE DIRECTO DEL PASANTE */}
          <div className="border-b border-white/10 pb-3">
            <div className="flex items-center justify-between">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {internData.type}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span>📱</span> {deviceName} (Verificado)
              </span>
            </div>

            <h2 className="text-lg font-black text-white mt-2 leading-tight">
              {internData.full_name}
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {internData.university_or_origin}
            </p>
            {internData.career_or_specialty && (
              <p className="text-[11px] text-indigo-300">
                {internData.career_or_specialty}
              </p>
            )}
            {(internData.schedule_details || internData.schedule_type) && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 text-[10px] font-medium border border-indigo-400/20">
                <span>⏰</span> {internData.schedule_details || internData.schedule_type}
              </div>
            )}
          </div>

          {/* BARRA DE PROGRESO DE HORAS */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Horas de Prácticas:</span>
              <span className="font-bold text-white">
                {internData.completed_hours || 0} / {internData.required_hours} hrs (
                {Math.min(
                  100,
                  Math.round(
                    ((internData.completed_hours || 0) / internData.required_hours) * 100
                  )
                )}
                %)
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((internData.completed_hours || 0) / internData.required_hours) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* CAMPO DE PIN DE 4 DÍGITOS */}
          <div className="bg-black/20 border border-white/10 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                <span>🔒</span> Tu PIN Personal (4 dígitos):
              </label>
              <label className="text-[10px] text-indigo-300 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberPin}
                  onChange={(e) => setRememberPin(e.target.checked)}
                  className="rounded text-indigo-500 bg-white/10"
                />
                Recordar en mi cel
              </label>
            </div>
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full text-center tracking-[1em] text-lg font-mono p-2.5 rounded-lg bg-black/40 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
            />
            <span className="text-[10px] text-slate-400 block text-center">
              Garantiza que solo tú registres asistencia desde este teléfono.
            </span>
          </div>

          {/* ACCIÓN: SI YA TIENE ENTRADA HOY -> BOTÓN SALIDA */}
          {internData.active_attendance ? (
            <div className="space-y-3 pt-1">
              <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 text-center">
                <div className="text-[11px] font-bold text-amber-300 uppercase">
                  Turno Activo en DECE
                </div>
                <div className="text-xs text-slate-200 mt-0.5">
                  Marcaste entrada hoy a las{" "}
                  <span className="font-bold text-white font-mono">
                    {internData.active_attendance.check_in_time}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Actividades realizadas hoy (opcional):
                </label>
                <textarea
                  rows={2}
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  placeholder="Ej: Apoyo en taller de prevención, archivo de fichas..."
                  className="w-full text-xs p-2.5 rounded-lg bg-black/30 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <button
                type="button"
                onClick={handleCheckOut}
                disabled={isPending}
                className="w-full py-4 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-[0.98] text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registrando salida...
                  </>
                ) : (
                  <>
                    <span className="text-lg">🔴</span>
                    REGISTRAR SALIDA AHORA
                  </>
                )}
              </button>
            </div>
          ) : (
            /* ACCIÓN: NO TIENE ENTRADA HOY -> BOTÓN ENTRADA */
            <div className="space-y-3 pt-1">
              <div className="bg-indigo-500/20 border border-indigo-400/40 rounded-xl p-3 text-center">
                <div className="text-[11px] font-bold text-indigo-200 uppercase">
                  Listo para Iniciar Jornada
                </div>
                <div className="text-xs text-slate-200 mt-0.5">
                  Verifica tu PIN e ingresa con un solo toque.
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckIn}
                disabled={isPending}
                className="w-full py-4 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] text-white font-black text-base rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registrando entrada...
                  </>
                ) : (
                  <>
                    <span className="text-xl">🟢</span>
                    REGISTRAR ENTRADA AHORA
                  </>
                )}
              </button>
            </div>
          )}

          <div className="pt-2 text-center text-[10px] text-slate-400">
            🔒 Dispositivo personal verificado contra suplantación
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CASO 2: CELULAR NO VINCULADO (PRIMER ESCANEO) -> ASOCIAR MI CELULAR   */}
      {/* ===================================================================== */}
      {!loading && !isBound && (
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl space-y-4">
          {!selectedInternToLink ? (
            /* PASO 1: SELECCIONAR SU NOMBRE DE LA LISTA */
            <div className="space-y-3">
              <div className="text-center border-b border-white/10 pb-3">
                <div className="inline-block p-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-xl mb-1">
                  📱
                </div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Vincula tu Celular Personal
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Para evitar que otros marquen por ti, selecciona tu nombre para registrar este teléfono como tu dispositivo exclusivo.
                </p>
              </div>

              {availableInterns.length > 0 ? (
                <>
                  <div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar tu nombre o cédula..."
                      className="w-full text-xs p-2.5 rounded-lg bg-black/30 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-white/5">
                    {filteredAvailable.map((intern) => (
                      <button
                        key={intern.id}
                        type="button"
                        onClick={() => {
                          if (intern.has_device) {
                            setErrorMessage(
                              `⛔ Este pasante (${intern.full_name}) ya tiene un teléfono celular registrado (${intern.device_name || "Móvil"}). Por seguridad anti-suplantación, solo puedes registrar asistencia desde tu propio celular registrado.`
                            );
                            return;
                          }
                          setErrorMessage(null);
                          setSelectedInternToLink(intern);
                        }}
                        className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/15 active:bg-white/20 transition-all border border-white/10 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">
                            {intern.full_name}
                          </div>
                          <div className="text-[10px] text-slate-300">
                            {intern.type} · {intern.university_or_origin}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            C.I.: {intern.document_id}
                          </div>
                        </div>
                        <div>
                          {intern.has_device ? (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full font-semibold">
                              Ya vinculado
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              Vincular →
                            </span>
                          )}
                        </div>
                      </button>
                    ))}

                    {filteredAvailable.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No se encontraron pasantes con ese criterio de búsqueda.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ESTADO: NO HAY PASANTES REGISTRADOS EN LA INSTITUCIÓN */
                <div className="text-center py-6 px-4 bg-amber-500/10 border border-amber-400/30 rounded-2xl space-y-3">
                  <div className="text-3xl">ℹ️</div>
                  <div className="text-sm font-bold text-amber-200">
                    Aún no hay pasantes registrados en el DECE
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                    Para poder vincular tu teléfono, el tutor o coordinador DECE debe registrarte primero en el sistema desde el panel administrativo en <strong>"Nuevo Pasante"</strong>.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/pasantes/nuevo"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                    >
                      <span>+</span> Registrar Nuevo Pasante
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* PASO 2: CONFIRMAR CÉDULA Y CREAR PIN DE 4 DÍGITOS */
            <form onSubmit={handleLinkDeviceSubmit} className="space-y-4">
              <div className="border-b border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => setSelectedInternToLink(null)}
                  className="text-[11px] text-indigo-300 hover:text-white font-semibold mb-1 cursor-pointer"
                >
                  ← Cambiar de pasante
                </button>
                <h2 className="text-base font-bold text-white">
                  {selectedInternToLink.full_name}
                </h2>
                <p className="text-xs text-slate-300">
                  {selectedInternToLink.university_or_origin}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  1. Confirma tu número de Cédula de Identidad *
                </label>
                <input
                  type="text"
                  required
                  value={documentInput}
                  onChange={(e) => setDocumentInput(e.target.value)}
                  placeholder="Ingresa tu cédula completa..."
                  className="w-full text-xs p-2.5 rounded-lg bg-black/40 border border-white/20 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-400"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Se verificará que coincida con el registro del DECE.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    2. PIN (4 dígitos) *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={newPinInput}
                    onChange={(e) =>
                      setNewPinInput(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="••••"
                    className="w-full text-center tracking-widest text-base font-mono p-2 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    3. Confirma PIN *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={newPinConfirm}
                    onChange={(e) =>
                      setNewPinConfirm(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="••••"
                    className="w-full text-center tracking-widest text-base font-mono p-2 rounded-lg bg-black/40 border border-white/20 text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberPinLink"
                  checked={rememberPin}
                  onChange={(e) => setRememberPin(e.target.checked)}
                  className="rounded text-indigo-500 bg-white/10"
                />
                <label
                  htmlFor="rememberPinLink"
                  className="text-xs text-slate-300 cursor-pointer"
                >
                  Recordar PIN en este celular para próximos marcajes
                </label>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Vinculando teléfono celular...
                  </>
                ) : (
                  <>
                    <span>📱</span>
                    VINCULAR ESTE TELÉFONO COMO MI DISPOSITIVO
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
