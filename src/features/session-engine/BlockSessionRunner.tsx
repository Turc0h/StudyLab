import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface SessionBlock {
  label: string;
  durationSec: number;
}

interface BlockSessionRunnerProps {
  blocks: SessionBlock[];
  onBlockChange?: (index: number) => void;
  onFinish?: (totalElapsedSec: number) => void;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function BlockSessionRunner({ blocks, onBlockChange, onFinish }: BlockSessionRunnerProps) {
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(blocks[0]?.durationSec ?? 0);
  const [running, setRunning] = useState(false);
  const targetEndTimeRef = useRef<number | null>(null);
  const startTimestampRef = useRef(Date.now());
  const elapsedAccumRef = useRef(0);

  const block = blocks[index];
  const totalDuration = block?.durationSec || 1;
  const progress = Math.min(1, Math.max(0, (totalDuration - remaining) / totalDuration));

  useEffect(() => {
    const dur = blocks[index]?.durationSec ?? 0;
    setRemaining(dur);
    if (running) {
      targetEndTimeRef.current = Date.now() + dur * 1000;
    }
    onBlockChange?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (!running) {
      targetEndTimeRef.current = null;
      return;
    }

    targetEndTimeRef.current = Date.now() + remaining * 1000;
    startTimestampRef.current = Date.now();

    const interval = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const now = Date.now();
      const diffSec = Math.max(0, Math.round((targetEndTimeRef.current - now) / 1000));
      elapsedAccumRef.current += 1;

      if (diffSec <= 0) {
        setRemaining(0);
        if (index < blocks.length - 1) {
          setIndex((i) => i + 1);
        } else {
          setRunning(false);
          targetEndTimeRef.current = null;
          onFinish?.(elapsedAccumRef.current);
        }
      } else {
        setRemaining(diffSec);
      }
    }, 500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index]);

  if (!block) return null;

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center gap-1.5">
        {blocks.map((b, i) => (
          <span
            key={`${b.label}-${i}`}
            className={
              i === index
                ? "h-1.5 w-6 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)] transition-all duration-200"
                : i < index
                  ? "h-1.5 w-2 rounded-full bg-accent/50 transition-all duration-200"
                  : "h-1.5 w-2 rounded-full bg-bg-surface-2 border border-border-subtle transition-all duration-200"
            }
          />
        ))}
      </div>

      {/* Progress Ring HUD */}
      <div className="relative flex items-center justify-center">
        <svg className="h-48 w-48 -rotate-90 transform" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-bg-surface-2"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-accent transition-all duration-300"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent) 60%, transparent))",
            }}
          />
        </svg>

        <div className="absolute flex flex-col items-center gap-1 text-center">
          <span className="font-mono text-[10px] tracking-widest text-text-tertiary uppercase">
            {block.label}
          </span>
          <span className="font-mono text-4xl font-semibold tabular-nums text-text-primary tracking-tight">
            {formatTime(remaining)}
          </span>
          <span className="font-mono text-[10px] text-accent/80">
            {Math.round(progress * 100)}% COMPLETADO
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-accent-contrast shadow-[var(--shadow-glow-sm)] transition-all duration-150 hover:bg-accent-hover hover:shadow-[var(--shadow-glow)] active:scale-95"
        >
          {running ? (
            <Pause size={18} strokeWidth={2} />
          ) : (
            <Play size={18} strokeWidth={2} className="ml-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setIndex(0);
            setRemaining(blocks[0]?.durationSec ?? 0);
            elapsedAccumRef.current = 0;
            targetEndTimeRef.current = null;
          }}
          title="Reiniciar bloque"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-bg-surface-2 text-text-secondary transition-colors duration-150 hover:border-accent/40 hover:text-text-primary active:scale-95"
        >
          <RotateCcw size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (index < blocks.length - 1) {
              setIndex((i) => i + 1);
            } else {
              setRunning(false);
              targetEndTimeRef.current = null;
              onFinish?.(elapsedAccumRef.current);
            }
          }}
          title="Saltar al siguiente bloque"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-bg-surface-2 text-text-secondary transition-colors duration-150 hover:border-accent/40 hover:text-text-primary active:scale-95"
        >
          <SkipForward size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
