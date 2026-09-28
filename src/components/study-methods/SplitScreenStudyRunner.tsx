import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Columns2,
  Maximize2,
  Minimize2,
  BookOpen,
  PenTool,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { Button } from "../ui/Button";
import { VirtualBlackboard } from "../whiteboard/VirtualBlackboard";
import { db } from "../../db/db";
import { generateId } from "../../features/files/fileHelpers";

interface SplitScreenStudyRunnerProps {
  onFinish?: () => void;
  initialSourceId?: string;
}

export const SplitScreenStudyRunner: React.FC<SplitScreenStudyRunnerProps> = ({
  onFinish,
  initialSourceId,
}) => {
  // Estado de Layout: "50-50" | "65-35" | "35-65"
  const [splitRatio, setSplitRatio] = useState<"50-50" | "65-35" | "35-65">("50-50");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Documentos de la biblioteca académica
  const sources = useLiveQuery(() => db.academicSources.toArray(), []) ?? [];
  const [selectedSourceId, setSelectedSourceId] = useState<string>(initialSourceId || "");
  const [customNote, setCustomNote] = useState<string>(
    "Escribe o pega aquí el teorema, consigna o fragmento del paper a resolver..."
  );

  // Temporizador de Foco Zen
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timerSeconds]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleFinishSession = async () => {
    const elapsedMinutes = Math.max(1, Math.round((25 * 60 - timerSeconds) / 60));
    try {
      await db.sessions.add({
        id: generateId(),
        methodId: "split-screen",
        subjectFolderId: null,
        startedAt: Date.now() - elapsedMinutes * 60 * 1000,
        endedAt: Date.now(),
        durationSec: elapsedMinutes * 60,
      });
    } catch (e) {
      console.error("Error guardando sesión de atril dividido:", e);
    }
    onFinish?.();
  };

  const activeSource = sources.find((s) => s.id === selectedSourceId);

  // Clases de ancho para la pantalla dividida
  const leftColClass =
    splitRatio === "50-50"
      ? "w-full md:w-1/2"
      : splitRatio === "65-35"
      ? "w-full md:w-[65%]"
      : "w-full md:w-[35%]";

  const rightColClass =
    splitRatio === "50-50"
      ? "w-full md:w-1/2"
      : splitRatio === "65-35"
      ? "w-full md:w-[35%]"
      : "w-full md:w-[65%]";

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] w-full rounded-2xl border border-border-hairline bg-bg-surface-1 shadow-md overflow-hidden animate-in fade-in duration-200">
      {/* Barra de Foco Zen Superior */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-border-hairline bg-bg-surface-2 text-xs">
        {/* Lado izquierdo: Título y Navegación */}
        <div className="flex items-center gap-3">
          {onFinish && (
            <button
              type="button"
              onClick={onFinish}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface-3 transition-colors cursor-pointer"
              title="Volver"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Columns2 className="w-4 h-4 text-accent-primary" />
            <span className="font-serif font-semibold text-text-primary text-sm">
              Atril Dividido: Lectura + Pizarra
            </span>
          </div>
        </div>

        {/* Centro: Temporizador de Foco Zen */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-border-hairline bg-bg-surface-1 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-accent-primary" />
          <span className="font-mono text-xs font-bold text-text-primary tabular-nums">
            {formatTimer(timerSeconds)}
          </span>
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className="p-1 rounded hover:bg-bg-surface-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title={isRunning ? "Pausar" : "Iniciar"}
          >
            {isRunning ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRunning(false);
              setTimerSeconds(25 * 60);
            }}
            className="p-1 rounded hover:bg-bg-surface-2 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            title="Reiniciar"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Lado derecho: Proporción, Pantalla Completa y Concluir */}
        <div className="flex items-center gap-2">
          {/* Selector de Proporción */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border-hairline bg-bg-surface-1">
            <button
              type="button"
              onClick={() => setSplitRatio("65-35")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                splitRatio === "65-35"
                  ? "bg-bg-surface-3 text-text-primary font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Foco en Lectura (65% texto, 35% pizarra)"
            >
              65:35
            </button>
            <button
              type="button"
              onClick={() => setSplitRatio("50-50")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                splitRatio === "50-50"
                  ? "bg-bg-surface-3 text-text-primary font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Equilibrado (50% texto, 50% pizarra)"
            >
              50:50
            </button>
            <button
              type="button"
              onClick={() => setSplitRatio("35-65")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                splitRatio === "35-65"
                  ? "bg-bg-surface-3 text-text-primary font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Foco en Pizarra (35% texto, 65% pizarra)"
            >
              35:65
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-border-hairline bg-bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-bg-surface-3 transition-colors cursor-pointer"
            title={isFullscreen ? "Salir de Pantalla Completa" : "Pantalla Completa Zen"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleFinishSession}
            className="text-xs gap-1.5 shadow-xs"
          >
            <CheckCircle2 size={13} />
            <span>Concluir Sesión</span>
          </Button>
        </div>
      </header>

      {/* Cuerpo Dividido: Apunte a la Izquierda / Pizarra a la Derecha */}
      <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden">
        {/* Columna Izquierda: Documento / Apunte de Cátedra */}
        <div
          className={`${leftColClass} h-full border-b md:border-b-0 md:border-r border-border-hairline bg-bg-surface-1 flex flex-col transition-all duration-200`}
        >
          {/* Selector de Fuente */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-hairline bg-bg-surface-2 text-xs">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <BookOpen size={13} />
              <span className="font-sans font-medium">Material de Cátedra</span>
            </div>

            {sources.length > 0 && (
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="max-w-[180px] p-1 rounded border border-border-hairline bg-bg-surface-1 font-sans text-xs text-text-primary truncate focus:outline-hidden"
              >
                <option value="">Nota libre / Enunciado</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Contenido del Documento */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeSource ? (
              <article className="prose prose-sm dark:prose-invert max-w-none font-serif text-text-primary leading-relaxed space-y-3">
                <h3 className="font-bold text-base font-serif border-b border-border-hairline pb-1">
                  {activeSource.title}
                </h3>
                <p className="text-xs text-text-secondary italic">
                  Fuente académica registrada en la biblioteca local.
                </p>
                <div className="text-xs font-sans text-text-primary whitespace-pre-wrap leading-relaxed">
                  {`Documento tipo: ${activeSource.documentType} • ${activeSource.pageCount} pág(s) • ${activeSource.chunkCount} fragmentos.`}
                  {activeSource.career ? `\nCarrera: ${activeSource.career}` : ""}
                  {activeSource.year ? ` • Año: ${activeSource.year}` : ""}
                </div>
              </article>
            ) : (
              <div className="h-full flex flex-col gap-2">
                <span className="font-mono text-[11px] text-text-muted flex items-center gap-1">
                  <FileText size={12} />
                  <span>Enunciado o fragmento a trabajar:</span>
                </span>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="flex-1 w-full p-3 rounded-xl border border-border-hairline bg-bg-surface-2 font-serif text-xs md:text-sm text-text-primary leading-relaxed resize-none focus:outline-hidden focus:border-accent-primary"
                  placeholder="Escribe el texto, fórmula o ejercicio aquí..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Pizarra Virtual Inteligente */}
        <div className={`${rightColClass} h-full bg-bg-surface-1 flex flex-col transition-all duration-200`}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-hairline bg-bg-surface-2 text-xs">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <PenTool size={13} />
              <span className="font-sans font-medium">Lienzo y Demostración</span>
            </div>
            <span className="font-mono text-[10px] text-text-muted">
              Motor RDP Nativo Rust Activo
            </span>
          </div>

          <div className="flex-1 w-full h-full relative">
            <VirtualBlackboard className="h-full border-0 rounded-none shadow-none" />
          </div>
        </div>
      </div>
    </div>
  );
};