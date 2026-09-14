import { useEffect, useRef, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { db } from "../../../db/db";
import { automationBus } from "../automationEngine";
import { Activity, RotateCcw } from "lucide-react";

export function CognitiveFatigueMeter() {
  const [fatigueScore, setFatigueScore] = useState(18); // Default calm starting score
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);

  const lastKeyTimeRef = useRef<number>(Date.now());
  const intervalsRef = useRef<number[]>([]);
  const backspacesInWindowRef = useRef<number>(0);
  const lastSpikeEmittedRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      setKeystrokeCount((c) => c + 1);

      if (e.key === "Backspace" || e.key === "Delete") {
        setBackspaceCount((b) => b + 1);
        backspacesInWindowRef.current += 1;
      }

      if (interval > 4000 && interval < 30000) {
        setPauseCount((p) => p + 1);
      }

      // Keep recent 30 intervals to compute typing variance
      intervalsRef.current.push(interval);
      if (intervalsRef.current.length > 30) {
        intervalsRef.current.shift();
      }

      // Compute standard deviation of intervals (jitter)
      const intervals = intervalsRef.current;
      if (intervals.length >= 5) {
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance =
          intervals.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        // Fatigue algorithm:
        // High jitter (unstable typing rhythm) + high backspace frequency + prolonged hesitation pauses
        const jitterComponent = Math.min(40, (stdDev / 800) * 40);
        const errorComponent = Math.min(35, backspacesInWindowRef.current * 4);
        const baseScore = 15;

        const calculated = Math.min(100, Math.round(baseScore + jitterComponent + errorComponent));
        setFatigueScore(calculated);

        // Check spike
        if (calculated >= 75 && now - lastSpikeEmittedRef.current > 120000) {
          lastSpikeEmittedRef.current = now;
          automationBus.emit("FATIGUE_SPIKE", { fatigueScore: calculated });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Periodically decay backspace bursts and persist telemetry
    const intervalTimer = setInterval(() => {
      backspacesInWindowRef.current = Math.max(0, backspacesInWindowRef.current - 1);
      setFatigueScore((prev) => Math.max(12, prev - 1));

      // Persist snapshot to db
      db.fatigueTelemetry
        .add({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          fatigueScore,
          keystrokeVariance: 0,
          pauseRate: pauseCount,
          sessionDurationSec: 60,
        })
        .catch(() => {});
    }, 15000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(intervalTimer);
    };
  }, [fatigueScore, pauseCount]);

  function handleReset() {
    setFatigueScore(15);
    setKeystrokeCount(0);
    setBackspaceCount(0);
    setPauseCount(0);
    intervalsRef.current = [];
    backspacesInWindowRef.current = 0;
  }

  const statusColor =
    fatigueScore >= 75 ? "#ff3b5c" : fatigueScore >= 45 ? "#ffb020" : "#00e5a3";
  const statusLabel =
    fatigueScore >= 75
      ? "Sobrecarga Crítica"
      : fatigueScore >= 45
        ? "Fatiga Moderada"
        : "Óptimo (Flow State)";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-bg-surface-2/90 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: statusColor }} />
          <h4 className="font-display text-sm font-semibold text-text-primary">
            Medidor de Fatiga Cognitiva
          </h4>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-text-tertiary hover:text-text-secondary transition-colors p-1"
          title="Reiniciar telemetría"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Radial / Bar HUD Gauge */}
      <div className="flex items-center gap-5">
        <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-border-subtle"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              strokeDasharray={`${fatigueScore}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke={statusColor}
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center font-mono">
            <span className="text-lg font-bold" style={{ color: statusColor }}>
              {fatigueScore}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <Badge
            variant={fatigueScore >= 75 ? "danger" : fatigueScore >= 45 ? "warning" : "success"}
            className="self-start"
          >
            {statusLabel}
          </Badge>
          <p className="text-xs text-text-secondary leading-relaxed">
            {fatigueScore >= 75
              ? "Degradación en la latencia de respuesta y ráfagas de corrección. Tomá 5m de descanso."
              : fatigueScore >= 45
                ? "Variabilidad moderada detectada. Mantén ritmo constante de foco."
                : "Cadencia de tecleo estable y baja tasa de correcciones de error."}
          </p>
        </div>
      </div>

      {/* Telemetry counters */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-subtle/60 text-center font-mono text-[11px]">
        <div className="rounded bg-bg-surface-1/70 p-2 border border-border-subtle/50">
          <span className="text-text-tertiary block text-[10px]">Tecleos</span>
          <strong className="text-text-primary">{keystrokeCount}</strong>
        </div>
        <div className="rounded bg-bg-surface-1/70 p-2 border border-border-subtle/50">
          <span className="text-text-tertiary block text-[10px]">Correcciones</span>
          <strong className="text-warning">{backspaceCount}</strong>
        </div>
        <div className="rounded bg-bg-surface-1/70 p-2 border border-border-subtle/50">
          <span className="text-text-tertiary block text-[10px]">Pausas &gt;4s</span>
          <strong className="text-text-secondary">{pauseCount}</strong>
        </div>
      </div>
    </div>
  );
}
