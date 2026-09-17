import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, X, Check, Lightbulb, Zap, Compass } from "lucide-react";
import { useGuideModeStore } from "../../stores/useGuideModeStore";
import { clsx } from "clsx";

export interface PanelGuideProps {
  id: string;
  title: string;
  whatItDoes: string;
  howToUse: string[];
  tip?: string;
  className?: string;
  align?: "left" | "right";
}

export const PanelGuide: React.FC<PanelGuideProps> = ({
  id,
  title,
  whatItDoes,
  howToUse,
  tip,
  className,
  align = "right",
}) => {
  const isGuideMode = useGuideModeStore((s) => s.isGuideMode);
  const activePanelId = useGuideModeStore((s) => s.activePanelId);
  const setActivePanelId = useGuideModeStore((s) => s.setActivePanelId);

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sincronizar con el estado global si se enfoca externamente
  useEffect(() => {
    if (activePanelId === id) {
      setIsOpen(true);
    }
  }, [activePanelId, id]);

  // Click outside para cerrar
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (activePanelId === id) {
          setActivePanelId(null);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, activePanelId, id, setActivePanelId]);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    setActivePanelId(next ? id : null);
  };

  return (
    <div className={clsx("relative inline-flex items-center", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        title={`Ver qué hace: ${title}`}
        className={clsx(
          "group flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-mono transition-all duration-200 cursor-pointer",
          isGuideMode
            ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/50 shadow-[0_0_12px_rgba(47,93,124,0.3)] animate-pulse hover:bg-accent-primary/30"
            : "text-text-tertiary hover:text-text-primary hover:bg-bg-secondary border border-transparent hover:border-border-subtle",
        )}
      >
        <HelpCircle
          size={14}
          strokeWidth={2}
          className={clsx(
            "transition-transform duration-200 group-hover:scale-110",
            isGuideMode ? "text-accent-primary" : "text-text-secondary",
          )}
        />
        {isGuideMode && (
          <span className="font-semibold tracking-wide hidden sm:inline">
            ¿Qué hace?
          </span>
        )}
      </button>

      {/* Popover anclado al panel */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={clsx(
            "absolute top-full mt-2 z-50 w-72 sm:w-80 rounded-xl border border-border-subtle bg-bg-elevated p-4 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 font-sans",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {/* Header del Popover */}
          <div className="flex items-start justify-between gap-2 border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-primary/15 text-accent-primary">
                <Compass size={14} strokeWidth={2} />
              </div>
              <h4 className="font-serif text-xs font-semibold text-text-primary">
                {title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (activePanelId === id) setActivePanelId(null);
              }}
              className="rounded p-1 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>

          {/* Sección 1: Qué hace */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-accent-primary">
              <Zap size={12} />
              <span>¿Para qué sirve?</span>
            </div>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              {whatItDoes}
            </p>
          </div>

          {/* Sección 2: Cómo usarlo */}
          <div className="mt-3 pt-2.5 border-t border-border-subtle">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-text-primary">
              <Check size={12} className="text-success" />
              <span>¿Cómo se usa?</span>
            </div>
            <ul className="mt-1.5 space-y-1.5 text-xs text-text-secondary">
              {howToUse.map((step, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-snug">
                  <span className="font-mono text-[10px] text-text-tertiary shrink-0 mt-0.5">
                    {idx + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sección 3: Tip o atajo */}
          {tip && (
            <div className="mt-3 rounded-lg bg-bg-secondary/60 border border-border-subtle/80 p-2.5 flex items-start gap-2">
              <Lightbulb size={13} className="shrink-0 text-warning mt-0.5" />
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {tip}
              </p>
            </div>
          )}

          {/* Botón Entendido */}
          <div className="mt-3 pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (activePanelId === id) setActivePanelId(null);
              }}
              className="rounded-md bg-accent-primary/15 px-3 py-1 text-[11px] font-medium text-accent-primary hover:bg-accent-primary hover:text-white transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
