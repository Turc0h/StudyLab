import React, { useState, useRef, useCallback, useEffect } from "react";
import { Badge } from "../ui/Badge";
import { Columns } from "lucide-react";

export interface SplitPanelProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSplitRatio?: number; // Porcentaje del panel izquierdo (ej. 50 para 50%)
  minRatio?: number;
  maxRatio?: number;
  resizable?: boolean;
  leftTitle?: string;
  rightTitle?: string;
  leftBadge?: string;
  rightBadge?: string;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  showPresets?: boolean;
  className?: string;
}

import { clampSplitRatio } from "./shellBehavior";
export { clampSplitRatio };

export const SplitPanel: React.FC<SplitPanelProps> = ({
  left,
  right,
  defaultSplitRatio = 50,
  minRatio = 20,
  maxRatio = 80,
  resizable = true,
  leftTitle,
  rightTitle,
  leftBadge,
  rightBadge,
  leftActions,
  rightActions,
  showPresets = true,
  className = "",
}) => {
  const [ratio, setRatio] = useState<number>(() => clampSplitRatio(defaultSplitRatio, minRatio, maxRatio));
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!resizable) return;
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const newRatio = (pointerX / rect.width) * 100;
      const clamped = clampSplitRatio(newRatio, minRatio, maxRatio);
      setRatio(clamped);
    },
    [isDragging, minRatio, maxRatio],
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar si ya fue liberado
    }
  };

  // Prevenir selección de texto accidental durante el arrastre
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Barra de atajos de proporción rápida (Presets) */}
      {showPresets && resizable && (
        <div className="flex items-center justify-between px-1 text-xs text-text-muted">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Columns className="h-3.5 w-3.5 text-accent-primary" />
            <span>Proporción: <strong>{Math.round(ratio)}%</strong> / <strong>{Math.round(100 - ratio)}%</strong></span>
          </div>

          <div className="flex items-center gap-1 bg-bg-secondary/60 p-0.5 rounded-lg border border-border-subtle">
            <button
              type="button"
              onClick={() => setRatio(30)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                Math.round(ratio) === 30 ? "bg-accent-primary text-white" : "hover:text-text-primary"
              }`}
            >
              30 / 70
            </button>
            <button
              type="button"
              onClick={() => setRatio(50)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                Math.round(ratio) === 50 ? "bg-accent-primary text-white" : "hover:text-text-primary"
              }`}
            >
              50 / 50
            </button>
            <button
              type="button"
              onClick={() => setRatio(70)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                Math.round(ratio) === 70 ? "bg-accent-primary text-white" : "hover:text-text-primary"
              }`}
            >
              70 / 30
            </button>
          </div>
        </div>
      )}

      {/* Contenedor Split Interactivo */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex flex-col md:flex-row w-full min-h-[480px] rounded-xl border border-border-subtle bg-bg-surface overflow-hidden shadow-xs"
      >
        {/* Panel Izquierdo */}
        <div
          style={{ width: isDesktop ? `${ratio}%` : "100%" }}
          className="flex flex-col min-w-0 h-full border-b md:border-b-0 md:border-r border-border-subtle overflow-y-auto"
        >
          {(leftTitle || leftBadge || leftActions) && (
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5 bg-bg-secondary/30 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {leftTitle && <span className="font-semibold text-xs text-text-primary truncate">{leftTitle}</span>}
                {leftBadge && <Badge variant="neutral" className="text-[10px]">{leftBadge}</Badge>}
              </div>
              {leftActions && <div className="flex items-center gap-1.5">{leftActions}</div>}
            </div>
          )}

          <div className="p-4 flex-1 overflow-y-auto">{left}</div>
        </div>

        {/* Separador de Arrastre (Divider Handle) */}
        {resizable && (
          <div
            onPointerDown={handlePointerDown}
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={Math.round(ratio)}
            aria-valuemin={minRatio}
            aria-valuemax={maxRatio}
            tabIndex={0}
            className={`hidden md:flex relative z-10 w-2.5 items-center justify-center cursor-col-resize select-none transition-colors group -ml-[1px] -mr-[1px] ${
              isDragging ? "bg-accent-primary" : "bg-border-subtle/40 hover:bg-accent-primary/60"
            }`}
            title="Arrastra para ajustar la división"
          >
            <div className="h-6 w-1 rounded-full bg-border-subtle group-hover:bg-white transition-colors" />
          </div>
        )}

        {/* Panel Derecho */}
        <div
          style={{ width: isDesktop ? `${100 - ratio}%` : "100%" }}
          className="flex flex-col min-w-0 h-full overflow-y-auto flex-1"
        >
          {(rightTitle || rightBadge || rightActions) && (
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5 bg-bg-secondary/30 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {rightTitle && <span className="font-semibold text-xs text-text-primary truncate">{rightTitle}</span>}
                {rightBadge && <Badge variant="accent" className="text-[10px]">{rightBadge}</Badge>}
              </div>
              {rightActions && <div className="flex items-center gap-1.5">{rightActions}</div>}
            </div>
          )}

          <div className="p-4 flex-1 overflow-y-auto">{right}</div>
        </div>
      </div>
    </div>
  );
};
