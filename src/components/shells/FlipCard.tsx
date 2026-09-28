import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "../ui/Badge";
import { RotateCw, Eye } from "lucide-react";

export interface RatingOption<T = any> {
  value: T;
  label: string;
  subtitle?: string;
  keyHint?: string;
  variant?: "danger" | "warning" | "primary" | "success" | "neutral";
  colorClass?: string;
}

export interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  ratingScale?: 3 | 4 | 5;
  ratings?: RatingOption[];
  onRate?: (ratingValue: any) => void;
  showKeyboardHints?: boolean;
  disableHotkeys?: boolean;
  frontBadge?: string;
  backBadge?: string;
  flipPromptText?: string;
  className?: string;
}

import { shouldIgnoreKeyboardEvent, resolveRatingKey } from "./shellBehavior";
export { shouldIgnoreKeyboardEvent, resolveRatingKey };

export const FlipCard: React.FC<FlipCardProps> = ({
  front,
  back,
  isFlipped: controlledFlipped,
  onFlip,
  ratingScale = 4,
  ratings: customRatings,
  onRate,
  showKeyboardHints = true,
  disableHotkeys = false,
  frontBadge = "Anverso (Pregunta)",
  backBadge = "Reverso (Respuesta)",
  flipPromptText = "Toca la tarjeta o presiona Espacio para voltear",
  className = "",
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const toggleFlip = useCallback(() => {
    const next = !flipped;
    if (controlledFlipped === undefined) {
      setInternalFlipped(next);
    }
    onFlip?.(next);
  }, [flipped, controlledFlipped, onFlip]);

  // Ratings por defecto según escala 3, 4 o 5
  const ratings: RatingOption[] = customRatings || (
    ratingScale === 3
      ? [
          { value: 1, label: "Fallé", keyHint: "1", variant: "danger", subtitle: "Reencolar" },
          { value: 2, label: "Dudoso", keyHint: "2", variant: "warning", subtitle: "Repaso pronto" },
          { value: 3, label: "Acerté", keyHint: "3", variant: "success", subtitle: "Consolidado" },
        ]
      : ratingScale === 5
      ? [
          { value: 1, label: "En blanco", keyHint: "1", variant: "danger", subtitle: "Sin recuerdo" },
          { value: 2, label: "Con dudas", keyHint: "2", variant: "warning", subtitle: "Impreciso" },
          { value: 3, label: "Parcial", keyHint: "3", variant: "neutral", subtitle: "Puntos clave" },
          { value: 4, label: "Correcto", keyHint: "4", variant: "primary", subtitle: "Casi exacto" },
          { value: 5, label: "Perfecto", keyHint: "5", variant: "success", subtitle: "Sin lagunas" },
        ]
      : [
          { value: 1, label: "Otra vez", keyHint: "1", variant: "danger", subtitle: "10 min" },
          { value: 2, label: "Difícil", keyHint: "2", variant: "warning", subtitle: "1 a 2 días" },
          { value: 3, label: "Bueno", keyHint: "3", variant: "primary", subtitle: "3 a 5 días" },
          { value: 4, label: "Fácil", keyHint: "4", variant: "success", subtitle: "10+ días" },
        ]
  );

  // Manejo de atajos de teclado estandarizado en el Shell
  useEffect(() => {
    if (disableHotkeys) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está interactuando con un campo de formulario
      if (shouldIgnoreKeyboardEvent(e.target)) {
        return;
      }

      // Espacio: Voltear
      if (e.code === "Space") {
        e.preventDefault();
        toggleFlip();
        return;
      }

      // 1, 2, 3, 4, 5...: Calificar (solo disponible cuando está volteada)
      if (flipped && onRate) {
        const matched = resolveRatingKey(e.key, ratings);
        if (matched) {
          e.preventDefault();
          onRate(matched.value);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipped, disableHotkeys, toggleFlip, ratings, onRate]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Contenedor interactivo de tarjeta */}
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? backBadge : frontBadge}
        onClick={toggleFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter") toggleFlip();
        }}
        className={`group relative flex flex-col justify-between min-h-[300px] w-full rounded-2xl border transition-all duration-300 p-6 cursor-pointer select-none ${
          flipped
            ? "border-accent-primary/40 bg-bg-surface shadow-md ring-1 ring-accent-primary/20"
            : "border-border-subtle bg-bg-surface hover:border-accent-primary/30 hover:shadow-xs"
        }`}
      >
        {/* Cabecera de la tarjeta: Badge de lado + Botón de volteo */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <Badge variant={flipped ? "accent" : "neutral"} className="text-[11px] font-mono">
            {flipped ? backBadge : frontBadge}
          </Badge>

          <div className="flex items-center gap-2 text-text-muted group-hover:text-text-primary transition-colors">
            <span className="text-[11px] hidden sm:inline">{flipPromptText}</span>
            <RotateCw className={`h-4 w-4 transition-transform duration-300 ${flipped ? "rotate-180 text-accent-primary" : ""}`} />
          </div>
        </div>

        {/* Cuerpo del contenido (Anverso o Reverso) */}
        <div className="my-auto py-6">
          {flipped ? back : front}
        </div>

        {/* Pie de tarjeta con recordatorio de atajo */}
        <div className="border-t border-border-subtle/50 pt-3 flex items-center justify-between text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-accent-primary" />
            <span>{flipped ? "Respuesta a la vista" : "Intenta evocar antes de mirar"}</span>
          </span>

          {showKeyboardHints && (
            <span className="font-mono text-[10px] bg-bg-secondary px-2 py-0.5 rounded border border-border-subtle">
              [Espacio] Voltear
            </span>
          )}
        </div>
      </div>

      {/* Botonera de Calificación Estandarizada */}
      {flipped && onRate && (
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-border-subtle bg-bg-secondary/40 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-xs text-text-secondary px-1">
            <span className="font-semibold text-text-primary">Califica tu evocación mnemónica:</span>
            {showKeyboardHints && (
              <span className="font-mono text-[10px] text-text-muted">
                Usa las teclas [1] a [{ratings.length}]
              </span>
            )}
          </div>

          <div className={`grid gap-2 pt-1 ${
            ratings.length === 2 
              ? "grid-cols-1 sm:grid-cols-2 max-w-md mx-auto w-full" 
              : ratings.length === 3 
                ? "grid-cols-1 sm:grid-cols-3" 
                : "grid-cols-2 sm:grid-cols-4"
          }`}>
            {ratings.map((opt) => {
              const variantMap = {
                danger: "border-signal-danger/30 hover:bg-signal-danger/10 text-signal-danger",
                warning: "border-signal-warn/30 hover:bg-signal-warn/10 text-signal-warn",
                primary: "border-accent-primary/40 hover:bg-accent-primary/10 text-accent-primary",
                success: "border-signal-ok/30 hover:bg-signal-ok/10 text-signal-ok",
                neutral: "border-border-hairline hover:bg-bg-surface-2 text-text-primary",
              };

              const styleClass = opt.colorClass || variantMap[opt.variant || "neutral"];

              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate(opt.value);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border bg-bg-surface transition-all active:scale-95 ${styleClass}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs">{opt.label}</span>
                    {showKeyboardHints && opt.keyHint && (
                      <span className="text-[10px] font-mono opacity-70 px-1 rounded bg-bg-secondary border border-border-subtle">
                        {opt.keyHint}
                      </span>
                    )}
                  </div>
                  {opt.subtitle && (
                    <span className="text-[10px] text-text-muted mt-0.5">{opt.subtitle}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
