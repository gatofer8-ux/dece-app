import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTapasSessionByCode, isTapasSessionOpen } from "@/lib/tapas/tapasSessions";
import { getDeckCards } from "@/lib/tapas/cardDeck";
import type { TapasApplicationRow } from "@/lib/types";
import TapasGame from "./TapasGame";

export const metadata = { title: "Juego de arquetipos" };

export default function TapasGamePage({ params }: { params: { code: string; appId: string } }) {
  const s = getTapasSessionByCode(params.code);
  if (!s) notFound();
  const app = db
    .prepare("SELECT * FROM tapas_applications WHERE id = ? AND session_id = ?")
    .get(params.appId, s.id) as TapasApplicationRow | undefined;
  if (!app) notFound();

  if (app.status === "FINALIZADA") redirect(`/j/${params.code}/${params.appId}/gracias`);
  if (!isTapasSessionOpen(s)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-600 text-sm">Este juego está cerrado. Consulta con el DECE.</p>
      </div>
    );
  }

  let classification: Record<string, "SI" | "DUDA" | "NO"> = {};
  let groups: { id: string; name: string; archetypes: string[] }[] = [];
  try {
    classification = JSON.parse(app.classification_json || "{}");
  } catch {
    classification = {};
  }
  try {
    const raw = JSON.parse(app.groups_json || "[]");
    groups = Array.isArray(raw)
      ? raw.map((g: { name?: string; archetypes?: string[] }, i: number) => ({
          id: `g${i + 1}`,
          name: g.name || "",
          archetypes: Array.isArray(g.archetypes) ? g.archetypes : [],
        }))
      : [];
  } catch {
    groups = [];
  }

  const deckCards = getDeckCards(s.institution_id);
  const deck: Record<string, string> = {};
  for (const key of Object.keys(deckCards)) {
    deck[key] = `/api/tapas/deck/${params.code}/${key}`;
  }

  return (
    <TapasGame
      code={params.code}
      appId={params.appId}
      studentName={app.student_name}
      initialClassification={classification}
      initialGroups={groups}
      initialReflection={app.reflection || ""}
      initialLetter={app.future_letter || ""}
      deck={deck}
    />
  );
}
