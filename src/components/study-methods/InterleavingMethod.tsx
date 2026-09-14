import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { saveStudySession } from "../../lib/db";
import { Play, Pause, RotateCcw } from "lucide-react";

export interface InterleavingMethodProps {
  onSessionFinished?: () => void;
}

export const InterleavingMethod: React.FC<InterleavingMethodProps> = ({ onSessionFinished }) => {
  const [topicA, setTopicA] = useState<string>("Álgebra Lineal");
  const [topicB, setTopicB] = useState<string>("Cálculo Diferencial");
  const [currentTopic, setCurrentTopic] = useState<"A" | "B">("A");
  const [blockMinutes] = useState<number>(15);
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [rotations, setRotations] = useState<number>(0);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0) {
      setIsRunning(false);
      setRotations((r) => r + 1);
      setCurrentTopic((t) => (t === "A" ? "B" : "A"));
      setSecondsLeft(blockMinutes * 60);
    }
  }, [secondsLeft, blockMinutes]);

  const handleFinish = async () => {
    await saveStudySession({
      id: `interleaving_${Date.now()}`,
      methodId: "interleaving",
      subject: `${topicA} & ${topicB}`,
      topic: "Práctica Intercalada",
      durationMinutes: rotations * blockMinutes + Math.round((blockMinutes * 60 - secondsLeft) / 60),
      notes: `Rotaciones entre temas: ${rotations}. Temas: ${topicA} y ${topicB}.`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <Card elevated className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Práctica Intercalada (Interleaving)</CardTitle>
        <span className="text-xs text-text-secondary">
          Alternar temas afines en lugar de bloquear el estudio entrena al cerebro para distinguir patrones
        </span>
      </CardHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`p-4 rounded border transition-colors ${currentTopic === "A" ? "border-accent-primary bg-bg-elevated" : "border-border-subtle bg-bg-secondary"}`}>
          <div className="flex items-center justify-between mb-2">
            <Badge variant={currentTopic === "A" ? "accent" : "neutral"}>Tema A</Badge>
            {currentTopic === "A" && <span className="text-xs font-mono text-accent-primary font-medium">EN CURSO</span>}
          </div>
          <Input value={topicA} onChange={(e) => setTopicA(e.target.value)} placeholder="Primer tema..." />
        </div>

        <div className={`p-4 rounded border transition-colors ${currentTopic === "B" ? "border-accent-secondary bg-bg-elevated" : "border-border-subtle bg-bg-secondary"}`}>
          <div className="flex items-center justify-between mb-2">
            <Badge variant={currentTopic === "B" ? "secondary" : "neutral"}>Tema B</Badge>
            {currentTopic === "B" && <span className="text-xs font-mono text-accent-secondary font-medium">EN CURSO</span>}
          </div>
          <Input value={topicB} onChange={(e) => setTopicB(e.target.value)} placeholder="Segundo tema..." />
        </div>
      </div>

      <div className="flex flex-col items-center py-4">
        <span className="font-serif text-5xl font-semibold tracking-tight text-text-primary tabular-nums">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
        <span className="text-xs text-text-muted mt-2">
          Estudiando actualmente: <strong>{currentTopic === "A" ? topicA : topicB}</strong>
        </span>

        <div className="flex items-center gap-3 mt-5">
          <Button variant="primary" onClick={() => setIsRunning((r) => !r)} className="w-28 gap-2">
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isRunning ? "Pausar" : "Iniciar"}</span>
          </Button>
          <Button variant="outline" onClick={() => { setIsRunning(false); setSecondsLeft(blockMinutes * 60); }}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-4 flex items-center justify-between">
        <span className="text-xs text-text-muted">Rotaciones completadas: {rotations}</span>
        <Button variant="secondary" size="sm" onClick={handleFinish}>
          Concluir y Guardar
        </Button>
      </div>
    </Card>
  );
};
