import React from "react";
import { Sparkles, X } from "lucide-react";
import { useGuideModeStore } from "../../stores/useGuideModeStore";

export const GuideStatusBar: React.FC = () => {
  const isGuideMode = useGuideModeStore((s) => s.isGuideMode);
  const toggleGuideMode = useGuideModeStore((s) => s.toggleGuideMode);

  if (!isGuideMode) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border border-accent-primary/40 bg-bg-elevated/95 px-4 py-2 text-xs font-sans text-text-primary shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-white">
        <Sparkles size={12} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-accent-primary">Modo Guía Activo:</span>
        <span className="text-text-secondary hidden sm:inline">
          Hacé clic en el botón <strong className="font-mono text-text-primary">[?]</strong> de cualquier panel para ver qué hace.
        </span>
        <span className="text-text-secondary sm:hidden">
          Tocá los <strong className="font-mono text-text-primary">[?]</strong> para ver detalles.
        </span>
      </div>
      <button
        type="button"
        onClick={toggleGuideMode}
        className="flex items-center gap-1 rounded-full bg-bg-secondary hover:bg-bg-surface-2 px-2.5 py-1 text-[11px] font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-border-subtle"
        title="Salir del Modo Guía"
      >
        <span>Salir</span>
        <X size={12} />
      </button>
    </div>
  );
};
