import fs from "fs";
import path from "path";

/**
 * Carga el texto ya extraído (una sola vez, sin volver a leer el PDF pesado
 * en cada solicitud) de los materiales oficiales del ENEIS y busca, dentro de
 * ese texto, las páginas más relacionadas con lo que el docente está
 * planificando (asignatura, curso, tema). Así la IA redacta basada en el
 * contenido REAL del libro elegido — con su número de página real — en vez
 * de inventar temas o citas que no están ahí.
 */

const MATERIALES_DIR = path.join(process.cwd(), "src", "lib", "eneis", "materiales");

interface PageChunk {
  page: number;
  text: string;
}

const pageCache = new Map<string, PageChunk[]>();

function loadPages(materialId: string): PageChunk[] {
  const cached = pageCache.get(materialId);
  if (cached) return cached;

  const filePath = path.join(MATERIALES_DIR, `${materialId}.txt`);
  let raw = "";
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    pageCache.set(materialId, []);
    return [];
  }

  // El texto se guardó con marcadores "[PÁGINA N]" antes del contenido de cada página.
  const parts = raw.split(/\[PÁGINA (\d+)\]/);
  const pages: PageChunk[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const page = Number(parts[i]);
    const text = (parts[i + 1] || "").trim();
    if (text) pages.push({ page, text });
  }
  pageCache.set(materialId, pages);
  return pages;
}

const STOPWORDS = new Set([
  "para", "como", "desde", "entre", "hacia", "donde", "cuando", "porque", "sobre", "este", "esta", "estos",
  "estas", "unos", "unas", "segun", "sobre", "cada", "todo", "toda", "todos", "todas", "pero", "mas", "más",
  "que", "los", "las", "del", "por", "con", "una", "uno", "sus", "les", "nos", "muy", "son",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function keywordsOf(text: string): string[] {
  return Array.from(
    new Set(
      normalize(text)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    )
  );
}

export interface RelevantExcerpt {
  excerpt: string;
  pages: number[];
}

/** Busca, por palabras clave, las páginas del material más relacionadas con `query`. */
export function findRelevantExcerpt(materialId: string, query: string, maxChars = 9000): RelevantExcerpt {
  const pages = loadPages(materialId);
  if (pages.length === 0) return { excerpt: "", pages: [] };

  const words = keywordsOf(query);
  let chosen: PageChunk[];

  if (words.length === 0) {
    chosen = pages.slice(0, 4);
  } else {
    const scored = pages.map((p) => {
      const normalized = normalize(p.text);
      let score = 0;
      for (const w of words) {
        const re = new RegExp(`\\b${w}\\b`, "g");
        const matches = normalized.match(re);
        if (matches) score += matches.length;
      }
      return { ...p, score };
    });
    const withHits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
    chosen = (withHits.length > 0 ? withHits : scored.slice(0, 4)).sort((a, b) => a.page - b.page);
  }

  let excerpt = "";
  const usedPages: number[] = [];
  for (const c of chosen) {
    const remaining = maxChars - excerpt.length;
    if (remaining <= 0) break;
    // Si la propia página ya no cabe entera en lo que queda de espacio, se recorta
    // (en vez de descartarla) para nunca devolver un fragmento vacío por esta causa.
    const text = c.text.length > remaining - 20 ? `${c.text.slice(0, Math.max(0, remaining - 23))}…` : c.text;
    const block = `[PÁGINA ${c.page}]\n${text}\n\n`;
    excerpt += block;
    usedPages.push(c.page);
  }
  return { excerpt: excerpt.trim(), pages: usedPages };
}
