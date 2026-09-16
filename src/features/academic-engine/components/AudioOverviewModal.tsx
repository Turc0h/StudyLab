import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import {
  type AudioOverviewFormat,
  type AudioOverviewScript,
  type AudioOverviewSentence,
  generateAudioOverview,
} from "../audioOverviewEngine";
import { CitationPill } from "./CitationPill";
import type { AcademicBoundingBox } from "../../../db/db";
import {
  Headphones,
  Play,
  Pause,
  Square,
  Volume2,
  Download,
  RefreshCw,
  Sliders,
  ExternalLink,
} from "lucide-react";

interface AudioOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceIds: string[];
  onNavigateCitation?: (page: number, bbox?: AcademicBoundingBox) => void;
}

export const AudioOverviewModal: React.FC<AudioOverviewModalProps> = ({
  isOpen,
  onClose,
  sourceIds,
  onNavigateCitation,
}) => {
  const [format, setFormat] = useState<AudioOverviewFormat>("general");
  const [script, setScript] = useState<AudioOverviewScript | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load script when modal opens or format changes
  useEffect(() => {
    if (!isOpen || sourceIds.length === 0) return;

    let isMounted = true;
    setIsLoading(true);

    generateAudioOverview({ sourceIds, format })
      .then((generated) => {
        if (isMounted) {
          setScript(generated);
          setCurrentSentenceIndex(-1);
          setIsPlaying(false);
          window.speechSynthesis?.cancel();
        }
      })
      .catch((err) => console.error("Error al generar resumen narrado:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      window.speechSynthesis?.cancel();
    };
  }, [isOpen, sourceIds, format]);

  // Clean up speech synthesis on close
  const handleClose = () => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
    onClose();
  };

  // Playback logic with Web Speech API
  const speakSentence = (index: number) => {
    if (!script || index >= script.sentences.length) {
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      return;
    }

    window.speechSynthesis.cancel();
    const sentence = script.sentences[index];
    setCurrentSentenceIndex(index);

    // Scroll active sentence into view
    sentenceRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    const utterance = new SpeechSynthesisUtterance(sentence.text);
    utterance.lang = "es-ES";
    utterance.rate = playbackSpeed;

    utterance.onend = () => {
      if (index + 1 < script.sentences.length) {
        speakSentence(index + 1);
      } else {
        setIsPlaying(false);
        setCurrentSentenceIndex(-1);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePlay = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      } else {
        setIsPlaying(true);
        const nextIdx = currentSentenceIndex >= 0 ? currentSentenceIndex : 0;
        speakSentence(nextIdx);
      }
    }
  };

  const stopPlayback = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentSentenceIndex(-1);
  };

  const handleSentenceClick = (index: number, sentence: AudioOverviewSentence) => {
    if (onNavigateCitation && sentence.pageNumber) {
      onNavigateCitation(sentence.pageNumber, sentence.boundingBox);
    }
    if (isPlaying) {
      speakSentence(index);
    } else {
      setCurrentSentenceIndex(index);
    }
  };

  const exportScript = () => {
    if (!script) return;
    const blob = new Blob(
      [
        `# ${script.title}\n\n`,
        `> Formato: ${script.formatLabel}\n`,
        `> Calidad: ${script.laneQualityLabel}\n\n`,
        `---\n\n`,
        script.sentences.map((s, i) => `${i + 1}. ${s.text} *[${s.sourceTitle} · Pág. ${s.pageNumber}]*`).join("\n\n"),
      ],
      { type: "text/markdown;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Resumen_Narrado_${script.format}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Resumen Narrado de Cátedra (Audio Overview)"
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-4 font-sans text-text-primary">
        {/* Honest Architecture Notice */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-accent-primary/20 bg-accent-primary/5 text-xs">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-accent-primary shrink-0" />
            <span className="font-medium text-text-secondary">
              Resumen oral en primera persona · <strong className="text-accent-primary">Web Speech API Local</strong>
            </span>
          </div>
          <Badge variant="neutral" className="text-[10px] text-text-muted font-mono">
            100% On-Device · Grounded en Chunks
          </Badge>
        </div>

        {/* Format Selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3">
          <span className="text-xs font-mono uppercase text-text-tertiary">Enfoque:</span>
          <div className="flex items-center gap-1.5 bg-bg-surface-2 p-1 rounded-lg border border-border-subtle text-xs">
            <button
              type="button"
              onClick={() => setFormat("general")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                format === "general"
                  ? "bg-accent-primary text-bg-surface-1 font-semibold shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Panorama General (3-5m)
            </button>
            <button
              type="button"
              onClick={() => setFormat("unreviewed_weak")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                format === "unreviewed_weak"
                  ? "bg-accent-primary text-bg-surface-1 font-semibold shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Solo lo Nuevo / FSRS Débil
            </button>
            <button
              type="button"
              onClick={() => setFormat("exam_readiness")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                format === "exam_readiness"
                  ? "bg-accent-primary text-bg-surface-1 font-semibold shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Puntos en Riesgo (Examen)
            </button>
          </div>
        </div>

        {/* Audio Player Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-bg-surface-2/80 border border-border-subtle">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading || !script}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-accent-primary text-bg-surface-1 hover:brightness-110 shadow-md font-bold transition-all disabled:opacity-40 cursor-pointer"
              title={isPlaying ? "Pausar lectura" : "Reproducir lectura en voz alta"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={stopPlayback}
              disabled={!isPlaying && currentSentenceIndex === -1}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-bg-surface-1 border border-border-subtle text-text-secondary hover:text-danger hover:border-danger/40 transition-all disabled:opacity-30 cursor-pointer"
              title="Detener lectura"
            >
              <Square className="h-3.5 w-3.5" />
            </button>

            <div className="ml-2 flex items-center gap-2 font-mono text-xs text-text-secondary">
              <Volume2 className="h-4 w-4 text-accent-primary" />
              <span>
                {currentSentenceIndex >= 0 && script
                  ? `Oración ${currentSentenceIndex + 1} de ${script.sentences.length}`
                  : `Duración est.: ~${script?.estimatedDurationMinutes || 3} min`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed selector */}
            <div className="flex items-center gap-1 text-xs font-mono">
              <Sliders className="h-3 w-3 text-text-tertiary" />
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="rounded bg-bg-surface-1 border border-border-subtle px-2 py-1 text-xs text-text-primary focus:outline-hidden"
              >
                <option value={0.75}>0.75x</option>
                <option value={1.0}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
              </select>
            </div>

            {/* Export Script */}
            <button
              type="button"
              onClick={exportScript}
              disabled={!script}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-1 hover:bg-bg-surface-3 text-xs font-medium text-text-primary transition-all cursor-pointer"
              title="Exportar transcripción completa como Markdown"
            >
              <Download className="h-3.5 w-3.5 text-accent-primary" />
              <span>Exportar Guion</span>
            </button>
          </div>
        </div>

        {/* Script Viewer with Synchronized Highlighting */}
        <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-2 rounded-xl border border-border-subtle/60 bg-bg-surface-1/50 p-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-text-muted gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-accent-primary" />
              <span className="text-xs font-mono">Construyendo guion narrativo grounded...</span>
            </div>
          ) : !script || script.sentences.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-xs">
              No se encontraron fragmentos suficientes en las fuentes seleccionadas para estructurar este resumen.
            </div>
          ) : (
            script.sentences.map((sentence, idx) => {
              const isCurrent = currentSentenceIndex === idx;
              return (
                <div
                  key={sentence.id}
                  ref={(el) => {
                    sentenceRefs.current[idx] = el;
                  }}
                  onClick={() => handleSentenceClick(idx, sentence)}
                  className={`group flex flex-col gap-1.5 p-2.5 rounded-lg border transition-all cursor-pointer text-xs leading-relaxed ${
                    isCurrent
                      ? "bg-accent-primary/10 border-accent-primary shadow-[0_0_12px_rgba(0,240,255,0.2)] text-text-primary font-medium"
                      : "bg-bg-surface-2/40 border-border-subtle/50 text-text-secondary hover:bg-bg-surface-2 hover:border-accent-primary/40 hover:text-text-primary"
                  }`}
                >
                  <p className="flex-1">{sentence.text}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary mt-0.5">
                    <CitationPill
                      sourceTitle={sentence.sourceTitle}
                      pageNumber={sentence.pageNumber}
                      paragraphIndex={sentence.paragraphIndex}
                      boundingBox={sentence.boundingBox}
                      charOffset={sentence.charOffset}
                      webUrlFragment={sentence.webUrl ? { url: sentence.webUrl, textSnippet: sentence.text } : undefined}
                      transcriptTimestamp={sentence.transcriptTimestamp}
                      onClickCitation={onNavigateCitation}
                    />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-accent-primary">
                      <span>Tocar para saltar a fuente</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
