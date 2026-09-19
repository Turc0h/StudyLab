import React from "react";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { useBiometricsStore } from "../../stores/useBiometricsStore";
import { BoxBreathingModal } from "./BoxBreathingModal";
import {
  Heart,
  Bluetooth,
  Activity,
  Wind,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export const BiometricsMonitorCard: React.FC = () => {
  const {
    connectionState,
    deviceName,
    currentBpm,
    currentHrv,
    stressEvaluation,
    history,
    isBoxBreathingOpen,
    errorMessage,
    connectBle,
    disconnect,
    startSimulation,
    setBoxBreathingOpen,
    clearError,
  } = useBiometricsStore();

  // Duración de la animación de latido en base al BPM actual (ej: 72 bpm -> ~0.83s por latido)
  const pulseDurationSec = currentBpm > 0 ? (60 / currentBpm).toFixed(2) : "1.00";

  return (
    <Card className="border-border-subtle bg-bg-surface/80 backdrop-blur-md shadow-lg overflow-hidden">
      <CardHeader className="border-b border-border-subtle pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/30">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-text-primary flex items-center gap-2">
                Telemetría Biométrica & Pulso Cardíaco
                <Badge
                  variant={
                    connectionState === "connected"
                      ? "success"
                      : connectionState === "simulated"
                      ? "warning"
                      : "neutral"
                  }
                  className="text-[10px] uppercase font-mono"
                >
                  {connectionState === "connected"
                    ? "BLE CONECTADO"
                    : connectionState === "simulated"
                    ? "SIMULADOR SINTÉTICO"
                    : "DESCONECTADO"}
                </Badge>
              </CardTitle>
              <p className="text-xs text-text-secondary mt-0.5">
                {deviceName ? `Dispositivo: ${deviceName}` : "Soporte Bluetooth Low Energy GATT Heart Rate Service (0x180D)."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBoxBreathingOpen(true)}
              className="text-xs flex items-center gap-1.5 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Wind className="h-3.5 w-3.5" />
              <span>Respiración 4-4-4-4</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="p-6 space-y-6">
        {/* Banner de Error si falló BLE */}
        {errorMessage && (
          <div className="flex items-start justify-between rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-white font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Panel Central de Pulso */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Gauge Cardíaco con Corazón Animado */}
          <div className="flex items-center gap-5 rounded-2xl border border-border-subtle bg-bg-surface-2/40 p-5">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <Heart
                className="h-10 w-10 text-red-500 fill-red-500/30 transition-transform"
                style={{
                  animation: connectionState !== "disconnected" ? `pulse ${pulseDurationSec}s infinite ease-in-out` : "none",
                }}
              />
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black font-mono tracking-tight text-text-primary">
                  {connectionState !== "disconnected" ? currentBpm : "--"}
                </span>
                <span className="text-xs font-mono text-text-tertiary">BPM</span>
              </div>
              <div className="text-[11px] text-text-secondary mt-1 flex items-center gap-1.5">
                <span>Variabilidad HRV:</span>
                <span className="font-mono font-bold text-accent">
                  {currentHrv ? `${currentHrv} ms` : "No disponible"}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnóstico de Estrés Autonómico */}
          <div className="md:col-span-2 rounded-2xl border border-border-subtle bg-bg-surface-2/40 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Estado Fisiológico y Carga Atencional:
              </span>
              <Badge
                variant={
                  stressEvaluation.state === "stressed"
                    ? "danger"
                    : stressEvaluation.state === "strained"
                    ? "warning"
                    : "success"
                }
                className="text-xs font-mono"
              >
                {stressEvaluation.stateLabel}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {stressEvaluation.description}
            </p>

            {stressEvaluation.recommendedAction === "box_breathing" && (
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => setBoxBreathingOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Wind className="h-3.5 w-3.5" />
                  Iniciar Box Breathing Anti-Estrés
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico Histórico de Lecturas (Sparkline) */}
        {history.length > 2 && (
          <div className="space-y-2 rounded-xl border border-border-subtle bg-bg-surface-2/20 p-4">
            <div className="flex items-center justify-between text-xs text-text-tertiary font-mono">
              <span>HISTORIAL EN VIVO (ÚLTIMAS {history.length} MUESTRAS)</span>
              <span>MIN: {Math.min(...history.map((h) => h.bpm))} BPM • MAX: {Math.max(...history.map((h) => h.bpm))} BPM</span>
            </div>

            {/* Barras de Pulso */}
            <div className="flex items-end gap-1.5 h-16 pt-2">
              {history.map((sample, idx) => {
                // Escalar altura de 0 a 100% en base a un rango de 50 a 130 BPM
                const heightPct = Math.min(100, Math.max(15, ((sample.bpm - 50) / 80) * 100));
                const isHigh = sample.bpm >= 95;
                const isMedium = sample.bpm >= 82 && sample.bpm < 95;

                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-t transition-all duration-300 relative group"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div
                      className={`w-full h-full rounded-t ${
                        isHigh
                          ? "bg-red-500/80 group-hover:bg-red-400"
                          : isMedium
                          ? "bg-amber-500/80 group-hover:bg-amber-400"
                          : "bg-emerald-500/80 group-hover:bg-emerald-400"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Acciones de Conexión y Simulación */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-subtle/60">
          <div className="flex flex-wrap items-center gap-2">
            {connectionState === "disconnected" ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={connectBle}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Bluetooth className="h-3.5 w-3.5" />
                  <span>Conectar Banda BLE</span>
                </Button>

                <div className="flex items-center gap-1 pl-2">
                  <span className="text-[11px] text-text-tertiary">Probar con Simulador:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startSimulation("calm")}
                    className="text-xs py-1 px-2 border-slate-700 text-slate-300"
                  >
                    Calma (64 BPM)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startSimulation("focused")}
                    className="text-xs py-1 px-2 border-slate-700 text-emerald-400"
                  >
                    Foco (78 BPM)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startSimulation("stressed")}
                    className="text-xs py-1 px-2 border-slate-700 text-red-400"
                  >
                    Estrés (104 BPM)
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Desconectar / Detener</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Datos procesados 100% en cliente sin transferencias a la nube.</span>
          </div>
        </div>
      </div>

      {/* Modal de Box Breathing */}
      <BoxBreathingModal
        isOpen={isBoxBreathingOpen}
        onClose={() => setBoxBreathingOpen(false)}
      />
    </Card>
  );
};
