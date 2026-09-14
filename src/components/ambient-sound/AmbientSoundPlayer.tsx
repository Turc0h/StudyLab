import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Volume2, VolumeX, Play, Pause, CloudRain, Coffee, Wind, Waves } from "lucide-react";

export type AmbientTrackId = "rain" | "cafe" | "white-noise" | "waves";

interface Track {
  id: AmbientTrackId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TRACKS: Track[] = [
  { id: "rain", name: "Lluvia Fina", description: "Sonido de gotas constantes sobre cristal", icon: CloudRain },
  { id: "white-noise", name: "Ruido Blanco", description: "Espectro continuo para aislar frecuencias del entorno", icon: Wind },
  { id: "cafe", name: "Cafetería Universitaria", description: "Murmullo tenue y tazas a distancia", icon: Coffee },
  { id: "waves", name: "Oleaje Oceánico", description: "Flujo y reflujo armónico de baja frecuencia", icon: Waves },
];

export const AmbientSoundPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTrack, setActiveTrack] = useState<AmbientTrackId>("rain");
  const [volume, setVolume] = useState<number>(0.3);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);

  // Initialize Web Audio synthesizer for ambient sound (100% offline)
  const startAudio = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    if (sourceNodeRef.current) {
      try {
        (sourceNodeRef.current as AudioBufferSourceNode).stop();
      } catch {
        // ignore
      }
    }

    // Generate 5-second loop of brown/pink noise
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise filter
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);

    // Lowpass filter for smooth rain/waves
    const filter = ctx.createBiquadFilter();
    filter.type = activeTrack === "white-noise" ? "allpass" : "lowpass";
    filter.frequency.setValueAtTime(activeTrack === "waves" ? 400 : 800, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start();

    sourceNodeRef.current = noiseSource;
    gainNodeRef.current = gainNode;
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        (sourceNodeRef.current as AudioBufferSourceNode).stop();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      startAudio();
      setIsPlaying(true);
    }
  };

  const handleChangeTrack = (id: AmbientTrackId) => {
    setActiveTrack(id);
    if (isPlaying) {
      stopAudio();
      setTimeout(() => startAudio(), 50);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(val, audioContextRef.current.currentTime);
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <Card elevated className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Sonido Ambiente para Sesiones Profundas</CardTitle>
        <span className="text-xs text-text-secondary">
          Generado sintéticamente en el cliente vía Web Audio API para aislar el entorno acústico
        </span>
      </CardHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TRACKS.map((track) => {
          const Icon = track.icon;
          const isSelected = activeTrack === track.id;
          return (
            <div
              key={track.id}
              onClick={() => handleChangeTrack(track.id)}
              className={`p-4 rounded border transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? "border-accent-primary bg-bg-elevated shadow-2xs"
                  : "border-border-subtle bg-bg-secondary hover:border-text-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm font-semibold text-text-primary">
                  {track.name}
                </span>
                <Icon className={`h-4 w-4 ${isSelected ? "text-accent-primary" : "text-text-muted"}`} />
              </div>
              <p className="font-sans text-xs text-text-secondary leading-relaxed">
                {track.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border-subtle pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant={isPlaying ? "secondary" : "primary"}
            onClick={handleTogglePlay}
            className="w-32 gap-2"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPlaying ? "Detener" : "Reproducir"}</span>
          </Button>

          <span className="font-sans text-xs text-text-muted">
            {isPlaying ? "Pista activa en bucle" : "Pista pausada"}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-64">
          {volume === 0 ? <VolumeX className="h-4 w-4 text-text-muted" /> : <Volume2 className="h-4 w-4 text-text-secondary" />}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-accent-primary"
            aria-label="Control de volumen"
          />
          <span className="font-mono text-xs text-text-muted tabular-nums w-8">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </Card>
  );
};
