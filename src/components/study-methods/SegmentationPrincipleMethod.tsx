import React, { useState, useEffect } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Split, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Timer, 
  Play, 
  Pause, 
  RotateCcw,
  Sparkles
} from "lucide-react";

export interface SegmentationPrincipleMethodProps {
  onSessionFinished?: () => void;
}

interface VideoSegment {
  id: string;
  segmentNumber: number;
  timeRange: string;
  topicTitle: string;
  summarySentence: string;
}

const DEFAULT_SEGMENTS: VideoSegment[] = [
  {
    id: "seg_1",
    segmentNumber: 1,
    timeRange: "00:00 - 04:15",
    topicTitle: "Definición de Entropía y Segundo Principio",
    summarySentence: "La entropía cuantifica el número de microestados accesibles en un sistema aislado y siempre aumenta en procesos espontáneos.",
  },
  {
    id: "seg_2",
    segmentNumber: 2,
    timeRange: "04:15 - 08:30",
    topicTitle: "Energía Libre de Gibbs y Espontaneidad",
    summarySentence: "Un valor negativo de Delta G combina entalpía y entropía para predecir la espontaneidad termodinámica a temperatura constante.",
  },
];

export const SegmentationPrincipleMethod: React.FC<SegmentationPrincipleMethodProps> = ({ onSessionFinished }) => {
  const [lectureTitle, setLectureTitle] = useState<string>("Clase Magistral: Termodinámica Química");
  const [segments, setSegments] = useState<VideoSegment[]>(DEFAULT_SEGMENTS);

  // Temporizador de pausa activa de 60 segundos
  const [pauseSeconds, setPauseSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Nuevo segmento
  const [newTimeRange, setNewTimeRange] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && pauseSeconds > 0) {
      interval = setInterval(() => {
        setPauseSeconds((prev) => prev - 1);
      }, 1000);
    } else if (pauseSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, pauseSeconds]);

  const handleStartPause = () => {
    setPauseSeconds(60);
    setIsTimerRunning(true);
  };

  const handleResetPause = () => {
    setIsTimerRunning(false);
    setPauseSeconds(60);
  };

  const handleAddSegment = () => {
    if (!newTitle.trim() || !newSummary.trim()) return;
    const newEntry: VideoSegment = {
      id: `seg_${Date.now()}`,
      segmentNumber: segments.length + 1,
      timeRange: newTimeRange.trim() || "00:00 - 05:00",
      topicTitle: newTitle.trim(),
      summarySentence: newSummary.trim(),
    };
    setSegments([...segments, newEntry]);
    setNewTimeRange("");
    setNewTitle("");
    setNewSummary("");
    handleStartPause(); // Inicia la pausa de asimilación automáticamente
  };

  const handleRemoveSegment = (id: string) => {
    setSegments(
      segments
        .filter((s) => s.id !== id)
        .map((s, idx) => ({ ...s, segmentNumber: idx + 1 }))
    );
  };

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `segmentation_${Date.now()}`,
      methodId: "segmentation-principle",
      subject: "Principio de Segmentación (Mayer)",
      topic: lectureTitle || "Despiece de Clase Multimedia",
      durationMinutes: Math.max(15, segments.length * 6),
      notes: `Clase / Video: ${lectureTitle}\nSegmentos procesados (${segments.length}):\n${segments
        .map(
          (s) =>
            `[Segmento ${s.segmentNumber} (${s.timeRange})]: ${s.topicTitle}\n  • Síntesis: ${s.summarySentence}`
        )
        .join("\n\n")}`,
      completedAt: Date.now(),
    });

    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Principio de Segmentación Multimedia</CardTitle>
            <Badge variant="accent">Carga Cognitiva (Richard Mayer)</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Divide clases grabadas en segmentos breves (3-5 min) y toma pausas obligatorias de 60s para sintetizar antes de continuar.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinishSession}
          disabled={segments.length === 0}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Guardar Sesión ({segments.length} Segmentos)</span>
        </Button>
      </div>

      {/* Título de la clase */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text-primary">Título de la Clase Grabada o Video</label>
        <Input
          value={lectureTitle}
          onChange={(e) => setLectureTitle(e.target.value)}
          placeholder="Ej: Teórico 4 - Sistema Cardiovascular"
        />
      </div>

      {/* Temporizador de Pausa de Asimilación de 60 Segundos */}
      <div className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-accent-primary" />
            <span className="text-xs font-semibold text-text-primary">
              Pausa de Asimilación (60 segundos obligatorios)
            </span>
          </div>
          <p className="text-[11px] text-text-secondary">
            No avances el video sin antes procesar mentalmente el bloque recién visto.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className={`text-2xl font-mono font-bold ${pauseSeconds === 0 ? "text-emerald-400" : "text-accent-primary"}`}>
            00:{pauseSeconds < 10 ? `0${pauseSeconds}` : pauseSeconds}
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-xs px-2.5"
            >
              {isTimerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-accent-primary" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetPause}
              className="text-xs px-2"
              title="Reiniciar a 60s"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Segmentos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Split className="h-3.5 w-3.5 text-accent-primary" />
            <span>Despiece de Segmentos Procesados ({segments.length})</span>
          </span>
          <span className="text-[10px] text-text-muted">Ritmo regulado por el estudiante</span>
        </div>

        <div className="space-y-3">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/50 space-y-2 relative group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="accent" className="text-xs font-mono">
                    Segmento {seg.segmentNumber}
                  </Badge>
                  <span className="text-xs font-mono text-text-muted">
                    [{seg.timeRange}]
                  </span>
                  <span className="font-semibold text-xs text-text-primary">
                    {seg.topicTitle}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSegment(seg.id)}
                  className="text-text-muted hover:text-red-400 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-2.5 rounded-lg border border-border-subtle bg-bg-tertiary/60 text-xs text-text-secondary leading-relaxed flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="flex-1">
                  <strong className="text-text-primary">Frase Síntesis: </strong>
                  {seg.summarySentence}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form para Añadir Nuevo Segmento */}
      <div className="rounded-xl border border-dashed border-border-hover bg-bg-secondary/30 p-4 space-y-3">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5 text-accent-primary" />
          <span>Registrar y Pausar Siguiente Segmento (3-5 min)</span>
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Intervalo temporal (Ej: 08:30 - 13:00)"
            value={newTimeRange}
            onChange={(e) => setNewTimeRange(e.target.value)}
            className="text-xs"
          />
          <Input
            placeholder="Tema del fragmento (Ej: Curvas de Disociación)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="text-xs sm:col-span-2"
          />
        </div>

        <Textarea
          rows={2}
          placeholder="Escribe la frase síntesis durante la pausa de 60s antes de reanudar el video..."
          value={newSummary}
          onChange={(e) => setNewSummary(e.target.value)}
          className="text-xs"
        />

        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddSegment}
            disabled={!newTitle.trim() || !newSummary.trim()}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Agregar y Comenzar Pausa de 60s</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
