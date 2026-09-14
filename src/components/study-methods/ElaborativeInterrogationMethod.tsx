import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { HelpCircle } from "lucide-react";

export interface ElaborativeInterrogationMethodProps {
  onSessionFinished?: () => void;
}

export const ElaborativeInterrogationMethod: React.FC<ElaborativeInterrogationMethodProps> = ({
  onSessionFinished,
}) => {
  const [statement, setStatement] = useState<string>("");
  const [whyExplanation, setWhyExplanation] = useState<string>("");
  const [counterExample, setCounterExample] = useState<string>("");

  const handleFinish = async () => {
    if (!statement.trim() || !whyExplanation.trim()) return;
    await saveStudySession({
      id: `elaboration_${Date.now()}`,
      methodId: "elaborative-interrogation",
      subject: "Interrogación Elaborativa",
      topic: statement,
      durationMinutes: 25,
      notes: `Hecho:\n${statement}\n\n¿Por qué es verdadero?:\n${whyExplanation}\n\n¿Qué pasaría si no se cumple?:\n${counterExample}`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Interrogación Elaborativa</CardTitle>
        <span className="text-xs text-text-secondary">
          Cuestionar rigurosamente el "por qué" de cada afirmación para integrarla en tu red de conocimientos
        </span>
      </CardHeader>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-xs font-medium text-text-primary">
          1. Hecho, fórmula o propiedad estudiada:
        </label>
        <Input
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Ej: Las arterias tienen paredes más elásticas que las venas..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-xs font-medium text-text-primary flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-accent-primary" />
          <span>2. ¿Por qué es este hecho biológicamente, matemáticamente o físicamente verdadero?</span>
        </label>
        <Textarea
          value={whyExplanation}
          onChange={(e) => setWhyExplanation(e.target.value)}
          rows={4}
          placeholder="Explica el mecanismo causal subyacente que lo hace necesario..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-xs font-medium text-text-primary">
          3. ¿Qué sucedería en el sistema si esta propiedad no se cumpliese?
        </label>
        <Textarea
          value={counterExample}
          onChange={(e) => setCounterExample(e.target.value)}
          rows={3}
          placeholder="Plantea las consecuencias lógicas de la negación de este hecho..."
        />
      </div>

      <div className="border-t border-border-subtle pt-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={handleFinish}
          disabled={!statement.trim() || !whyExplanation.trim()}
        >
          Guardar Interrogación Elaborativa
        </Button>
      </div>
    </Card>
  );
};
