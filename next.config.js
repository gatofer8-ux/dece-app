/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "pdf-to-png-converter", "pdfjs-dist"],
    instrumentationHook: true,
    // El build en el "Metal builder" de Railway se venía muriendo en
    // silencio ("Deploy failed", sin ningún error) justo al arrancar
    // "Creating an optimized production build...", incluso después de
    // subir el límite de memoria de Node. Sospecha: en máquinas de build
    // compartidas, Node/Next detecta un número de CPUs mucho más alto del
    // que la máquina realmente tiene disponible para este contenedor, y
    // lanza demasiados procesos worker en paralelo para compilar/minificar
    // — cada uno con su propio uso de memoria — lo que satura la memoria
    // real disponible casi de inmediato. Limitar a 1 CPU / sin worker
    // threads evita ese pico, a costa de un build un poco más lento (pero
    // más confiable).
    cpus: 1,
    workerThreads: false,
  },
};

module.exports = nextConfig;
