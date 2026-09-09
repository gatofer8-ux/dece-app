"use client";

import { useState, useRef } from "react";
import { bulkCreateStudentsFromPDF } from "@/app/(app)/estudiantes/ai-bulk-actions";

export default function UploadStudentListPDFButton() {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Por favor, selecciona un archivo PDF.");
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = (event.target?.result as string).split(",")[1];
        
        const result = await bulkCreateStudentsFromPDF(base64Data);
        
        if (result.success) {
          alert("¡Éxito! Se crearon " + result.createdCount + " estudiantes automáticamente desde el PDF.");
        } else {
          alert("Error: " + result.error);
        }
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al procesar el documento.");
      setIsProcessing(false);
    }
  };

  return (
    <>
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="btn-secondary disabled:opacity-60 flex items-center gap-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando IA...
          </>
        ) : (
          <>
            📄 Creación IA con PDF
          </>
        )}
      </button>
    </>
  );
}
