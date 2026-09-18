import React, { useState, useEffect } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Flame, 
  Clock, 
  CheckCircle2, 
  Play, 
  Pause, 
  RotateCcw, 
  ShieldCheck
} from "lucide-react";

export interface DeepWorkMethodProps {
  onSessionFinished?: () => void;
}

export const DeepWorkMethod: React.FC<DeepWorkMethodProps> = ({ onSessionFinished }) => {
  const [monumentalGoal, setMonumentalGoal] = useState<string>("Resolver Guía de Topología y Demostrar Teorema de Tychonoff");
  const [selectedMinutes, setSelectedMinutes] = useState<number>(90); // 60, 90, 120 min
  const [secondsRemaining, setSecondsRemaining] = useState<number>(90 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>("");

  // Checklists de aislamiento
  const [checklist, setChecklist] = useState({
    notificationsMuted: true,
    tabsClosed: true,
    materialsPrepared: true,
    waterAtHand: true,
  });

  useEffect(() => {
    setSecondsRemaining(selectedMinutes * 60);
    setIsRunning(false);
    setHasStarted(false);
  }, [selectedMinutes]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isRunning) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining]);

  const toggleTimer = () => {
    setHasStarted(true);
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setHasStarted(false);
    setSecondsRemaining(selectedMinutes * 60);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleFinishSession = async () => {
    const elapsedMinutes = Math.round((selectedMinutes * 60 - secondsRemaining) / 60);
    await saveStudySession({
      id: `deepwork_${Date.now()}`,
      methodId: "deep-work",
      subject: "Bloques de Trabajo Profundo",
      topic: monumentalGoal || "Sesión Deep Work",
      durationMinutes: Math.max(15, elapsedMinutes),
      notes: `META MONUMENTAL: ${monumentalGoal}\nDuración planificada: ${selectedMinutes} min | Tiempo real: ${elapsedMinutes} min\n\nNOTAS DE SESIÓN:\n${sessionNotes || "Sesión de alta inmersión completada."}`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  const isComplete = secondsRemaining === 0;

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Bloques de Trabajo Profundo (Deep Work)</CardTitle>
            <Badge variant="accent">Ciclos Ultradianos (90 min)</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Inmersión cognitiva prolongada sin interrupciones para alcanzar el estado de flujo en problemas de máxima dificultad.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinishSession}
          disabled={!hasStarted && !isComplete}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Finalizar y Guardar Sesión</span>
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-text-primary font-sans">
          Meta Monumental Única del Bloque:
        </label>
        <Input
          value={monumentalGoal}
          onChange={(e) => setMonumentalGoal(e.target.value)}
          placeholder="Ej: Resolver 10 demostraciones de Álgebra Abstracta..."
          disabled={isRunning}
        />
      </div>

      {/* Ultradian Duration Selector & Isolation Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Selector de Duración */}
        <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 space-y-3">
          <span className="text-xs font-semibold text-text-primary font-serif flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-accent-primary" />
            <span>Duración del Ciclo Ultradiano</span>
          </span>

          <div className="grid grid-cols-3 gap-2">
            {[60, 90, 120].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setSelectedMinutes(mins)}
                disabled={isRunning}
                className={`rounded-lg border p-2.5 text-center transition-all ${
                  selectedMinutes === mins
                    ? "border-accent-primary bg-accent-primary/10 text-accent-primary font-bold shadow-xs"
                    : "border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary"
                }`}
              >
                <div className="font-mono text-base">{mins} min</div>
                <span className="text-[10px] opacity-75">
                  {mins === 90 ? "Óptimo BRAC" : mins === 60 ? "Enfoque Medio" : "Inmersión Máx"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Isolation Checklist */}
        <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 space-y-2.5">
          <span className="text-xs font-semibold text-text-primary font-serif flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Condiciones de Aislamiento Innegociables</span>
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.notificationsMuted}
                onChange={(e) => setChecklist((prev) => ({ ...prev, notificationsMuted: e.target.checked }))}
                className="rounded border-border-subtle accent-accent-primary"
              />
              <span>Notificaciones silenciadas</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.tabsClosed}
                onChange={(e) => setChecklist((prev) => ({ ...prev, tabsClosed: e.target.checked }))}
                className="rounded border-border-subtle accent-accent-primary"
              />
              <span>Pestañas cerradas</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.materialsPrepared}
                onChange={(e) => setChecklist((prev) => ({ ...prev, materialsPrepared: e.target.checked }))}
                className="rounded border-border-subtle accent-accent-primary"
              />
              <span>Textos a mano</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.waterAtHand}
                onChange={(e) => setChecklist((prev) => ({ ...prev, waterAtHand: e.target.checked }))}
                className="rounded border-border-subtle accent-accent-primary"
              />
              <span>Hidratación lista</span>
            </label>
          </div>
        </div>
      </div>

      {/* Countdown Timer Display */}
      <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center space-y-4 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <Flame className={`h-5 w-5 ${isRunning ? "text-amber-500 animate-pulse" : "text-text-muted"}`} />
          <span className="font-serif text-sm font-semibold text-text-primary">
            {isRunning ? "Estado de Inmersión Activo" : isComplete ? "¡Ciclo Completado!" : "Listo para Comenzar"}
          </span>
        </div>

        <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-text-primary py-2">
          {formatTime(secondsRemaining)}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant={isRunning ? "outline" : "primary"}
            size="sm"
            onClick={toggleTimer}
            className="text-xs flex items-center gap-1.5 px-5"
          >
            {isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Pausar Flujo</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Iniciar Inmersión</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={resetTimer}
            className="text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reiniciar</span>
          </Button>
        </div>
      </div>

      {/* Notes / Findings Area */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-primary font-sans">
          Avance, Derivaciones y Conclusiones Alcanzadas:
        </label>
        <Textarea
          rows={4}
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Registra las demostraciones resueltas, fórmulas derivadas o páginas redactadas..."
          className="text-xs"
        />
      </div>
    </Card>
  );
};
