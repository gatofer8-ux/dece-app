/**
 * Genera las cartillas incluidas en la app (public/tapas-cards/*.jpg) a partir del
 * PDF "Cartillas arquetipos TaPas, una por hoja" (Proyecto TaPas – VVOB, distribución gratuita).
 *
 * Uso:  node scripts/buildTapasBuiltinDeck.mjs "C:/ruta/Cartillas_arquetipos_TaPas_una_por_hoja.pdf"
 *
 * El PDF no trae capa de texto (el nombre de cada cartilla es imagen), así que la tabla
 * página -> arquetipo está fijada aquí, verificada leyendo cada hoja.
 */
import fs from "fs";
import path from "path";

const PDF = process.argv[2];
if (!PDF || !fs.existsSync(PDF)) {
  console.error("Indica la ruta del PDF de cartillas.");
  process.exit(1);
}
const OUT = path.join(process.cwd(), "public", "tapas-cards");

// página (1-based) -> clave de arquetipo (src/lib/tapas/archetypes.ts)
const PAGE_TO_KEY = {
  1: "deportista", 2: "detective", 3: "guia_espiritual", 4: "protector_animales", 5: "erudito",
  6: "chef", 7: "servicial", 8: "amigable", 9: "piloto", 10: "empatico",
  11: "presidente", 12: "pintor", 13: "inventor", 14: "pionero", 15: "capaz_conectar",
  16: "heroe", 17: "constructor", 18: "quimico", 19: "filosofo", 20: "escritor",
  21: "cuidador", 22: "comediante", 23: "abogado", 24: "valiente", 25: "docente",
  26: "acrobata", 27: "especialista", 28: "mediador", 29: "musico", 30: "artista",
  31: "clarividente", 32: "tecnico", 33: "disenador", 34: "poeta", 35: "capaz_riesgos",
  36: "geografo", 37: "biologo", 38: "bailarin", 39: "carpintero", 40: "artesano",
  41: "lider", 42: "sonador", 43: "guardaespaldas", 44: "medico", 45: "capitan",
  46: "historiador", 47: "ambientalista", 48: "cuentacuentos", 49: "mama", 50: "capaz_completar",
  51: "salvavidas", 52: "romantico", 53: "actor", 54: "juez", 55: "interprete",
  56: "rebelde", 57: "sabio", 58: "consejero", 59: "aventurero", 60: "laboratorista",
  61: "jardinero", 62: "reparador", 63: "ermitano", 64: "guerrero", 65: "comerciante",
  66: "buscador", 67: "guia", 68: "jefe_tribu", 69: "cientifico",
  // 70-72 y 78-80: tarjetas de categoría (se usa el primer juego)
  70: "cat_si", 71: "cat_duda", 72: "cat_no",
  73: "director_cine", 74: "viajero", 75: "papa", 76: "capaz_solucionar", 77: "capaz_ayudar",
};

const { pdfToPng } = await import("pdf-to-png-converter");
const { Jimp } = await import("jimp");
fs.mkdirSync(OUT, { recursive: true });

const pages = Object.keys(PAGE_TO_KEY).map(Number);
const rendered = await pdfToPng(fs.readFileSync(PDF), { viewportScale: 1.6, pagesToProcess: pages });

// Región de la cartilla dentro de la hoja (fracciones medidas sobre el diseño, constantes en todo el mazo)
const CROP = { x: 0.067, y: 0.063, w: 0.866, h: 0.873 };
const CARD_WIDTH = 520;

let total = 0;
for (let i = 0; i < pages.length; i++) {
  const key = PAGE_TO_KEY[pages[i]];
  const content = rendered[i]?.content;
  if (!Buffer.isBuffer(content)) throw new Error(`Sin imagen para la página ${pages[i]}`);
  const img = await Jimp.read(content);
  const W = img.bitmap.width;
  const H = img.bitmap.height;
  img.crop({ x: Math.round(W * CROP.x), y: Math.round(H * CROP.y), w: Math.round(W * CROP.w), h: Math.round(H * CROP.h) });
  if (key.startsWith("cat_")) img.rotate(-90); // el texto de las categorías va girado en el PDF
  img.resize({ w: key.startsWith("cat_") ? 640 : CARD_WIDTH });
  const buf = await img.getBuffer("image/jpeg", { quality: 82 });
  fs.writeFileSync(path.join(OUT, `${key}.jpg`), buf);
  total += buf.length;
}
console.log(`ok: ${pages.length} imágenes en ${OUT} (${(total / 1024 / 1024).toFixed(1)} MB)`);
