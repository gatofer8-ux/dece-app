import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SADEX · Sistema de Acompañamiento, DECE y Expedientes",
  description: "SADEX: Plataforma integral para Departamentos de Consejería Estudiantil (DECE). Gestión de expedientes, acuerdos, actas de socialización, círculos restaurativos y bienestar escolar.",
  icons: {
    icon: "/sadex-logo.png",
    apple: "/sadex-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SADEX",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <ServiceWorkerRegister />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
