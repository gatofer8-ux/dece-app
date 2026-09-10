import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: false,
    // better-sqlite3 es un addon nativo. Cargarlo desde varios worker_threads
    // (el pool por defecto de Vitest) provoca caídas "Worker exited
    // unexpectedly" en los runners de CI. El pool "forks" aísla cada archivo
    // de test en su propio proceso hijo, donde el addon nativo es estable, y
    // mantiene el aislamiento de módulos (cada archivo abre y cierra su propia
    // conexión a la base de datos).
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
