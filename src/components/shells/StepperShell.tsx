import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw } from "lucide-react";

export interface StepItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  optional?: boolean;
}

export interface StepperShellProps {
  title?: string;
  badgeText?: string;
  steps: StepItem[];
  currentStepIndex?: number;
  onStepChange?: (nextIndex: number) => void;
  canAdvance?: (stepIndex: number) => boolean | Promise<boolean>;
  onComplete?: () => void;
  onReset?: () => void;
  renderStep?: (stepIndex: number, step: StepItem) => React.ReactNode;
  children?: React.ReactNode;
  actionsSlot?: (stepIndex: number, controls: {
    goNext: () => void;
    goBack: () => void;
    isFirst: boolean;
    isLast: boolean;
    isValidating: boolean;
  }) => React.ReactNode;
  completeLabel?: string;
  className?: string;
}

import { validateStepTransition } from "./shellBehavior";
export { validateStepTransition };

export const StepperShell: React.FC<StepperShellProps> = ({
  title,
  badgeText,
  steps,
  currentStepIndex: controlledIndex,
  onStepChange,
  canAdvance,
  onComplete,
  onReset,
  renderStep,
  children,
  actionsSlot,
  completeLabel = "Finalizar Protocolo",
  className = "",
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isValidating, setIsValidating] = useState(false);

  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;
  const currentStep = steps[activeIndex] || steps[0];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;

  const goToStep = async (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    // Si avanza hacia adelante, comprobar validación
    if (nextIndex > activeIndex && canAdvance) {
      setIsValidating(true);
      const allowed = await validateStepTransition(activeIndex, nextIndex, canAdvance);
      setIsValidating(false);
      if (!allowed) return;
    }

    if (controlledIndex === undefined) {
      setInternalIndex(nextIndex);
    }
    onStepChange?.(nextIndex);
  };

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      void goToStep(activeIndex + 1);
    }
  };

  const handleBack = () => {
    void goToStep(activeIndex - 1);
  };

  const progressPct = steps.length > 1 ? ((activeIndex + 1) / steps.length) * 100 : 100;

  return (
    <div className={`flex flex-col gap-6 rounded-xl border border-border-subtle bg-bg-surface p-6 ${className}`}>
      {/* Header con título, badge y paso X de N */}
      <div className="flex flex-col gap-4 border-b border-border-subtle pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {title && <h2 className="text-base font-semibold text-text-primary">{title}</h2>}
              {badgeText && <Badge variant="accent">{badgeText}</Badge>}
            </div>
            {currentStep?.description && (
              <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
                {currentStep.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-text-muted">
              Paso <strong className="text-text-primary">{activeIndex + 1}</strong> de {steps.length}
            </span>
            {onReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 px-2 text-xs text-text-muted hover:text-text-primary"
                title="Reiniciar a paso 1"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Stepper visual interactivo */}
        <div className="space-y-2">
          {/* Barra de progreso continua */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
            <div
              className="h-full bg-accent-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Pastillas numeradas de cada paso */}
          <nav aria-label="Progreso del protocolo" className="grid grid-flow-col auto-cols-fr gap-2 pt-1">
            {steps.map((step, idx) => {
              const isPassed = idx < activeIndex;
              const isCurrent = idx === activeIndex;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => void goToStep(idx)}
                  className={`group flex items-center gap-2 rounded-lg p-1.5 text-left transition-all ${
                    isCurrent
                      ? "bg-accent-primary/10 border border-accent-primary/30"
                      : isPassed
                      ? "hover:bg-bg-elevated"
                      : "opacity-60 hover:opacity-90"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-bold ${
                      isCurrent
                        ? "bg-accent-primary text-white"
                        : isPassed
                        ? "bg-signal-ok/20 text-signal-ok border border-signal-ok/30"
                        : "bg-bg-secondary text-text-muted"
                    }`}
                  >
                    {isPassed ? "✓" : idx + 1}
                  </span>
                  <div className="min-w-0 hidden md:block">
                    <p
                      className={`truncate text-xs font-medium leading-none ${
                        isCurrent ? "text-accent-primary" : "text-text-secondary"
                      }`}
                    >
                      {step.title}
                    </p>
                    {step.subtitle && (
                      <p className="truncate text-[10px] text-text-muted mt-0.5">{step.subtitle}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenido del paso activo */}
      <div className="min-h-[220px]">
        {renderStep ? renderStep(activeIndex, currentStep) : children}
      </div>

      {/* Botonera de navegación inferior */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle pt-4">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={isFirst || isValidating}
            className="text-xs flex items-center gap-1.5 w-full sm:w-auto"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Paso Anterior</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {actionsSlot?.(activeIndex, {
            goNext: handleNext,
            goBack: handleBack,
            isFirst,
            isLast,
            isValidating,
          })}

          <Button
            variant={isLast ? "primary" : "primary"}
            size="sm"
            onClick={handleNext}
            disabled={isValidating}
            className="text-xs flex items-center gap-1.5 w-full sm:w-auto"
          >
            {isLast ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{completeLabel}</span>
              </>
            ) : (
              <>
                <span>Siguiente Paso</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
