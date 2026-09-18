import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  GitCommit, 
  HelpCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Sparkles
} from "lucide-react";

export interface SelfExplanationMethodProps {
  onSessionFinished?: () => void;
}

interface ReasoningStep {
  id: string;
  stepNumber: number;
  actionText: string;
  justification: string;
  boundaryCondition: string;
}

const DEFAULT_STEPS: ReasoningStep[] = [
  {
    id: "step_1",
    stepNumber: 1,
    actionText: "Partimos de la definición de probabilidad condicional: P(A ∩ B) = P(A|B) * P(B)",
    justification: "Axioma fundamental de Kolmogorov: la probabilidad conjunta es el producto de la condicional por la marginal.",
    boundaryCondition: "Si A y B fueran independientes, P(A|B) = P(A), simplificando la expresión.",
  },
  {
    id: "step_2",
    stepNumber: 2,
    actionText: "Por simetría de la intersección, también es válido: P(A ∩ B) = P(B|A) * P(A)",
    justification: "Propiedad conmutativa de conjuntos: la intersección de A y B es idéntica a la de B y A.",
    boundaryCondition: "Requiere que P(A) > 0 y P(B) > 0 para que las condicionales estén bien definidas.",
  },
  {
    id: "step_3",
    stepNumber: 3,
    actionText: "Igualamos ambas expresiones: P(A|B) * P(B) = P(B|A) * P(A) y despejamos P(A|B)",
    justification: "Regla algebraica transitiva: si dos expresiones igualan al mismo término, son iguales entre sí.",
    boundaryCondition: "Se obtiene la forma elemental del Teorema de Bayes.",
  },
];

export const SelfExplanationMethod: React.FC<SelfExplanationMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Demostración del Teorema de Bayes");
  const [steps, setSteps] = useState<ReasoningStep[]>(DEFAULT_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Nuevo paso
  const [newAction, setNewAction] = useState<string>("");
  const [newJustification, setNewJustification] = useState<string>("");
  const [newBoundary, setNewBoundary] = useState<string>("");

  const handleAddStep = () => {
    if (!newAction.trim() || !newJustification.trim()) return;
    const nextStep: ReasoningStep = {
      id: `step_${Date.now()}`,
      stepNumber: steps.length + 1,
      actionText: newAction.trim(),
      justification: newJustification.trim(),
      boundaryCondition: newBoundary.trim() || "Condición estándar del sistema",
    };
    setSteps((prev) => [...prev, nextStep]);
    setNewAction("");
    setNewJustification("");
    setNewBoundary("");
  };

  const handleRemoveStep = (id: string) => {
    setSteps((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, idx) => ({ ...s, stepNumber: idx + 1 }))
    );
  };

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `self_explain_${Date.now()}`,
      methodId: "self-explanation",
      subject: "Autoexplicación de Procesos",
      topic: topic || "Demostración Paso a Paso",
      durationMinutes: Math.max(15, steps.length * 5),
      notes: `Tema: ${topic}\nPasos explicados (${steps.length}):\n${steps
        .map(
          (s) =>
            `[Paso ${s.stepNumber}]: ${s.actionText}\n  • ¿Por qué es válido?: ${s.justification}\n  • Variación de premisa: ${s.boundaryCondition}`
        )
        .join("\n\n")}`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  const currentStep = steps[currentStepIndex];

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Efecto de Autoexplicación (Self-Explanation)</CardTitle>
            <Badge variant="accent">Metacognición Causal</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Analiza demostraciones o códigos paso a paso respondiendo por qué cada transformación es válida y cómo cambiaría ante variaciones.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinishSession}
          disabled={steps.length === 0}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Guardar Sesión ({steps.length} Pasos)</span>
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-text-primary font-sans">
          Problema, Teorema o Código a Autoexplicar:
        </label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Derivación de Ecuación de Ondas, Algoritmo Quicksort..."
        />
      </div>

      {/* Stepper Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border-subtle">
        {steps.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentStepIndex(idx)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono transition-colors shrink-0 ${
              currentStepIndex === idx
                ? "bg-accent-primary text-bg-elevated font-bold"
                : "bg-bg-secondary text-text-secondary border border-border-subtle hover:bg-bg-elevated"
            }`}
          >
            <GitCommit className="h-3 w-3" />
            <span>Paso {s.stepNumber}</span>
          </button>
        ))}
      </div>

      {/* Active Step Details */}
      {currentStep && (
        <div className="rounded-xl border border-border-subtle bg-bg-secondary p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-primary/10 font-mono text-xs font-bold text-accent-primary">
                {currentStep.stepNumber}
              </span>
              <h4 className="font-serif text-sm font-semibold text-text-primary">
                Transformación o Línea de Código
              </h4>
            </div>

            <button
              type="button"
              onClick={() => handleRemoveStep(currentStep.id)}
              className="text-text-muted hover:text-rose-400 transition-colors p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-sm font-mono font-medium text-text-primary bg-bg-elevated p-3 rounded-lg border border-border-subtle">
            {currentStep.actionText}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                <span>¿Por qué es válido este paso específico?</span>
              </span>
              <p className="text-xs text-text-primary leading-relaxed">
                {currentStep.justification}
              </p>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>¿Qué cambiaría si la premisa varía?</span>
              </span>
              <p className="text-xs text-text-primary leading-relaxed">
                {currentStep.boundaryCondition}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form to Add Step */}
      <div className="rounded-xl border border-dashed border-border-hover bg-bg-secondary/60 p-4 space-y-3">
        <span className="text-xs font-semibold text-text-primary font-serif flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5 text-accent-primary" />
          <span>Agregar Siguiente Paso de Razonamiento</span>
        </span>

        <Input
          placeholder="Línea de cálculo o deducción (Ej: Derivamos ambos miembros respecto al tiempo)"
          value={newAction}
          onChange={(e) => setNewAction(e.target.value)}
        />
        <Textarea
          rows={2}
          placeholder="¿Por qué el autor realiza este paso? (Regla, teorema o principio que lo sustenta)"
          value={newJustification}
          onChange={(e) => setNewJustification(e.target.value)}
        />
        <Input
          placeholder="¿Qué pasaría si cambiara la condición inicial? (Condición de frontera)"
          value={newBoundary}
          onChange={(e) => setNewBoundary(e.target.value)}
        />

        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddStep}
            disabled={!newAction.trim() || !newJustification.trim()}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Agregar Paso</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
