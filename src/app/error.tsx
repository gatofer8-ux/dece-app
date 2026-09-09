"use client";

import { useEffect } from "react";

/** Red de seguridad general: cualquier error fuera del panel principal (por ejemplo, en /login) cae aquí en vez de una pantalla en blanco. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: "1.5rem" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.5rem" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>Ocurrió un problema</h2>
        <p style={{ fontSize: "0.875rem", color: "#475569", marginBottom: 16 }}>
          {error.message || "Algo no salió como se esperaba. Puedes intentarlo de nuevo."}
        </p>
        <button
          onClick={() => reset()}
          style={{ background: "#0f4c81", color: "white", border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontSize: "0.875rem", cursor: "pointer" }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
