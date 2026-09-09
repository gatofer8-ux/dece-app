"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: "student" | "case" | "appointment" | "alert";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}

export default function GlobalSearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Escuchar atajo de teclado Ctrl+K o Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Enfocar input cuando abre
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Buscar debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        // error de red
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "student":
        return "bg-blue-100 text-blue-800";
      case "case":
        return "bg-amber-100 text-amber-800";
      case "alert":
        return "bg-rose-100 text-rose-800";
      case "appointment":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "student":
        return "🎓";
      case "case":
        return "📁";
      case "alert":
        return "🚩";
      case "appointment":
        return "📅";
      default:
        return "📄";
    }
  };

  return (
    <>
      {/* Botón trigger en el Header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-200/60 shadow-sm"
        title="Buscar (Ctrl + K)"
      >
        <span>🔍</span>
        <span className="hidden sm:inline">Buscar estudiante, caso, cita...</span>
        <span className="sm:hidden">Buscar...</span>
        <kbd className="hidden md:inline-block bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-mono shadow-sm">
          Ctrl K
        </kbd>
      </button>

      {/* Modal Backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/50 backdrop-blur-sm">
          <div
            className="fixed inset-0"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] z-10">
            {/* Input de Búsqueda */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/50">
              <span className="text-slate-400 text-lg">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe el nombre del estudiante, cédula, código de caso..."
                className="flex-1 bg-transparent border-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {loading && (
                <div className="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-1 rounded font-medium"
              >
                ESC
              </button>
            </div>

            {/* Lista de Resultados */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
              {query.trim().length >= 2 && results.length === 0 && !loading && (
                <div className="text-center py-8 text-sm text-slate-500">
                  <div className="text-2xl mb-1">🔍</div>
                  No se encontraron resultados para &ldquo;{query}&rdquo;
                </div>
              )}

              {query.trim().length < 2 && (
                <div className="p-4 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 mb-2">Búsqueda rápida global:</p>
                  <ul className="space-y-1 list-disc list-inside text-slate-600">
                    <li>Nombre o apellido de estudiantes</li>
                    <li>Número de cédula</li>
                    <li>Código de caso DECE (ej. DECE-2026-...)</li>
                    <li>Citas y Alertas tempranas</li>
                  </ul>
                </div>
              )}

              {results.map((res) => (
                <div
                  key={`${res.type}-${res.id}`}
                  onClick={() => handleSelect(res.href)}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-brand-50/80 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center text-base shrink-0 transition-colors">
                      {getIcon(res.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-brand-900 truncate">
                        {res.title}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {res.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {res.badge && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getBadgeColor(res.type)}`}>
                        {res.badge}
                      </span>
                    )}
                    <span className="text-slate-300 group-hover:text-brand-600 text-sm">→</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Navega con un clic o presiona ESC para cerrar</span>
              <span>DECE 360°</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
