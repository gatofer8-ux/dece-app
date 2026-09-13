import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { roleHomePath } from "@/lib/permissions";
import ParchisInclusivoApp from "./ParchisInclusivoApp";

export const metadata: Metadata = {
  title: "Parchís Inclusivo | SADEX DECE",
  description:
    "Herramienta digital interactiva del Parchís Inclusivo basada en la Guía oficial de Respiramos Inclusión (World Vision & ACNUR) para talleres educativos y ferias masivas.",
};

export default async function ParchisInclusivoPage() {
  const session = await requireSession();

  // Accesible para roles DECE, ADMIN, SUPERADMIN, AUTORIDAD y DOCENTE
  const allowedRoles = ["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD", "DOCENTE"];
  if (!allowedRoles.includes(session.user.role)) {
    redirect(roleHomePath(session.user.role));
  }

  return <ParchisInclusivoApp />;
}
