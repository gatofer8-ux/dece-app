import LoginForm from "./LoginForm";
import SadexLogo from "@/components/SadexLogo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#090d16] px-4 py-12 overflow-hidden selection:bg-cyan-500 selection:text-white">
      {/* Luces de ambiente sutiles y elegantes (sin azul estridente) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-25 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Cabecera oficial SADEX */}
        <div className="text-center mb-7">
          <SadexLogo variant="full" size="xl" theme="dark" showSubtitle={true} />
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Departamento de Consejería Estudiantil
          </div>
        </div>

        {/* Tarjeta translúcida ejecutiva de alta gama */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 backdrop-blur-xl p-7 sm:p-8 shadow-2xl shadow-black/80 ring-1 ring-white/5">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white tracking-tight">Iniciar Sesión</h2>
            <p className="text-xs text-slate-400 mt-1">Ingresa tus credenciales institucionales para acceder a SADEX.</p>
          </div>
          <LoginForm error={searchParams.error} />
        </div>

        {/* Pie confidencial sobrio */}
        <div className="text-center text-xs text-slate-500 mt-6 max-w-sm mx-auto flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Acceso seguro y confidencial registrado en bitácora de auditoría.</span>
        </div>
      </div>
    </div>
  );
}
