/** @type {import('next').NextConfig} */

// Cabeceras de seguridad aplicadas a todas las respuestas.
// CSP deliberadamente laxa en `script-src` porque Next.js inyecta scripts
// inline con nonce dinámico; endurecer requiere `next-safe-middleware` o
// una CSP con nonce. El resto son ganancias inmediatas sin riesgo.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  eslint: {
    // El lint está limpio (ver .eslintrc.json). Si un build en un entorno con
    // poca memoria vuelve a fallar por esto, cámbialo a `true` y confía en el
    // gate de CI (.github/workflows/ci.yml).
    ignoreDuringBuilds: false,
    dirs: ["src"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "pdf-to-png-converter", "pdfjs-dist"],
    instrumentationHook: true,
    // El build en el "Metal builder" de Railway se moría en silencio al
    // iniciar la compilación de producción: en máquinas de build compartidas,
    // Next detecta más CPUs de las realmente disponibles para el contenedor y
    // lanza demasiados workers en paralelo, saturando la memoria. Limitar a
    // 1 CPU / sin worker threads evita ese pico (build más lento pero fiable).
    cpus: 1,
    workerThreads: false,
    // Next.js limita a 1 MB el cuerpo de una petición a una Server Action.
    // Varias pantallas suben archivos más grandes por ese camino (adjuntos de
    // casos hasta 15 MB, matrices Excel hasta 15 MB, PDF/.zip de estudiantes
    // hasta 20 MB) y sin este ajuste Next rechaza la petición ANTES de que el
    // código de la acción corra — el usuario ve un error genérico de React
    // ("Cannot read properties of undefined (reading 'error')") en vez del
    // mensaje amigable que cada acción ya valida por su cuenta.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

module.exports = nextConfig;
