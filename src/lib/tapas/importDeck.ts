import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { TAPAS_CARDS_DIR, matchArchetypeKey } from "./cardDeck";
import { ARCHETYPE_MAP } from "./archetypes";

/**
 * Procesa el PDF oficial de "Tarjetas de arquetipos" (Proyecto TaPas – VVOB)
 * que sube la institución: una página por cartilla, con el nombre impreso.
 * Renderiza cada página a PNG y la empareja con su arquetipo por el nombre.
 *
 * Solo servidor. No incluye ilustración alguna: procesa el archivo de la
 * institución y guarda las imágenes en su propio almacenamiento.
 */

interface PageLabel {
  page: number;
  name: string;
}

async function readPageLabels(pdf: Buffer): Promise<PageLabel[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise;
  const out: PageLabel[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const cand = tc.items
      .map((i: any) => ({
        s: String(i.str || "").trim(),
        y: vp.height - i.transform[5],
        h: Math.abs(i.transform[3] || i.transform[0] || 0),
      }))
      .filter((i: { s: string; y: number }) => i.s && i.y > vp.height * 0.7);
    cand.sort((a: { h: number; y: number }, b: { h: number; y: number }) => b.h - a.h || a.y - b.y);
    const maxH = cand[0]?.h || 0;
    const parts = cand
      .filter((i: { h: number }) => i.h >= maxH - 1)
      .sort((a: { y: number }, b: { y: number }) => a.y - b.y);
    const name = parts
      .map((i: { s: string }) => i.s)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    out.push({ page: p, name });
  }
  return out;
}

export interface DeckImportResult {
  matched: number;
  total: number;
  unmatchedPages: { page: number; name: string }[];
  missingArchetypes: string[];
}

export async function importTapasDeckFromPdf(
  pdf: Buffer,
  institutionId: string,
  uploadedById: string,
  sourceNote: string
): Promise<DeckImportResult> {
  const labels = await readPageLabels(pdf);

  // Asignar cada página con nombre a un arquetipo (sin repetir).
  const taken = new Set<string>();
  const assignment: { page: number; key: string }[] = [];
  const unmatchedPages: { page: number; name: string }[] = [];
  for (const l of labels) {
    if (!l.name) continue;
    const key = matchArchetypeKey(l.name);
    if (key && !taken.has(key)) {
      taken.add(key);
      assignment.push({ page: l.page, key });
    } else if (key && taken.has(key)) {
      // ya asignado — ignorar duplicado
    } else {
      unmatchedPages.push({ page: l.page, name: l.name });
    }
  }

  if (assignment.length === 0) {
    throw new Error(
      "No se reconoció ninguna cartilla en el PDF. Verifica que sea el archivo oficial de «Tarjetas de arquetipos» del Proyecto TaPas."
    );
  }

  const { pdfToPng } = await import("pdf-to-png-converter");
  const { Jimp } = await import("jimp");
  const pages = assignment.map((a) => a.page);
  const rendered = await pdfToPng(pdf, { viewportScale: 2.0, pagesToProcess: pages });

  const dir = path.join(TAPAS_CARDS_DIR, institutionId);
  fs.mkdirSync(dir, { recursive: true });

  // El PDF oficial "para presentar a la clase" muestra la cartilla (ilustración
  // + nombre) en la mitad izquierda de una página horizontal, con el texto de
  // la definición a la derecha. Se recorta a la cartilla para que no se vea
  // diminuta. Fracciones medidas sobre el diseño (constante en todo el mazo).
  const CROP = { x: 0.075, y: 0.015, w: 0.386, h: 0.945 };

  async function cropCard(pngBuffer: Buffer): Promise<Buffer> {
    try {
      const img = await Jimp.read(pngBuffer);
      const W = img.bitmap.width;
      const H = img.bitmap.height;
      // Solo recortar si es una página apaisada (layout de presentación).
      if (W > H) {
        img.crop({
          x: Math.round(W * CROP.x),
          y: Math.round(H * CROP.y),
          w: Math.round(W * CROP.w),
          h: Math.round(H * CROP.h),
        });
      }
      return (await img.getBuffer("image/png")) as Buffer;
    } catch {
      return pngBuffer;
    }
  }

  const cards: Record<string, string> = {};
  for (let i = 0; i < assignment.length; i++) {
    const { key } = assignment[i];
    const content = rendered[i]?.content;
    if (!Buffer.isBuffer(content)) continue;
    const cropped = await cropCard(content);
    const rel = path.join("tapas-cards", institutionId, `${key}.png`);
    fs.writeFileSync(path.join(dir, `${key}.png`), cropped);
    cards[key] = rel.split(path.sep).join("/");
  }

  db.prepare(
    `INSERT INTO tapas_card_decks (institution_id, cards_json, card_count, source_note, uploaded_by_id, updated_at)
     VALUES (@institution_id, @cards_json, @card_count, @source_note, @uploaded_by_id, datetime('now'))
     ON CONFLICT(institution_id) DO UPDATE SET
       cards_json = @cards_json, card_count = @card_count, source_note = @source_note,
       uploaded_by_id = @uploaded_by_id, updated_at = datetime('now')`
  ).run({
    institution_id: institutionId,
    cards_json: JSON.stringify(cards),
    card_count: Object.keys(cards).length,
    source_note: sourceNote || null,
    uploaded_by_id: uploadedById,
  });

  const missingArchetypes = Object.keys(ARCHETYPE_MAP)
    .filter((k) => !cards[k])
    .map((k) => ARCHETYPE_MAP[k].name);

  return {
    matched: Object.keys(cards).length,
    total: Object.keys(ARCHETYPE_MAP).length,
    unmatchedPages,
    missingArchetypes,
  };
}

export function clearTapasDeck(institutionId: string): void {
  const dir = path.join(TAPAS_CARDS_DIR, institutionId);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* noop */
  }
  db.prepare("DELETE FROM tapas_card_decks WHERE institution_id = ?").run(institutionId);
}
