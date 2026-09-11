"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem("dece_theme") as ThemeMode) || "system";
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    const isDark =
      mode === "dark" ||
      (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const handleToggle = () => {
    let next: ThemeMode = "light";
    if (theme === "light") next = "dark";
    else if (theme === "dark") next = "system";
    else next = "light";

    setTheme(next);
    localStorage.setItem("dece_theme", next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
    );
  }

  const icon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️";
  const label =
    theme === "dark"
      ? "Modo Oscuro (click para Sistema)"
      : theme === "light"
      ? "Modo Claro (click para Oscuro)"
      : "Modo Sistema (click para Claro)";

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all text-sm shadow-2xs cursor-pointer flex items-center justify-center h-8 w-8"
      title={label}
      aria-label={label}
    >
      <span>{icon}</span>
    </button>
  );
}
