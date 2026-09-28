import React, { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { CheckCircle2, Play, Pause, RotateCcw, BrainCircuit, AlertTriangle } from "lucide-react";
import { Feynman2Runner } from "../../features/session-engine/components/Feynman2Runner";
import { StepperShell, type StepItem } from "../shells";
import { analyzeFeynmanExplanation, type FeynmanGap } from "../../features/session-engine/feynmanEngine";
import { Badge } from "../ui/Badge";

const FEYNMAN_STEPS: StepItem[] = [
  { id: "step-1", title: "Definir concepto", subtitle: "Fase 1", description: "Define con precisión el concepto, teorema o principio que vas a desglosar." },
  { id: "step-2", title: "Explicación llana", subtitle: "Fase 2", description: "Explícalo con tus palabras como si enseñaras a un estudiante de primer año sin jerga previa." },
  { id: "step-3", title: "Detectar lagunas", subtitle: "Fase 3", description: "Identifica qué partes requirieron saltos lógicos, memorización forzada o términos oscuros." },
  { id: "step-4", title: "Crear analogía", subtitle: "Fase 4", description: "Sintetiza el principio central construyendo una analogía intuitiva de la vida cotidiana." },
];

export interface FeynmanMethodProps {
  onSessionFinished?: () => void;
}

export const FeynmanMethod: React.FC<FeynmanMethodProps> = ({ onSessionFinished }) => {
  const [feynmanVersion, setFeynmanVersion] = useState<"v2" | "classic">("v2");
  const [step, setStep] = useState<number>(1);
  const [concept, setConcept] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [confusions, setConfusions] = useState<string>("");
  const [analogy, setAnalogy] = useState<string>("");

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [jargonAlerts, setJargonAlerts] = useState<FeynmanGap[]>([]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    if (step === 3 && explanation.trim()) {
      void analyzeFeynmanExplanation(concept || "Concepto", explanation).then((res) => {
        setJargonAlerts(res.gaps.filter((g) => g.type === "jargon"));
      });
    }
  }, [step, concept, explanation]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handleFinish = async () => {
    if (!concept.trim()) return;

    await saveStudySession({
      id: `feynman_${Date.now()}`,
      methodId: "feynman",
      subject: "Autodidacta / Universidad",
      topic: concept,
      durationMinutes: Math.max(1, Math.round((25 * 60 - secondsLeft) / 60)),
      notes: `Explicación:\n${explanation}\n\nLagunas:\n${confusions}\n\nAnalogía:\n${analogy}`,
      completedAt: Date.now(),
      qualityScore: 5,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onSessionFinished?.();
    }, 1500);
  };

  if (feynmanVersion === "v2") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-xl border border-border-hairline bg-bg-surface-1 p-2.5 shadow-sm">
          <span className="text-xs font-mono text-text-tertiary">Modo de estudio:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFeynmanVersion("v2")}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-mono font-semibold bg-bg-surface-3 text-text-primary border border-border-hairline transition-colors"
            >
              <BrainCircuit className="h-3.5 w-3.5 text-accent-primary" /> Feynman 2.0 (Auditoría Cátedra)
            </button>
            <button
              type="button"
              onClick={() => setFeynmanVersion("classic")}
              className="rounded px-3 py-1.5 text-xs font-mono text-text-tertiary hover:text-text-primary border border-transparent transition-colors"
            >
              Protocolo Tradicional (4 pasos)
            </button>
          </div>
        </div>
        <Feynman2Runner onFinish={onSessionFinished} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border-hairline bg-bg-surface-1 p-4 shadow-xs">
        <div>
          <span className="text-xs font-mono text-text-tertiary">
            Protocolo pedagógico secuencial
          </span>
          <h2 className="font-serif text-lg font-bold text-text-primary mt-0.5">
            Técnica Feynman
          </h2>
          <p className="font-sans text-xs text-text-tertiary mt-0.5">
            Aprende a través de la enseñanza activa y la simplificación conceptual progresiva.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xl font-bold text-text-primary tabular-nums">
            {formattedTime}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRunning((r) => !r)}
            aria-label={isRunning ? "Pausar cronómetro" : "Iniciar cronómetro"}
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsRunning(false);
              setSecondsLeft(25 * 60);
            }}
            aria-label="Reiniciar cronómetro"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => setFeynmanVersion("v2")}
            className="flex items-center gap-1.5 text-xs font-mono text-accent-primary hover:underline font-semibold ml-2"
          >
            <BrainCircuit className="h-3.5 w-3.5" /> Feynman 2.0
          </button>
        </div>
      </div>

      <StepperShell
        title="Protocolo Feynman Tradicional"
        badgeText="4 Fases"
        steps={FEYNMAN_STEPS}
        currentStepIndex={step - 1}
        onStepChange={(idx) => setStep(idx + 1)}
        canAdvance={(idx) => {
          if (idx === 0) return Boolean(concept.trim());
          if (idx === 1) return Boolean(explanation.trim());
          return true;
        }}
        onComplete={handleFinish}
        completeLabel="Concluir y Guardar Sesión"
        onReset={() => setStep(1)}
        renderStep={(activeIndex) => {
          if (activeIndex === 0) {
            return (
              <div className="flex flex-col gap-3">
                <label className="font-sans text-xs font-medium text-text-primary">
                  Concepto, teorema o ley central a desglosar:
                </label>
                <Input
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ejemplo: Ley de Conservación del Momento Angular, o Teorema de Bayes..."
                  autoFocus
                />
              </div>
            );
          }
          if (activeIndex === 1) {
            return (
              <div className="flex flex-col gap-3">
                <label className="font-sans text-xs font-medium text-text-primary">
                  Explicación en lenguaje llano (como si enseñaras a alguien sin formación previa):
                </label>
                <Textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={6}
                  placeholder="Imagina que se lo estás explicando a alguien que nunca cursó esta materia..."
                />
              </div>
            );
          }
          if (activeIndex === 2) {
            return (
              <div className="flex flex-col gap-3">
                {jargonAlerts.length > 0 && (
                  <div className="rounded-lg border border-signal-warning/30 bg-signal-warning/10 p-3 space-y-2">
                    <span className="text-xs font-mono font-semibold text-signal-warning flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Detector de jerga de cátedra (análisis de tu explicación previa):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {jargonAlerts.map((gap) => (
                        <Badge key={gap.id} variant="warning" className="text-[11px] font-mono">
                          {gap.studentQuote || gap.title}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[11px] text-text-tertiary">
                      En el protocolo Feynman, si usaste estos términos técnicos como muletillas sin desarmar su mecanismo, anótalos abajo como lagunas para consultar la bibliografía.
                    </p>
                  </div>
                )}
                <label className="font-sans text-xs font-medium text-text-primary">
                  Lagunas conceptuales, saltos lógicos y términos oscuros detectados:
                </label>
                <Textarea
                  value={confusions}
                  onChange={(e) => setConfusions(e.target.value)}
                  rows={5}
                  placeholder="Anota las dudas puntuales o pasos lógicos que necesitan revisión en la bibliografía..."
                />
              </div>
            );
          }
          return (
            <div className="flex flex-col gap-3">
              <label className="font-sans text-xs font-medium text-text-primary">
                Analogía o metáfora cotidiana intuitiva:
              </label>
              <Textarea
                value={analogy}
                onChange={(e) => setAnalogy(e.target.value)}
                rows={5}
                placeholder="Una analogía o historia sencilla que capture la esencia matemática o conceptual..."
              />
              {savedSuccess && (
                <div className="flex items-center gap-2 p-3 bg-signal-ok/10 border border-signal-ok/30 rounded-lg text-signal-ok text-xs font-mono font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sesión Feynman guardada exitosamente en tu base de datos local.</span>
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
};
