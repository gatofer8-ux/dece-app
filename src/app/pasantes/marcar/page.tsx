import { Metadata } from "next";
import MobileCheckInClient from "./MobileCheckInClient";

export const metadata: Metadata = {
  title: "Marcaje de Asistencia QR · Pasantes y Voluntarios DECE",
  description: "Registro rápido de entrada y salida de pasantes y voluntarios del DECE.",
};

export default function MobileCheckInPage({
  searchParams,
}: {
  searchParams: { token?: string; inst?: string };
}) {
  return (
    <MobileCheckInClient
      initialToken={searchParams.token}
      initialInstId={searchParams.inst}
    />
  );
}
