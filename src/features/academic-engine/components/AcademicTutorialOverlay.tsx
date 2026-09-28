import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  BookOpen,
  Brain,
  Share2,
} from "lucide-react";

interface StepConfig {
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const TOUR_STEPS: StepConfig[] = [
  {
    targetSelector: '[data-tour="source-manager"]',
    title: "1. Gestor e Ingesta de Fuentes",
    description:
      "Arrastra tus PDFs universitarios, apuntes en Markdown o textos al uploader drag-and-drop. El motor local extraerá texto, páginas, fórmulas LaTeX y bounding boxes automáticamente.",
    icon: BookOpen,
    accentColor: "text-accent-primary border-accent-primary/40 bg-accent-primary/10",
  },
  {
    targetSelector: '[data-tour="canvas-viewer"]',
    title: "2. Visor Interactivo y Selección Ejecutable",
    description:
      "Explora tus documentos reales. Al seleccionar cualquier fragmento con el ratón aparece un menú flotante para: [✨ Generar Flashcard FSRS], [🧠 Evaluar con Feynman] o [🔗 Conectar al Grafo]. Además, cada bloque incluye '⚡ Ejecutar Simulacro' para evaluarte en ese párrafo.",
    icon: Sparkles,
    accentColor: "text-amber-400 border-amber-500/40 bg-amber-950/20",
  },
  {
    targetSelector: '[data-tour="cognitive-widgets"]',
    title: "3. Motor de Retención FSRS v4.5",
    description:
      "Repasa con rigor matemático. Los botones Again, Hard, Good y Easy calculan la estabilidad (S) y retención (R) exactas para maximizar tu retención a largo plazo sin sobre-estudio.",
    icon: Brain,
    accentColor: "text-purple-400 border-purple-500/40 bg-purple-950/20",
  },
  {
    targetSelector: '[data-tour="cognitive-widgets"]',
    title: "4. Grafo Causal y Ruta Crítica RPG",
    description:
      "El mapa de prerrequisitos de tu carrera: nodos verdes (R ≥ 80%) dominados, cian (50-79%) en progreso, y rojos (< 50%) bloqueados con candado. Haz clic en cualquier nodo para lanzar una sesión exprés inmediata.",
    icon: Share2,
    accentColor: "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
  },
];

interface AcademicTutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  stepIndex: number;
  onStepChange: (index: number) => void;
}

export const AcademicTutorialOverlay: React.FC<AcademicTutorialOverlayProps> = ({
  isOpen,
  onClose,
  stepIndex,
  onStepChange,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];
  const Icon = currentStep.icon;

  useEffect(() => {
    if (!isOpen) return;

    const updateRect = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    const interval = setInterval(updateRect, 300);

    return () => {
      window.removeEventListener("resize", updateRect);
      clearInterval(interval);
    };
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        if (stepIndex < TOUR_STEPS.length - 1) onStepChange(stepIndex + 1);
        else onClose();
      } else if (e.key === "ArrowLeft") {
        if (stepIndex > 0) onStepChange(stepIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, stepIndex, onStepChange, onClose]);

  if (!isOpen) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center font-sans">
      {/* Dark overlay backdrop with spotlight cutout if target element exists */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300" />

      {/* Target highlight ring */}
      {targetRect && (
        <div
          className="absolute border-2 border-accent-primary rounded-xl pointer-events-none ring-4 ring-accent-primary/20 shadow-lg transition-all duration-300"
          style={{
            top: `${Math.max(0, targetRect.top - 4)}px`,
            left: `${Math.max(0, targetRect.left - 4)}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
          }}
        />
      )}

      {/* Floating Tutorial Card */}
      <div className="relative z-50 w-full max-w-md mx-4 p-5 rounded-xl bg-bg-surface-2 border border-border-hairline shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${currentStep.accentColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] text-accent-primary uppercase tracking-wider block">
                Guía Interactiva • Paso {stepIndex + 1} de {TOUR_STEPS.length}
              </span>
              <h3 className="font-display font-semibold text-sm text-text-primary">
                {currentStep.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-xs text-text-secondary leading-relaxed font-sans">
          {currentStep.description}
        </p>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-between pt-2 border-t border-border-hairline">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onStepChange(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex
                    ? "w-6 bg-accent-primary"
                    : i < stepIndex
                      ? "w-2 bg-emerald-500"
                      : "w-2 bg-border-subtle"
                }`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStepChange(stepIndex - 1)}
                className="text-xs font-mono h-7 px-2.5 text-text-secondary hover:text-text-primary"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                Atrás
              </Button>
            )}

            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (isLast) onClose();
                else onStepChange(stepIndex + 1);
              }}
              className="text-xs font-mono h-7 px-3 flex items-center gap-1"
            >
              {isLast ? "Comenzar a Estudiar" : "Siguiente"}
              {!isLast && <ChevronRight className="w-3.5 h-3.5 ml-0.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
