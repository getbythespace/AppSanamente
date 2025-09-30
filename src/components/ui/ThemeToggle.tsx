import React from "react";
import { useTheme } from "./ThemeProvider";

type Props = {
  /** deja false para evitar el botón flotante */
  floating?: boolean;
  /** esquina del flotante */
  position?: "bottom-left" | "bottom-right";
  /** mostrar texto al lado del ícono */
  showLabel?: boolean;
  className?: string;
};

export default function ThemeToggle({
  floating = false,
  position = "bottom-left",
  showLabel = true,
  className = "",
}: Props) {
  const { theme, toggle, mounted } = useTheme();
  if (!mounted) return null;

  const isDark = theme === "dark";

  const inlineClasses =
    "group inline-flex h-8 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 text-xs text-white backdrop-blur transition hover:bg-white/20 dark:border-white/20";

  const fabClasses = `fixed ${
    position === "bottom-left" ? "left-4" : "right-4"
  } bottom-4 z-50
     inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs
     bg-white/90 text-slate-900 border-slate-200 shadow-md backdrop-blur
     hover:bg-white dark:bg-slate-900/90 dark:text-slate-100 dark:border-slate-700`;

  const chipClasses =
    "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-slate-800 dark:bg-slate-800 dark:text-white";

  return (
    <button
      onClick={toggle}
      className={`${floating ? fabClasses : inlineClasses} ${className}`}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={isDark}
    >
      <span className={chipClasses}>{isDark ? "🌙" : "☀️"}</span>
      {showLabel && (
        <span className={floating ? "" : "hidden sm:inline drop-shadow"}>
          {isDark ? "Modo oscuro" : "Modo claro"}
        </span>
      )}
    </button>
  );
}
