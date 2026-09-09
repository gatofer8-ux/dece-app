"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 0, background: "#f8fafc" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ maxWidth: 460, width: "100%", textAlign: "center", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "2rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
              Ocurrió un error inesperado
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: 20 }}>
              {error?.message || "Hubo un problema al cargar la vista. Por favor reintenta o recarga la página."}
            </p>
            <button
              onClick={() => reset()}
              style={{ background: "#1f4bd1", color: "white", border: "none", borderRadius: 8, padding: "0.6rem 1.25rem", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
            >
              🔄 Reintentar carga
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
