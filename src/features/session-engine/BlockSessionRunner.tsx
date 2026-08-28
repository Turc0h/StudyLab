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
  const elapsedRef = useRef(0);

  useEffect(() => {
    setRemaining(blocks[index]?.durationSec ?? 0);
    onBlockChange?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      elapsedRef.current += 1;
      setRemaining((r) => {
        if (r <= 1) {
          if (index < blocks.length - 1) {
            setIndex((i) => i + 1);
          } else {
            setRunning(false);
            onFinish?.(elapsedRef.current);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index, blocks]);

  const block = blocks[index];
  if (!block) return null;

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="flex items-center gap-1.5">
        {blocks.map((b, i) => (
          <span
            key={`${b.label}-${i}`}
            className={
              i === index
                ? "h-1.5 w-6 rounded-full bg-accent transition-all duration-150"
                : i < index
                  ? "h-1.5 w-1.5 rounded-full bg-accent/50 transition-all duration-150"
                  : "h-1.5 w-1.5 rounded-full bg-bg-surface-2 transition-all duration-150"
            }
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
          {block.label}
        </span>
        <span className="font-mono text-5xl tabular-nums text-text-primary">
          {formatTime(remaining)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-accent-contrast transition-colors duration-150 hover:bg-accent-hover"
        >
          {running ? (
            <Pause size={18} strokeWidth={1.75} />
          ) : (
            <Play size={18} strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setIndex(0);
            elapsedRef.current = 0;
          }}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-bg-surface-2 hover:text-text-primary"
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
              onFinish?.(elapsedRef.current);
            }
          }}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-bg-surface-2 hover:text-text-primary"
        >
          <SkipForward size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
