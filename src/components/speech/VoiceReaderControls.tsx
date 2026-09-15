import React from "react";
import { Play, Pause, Square, Volume2, FastForward } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import type { useSpeechReader } from "../../hooks/useSpeechReader";

interface VoiceReaderControlsProps {
  reader: ReturnType<typeof useSpeechReader>;
  textToRead: string;
  className?: string;
  label?: string;
}

const SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5, 2.0];

export const VoiceReaderControls: React.FC<VoiceReaderControlsProps> = ({
  reader,
  textToRead,
  className = "",
  label = "Lector por voz",
}) => {
  const {
    isPlaying,
    isPaused,
    voices,
    selectedVoice,
    rate,
    currentChunkIndex,
    totalChunks,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setVoice,
    isSupported,
  } = reader;

  if (!isSupported) {
    return (
      <div className="p-3 rounded border border-border-subtle bg-bg-secondary text-xs text-text-muted">
        Tu navegador no soporta síntesis de voz (SpeechSynthesis API).
      </div>
    );
  }

  const handlePlayToggle = () => {
    if (isPlaying && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      if (!textToRead.trim()) return;
      speak(textToRead);
    }
  };

  const spanishVoices = voices.filter((v) => v.lang.startsWith("es"));
  const displayVoices = spanishVoices.length > 0 ? spanishVoices : voices;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border border-border-subtle bg-bg-secondary/70 backdrop-blur-xs ${className}`}
    >
      {/* Estado y etiqueta */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isPlaying && !isPaused
              ? "bg-accent-primary/20 text-accent-primary animate-pulse"
              : "bg-bg-surface-2 text-text-secondary"
          }`}
        >
          <Volume2 className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-xs font-semibold text-text-primary">{label}</span>
            {isPlaying && (
              <Badge variant={isPaused ? "warning" : "accent"}>
                {isPaused ? "Pausado" : "Reproduciendo"}
              </Badge>
            )}
          </div>
          {isPlaying && totalChunks > 1 && (
            <span className="font-sans text-[11px] text-text-muted">
              Párrafo {currentChunkIndex + 1} de {totalChunks}
            </span>
          )}
        </div>
      </div>

      {/* Controles de reproducción */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isPlaying && !isPaused ? "secondary" : "primary"}
          onClick={handlePlayToggle}
          disabled={!textToRead.trim()}
          className="flex items-center gap-1.5"
        >
          {isPlaying && !isPaused ? (
            <>
              <Pause className="h-3.5 w-3.5" />
              <span>Pausar</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{isPaused ? "Reanudar" : "Escuchar"}</span>
            </>
          )}
        </Button>

        {isPlaying && (
          <Button
            size="sm"
            variant="outline"
            onClick={stop}
            aria-label="Detener lectura"
            className="text-text-muted hover:text-error"
          >
            <Square className="h-3 w-3 fill-current" />
          </Button>
        )}

        {/* Control de velocidad */}
        <div className="flex items-center gap-1 bg-bg-elevated rounded border border-border-subtle p-0.5">
          <FastForward className="h-3 w-3 text-text-muted ml-1" />
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRate(s)}
              className={`px-1.5 py-0.5 text-[10px] font-sans font-medium rounded transition-colors ${
                rate === s
                  ? "bg-accent-primary text-bg-elevated font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Selector de voces (si hay múltiples) */}
        {displayVoices.length > 1 && (
          <select
            value={selectedVoice?.name || ""}
            onChange={(e) => {
              const voice = displayVoices.find((v) => v.name === e.target.value);
              if (voice) setVoice(voice);
            }}
            className="text-[11px] font-sans rounded border border-border-subtle bg-bg-elevated px-2 py-1 text-text-secondary max-w-[140px] truncate"
            title="Seleccionar voz"
          >
            {displayVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
