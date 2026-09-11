"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateOwnInstitutionDetails, type ActionState } from "../instituciones/actions";
import { useToastOnChange } from "@/components/Toast";
import type { InstitutionRow } from "@/lib/types";
import { currentSchoolYearText } from "@/lib/schoolYearText";
import {
  formatZoneCode,
  formatDistrictCode,
  formatInstitutionAcronym,
  buildReportNumberString,
} from "@/lib/reportNumberingShared";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary text-xs w-full sm:w-auto px-5 py-2.5 disabled:opacity-60 font-semibold shadow-xs"
    >
      {pending ? "Guardando cambios..." : "💾 Guardar Datos y Logo Institucional"}
    </button>
  );
}

export default function InstitutionSettingsForm({ institution }: { institution: InstitutionRow }) {
  const [state, formAction] = useFormState(updateOwnInstitutionDetails, initialState);
  const [preview, setPreview] = useState<string | null>(institution.seal_image);
  const [instName, setInstName] = useState(institution.name);
  const [acronym, setAcronym] = useState((institution as any).acronym || "");
  const [district, setDistrict] = useState(institution.district || "");
  const [zona, setZona] = useState(institution.zona || "");
  const [mineducCode, setMineducCode] = useState((institution as any).mineduc_code || "Mineduc");
  const [zoneCode, setZoneCode] = useState((institution as any).zone_code || "");
  const [districtCode, setDistrictCode] = useState((institution as any).district_code || "");
  const [deceCode, setDeceCode] = useState((institution as any).dece_code || "DECE");
  const [savedSuccess, setSavedSuccess] = useState(false);
  useToastOnChange(state.error, "error");

  const effZone = formatZoneCode(zona, zoneCode);
  const effDist = formatDistrictCode(district, districtCode);
  const effAcr = formatInstitutionAcronym(instName, acronym);
  const reportCodePreview = buildReportNumberString({
    mineduc: mineducCode || "Mineduc",
    zone: effZone,
    district: effDist,
    institution: effAcr,
    dece: deceCode || "DECE",
    professional: "MJ",
    schoolYear: currentSchoolYearText(),
    sequence: 1,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }}
      className="space-y-6"
    >
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
          ⚠️ {state.error}
        </div>
      )}

      {savedSuccess && !state.error && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-medium animate-in fade-in">
          ✓ Datos y logo institucional guardados con éxito. Se reflejarán en todos los formatos oficiales de inmediato.
        </div>
      )}

      {/* Vista previa en vivo del membrete oficial de 3 columnas */}
      <div className="card p-5 space-y-3 bg-white border-blue-200 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>👁️</span> Vista Previa del Membrete Oficial en Documentos
          </h3>
          <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
            Estandarizado MinEduc + Institucional
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Así es exactamente como se imprimen y exportan a Word todos los formatos técnicos (Reportes de Hecho de Violencia, Fichas de Observación, Derivaciones, Planes de Acompañamiento y Actas):
        </p>

        <div className="p-4 border-2 border-slate-300 rounded-lg bg-slate-50/50">
          <div className="grid grid-cols-[100px_1fr_90px] items-center gap-3 border-b-2 border-slate-800 pb-3">
            {/* Planta Central */}
            <div className="flex flex-col items-center justify-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mineduc-logo.png"
                alt="Logo MinEduc Planta Central"
                className="h-14 max-w-[100px] object-contain"
              />
              <span className="text-[9px] text-slate-400 font-medium mt-1">Planta Central</span>
            </div>

            {/* Texto Central */}
            <div className="text-center space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                MINISTERIO DE EDUCACIÓN
              </p>
              <h4 className="font-extrabold uppercase text-blue-950 text-xs sm:text-sm">
                {instName || "UNIDAD EDUCATIVA “SANTA ROSA”"}
              </h4>
              <p className="text-[10px] font-bold text-slate-700 uppercase">
                DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL
              </p>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest">
                AÑO LECTIVO 2025 - 2026
              </p>
            </div>

            {/* Logo Unidad Educativa */}
            <div className="flex flex-col items-center justify-center text-center">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Escudo Institucional"
                  className="h-14 max-w-[75px] object-contain drop-shadow-xs"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/institution-logo-default.png"
                  alt="Escudo Institucional"
                  className="h-14 max-w-[75px] object-contain drop-shadow-xs"
                />
              )}
              <span className="text-[9px] text-slate-400 font-medium mt-1">Sello Institución</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Carga de Escudo Institucional */}
      <div className="card p-5 space-y-4 bg-slate-50/50 border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span>🛡️</span> Cargar / Cambiar Escudo o Logo de la Unidad Educativa
        </h3>
        <p className="text-xs text-slate-500">
          Sube la imagen del escudo de tu institución educativa. Se ubicará automáticamente en el extremo derecho de los formatos oficiales y en la barra lateral del sistema.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
          <div className="h-24 w-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center p-2 shrink-0 shadow-xs overflow-hidden">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Vista previa del logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-center text-[10px] text-slate-400 font-semibold uppercase">
                Sin logo cargado
              </div>
            )}
          </div>

          <div className="space-y-1.5 flex-1 w-full">
            <label className="label text-xs">Seleccionar archivo de imagen (PNG / JPG)</label>
            <input
              type="file"
              name="seal_image"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="input text-xs !py-1.5 w-full bg-white cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              ✓ Formato recomendado: PNG transparente de alta resolución para que se vea perfectamente nítido al imprimir o exportar a Word.
            </p>
          </div>
        </div>
      </div>

      {/* Sección Datos de Identificación Institucional */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span>📝</span> Datos de Identificación de la Institución Educativa
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label text-xs">Nombre Oficial de la Institución *</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={institution.name}
              onChange={(e) => setInstName(e.target.value)}
              placeholder="Ej. Unidad Educativa Santa Rosa"
              className="input text-xs font-semibold"
            />
          </div>

          <div>
            <label className="label text-xs">Código AMIE</label>
            <input
              type="text"
              name="amie_code"
              defaultValue={institution.amie_code || ""}
              placeholder="Ej. 18H00456"
              className="input text-xs"
            />
          </div>

          <div>
            <label className="label text-xs">Siglas de la institución</label>
            <input
              type="text"
              name="acronym"
              value={acronym}
              onChange={(e) => setAcronym(e.target.value)}
              maxLength={8}
              placeholder="Ej. UESR"
              className="input text-xs uppercase"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Se usan en el código de cada caso y en la numeración de informes DECE.
            </p>
          </div>

          <div>
            <label className="label text-xs">Dirección Distrital de Educación</label>
            <input
              type="text"
              name="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Ej. 18D02 AMBATO 2"
              className="input text-xs"
            />
          </div>

          <div>
            <label className="label text-xs">Circuito Educativo</label>
            <input
              type="text"
              name="circuit"
              defaultValue={institution.circuit || ""}
              placeholder="Ej. 18D02C05_a"
              className="input text-xs"
            />
          </div>

          <div>
            <label className="label text-xs">Coordinación Zonal</label>
            <input
              type="text"
              name="zona"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              placeholder="Ej. ZONA 3"
              className="input text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label text-xs">Dirección de la Institución</label>
            <input
              type="text"
              name="address"
              defaultValue={institution.address || ""}
              placeholder="Ej. Av. Principal y Calle Secundaria, Santa Rosa"
              className="input text-xs"
            />
          </div>

          <div>
            <label className="label text-xs">Teléfono / conmutador</label>
            <input
              type="text"
              name="institution_phone"
              defaultValue={(institution as any).institution_phone || ""}
              placeholder="Ej. (03) 2844-123"
              className="input text-xs"
            />
          </div>
        </div>

        {/* Sección Configuración de Numeración Oficial de Informes DECE */}
        <div className="mt-6 pt-4 border-t border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>🔢</span> Numeración Automática de Informes del DECE
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Estructura oficial estandarizada: <span className="font-mono font-semibold text-slate-700">[Mineduc]-[Zona]-[Distrito]-[Institución]-[DECE]-[Profesional]-[Año]-[Consecutivo]</span>
              </p>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase self-start sm:self-auto">
              Oficial MinEduc
            </span>
          </div>

          {/* Banner de previsualización en vivo */}
          <div className="p-4 bg-slate-900 rounded-lg text-white space-y-2 shadow-xs border border-slate-800">
            <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <span>👁️</span> Previsualización del primer informe del año lectivo:
            </div>
            <div className="text-sm sm:text-base font-mono font-extrabold text-emerald-400 tracking-wide break-all">
              {reportCodePreview}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Consecutivo de 3 dígitos (<span className="text-emerald-300 font-mono">001, 002, 003...</span>) generado automáticamente y de manera inmutable al guardar. Se reinicia a 001 al cambiar de año lectivo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
            <div>
              <label className="label text-xs">Entidad rectora (Mineduc)</label>
              <input
                type="text"
                name="mineduc_code"
                value={mineducCode}
                onChange={(e) => setMineducCode(e.target.value)}
                placeholder="Mineduc"
                className="input text-xs font-semibold"
              />
            </div>

            <div>
              <label className="label text-xs">Código Coordinación Zonal</label>
              <input
                type="text"
                name="zone_code"
                value={zoneCode}
                onChange={(e) => setZoneCode(e.target.value)}
                placeholder={`Ej. CZ3 (Auto: ${effZone})`}
                className="input text-xs uppercase font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Calculado: {effZone}</p>
            </div>

            <div>
              <label className="label text-xs">Código de Distrito</label>
              <input
                type="text"
                name="district_code"
                value={districtCode}
                onChange={(e) => setDistrictCode(e.target.value)}
                placeholder={`Ej. 18D02 (Auto: ${effDist})`}
                className="input text-xs uppercase font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Calculado: {effDist}</p>
            </div>

            <div>
              <label className="label text-xs">Código Departamento DECE</label>
              <input
                type="text"
                name="dece_code"
                value={deceCode}
                onChange={(e) => setDeceCode(e.target.value)}
                placeholder="DECE"
                className="input text-xs uppercase font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            🖋️ Autoridad y coordinación
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">
            Estos datos se precargan automáticamente en las firmas de todos los informes y actas del DECE.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">Título de la autoridad</label>
              <input type="text" name="rector_title" defaultValue={(institution as any).rector_title || ""} placeholder="Msc. / Dr. / Lic." className="input text-xs" />
            </div>
            <div>
              <label className="label text-xs">Nombre de la máxima autoridad</label>
              <input type="text" name="rector_name" defaultValue={(institution as any).rector_name || ""} placeholder="Nombres y apellidos del rector(a)" className="input text-xs" />
            </div>
            <div>
              <label className="label text-xs">Cargo</label>
              <input type="text" name="rector_role" defaultValue={(institution as any).rector_role || "RECTOR(A) DE LA UNIDAD EDUCATIVA"} className="input text-xs" />
            </div>
            <div>
              <label className="label text-xs">Título coordinador/a DECE</label>
              <input type="text" name="dece_coordinator_title" defaultValue={(institution as any).dece_coordinator_title || ""} placeholder="Msc. / Lcda." className="input text-xs" />
            </div>
            <div className="sm:col-span-2">
              <label className="label text-xs">Nombre coordinador/a DECE</label>
              <input type="text" name="dece_coordinator_name" defaultValue={(institution as any).dece_coordinator_name || ""} placeholder="Nombres y apellidos" className="input text-xs" />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
