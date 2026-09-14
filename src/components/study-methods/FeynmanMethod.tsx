import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { CheckCircle2, Play, Pause, RotateCcw } from "lucide-react";

export interface FeynmanMethodProps {
  onSessionFinished?: () => void;
}

export const FeynmanMethod: React.FC<FeynmanMethodProps> = ({ onSessionFinished }) => {
  const [step, setStep] = useState<number>(1);
  const [concept, setConcept] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [confusions, setConfusions] = useState<string>("");
  const [analogy, setAnalogy] = useState<string>("");

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Timer and Protocol Steps */}
      <Card elevated>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-sans text-xs uppercase tracking-wider text-accent-secondary font-medium">
              Protocolo en 4 Fases
            </span>
            <h2 className="font-serif text-xl font-semibold text-text-primary">
              Técnica Feynman
            </h2>
            <p className="font-sans text-xs text-text-secondary mt-0.5">
              Aprende a través de la enseñanza activa y la simplificación conceptual
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-medium text-text-primary tabular-nums">
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
          </div>
        </div>

        {/* 4 Steps Navigation Bar */}
        <div className="mt-6 grid grid-cols-4 gap-2 border-t border-border-subtle pt-4 text-xs font-sans">
          {[
            { num: 1, label: "Concepto" },
            { num: 2, label: "Explicación" },
            { num: 3, label: "Lagunas" },
            { num: 4, label: "Analogía" },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-1.5 p-2 rounded transition-colors text-left ${
                step === s.num
                  ? "bg-accent-primary/10 text-accent-primary font-medium border border-accent-primary/20"
                  : "text-text-muted hover:bg-bg-secondary hover:text-text-secondary"
              }`}
            >
              <span className="font-mono font-semibold">{s.num}.</span>
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Active Phase Card */}
      <Card elevated>
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Fase 1: Define el concepto o teorema</CardTitle>
              <span className="text-xs text-text-secondary">
                Escribe con precisión el tema específico que vas a desglosar en esta sesión.
              </span>
            </CardHeader>
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ejemplo: Ley de Conservación del Momento Angular, o Teorema de Bayes..."
              autoFocus
            />
            <div className="flex justify-end mt-2">
              <Button onClick={() => setStep(2)} disabled={!concept.trim()}>
                Siguiente: Explicación básica →
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Fase 2: Explícalo a un estudiante de primer año</CardTitle>
              <span className="text-xs text-text-secondary">
                Usa lenguaje claro. Prohibido usar jerga técnica sin definirla previamente.
              </span>
            </CardHeader>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={6}
              placeholder="Imagina que se lo estás explicando a alguien que nunca cursó esta materia..."
            />
            <div className="flex justify-between mt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                ← Volver
              </Button>
              <Button onClick={() => setStep(3)} disabled={!explanation.trim()}>
                Siguiente: Identificar lagunas →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Fase 3: Identifica lagunas y términos oscuros</CardTitle>
              <span className="text-xs text-text-secondary">
                ¿En qué parte tuviste que recurrir a fórmulas de memoria o explicaciones circulares?
              </span>
            </CardHeader>
            <Textarea
              value={confusions}
              onChange={(e) => setConfusions(e.target.value)}
              rows={4}
              placeholder="Anota las dudas puntuales o pasos lógicos que necesitan revisión en la bibliografía..."
            />
            <div className="flex justify-between mt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                ← Volver
              </Button>
              <Button onClick={() => setStep(4)}>
                Siguiente: Analogía y cierre →
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Fase 4: Construye una analogía intuitiva</CardTitle>
              <span className="text-xs text-text-secondary">
                Sintetiza el principio central vinculándolo con una experiencia cotidiana concreta.
              </span>
            </CardHeader>
            <Textarea
              value={analogy}
              onChange={(e) => setAnalogy(e.target.value)}
              rows={4}
              placeholder="Una analogía o historia sencilla que capture la esencia matemática o conceptual..."
            />

            {savedSuccess ? (
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded text-success text-xs font-sans font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Sesión Feynman guardada exitosamente en tu base de datos local.</span>
              </div>
            ) : (
              <div className="flex justify-between mt-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  ← Volver
                </Button>
                <Button variant="secondary" onClick={handleFinish} disabled={!concept.trim()}>
                  Concluir y Guardar Sesión
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
