import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Headphones,
  Sliders,
  Maximize2,
  Minimize2,
  Save,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  PRESET_AUDIO_PLAYLISTS,
  DEFAULT_AUDIO_SETTINGS,
  speakUtterance,
  stopSpeech,
  playChimeCue,
  sleep,
  getSpanishVoices,
  saveAudioStudySessionRecord,
  type AudioFlashcardPlaylist,
  type AudioPlaybackSettings,
} from "../../features/audio-flashcards/audioFlashcardsEngine";

interface AudioFlashcardsMethodProps {
  onSessionFinished?: () => void;
}

type AudioPlayStep =
  | "idle"
  | "question"
  | "pause_recall"
  | "answer"
  | "pause_consolidation";

export const AudioFlashcardsMethod: React.FC<AudioFlashcardsMethodProps> = ({ onSessionFinished }) => {
  // Playlist & State
  const [selectedPlaylist, setSelectedPlaylist] = useState<AudioFlashcardPlaylist>(
    PRESET_AUDIO_PLAYLISTS[0],
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<AudioPlayStep>("idle");
  const [pauseCountdown, setPauseCountdown] = useState<number>(0);

  // Settings
  const [settings, setSettings] = useState<AudioPlaybackSettings>(DEFAULT_AUDIO_SETTINGS);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isWalkingMode, setIsWalkingMode] = useState<boolean>(false);

  // Session & Tracking
  const [sessionSaved, setSessionSaved] = useState<boolean>(false);
  const [cardsReviewedCount, setCardsReviewedCount] = useState<number>(0);
  const [sessionStartTime] = useState<number>(Date.now());

  // Refs to control playback lifecycle
  const cancelRequestedRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load voices on mount
  useEffect(() => {
    const updateVoices = () => {
      const v = getSpanishVoices();
      setAvailableVoices(v);
      if (v.length > 0 && !settings.selectedVoiceName) {
        setSettings((prev) => ({ ...prev, selectedVoiceName: v[0].name }));
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      stopSpeech();
    };
  }, []);

  // MediaSession API setup for Bluetooth headphones
  useEffect(() => {
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      const currentCard = selectedPlaylist.cards[currentIndex];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentCard ? currentCard.question : "StudyLab Audio Flashcards",
        artist: selectedPlaylist.title,
        album: "Audio Active Recall Universitario",
      });

      navigator.mediaSession.setActionHandler("play", () => {
        handlePlay();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        handlePause();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        handleNextCard();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        handlePrevCard();
      });
    }
  }, [currentIndex, selectedPlaylist]);

  // Main Audio Active Recall Loop
  const playCardLoop = async (index: number) => {
    const cards = selectedPlaylist.cards;
    if (index >= cards.length) {
      if (settings.loopPlaylist) {
        index = 0;
        setCurrentIndex(0);
      } else {
        setIsPlaying(false);
        setCurrentStep("idle");
        return;
      }
    }

    const card = cards[index];
    cancelRequestedRef.current = false;

    // 1. Speak Question
    setCurrentStep("question");
    const questionIntro = settings.announceCardIndex
      ? `Tarjeta ${index + 1} de ${cards.length}. ${card.question}`
      : card.question;

    await speakUtterance(questionIntro, settings);
    if (cancelRequestedRef.current) return;

    // 2. Active Recall Silence Pause
    setCurrentStep("pause_recall");
    const recallSeconds = settings.recallPauseSeconds;
    for (let s = recallSeconds; s > 0; s--) {
      if (cancelRequestedRef.current) return;
      setPauseCountdown(s);
      await sleep(1000);
    }
    setPauseCountdown(0);
    if (cancelRequestedRef.current) return;

    // 3. Audio Chime Cue
    if (settings.beepCue) {
      playChimeCue();
      await sleep(350);
    }
    if (cancelRequestedRef.current) return;

    // 4. Speak Answer
    setCurrentStep("answer");
    const answerIntro = `Respuesta: ${card.answer}`;
    await speakUtterance(answerIntro, settings);
    if (cancelRequestedRef.current) return;

    // 5. Consolidation Pause
    setCurrentStep("pause_consolidation");
    setCardsReviewedCount((c) => c + 1);
    await sleep(settings.answerPauseSeconds * 1000);
    if (cancelRequestedRef.current) return;

    // 6. Advance to next card
    const nextIdx = (index + 1) % cards.length;
    setCurrentIndex(nextIdx);
    if (isPlayingRef.current && !cancelRequestedRef.current) {
      void playCardLoop(nextIdx);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    cancelRequestedRef.current = false;
    void playCardLoop(currentIndex);
  };

  const handlePause = () => {
    setIsPlaying(false);
    cancelRequestedRef.current = true;
    stopSpeech();
    setCurrentStep("idle");
  };

  const handleNextCard = () => {
    stopSpeech();
    cancelRequestedRef.current = true;
    const nextIdx = (currentIndex + 1) % selectedPlaylist.cards.length;
    setCurrentIndex(nextIdx);
    if (isPlaying) {
      setTimeout(() => {
        cancelRequestedRef.current = false;
        void playCardLoop(nextIdx);
      }, 100);
    } else {
      setCurrentStep("idle");
    }
  };

  const handlePrevCard = () => {
    stopSpeech();
    cancelRequestedRef.current = true;
    const prevIdx = (currentIndex - 1 + selectedPlaylist.cards.length) % selectedPlaylist.cards.length;
    setCurrentIndex(prevIdx);
    if (isPlaying) {
      setTimeout(() => {
        cancelRequestedRef.current = false;
        void playCardLoop(prevIdx);
      }, 100);
    } else {
      setCurrentStep("idle");
    }
  };

  const handleSaveSession = async () => {
    if (sessionSaved) return;
    const elapsed = Math.round((Date.now() - sessionStartTime) / 1000);
    await saveAudioStudySessionRecord(
      selectedPlaylist.title,
      Math.max(60, elapsed),
      cardsReviewedCount,
    );
    setSessionSaved(true);
  };

  const currentCard = selectedPlaylist.cards[currentIndex];

  return (
    <div className={`space-y-6 ${isWalkingMode ? "min-h-[85vh] bg-black text-white p-6 rounded-2xl" : ""}`}>
      {/* Top Banner */}
      {!isWalkingMode && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Headphones className="h-6 w-6 text-cyan-400" />
              <h1 className="font-serif text-2xl font-bold text-text-primary">
                Audio Flashcards & Podcast Universitario
              </h1>
            </div>
            <p className="text-text-secondary text-sm mt-1">
              Active Recall auditivo manos libres con pausas de evocación activa. Diseñado para estudiar caminando, viajando o con la pantalla bloqueada.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsWalkingMode(true)}
              className="text-xs flex items-center gap-1.5 border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Modo Caminata (OLED)</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs flex items-center gap-1.5"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Configuración</span>
            </Button>
          </div>
        </div>
      )}

      {/* Walking Mode Header if active */}
      {isWalkingMode && (
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold">
              Modo Caminata Manos Libres • Audio Activo
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsWalkingMode(false)}
            className="text-xs text-white border-white/20 hover:bg-white/10"
          >
            <Minimize2 className="h-3.5 w-3.5 mr-1" />
            <span>Salir de Pantalla Completa</span>
          </Button>
        </div>
      )}

      {/* Playlist Selector Bar */}
      {!isWalkingMode && (
        <div className="flex flex-wrap items-center gap-2 bg-bg-surface-2/60 p-3 rounded-xl border border-border-subtle">
          <span className="text-xs font-medium text-text-secondary">Playlist Académica:</span>
          {PRESET_AUDIO_PLAYLISTS.map((pl) => (
            <button
              key={pl.id}
              onClick={() => {
                handlePause();
                setSelectedPlaylist(pl);
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPlaylist.id === pl.id
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-bg-surface-3 text-text-secondary hover:text-text-primary"
              }`}
            >
              {pl.title} ({pl.cards.length} tarjetas)
            </button>
          ))}
        </div>
      )}

      {/* Settings Drawer */}
      {showSettings && !isWalkingMode && (
        <Card className="p-5 border-cyan-500/40 bg-bg-surface-2 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              Parámetros de Reproducción & Active Recall Auditivo
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setShowSettings(false)}>
              ✕
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-text-secondary">
                Pausa de Evocación ({settings.recallPauseSeconds}s):
              </label>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={settings.recallPauseSeconds}
                onChange={(e) =>
                  setSettings({ ...settings, recallPauseSeconds: Number(e.target.value) })
                }
                className="w-full mt-2"
              />
              <span className="text-[10px] text-text-muted">
                Segundos de silencio tras escuchar la pregunta para formular tu respuesta.
              </span>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-secondary">
                Velocidad de Voz ({settings.speechRate}x):
              </label>
              <div className="flex items-center gap-1 mt-1">
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setSettings({ ...settings, speechRate: rate })}
                    className={`px-2.5 py-1 rounded text-xs font-mono ${
                      settings.speechRate === rate
                        ? "bg-cyan-500 text-white font-bold"
                        : "bg-bg-surface-3 text-text-secondary hover:bg-bg-surface"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-secondary">Voz Española:</label>
              <select
                value={settings.selectedVoiceName || ""}
                onChange={(e) => setSettings({ ...settings, selectedVoiceName: e.target.value })}
                className="w-full p-2 bg-bg-surface-3 rounded border border-border-subtle text-text-primary text-xs"
              >
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Main Interactive Audio Player Card */}
      <div
        className={`p-6 md:p-8 rounded-2xl border transition-all flex flex-col justify-between ${
          isWalkingMode
            ? "border-cyan-500/30 bg-neutral-950 min-h-[500px]"
            : "border-border-subtle bg-bg-surface shadow-lg min-h-[440px]"
        }`}
      >
        {/* Step Indicator & Playlist Title */}
        <div className="flex items-center justify-between border-b border-border-subtle/40 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
              {selectedPlaylist.subject} • {selectedPlaylist.title}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-cyan-400">
                Tarjeta {currentIndex + 1} / {selectedPlaylist.cards.length}
              </span>
              <span className="text-xs text-text-muted">• {currentCard.topic}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStep === "question" && (
              <Badge variant="accent" className="animate-pulse">
                🎙️ Reproduciendo Pregunta...
              </Badge>
            )}
            {currentStep === "pause_recall" && (
              <Badge variant="warning" className="animate-bounce font-mono">
                🧠 Evocación Activa ({pauseCountdown}s)
              </Badge>
            )}
            {currentStep === "answer" && (
              <Badge variant="success">
                🔊 Revelando Respuesta
              </Badge>
            )}
            {currentStep === "idle" && (
              <Badge variant="neutral">Listo para Reproducir</Badge>
            )}
          </div>
        </div>

        {/* Center: Large Card Visual Display */}
        <div className="my-8 text-center space-y-6 max-w-2xl mx-auto">
          {/* Question Text */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Consigna / Pregunta
            </span>
            <p
              className={`font-serif font-bold transition-all leading-relaxed ${
                isWalkingMode ? "text-2xl md:text-3xl text-white" : "text-xl md:text-2xl text-text-primary"
              }`}
            >
              "{currentCard.question}"
            </p>
          </div>

          {/* Active Recall Countdown Chime Visual */}
          {currentStep === "pause_recall" && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 max-w-md mx-auto space-y-1 animate-pulse">
              <span className="text-xs font-bold text-amber-300">
                ¡Tu turno! Formulá la respuesta en tu mente o en voz alta
              </span>
              <div className="font-mono text-3xl font-extrabold text-amber-400">
                {pauseCountdown}s
              </div>
            </div>
          )}

          {/* Answer Text (Revealed during answer phase or if manually requested) */}
          {(currentStep === "answer" || currentStep === "pause_consolidation") && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 max-w-xl mx-auto space-y-1 animate-in fade-in duration-300">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Respuesta Correcta de Cátedra
              </span>
              <p className="text-sm md:text-base text-emerald-200 font-medium leading-relaxed">
                {currentCard.answer}
              </p>
            </div>
          )}
        </div>

        {/* Audio Controls Bar */}
        <div className="pt-4 border-t border-border-subtle/40 space-y-4">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handlePrevCard}
              className="p-3 rounded-full bg-bg-surface-2 hover:bg-bg-surface-3 text-text-primary transition-all active:scale-95 cursor-pointer"
              title="Tarjeta Anterior"
            >
              <SkipBack className="h-6 w-6" />
            </button>

            {!isPlaying ? (
              <button
                onClick={handlePlay}
                className="p-5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl hover:shadow-cyan-500/25 transition-all active:scale-95 cursor-pointer"
                title="Iniciar Reproducción Continua"
              >
                <Play className="h-8 w-8 fill-current ml-0.5" />
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="p-5 rounded-full bg-amber-600 hover:bg-amber-500 text-white shadow-xl hover:shadow-amber-500/25 transition-all active:scale-95 cursor-pointer"
                title="Pausar"
              >
                <Pause className="h-8 w-8 fill-current" />
              </button>
            )}

            <button
              onClick={handleNextCard}
              className="p-3 rounded-full bg-bg-surface-2 hover:bg-bg-surface-3 text-text-primary transition-all active:scale-95 cursor-pointer"
              title="Siguiente Tarjeta"
            >
              <SkipForward className="h-6 w-6" />
            </button>
          </div>

          {/* Bottom Progress Bar & Track info */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
              {cardsReviewedCount} tarjetas evocadas en esta sesión
            </span>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={sessionSaved ? "outline" : "primary"}
                disabled={sessionSaved || cardsReviewedCount === 0}
                onClick={handleSaveSession}
                className="text-xs flex items-center gap-1"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{sessionSaved ? "Sesión Guardada" : "Guardar Sesión"}</span>
              </Button>

              {onSessionFinished && (
                <Button size="sm" variant="outline" onClick={onSessionFinished}>
                  Salir
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
