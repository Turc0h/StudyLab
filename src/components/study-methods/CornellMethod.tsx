import React, { useState, useEffect } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { Clock, Eye, EyeOff, Check, BookOpen, FileText, ArrowRight } from "lucide-react";

export interface CornellMethodProps {
  onSessionFinished?: () => void;
}

export const CornellMethod: React.FC<CornellMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [cues, setCues] = useState("");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");

  // Cronómetro de sesión activa
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Modo de evocación activa (oculta la columna de notas)
  const [isRecallModeActive, setIsRecallModeActive] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFinish = async () => {
    const durationMinutes = Math.max(1, Math.round(seconds / 60));
    await saveStudySession({
      id: `cornell_${Date.now()}`,
      methodId: "cornell",
      subject: subject.trim() || "Estudio Autónomo",
      topic: topic.trim() || "Apunte Cornell",
      durationMinutes,
      notes: `[PREGUNTAS / CUES]:\n${cues}\n\n[NOTAS DE CLASE]:\n${notes}\n\n[SÍNTESIS FINAL]:\n${summary}`,
      completedAt: Date.now(),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onSessionFinished?.();
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <Card elevated className="flex flex-col gap-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-serif text-lg">Método Cornell de Toma de Notas</CardTitle>
              <Badge variant="accent">Escritura & Metacognición</Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Organización espacial en 3 zonas: Preguntas/Cues, Notas principales y Resumen sintetizador.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-surface-2 px-3 py-1.5 text-xs font-mono text-text-primary">
              <Clock className="h-3.5 w-3.5 text-accent-primary" />
              <span>{formatTimer(seconds)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-xs"
            >
              {isTimerRunning ? "Pausar" : "Reanudar"}
            </Button>
          </div>
        </div>

        {/* Metadatos de la sesión */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-text-secondary font-medium block mb-1">Materia o Cátedra:</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ej: Fisiología Humana, Álgebra Lineal"
            />
          </div>
          <div>
            <label className="text-text-secondary font-medium block mb-1">Tema / Capítulo del Apunte:</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ej: Potencial de Acción y Sinapsis"
            />
          </div>
        </div>
      </Card>

      {/* Barra de Herramientas de Recall */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isRecallModeActive ? "primary" : "outline"}
            size="sm"
            onClick={() => setIsRecallModeActive(!isRecallModeActive)}
            className="text-xs flex items-center gap-1.5"
          >
            {isRecallModeActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>
              {isRecallModeActive ? "Modo Recall Activo (Notas Ocultas)" : "Activar Modo Recall (Ocultar Notas)"}
            </span>
          </Button>
          <span className="text-[11px] text-text-muted hidden sm:inline">
            Oculta las notas para practicar evocación activa mirando únicamente las preguntas.
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinish}
          disabled={savedSuccess || (!notes.trim() && !cues.trim())}
          className="text-xs flex items-center gap-1.5"
        >
          {savedSuccess ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Guardado en Historial</span>
            </>
          ) : (
            <>
              <span>Finalizar y Guardar Sesión</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>

      {/* Lienzo Cornell (Grid 30% / 70% + Resumen Inferior) */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface-2 overflow-hidden shadow-xs">
        {/* Cuerpo Superior: Cues y Notas */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px] divide-y md:divide-y-0 md:divide-x divide-border-subtle">
          {/* Columna Izquierda: Cues / Preguntas (4 de 12 cols = ~33%) */}
          <div className="md:col-span-4 p-4 bg-bg-secondary/20 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <BookOpen className="h-3.5 w-3.5 text-accent-primary" />
              <span>Preguntas Clave & Cues</span>
            </div>
            <p className="text-[11px] text-text-muted">
              Formulá preguntas de examen, términos gatillo o palabras disparadoras.
            </p>
            <Textarea
              value={cues}
              onChange={(e) => setCues(e.target.value)}
              placeholder="ej:&#10;• ¿Qué ion despolariza la membrana?&#10;• Ley del Todo o Nada&#10;• Período refractario absoluto vs relativo"
              className="flex-1 w-full text-xs font-sans resize-none p-3 min-h-[260px] bg-bg-primary/50"
            />
          </div>

          {/* Columna Derecha: Notas de Clase (8 de 12 cols = ~67%) */}
          <div className="md:col-span-8 p-4 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <FileText className="h-3.5 w-3.5 text-accent-primary" />
                <span>Notas Principales de Clase / Lectura</span>
              </div>
              {isRecallModeActive && (
                <Badge variant="warning">Notas Protegidas</Badge>
              )}
            </div>
            <p className="text-[11px] text-text-muted">
              Desarrollá las explicaciones, esquemas, teoremas y datos con tus palabras.
            </p>

            <div className="relative flex-1 flex flex-col">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribí aquí tus notas estructuradas durante la lectura del apunte o clase..."
                className="flex-1 w-full text-xs font-sans resize-none p-3 min-h-[260px] bg-bg-primary"
              />

              {/* Telón de Ocultamiento en Modo Recall */}
              {isRecallModeActive && (
                <div className="absolute inset-0 rounded-lg backdrop-blur-md bg-bg-surface-2/95 border border-accent-primary/20 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10 transition-all duration-200">
                  <div className="h-10 w-10 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                    <EyeOff className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-text-primary font-serif">
                      Modo Autoevaluación Activo
                    </h5>
                    <p className="text-[11px] text-text-secondary mt-1 max-w-sm">
                      Leé las preguntas de la columna izquierda e intentá responderlas mentalmente o en voz alta antes de destapar las notas.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRecallModeActive(false)}
                    className="text-xs"
                  >
                    Descubrir Notas
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Franja Inferior: Resumen / Síntesis Final */}
        <div className="border-t border-border-subtle p-4 bg-bg-secondary/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary font-serif">
              Resumen de Síntesis Final (Summary)
            </span>
            <span className="text-[11px] text-text-muted">
              2 o 3 oraciones concisas que capturen la esencia de la lección
            </span>
          </div>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Sintetizá brevemente la conclusión central o idea motriz del apunte..."
            className="w-full text-xs font-sans resize-none p-2.5 min-h-[80px] bg-bg-primary"
          />
        </div>
      </div>
    </div>
  );
};
