// Servidor HTTP personalizado, usado solo en producción (`npm start`).
//
// Next.js, en modo autoalojado (`next start`), no expone la dirección IP real
// del cliente en ningún lugar accesible desde Server Actions o Route Handlers
// — `headers()` solo ve cabeceras HTTP reales, y un navegador no manda la
// suya propia. La única forma confiable de obtenerla sin depender de que la
// institución ponga un proxy inverso enfrente es leerla directamente del
// socket TCP aquí, antes de entregarle la petición a Next.
//
// Se inyecta como cabecera `x-real-ip`, que luego lee `src/lib/audit.ts` para
// dejar constancia de "desde dónde" se hizo cada acción en la bitácora.
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    // "::ffff:192.168.1.5" (IPv4 mapeada sobre IPv6) -> "192.168.1.5"
    const remote = req.socket.remoteAddress || "";
    req.headers["x-real-ip"] = remote.replace(/^::ffff:/, "");

    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> Servidor listo en http://${hostname}:${port}`);
  });
});
