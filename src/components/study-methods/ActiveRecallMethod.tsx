import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { Eye, EyeOff } from "lucide-react";

export interface ActiveRecallMethodProps {
  onSessionFinished?: () => void;
}

export const ActiveRecallMethod: React.FC<ActiveRecallMethodProps> = ({ onSessionFinished }) => {
  const [question, setQuestion] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [referenceAnswer, setReferenceAnswer] = useState<string>("");
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [selfScore, setSelfScore] = useState<number | null>(null);

  const handleFinish = async () => {
    if (!question.trim() || !userAnswer.trim()) return;
    await saveStudySession({
      id: `recall_${Date.now()}`,
      methodId: "active-recall",
      subject: "Recuperación Activa",
      topic: question,
      durationMinutes: 20,
      notes: `Respuesta dada:\n${userAnswer}\n\nReferencia:\n${referenceAnswer}\nCalificación: ${selfScore}/5`,
      completedAt: Date.now(),
      qualityScore: selfScore || 3,
    });
    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Recuperación Activa (Active Recall)</CardTitle>
        <span className="text-xs text-text-secondary">
          Recuperar información desde la memoria sin consultar apuntes consolida los trazos sinápticos
        </span>
      </CardHeader>

      <div className="flex flex-col gap-3">
        <label className="font-sans text-xs font-medium text-text-primary">
          Pregunta o problema a resolver:
        </label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ej: ¿Cuáles son los axiomas de un espacio vectorial según Peano?"
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="font-sans text-xs font-medium text-text-primary">
          Tu respuesta recuperada (sin mirar apuntes):
        </label>
        <Textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          rows={5}
          placeholder="Escribe todo lo que recuerdes con tus palabras y fórmulas..."
        />
      </div>

      <div className="border-t border-border-subtle pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="font-sans text-xs font-medium text-text-primary">
            Respuesta de referencia (del libro / cátedra):
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRevealed((v) => !v)}
            className="text-xs gap-1.5"
          >
            {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{isRevealed ? "Ocultar" : "Revelar respuesta"}</span>
          </Button>
        </div>

        {isRevealed ? (
          <Textarea
            value={referenceAnswer}
            onChange={(e) => setReferenceAnswer(e.target.value)}
            rows={4}
            placeholder="Pega aquí la definición exacta del libro para contrastar..."
          />
        ) : (
          <div className="rounded border border-dashed border-border-subtle bg-bg-secondary p-4 text-center text-xs text-text-muted">
            Completa tu respuesta arriba antes de contrastarla con la solución.
          </div>
        )}
      </div>

      {isRevealed && (
        <div className="border-t border-border-subtle pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-sans">
            <span className="text-text-secondary">Autoevaluación:</span>
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setSelfScore(num)}
                className={`h-7 w-7 rounded border font-mono text-xs transition-colors ${
                  selfScore === num
                    ? "bg-accent-primary text-bg-elevated border-accent-primary"
                    : "bg-bg-elevated text-text-secondary border-border-subtle hover:bg-bg-secondary"
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            onClick={handleFinish}
            disabled={!question.trim() || !userAnswer.trim()}
          >
            Guardar intento en historial
          </Button>
        </div>
      )}
    </Card>
  );
};
