import { useEffect, useRef, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Headphones, Play, Square, Volume2, Waves } from "lucide-react";
import { automationBus } from "../automationEngine";

export type BinauralMode = "gamma" | "alpha" | "theta";

interface ModeConfig {
  name: string;
  frequencyDiff: number;
  carrierFreq: number;
  description: string;
  badgeVariant: "accent" | "success" | "warning";
}

const MODES: Record<BinauralMode, ModeConfig> = {
  gamma: {
    name: "Gamma (40 Hz)",
    frequencyDiff: 40,
    carrierFreq: 200,
    description: "Resolución de problemas complejos, foco ultra-nítido y alta carga de memoria de trabajo.",
    badgeVariant: "accent",
  },
  alpha: {
    name: "Alpha (10 Hz)",
    frequencyDiff: 10,
    carrierFreq: 200,
    description: "Consolidación de memoria, alerta relajada y reducción de cortisol.",
    badgeVariant: "success",
  },
  theta: {
    name: "Theta (6 Hz)",
    frequencyDiff: 6,
    carrierFreq: 200,
    description: "Asociación remota, incubación creativa y codificación episódica profunda.",
    badgeVariant: "warning",
  },
};

export function BinauralSynthesizer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMode, setCurrentMode] = useState<BinauralMode>("gamma");
  const [binauralVolume, setBinauralVolume] = useState(0.35);
  const [noiseVolume, setNoiseVolume] = useState(0.2);
  const [noiseType, setNoiseType] = useState<"brown" | "pink" | "off">("brown");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscLeftRef = useRef<OscillatorNode | null>(null);
  const oscRightRef = useRef<OscillatorNode | null>(null);
  const binauralGainRef = useRef<GainNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);

  // Automation listener: auto-switch to Alpha if fatigue spike occurs
  useEffect(() => {
    const unsubscribe = automationBus.subscribe("FATIGUE_SPIKE", () => {
      setCurrentMode("alpha");
    });
    return unsubscribe;
  }, []);

  const stopAudio = () => {
    try {
      oscLeftRef.current?.stop();
      oscRightRef.current?.stop();
      noiseSourceRef.current?.stop();
      audioCtxRef.current?.close();
    } catch {
      // ignore
    }
    oscLeftRef.current = null;
    oscRightRef.current = null;
    noiseSourceRef.current = null;
    audioCtxRef.current = null;
    setIsPlaying(false);
  };

  const startAudio = (modeKey = currentMode) => {
    stopAudio();

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const mode = MODES[modeKey];
    const carrier = mode.carrierFreq;
    const diff = mode.frequencyDiff;

    // Channel merger for true stereo separation (Left Ear vs Right Ear)
    const merger = ctx.createChannelMerger(2);

    // Left oscillator
    const oscLeft = ctx.createOscillator();
    oscLeft.type = "sine";
    oscLeft.frequency.value = carrier;

    // Right oscillator
    const oscRight = ctx.createOscillator();
    oscRight.type = "sine";
    oscRight.frequency.value = carrier + diff;

    // Binaural Master Gain
    const bGain = ctx.createGain();
    bGain.gain.value = binauralVolume;
    binauralGainRef.current = bGain;

    // Connect left to channel 0, right to channel 1
    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);
    merger.connect(bGain);
    bGain.connect(ctx.destination);

    oscLeft.start();
    oscRight.start();
    oscLeftRef.current = oscLeft;
    oscRightRef.current = oscRight;

    // Generate Brown/Pink noise buffer if enabled
    if (noiseType !== "off") {
      const bufferSize = ctx.sampleRate * 4; // 4 seconds looping buffer
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (noiseType === "brown") {
          // Brown noise integration
          lastOut = (lastOut + 0.02 * white) / 1.02;
          output[i] = lastOut * 3.5;
        } else {
          // Pink noise approximation
          output[i] = (lastOut + 0.05 * white) / 1.05;
          lastOut = output[i];
        }
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Low-pass filter for soft warm ambient sound
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;

      const nGain = ctx.createGain();
      nGain.gain.value = noiseVolume;
      noiseGainRef.current = nGain;

      noiseSource.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);

      noiseSource.start();
      noiseSourceRef.current = noiseSource;
    }

    setIsPlaying(true);
  };

  const handleToggle = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  const handleModeChange = (newMode: BinauralMode) => {
    setCurrentMode(newMode);
    if (isPlaying) {
      startAudio(newMode);
    }
  };

  const handleBinauralVolume = (val: number) => {
    setBinauralVolume(val);
    if (binauralGainRef.current && audioCtxRef.current) {
      binauralGainRef.current.gain.setValueAtTime(val, audioCtxRef.current.currentTime);
    }
  };

  const handleNoiseVolume = (val: number) => {
    setNoiseVolume(val);
    if (noiseGainRef.current && audioCtxRef.current) {
      noiseGainRef.current.gain.setValueAtTime(val, audioCtxRef.current.currentTime);
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const config = MODES[currentMode];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-bg-surface-2/90 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-accent-primary animate-pulse" />
          <h4 className="font-display text-sm font-semibold text-text-primary">
            Sintetizador Binaural Web Audio
          </h4>
        </div>
        <Badge
          variant={config.badgeVariant === "accent" ? "neutral" : config.badgeVariant}
          className="font-mono text-[10px]"
        >
          {config.name}
        </Badge>
      </div>

      <p className="text-xs text-text-secondary leading-relaxed">{config.description}</p>

      {/* Mode selection buttons */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-bg-surface-1 border border-border-subtle font-mono text-xs">
        {(Object.keys(MODES) as BinauralMode[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleModeChange(key)}
            className={`py-1.5 px-2 rounded text-center transition-all ${
              currentMode === key
                ? "bg-accent-primary/20 text-accent-primary font-bold border border-accent-primary/30"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {MODES[key].name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Waveform / Equalizer Animation when playing */}
      {isPlaying && (
        <div className="flex items-center justify-center gap-1 h-6 bg-bg-surface-1/50 rounded-lg px-3 border border-accent-primary/20">
          <Waves className="h-3.5 w-3.5 text-accent-primary mr-1" />
          {[40, 75, 55, 90, 60, 85, 45, 70, 95, 50, 80, 65].map((h, idx) => (
            <div
              key={idx}
              className="w-1 bg-accent-primary/70 rounded-full animate-pulse"
              style={{
                height: `${h}%`,
                animationDuration: `${0.6 + (idx % 4) * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
        <div>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" /> Frecuencia Binaural
            </span>
            <span>{Math.round(binauralVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={binauralVolume}
            onChange={(e) => handleBinauralVolume(parseFloat(e.target.value))}
            className="w-full accent-accent-primary cursor-pointer h-1.5 bg-bg-surface-1 rounded-lg"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-text-tertiary mb-1">
            <span>Ruido Marrón Suave</span>
            <span>{noiseType === "off" ? "Off" : `${Math.round(noiseVolume * 100)}%`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.05}
            value={noiseVolume}
            onChange={(e) => handleNoiseVolume(parseFloat(e.target.value))}
            className="w-full accent-accent-primary cursor-pointer h-1.5 bg-bg-surface-1 rounded-lg"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-text-tertiary">Enmascaramiento:</span>
          {(["brown", "pink", "off"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setNoiseType(t);
                if (isPlaying) startAudio();
              }}
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                noiseType === t
                  ? "bg-accent-primary/20 text-accent-primary font-bold"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant={isPlaying ? "danger" : "primary"}
          onClick={handleToggle}
          className="flex items-center gap-1.5 text-xs font-mono"
        >
          {isPlaying ? (
            <>
              <Square className="h-3 w-3 fill-current" /> Detener Audio
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current" /> Iniciar Síntesis
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
