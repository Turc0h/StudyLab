import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Progress } from "../ui/Progress";
import { saveStudySession } from "../../lib/db";
import { Play, Pause, RotateCcw, CheckCircle } from "lucide-react";

export interface PomodoroMethodProps {
  onSessionFinished?: () => void;
}

export const PomodoroMethod: React.FC<PomodoroMethodProps> = ({ onSessionFinished }) => {
  const [task, setTask] = useState<string>("");
  const [mode, setMode] = useState<"work" | "break">("work");
  const [workDuration] = useState<number>(25);
  const [breakDuration] = useState<number>(5);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(0);

  const totalSeconds = (mode === "work" ? workDuration : breakDuration) * 60;
  const progress = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  // Handle cycle transitions
  useEffect(() => {
    if (secondsLeft === 0) {
      setIsRunning(false);
      if (mode === "work") {
        setCompletedPomodoros((p) => p + 1);
        setMode("break");
        setSecondsLeft(breakDuration * 60);
      } else {
        setMode("work");
        setSecondsLeft(workDuration * 60);
      }
    }
  }, [secondsLeft, mode, breakDuration, workDuration]);

  const handleSaveAndEnd = async () => {
    if (!task.trim()) return;
    await saveStudySession({
      id: `pomodoro_${Date.now()}`,
      methodId: "pomodoro",
      subject: "Estudio Concentrado",
      topic: task,
      durationMinutes: completedPomodoros * workDuration + Math.round((totalSeconds - secondsLeft) / 60),
      notes: `Ciclos de pomodoro completados: ${completedPomodoros}`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <Card elevated className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Técnica Pomodoro</CardTitle>
        <span className="text-xs text-text-secondary">
          Bloques de trabajo atencional sin interrupciones combinados con descansos biológicos
        </span>
      </CardHeader>

      <div className="flex flex-col items-center py-6 text-center">
        <span className="font-sans text-xs uppercase tracking-wider text-text-muted mb-2">
          {mode === "work" ? "Bloque de Concentración" : "Pausa de Descanso"}
        </span>

        <span className="font-serif text-6xl font-semibold tracking-tight text-text-primary tabular-nums">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>

        <div className="w-full max-w-xs mt-6">
          <Progress value={progress} />
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button
            variant="primary"
            onClick={() => setIsRunning((r) => !r)}
            className="w-28 gap-2"
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isRunning ? "Pausar" : "Iniciar"}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setIsRunning(false);
              setSecondsLeft((mode === "work" ? workDuration : breakDuration) * 60);
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-4 flex flex-col gap-3">
        <label className="font-sans text-xs font-medium text-text-primary">
          Tarea u objetivo de este bloque:
        </label>
        <Input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Ej: Resolver ejercicios 1 al 5 de la guía práctica..."
        />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <CheckCircle className="h-4 w-4 text-accent-secondary" />
            <span>Pomodoros completados: {completedPomodoros}</span>
          </div>

          <Button variant="secondary" size="sm" onClick={handleSaveAndEnd} disabled={!task.trim()}>
            Registrar sesión
          </Button>
        </div>
      </div>
    </Card>
  );
};
