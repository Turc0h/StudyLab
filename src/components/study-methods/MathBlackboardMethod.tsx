import React, { useState, useEffect } from "react";
import {
  Binary,
  CheckCircle2,
  HelpCircle,
  Eye,
  ChevronRight,
  RotateCcw,
  Save,
  Clock,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { renderLatexToHtml } from "../../lib/latexHelper";
import {
  PRESET_MATH_THEOREMS,
  validateStepDerivation,
  saveMathBlackboardSessionRecord,
  type MathTheorem,
  type DerivationStep,
} from "../../features/math-blackboard/mathBlackboardEngine";

interface MathBlackboardMethodProps {
  onSessionFinished?: () => void;
}

const QUICK_MATH_SYMBOLS = [
  { label: "\\int", insert: "\\int_{a}^{b} " },
  { label: "\\sum", insert: "\\sum_{n=1}^{\\infty} " },
  { label: "\\lim", insert: "\\lim_{h \\to 0} " },
  { label: "\\frac", insert: "\\frac{a}{b}" },
  { label: "\\sqrt", insert: "\\sqrt{x}" },
  { label: "\\partial", insert: "\\partial " },
  { label: "\\nabla", insert: "\\nabla " },
  { label: "\\alpha", insert: "\\alpha " },
  { label: "\\beta", insert: "\\beta " },
  { label: "\\sigma", insert: "\\sigma " },
  { label: "\\lambda", insert: "\\lambda " },
  { label: "\\infty", insert: "\\infty " },
  { label: "\\ge", insert: "\\ge " },
  { label: "\\le", insert: "\\le " },
  { label: "\\in", insert: "\\in " },
  { label: "\\iff", insert: "\\iff " },
  { label: "\\implies", insert: "\\implies " },
];

export const MathBlackboardMethod: React.FC<MathBlackboardMethodProps> = ({ onSessionFinished }) => {
  const [selectedTheorem, setSelectedTheorem] = useState<MathTheorem>(PRESET_MATH_THEOREMS[0]);
  const [revealedStepIndex, setRevealedStepIndex] = useState<number>(0);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [showHint, setShowHint] = useState<boolean>(false);
  const [stepFeedback, setStepFeedback] = useState<{
    isCorrect: boolean;
    score: number;
    feedback: string;
  } | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [sessionSaved, setSessionSaved] = useState<boolean>(false);

  // Timer
  useEffect(() => {
    if (!isFinished) {
      const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isFinished]);

  const activeStep: DerivationStep | undefined = selectedTheorem.steps[revealedStepIndex];

  const handleSelectTheorem = (theorem: MathTheorem) => {
    setSelectedTheorem(theorem);
    setRevealedStepIndex(0);
    setCurrentInput("");
    setShowHint(false);
    setStepFeedback(null);
    setIsFinished(false);
    setElapsedSec(0);
    setSessionSaved(false);
  };

  const handleInsertSymbol = (symbol: string) => {
    setCurrentInput((prev) => prev + symbol);
  };

  const handleCheckDerivation = () => {
    if (!activeStep) return;
    const result = validateStepDerivation(
      currentInput,
      activeStep.latexFormula,
      activeStep.keyTokens,
    );
    setStepFeedback(result);

    if (result.isCorrect) {
      setTimeout(() => {
        handleAdvanceStep();
      }, 1500);
    }
  };

  const handleAdvanceStep = () => {
    if (revealedStepIndex + 1 < selectedTheorem.steps.length) {
      setRevealedStepIndex((prev) => prev + 1);
      setCurrentInput("");
      setShowHint(false);
      setStepFeedback(null);
    } else {
      setIsFinished(true);
    }
  };

  const handleRevealStep = () => {
    if (!activeStep) return;
    setCurrentInput(activeStep.latexFormula);
    setStepFeedback({
      isCorrect: true,
      score: 6.0,
      feedback: "Paso revelado para consolidación. Analizá los términos y continuá con la deducción subsiguiente.",
    });
  };

  const handleSaveSession = async () => {
    if (sessionSaved) return;
    try {
      await saveMathBlackboardSessionRecord(
        selectedTheorem.title,
        elapsedSec,
        selectedTheorem.steps.length,
      );
      setSessionSaved(true);
      if (onSessionFinished) onSessionFinished();
    } catch (err) {
      console.error("Error al guardar sesión de pizarra matemática:", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="accent" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
              <Binary className="w-3.5 h-3.5 mr-1" />
              Pizarra Matemática & Demostración Ciega
            </Badge>
            <Badge variant="neutral" className="text-muted-foreground">
              v5.27
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Demostraciones Paso a Paso & Pizarra KaTeX
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Evocación ciega de deducciones teóricas paso a paso, justificación algebraica y validación formal.
          </p>
        </div>

        {/* Selector de Teoremas */}
        <div className="flex items-center gap-3">
          <select
            value={selectedTheorem.id}
            onChange={(e) => {
              const found = PRESET_MATH_THEOREMS.find((t) => t.id === e.target.value);
              if (found) handleSelectTheorem(found);
            }}
            className="bg-card text-foreground border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {PRESET_MATH_THEOREMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.field.split("&")[0]} — {t.title}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/30 px-2.5 py-1.5 rounded-md border border-border/40">
            <Clock className="w-3.5 h-3.5 text-primary" />
            {Math.floor(elapsedSec / 60)}:{(elapsedSec % 60).toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Tarjeta del Teorema: Enunciado, Hipótesis y Tesis */}
      <Card className="p-6 border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              {selectedTheorem.field}
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mt-1">
              {selectedTheorem.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 italic">
              {selectedTheorem.historicalContext}
            </p>
          </div>
          <Badge variant="neutral" className="bg-primary/10 text-primary border-primary/30">
            {selectedTheorem.steps.length} Pasos Deductivos
          </Badge>
        </div>

        {/* Hipótesis */}
        <div className="my-4 p-4 rounded-lg bg-muted/20 border border-border/30">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Hipótesis de Partida:
          </span>
          <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside">
            {selectedTheorem.hypotheses.map((h, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: renderLatexToHtml(h) }} />
            ))}
          </ul>
        </div>

        {/* Tesis */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-1">
            Tesis a Demostrar:
          </span>
          <div
            className="text-base text-foreground font-serif text-center py-2"
            dangerouslySetInnerHTML={{
              __html: renderLatexToHtml(`$$${selectedTheorem.thesisLatex}$$`),
            }}
          />
        </div>
      </Card>

      {/* PIZARRA DE DEMOSTRACIÓN ACTIVA */}
      {!isFinished && (
        <div className="space-y-6">
          {/* Pasos Previamente Deducidos */}
          {revealedStepIndex > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Pasos Previamente Validados ({revealedStepIndex} de {selectedTheorem.steps.length})
              </h3>
              {selectedTheorem.steps.slice(0, revealedStepIndex).map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-foreground space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400">
                      Paso {step.stepNumber}: {step.name}
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      Deducido
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{step.explanation}</p>
                  <div
                    className="p-2 bg-background/80 rounded border border-border/40 text-center font-serif text-sm overflow-x-auto"
                    dangerouslySetInnerHTML={{
                      __html: renderLatexToHtml(`$$${step.latexFormula}$$`),
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Paso Activo a Deducir (Evocación Ciega) */}
          {activeStep && (
            <Card className="p-6 border-primary/40 bg-gradient-to-b from-card to-background shadow-xl">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground font-bold">
                    Paso {activeStep.stepNumber} de {selectedTheorem.steps.length}
                  </Badge>
                  <span className="font-semibold text-sm text-foreground">{activeStep.name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs"
                >
                  <HelpCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  {showHint ? "Ocultar Pista" : "Ver Pista"}
                </Button>
              </div>

              {/* Justificación y Pregunta Cognitiva */}
              <div className="space-y-2 mb-4">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {activeStep.explanation}
                </p>
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-md text-xs text-cyan-300 font-medium">
                  <strong>Desafío Deductivo:</strong> {activeStep.cognitiveQuestion}
                </div>
              </div>

              {/* Pista si se solicita */}
              {showHint && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-amber-300 mb-4 animate-in fade-in">
                  <strong>Pista de Cátedra:</strong> {activeStep.hint}
                </div>
              )}

              {/* Barra de Símbolos Rápidos */}
              <div className="mb-3">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1.5">
                  Insertar Operadores KaTeX:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_MATH_SYMBOLS.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInsertSymbol(s.insert)}
                      className="px-2 py-1 text-xs font-mono bg-muted/40 hover:bg-muted text-foreground rounded border border-border/60 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo de Entrada de Fórmula */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Escribí tu deducción en sintaxis KaTeX / LaTeX (ej: \int_x^{x+h} f(t)dt = f(c_h) h)..."
                  className="w-full bg-background border border-border/80 rounded-lg p-3 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />

                {/* Previsualización en Vivo de la Fórmula */}
                {currentInput.trim() && (
                  <div className="p-3 bg-muted/20 border border-border/40 rounded-lg text-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      Previsualización KaTeX en Vivo:
                    </span>
                    <div
                      className="text-base text-foreground font-serif py-1 overflow-x-auto"
                      dangerouslySetInnerHTML={{
                        __html: renderLatexToHtml(`$$${currentInput}$$`),
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Feedback del paso */}
              {stepFeedback && (
                <div
                  className={`mt-4 p-3 rounded-lg text-xs flex items-center justify-between gap-3 ${
                    stepFeedback.isCorrect
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                  }`}
                >
                  <span>{stepFeedback.feedback}</span>
                  <Badge variant={stepFeedback.isCorrect ? "success" : "error"}>
                    {stepFeedback.score} / 10
                  </Badge>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60">
                <Button variant="outline" size="sm" onClick={handleRevealStep}>
                  <Eye className="w-4 h-4 mr-1.5" />
                  Revelar Expresión Oficial
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCheckDerivation}
                    disabled={!currentInput.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Validar Deducción
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAdvanceStep}>
                    Omitir / Siguiente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ESTADO FINAL: Teorema Demostrado con Éxito */}
      {isFinished && (
        <Card className="p-8 border-emerald-500/40 bg-card text-center space-y-6 shadow-2xl animate-in fade-in">
          <div className="inline-flex p-4 bg-emerald-500/10 rounded-full text-emerald-400 mx-auto">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
              ¡Demostración Completa & Rigurosa!
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-1">
              {selectedTheorem.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
              Completaste los {selectedTheorem.steps.length} pasos deductivos del teorema con fundamento matemático, validando la tesis final mediante evocación ciega.
            </p>
          </div>

          <div
            className="p-4 rounded-xl bg-background/80 border border-border/60 max-w-lg mx-auto font-serif text-lg text-primary overflow-x-auto"
            dangerouslySetInnerHTML={{
              __html: renderLatexToHtml(`$$${selectedTheorem.thesisLatex}$$`),
            }}
          />

          <div className="flex items-center justify-center gap-4 pt-4 border-t border-border/40">
            <Button
              variant="outline"
              onClick={handleSaveSession}
              disabled={sessionSaved}
              className={sessionSaved ? "text-emerald-400 border-emerald-500/40" : ""}
            >
              <Save className="w-4 h-4 mr-1.5" />
              {sessionSaved ? "Deducción Guardada en Historial" : "Guardar en Historial"}
            </Button>

            <Button
              onClick={() => handleSelectTheorem(selectedTheorem)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Repetir Demostración
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MathBlackboardMethod;
