import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { FlipCard } from "../shells";
import { saveStudySession } from "../../lib/db";

export interface ActiveRecallMethodProps {
  onSessionFinished?: () => void;
}

export const ActiveRecallMethod: React.FC<ActiveRecallMethodProps> = ({ onSessionFinished }) => {
  const [question, setQuestion] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [referenceAnswer, setReferenceAnswer] = useState<string>("");
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [selfScore, setSelfScore] = useState<number | null>(null);

  const handleFinish = async (scoreToSave?: number) => {
    if (!question.trim() || !userAnswer.trim()) return;
    const finalScore = scoreToSave ?? selfScore ?? 3;
    await saveStudySession({
      id: `recall_${Date.now()}`,
      methodId: "active-recall",
      subject: "Recuperación Activa",
      topic: question,
      durationMinutes: 20,
      notes: `Respuesta dada:\n${userAnswer}\n\nReferencia:\n${referenceAnswer}\nCalificación: ${finalScore}/5`,
      completedAt: Date.now(),
      qualityScore: finalScore,
    });
    onSessionFinished?.();
  };

  return (
    <Card className="flex flex-col gap-6 rounded-xl border border-border-hairline bg-bg-surface-1 p-5 shadow-xs">
      <CardHeader className="p-0 pb-2 border-b border-border-hairline">
        <CardTitle className="font-serif text-lg text-text-primary">Recuperación Activa (Active Recall)</CardTitle>
        <span className="text-xs text-text-secondary">
          Recuperar información desde la memoria sin consultar apuntes consolida los trazos sinápticos
        </span>
      </CardHeader>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-xs font-medium text-text-primary">
          Pregunta o problema a resolver:
        </label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ej: ¿Cuáles son los axiomas de un espacio vectorial según Peano?"
        />
      </div>

      <FlipCard
        isFlipped={isRevealed}
        onFlip={setIsRevealed}
        frontBadge="Anverso • Fase de Evocación"
        backBadge="Reverso • Fase de Contraste"
        flipPromptText="Contrasta con la respuesta de referencia"
        front={
          <div className="flex flex-col gap-3">
            <label className="font-sans text-xs font-medium text-text-primary">
              Tu respuesta recuperada (sin mirar apuntes):
            </label>
            <Textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              rows={5}
              className="bg-bg-surface-2 border-border-hairline font-sans text-xs"
              placeholder="Escribe todo lo que recuerdes con tus palabras y fórmulas antes de dar vuelta la tarjeta..."
            />
            {!userAnswer.trim() && (
              <p className="text-[11px] text-text-muted italic">
                Tip: La evocación forzada produce el mayor beneficio sináptico aunque sientas dificultad inicial.
              </p>
            )}
          </div>
        }
        back={
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg border border-border-hairline bg-bg-surface-2">
              <span className="text-[10px] font-mono text-text-muted block mb-1">Lo que evocaste:</span>
              <p className="text-xs font-sans text-text-primary whitespace-pre-wrap">{userAnswer || "(Sin respuesta previa)"}</p>
            </div>

            <label className="font-sans text-xs font-medium text-text-primary mt-1">
              Respuesta de referencia (del libro / cátedra):
            </label>
            <Textarea
              value={referenceAnswer}
              onChange={(e) => setReferenceAnswer(e.target.value)}
              rows={4}
              className="bg-bg-surface-2 border-border-hairline font-sans text-xs"
              placeholder="Pega aquí la definición exacta del libro para contrastar..."
            />
          </div>
        }
        ratings={[
          { value: 1, label: "1. En blanco", keyHint: "1", variant: "danger", subtitle: "Sin recuerdo" },
          { value: 2, label: "2. Con dudas", keyHint: "2", variant: "warning", subtitle: "Impreciso" },
          { value: 3, label: "3. Parcial", keyHint: "3", variant: "neutral", subtitle: "Puntos clave" },
          { value: 4, label: "4. Correcto", keyHint: "4", variant: "primary", subtitle: "Casi exacto" },
          { value: 5, label: "5. Perfecto", keyHint: "5", variant: "success", subtitle: "Sin lagunas" },
        ]}
        onRate={(score) => {
          setSelfScore(Number(score));
          void handleFinish(Number(score));
        }}
      />

      {isRevealed && (
        <div className="flex justify-end pt-2 border-t border-border-hairline">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleFinish()}
            disabled={!question.trim() || !userAnswer.trim()}
            className="text-xs"
          >
            Guardar intento con nota ({selfScore ?? 3}/5)
          </Button>
        </div>
      )}
    </Card>
  );
};
