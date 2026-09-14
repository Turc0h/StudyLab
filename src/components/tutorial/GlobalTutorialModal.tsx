import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useTutorialStore,
  TUTORIAL_STEPS,
  type TutorialStep,
} from "../../stores/useTutorialStore";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  X,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Sparkles,
  ExternalLink,
  Compass,
  CheckCircle2,
  Lightbulb,
  Brain,
  RotateCcw,
} from "lucide-react";

export const GlobalTutorialModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    isOpen,
    activeTab,
    currentStepIndex,
    closeTutorial,
    nextStep,
    prevStep,
    goToStep,
    setTab,
  } = useTutorialStore();

  const [filterCategory, setFilterCategory] = useState<string>("all");

  const currentStep: TutorialStep = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeTutorial();
      } else if (activeTab === "tour") {
        if (e.key === "ArrowRight") nextStep();
        else if (e.key === "ArrowLeft") prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeTab, nextStep, prevStep, closeTutorial]);

  if (!isOpen) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNavigateToModule = (route: string) => {
    navigate(route);
    closeTutorial();
  };

  const getAccentStyles = (accent: TutorialStep["accent"]) => {
    switch (accent) {
      case "cyan":
        return {
          border: "border-cyan-500/40",
          bg: "bg-cyan-950/20",
          text: "text-cyan-400",
          badge: "accent" as const,
        };
      case "purple":
        return {
          border: "border-purple-500/40",
          bg: "bg-purple-950/20",
          text: "text-purple-400",
          badge: "neutral" as const,
        };
      case "emerald":
        return {
          border: "border-emerald-500/40",
          bg: "bg-emerald-950/20",
          text: "text-emerald-400",
          badge: "success" as const,
        };
      case "amber":
        return {
          border: "border-amber-500/40",
          bg: "bg-amber-950/20",
          text: "text-amber-400",
          badge: "warning" as const,
        };
    }
  };

  const styles = getAccentStyles(currentStep.accent);

  const filteredSteps =
    filterCategory === "all"
      ? TUTORIAL_STEPS
      : TUTORIAL_STEPS.filter((s) => s.category === filterCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
        onClick={closeTutorial}
      />

      {/* Main Modal Card */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-slate-100 flex items-center gap-2">
                Guía Maestra & Tutorial Completo de StudyLab
                <span className="font-mono text-[10px] text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">
                  v4.1
                </span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Aprende a dominar todos los módulos de alto rendimiento cognitivo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 font-mono text-xs">
              <button
                type="button"
                onClick={() => setTab("tour")}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                  activeTab === "tour"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tour Guiado</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("docs")}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                  activeTab === "docs"
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Manual Completo ({TUTORIAL_STEPS.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={closeTutorial}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: STEP-BY-STEP GUIDED TOUR */}
        {activeTab === "tour" && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4">
            {/* Step Header Badge & Category */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-cyan-400 font-bold">
                  Módulo {currentStepIndex + 1} de {TUTORIAL_STEPS.length}
                </span>
                <span className="text-slate-600">•</span>
                <Badge variant={styles.badge} className="font-mono text-[10px]">
                  {currentStep.category}
                </Badge>
              </div>

              <button
                type="button"
                onClick={() => handleNavigateToModule(currentStep.route)}
                className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors group"
              >
                <span>Probar módulo en vivo ({currentStep.route})</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Title & Subtitle Card */}
            <div className={`p-4 rounded-xl border ${styles.border} ${styles.bg}`}>
              <h3 className="font-display text-base font-bold text-slate-100 mb-1">
                {currentStep.title}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                {currentStep.subtitle}
              </p>
              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Key Capabilities & How To Use Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Features */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Capacidades Principales
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  {currentStep.keyFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-cyan-400 font-mono text-[10px] mt-0.5">▸</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Protocol How To Use */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  Protocolo de Uso Óptimo
                </span>
                <ol className="space-y-2 text-xs text-slate-300">
                  {currentStep.howToUse.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="font-mono text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30 shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Cognitive Benefit Box */}
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3">
              <Brain className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-display font-semibold text-xs text-purple-300 block mb-0.5">
                  Fundamento en Neurociencia Cognitiva:
                </strong>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {currentStep.cognitiveBenefit}
                </p>
              </div>
            </div>

            {/* Tip Box */}
            {currentStep.shortcutOrTip && (
              <div className="px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400">
                {currentStep.shortcutOrTip}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMPLETE MANUAL / REFERENCE (ALL 8 MODULES) */}
        {activeTab === "docs" && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
              <span className="text-slate-500 mr-1">Filtrar:</span>
              {["all", "Core", "Académico", "Cognitivo", "Productividad"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                    filterCategory === cat
                      ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 font-bold"
                      : "border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {cat === "all" ? "Todos los Módulos" : cat}
                </button>
              ))}
            </div>

            {/* Grid of Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSteps.map((step) => {
                const stepIdx = TUTORIAL_STEPS.findIndex((s) => s.id === step.id);
                return (
                  <div
                    key={step.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-display font-semibold text-xs text-slate-200">
                          {step.title}
                        </span>
                        <Badge variant="neutral" className="font-mono text-[9px]">
                          {step.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          goToStep(stepIdx);
                          setTab("tour");
                        }}
                        className="text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        Ver en Tour ↗
                      </button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleNavigateToModule(step.route)}
                        className="text-[10px] h-6 px-2 font-mono flex items-center gap-1"
                      >
                        <span>Abrir</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          {/* Step dots navigation */}
          {activeTab === "tour" ? (
            <div className="flex items-center gap-1.5">
              {TUTORIAL_STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToStep(i)}
                  title={TUTORIAL_STEPS[i].title}
                  className={`h-2 rounded-full transition-all ${
                    i === currentStepIndex
                      ? "w-6 bg-cyan-400"
                      : i < currentStepIndex
                        ? "w-2 bg-emerald-400"
                        : "w-2 bg-slate-700 hover:bg-slate-600"
                  }`}
                />
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                goToStep(0);
                setTab("tour");
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar recorrido desde el paso 1</span>
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {activeTab === "tour" && !isFirst && (
              <Button
                size="sm"
                variant="ghost"
                onClick={prevStep}
                className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </Button>
            )}

            {activeTab === "tour" ? (
              <Button
                size="sm"
                variant="primary"
                onClick={nextStep}
                className="text-xs font-mono flex items-center gap-1 shadow-md shadow-cyan-500/20"
              >
                <span>{isLast ? "¡Completar y Cerrar!" : "Siguiente Módulo"}</span>
                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={closeTutorial}
                className="text-xs font-mono"
              >
                Cerrar Guía
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
