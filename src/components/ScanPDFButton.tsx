"use client";

import { useState, useRef } from "react";
import { scanExpedientePDF } from "@/app/(app)/estudiantes/ai-actions";

export default function ScanPDFButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Por favor selecciona un archivo PDF válido.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Leer el PDF como Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Quitar el prefijo "data:application/pdf;base64,"
          const b64 = result.split(",")[1];
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Llamar al Server Action
      const result = await scanExpedientePDF(base64Data);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        // Auto-llenar el formulario
        const data = result.data;
        
        const setInputValue = (name: string, value: string | null | undefined) => {
          if (!value) return;
          const input = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement;
          if (input) {
            input.value = value;
          }
        };

        setInputValue("full_name", data.full_name);
        setInputValue("document_id", data.document_id);
        setInputValue("birth_date", data.birth_date);
        setInputValue("gender", data.gender);
        setInputValue("course", data.course);
        setInputValue("parallel", data.parallel);
        setInputValue("address", data.address);
        setInputValue("representative_name", data.representative_name);
        setInputValue("representative_document", data.representative_document);
        setInputValue("representative_phone", data.representative_phone);
        setInputValue("representative_email", data.representative_email);
        setInputValue("lives_with", data.lives_with);

        // Mostrar un mensaje sutil o simplemente limpiar
        alert("¡Datos extraídos con éxito! Por favor revisa que estén correctos antes de guardar.");
      }
    } catch (err: any) {
      setError(err.message || "Error al procesar el documento.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // reset
      }
    }
  };

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <span>🤖</span> Digitalización con Inteligencia Artificial
          </h3>
          <p className="text-xs text-blue-800 mt-1">
            Sube el expediente en PDF (antiguo o escaneado) y la IA extraerá los datos automáticamente para llenar este formulario.
          </p>
        </div>
        <div className="flex-shrink-0 relative">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="btn-primary text-xs flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <span>⏳ Analizando PDF...</span>
            ) : (
              <span>📄 Subir PDF y Extraer</span>
            )}
          </button>
        </div>
      </div>
      {error && <div className="text-xs text-red-600 mt-3 font-medium bg-red-50 p-2 rounded">{error}</div>}
    </div>
  );
}
