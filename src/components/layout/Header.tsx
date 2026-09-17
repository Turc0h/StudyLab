import React from "react";
import { Moon, Sun, HardDrive, Maximize2, Sparkles } from "lucide-react";
import { Badge } from "../ui/Badge";
import { useFocusModeStore } from "../../stores/useFocusModeStore";
import { useGuideModeStore } from "../../stores/useGuideModeStore";
import { clsx } from "clsx";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  isDark,
  onToggleTheme,
}) => {
  const enterFocusMode = useFocusModeStore((s) => s.enterFocusMode);
  const isGuideMode = useGuideModeStore((s) => s.isGuideMode);
  const toggleGuideMode = useGuideModeStore((s) => s.toggleGuideMode);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-primary/95 px-6 backdrop-blur-xs md:px-10">
      <div>
        <h1 className="font-serif text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Botón Modo Guía Interactivo */}
        <button
          type="button"
          onClick={toggleGuideMode}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-all duration-200 cursor-pointer shadow-2xs",
            isGuideMode
              ? "bg-accent-primary text-white border border-accent-primary shadow-[0_0_15px_rgba(47,93,124,0.4)]"
              : "border border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-accent-primary",
          )}
          title="Activa o desactiva la explicación directa sobre cada panel en pantalla"
        >
          <Sparkles className={clsx("h-3.5 w-3.5", isGuideMode ? "text-white" : "text-accent-primary")} />
          <span className="hidden sm:inline">
            {isGuideMode ? "Modo Guía: ON" : "Modo Guía"}
          </span>
        </button>

        {/* Botón Modo Enfoque */}
        <button
          type="button"
          onClick={enterFocusMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-subtle bg-bg-elevated text-xs font-sans text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors shadow-2xs"
          title="Ocultar paneles y distracciones para lectura y estudio profundo"
        >
          <Maximize2 className="h-3.5 w-3.5 text-accent-primary" />
          <span className="hidden sm:inline">Modo Enfoque</span>
        </button>

        <Badge variant="secondary" className="hidden sm:inline-flex items-center gap-1.5 py-1">
          <HardDrive className="h-3 w-3 text-accent-secondary" />
          <span>Local-First</span>
        </Badge>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="rounded-md border border-border-subtle p-2 text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
};
