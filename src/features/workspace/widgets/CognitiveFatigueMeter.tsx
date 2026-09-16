import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { automationBus } from "../automationEngine";
import { Activity, RotateCcw, Clock, Zap } from "lucide-react";
import { calculateSessionFatigue, type FatigueState } from "../../study-engine/fatigueMonitor";

export function CognitiveFatigueMeter() {
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [fatigueState, setFatigueState] = useState<FatigueState>({
    fatigueScore: 18,
    level: "low",
    sessionDurationMinutes: 1,
    averageLatencyMs: 0,
    latencyIncreaseRatio: 1.0,
    accuracyDropPercentage: 0,
    recommendation: "Nivel óptimo de concentración y rendimiento neurocognitivo.",
    requiresBreak: false,
  });

  useEffect(() => {
    // Monitor de fatiga ético: calcula periódicamente en base a duración y reviewLogs
    const updateMetrics = async () => {
      const state = await calculateSessionFatigue(sessionStartTime);
      setFatigueState(state);

      if (state.fatigueScore >= 75) {
        automationBus.emit("FATIGUE_SPIKE", { fatigueScore: state.fatigueScore });
      }
    };

    void updateMetrics();
    const interval = setInterval(() => {
      void updateMetrics();
    }, 30000); // Cada 30 segundos sin registrar pulsaciones

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  function handleReset() {
    setSessionStartTime(Date.now());
  }

  const fatigueScore = fatigueState.fatigueScore;

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
            {fatigueState.recommendation}
          </p>
        </div>
      </div>

      {/* Ethical Cognitive Metrics (Sección 26-BIS: Sin telemetría de tecleo) */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-subtle/60 text-center font-mono text-[11px]">
        <div className="rounded bg-bg-surface-1/70 p-2 border border-border-subtle/50">
          <span className="text-text-tertiary block text-[10px] flex items-center justify-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Tiempo
          </span>
          <strong className="text-text-primary">{fatigueState.sessionDurationMinutes} min</strong>
        </div>
        <div className="rounded bg-bg-surface-1/70 p-2 border border-border-subtle/50">
          <span className="text-text-tertiary block text-[10px] flex items-center justify-center gap-1">
            <Zap className="w-2.5 h-2.5 text-cyan-400" /> Latencia
          </span>
          <strong className="text-text-primary">
            {fatigueState.averageLatencyMs > 0 ? `${(fatigueState.averageLatencyMs / 1000).toFixed(1)}s` : "--"}
          </strong>
        </div>
        <div className="rounded bg-bg-surface-1/70 p-2 border border-border-subtle/50">
          <span className="text-text-tertiary block text-[10px]">Caída Acierto</span>
          <strong className={fatigueState.accuracyDropPercentage > 15 ? "text-warning" : "text-text-secondary"}>
            {fatigueState.accuracyDropPercentage > 0 ? `-${fatigueState.accuracyDropPercentage}%` : "0%"}
          </strong>
        </div>
      </div>
    </div>
  );
}
