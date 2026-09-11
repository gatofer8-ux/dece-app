"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm({ error }: { error?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setLocalError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || localError) && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-3.5 py-2.5 flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <span>{localError || "No se pudo iniciar sesión. Verifica tu correo y contraseña."}</span>
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5" htmlFor="email">
          Correo institucional
        </label>
        <input
          id="email"
          type="email"
          required
          autoFocus
          className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-150 focus:border-cyan-400 focus:bg-slate-950 focus:ring-2 focus:ring-cyan-500/20 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@institucion.edu.ec"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-150 focus:border-cyan-400 focus:bg-slate-950 focus:ring-2 focus:ring-cyan-500/20 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 hover:from-sky-500 hover:via-cyan-500 hover:to-teal-500 text-white font-medium py-2.5 text-sm shadow-md shadow-cyan-950/40 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-2"
        disabled={loading}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Ingresando a SADEX...</span>
          </>
        ) : (
          <span>Ingresar a SADEX</span>
        )}
      </button>
    </form>
  );
}
