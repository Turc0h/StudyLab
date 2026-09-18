import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Battery, Sparkles, Check } from "lucide-react";

export const PostSessionEnergyCheck: React.FC<{
  onRecorded?: () => void;
  sessionDurationMinutes?: number;
}> = ({ onRecorded, sessionDurationMinutes = 30 }) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Consultar registros históricos de telemetría de energía
  const energyLogs = useLiveQuery(async () => {
    const all = await db.fatigueTelemetry.toArray();
    return all.filter((l) => typeof l.energyScore === "number");
  }, []);

  const totalCount = energyLogs?.length || 0;
  const isUnlocked = totalCount >= 10;

  // Calcular estadísticas legibles cuando se alcanza el umbral de 10 registros
  let bestBlockLabel = "";
  let statsSummary = { morningAvg: 0, afternoonAvg: 0, nightAvg: 0 };

  if (isUnlocked && energyLogs) {
    const morningScores: number[] = [];
    const afternoonScores: number[] = [];
    const nightScores: number[] = [];

    energyLogs.forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      const score = log.energyScore || 3;
      if (hour >= 6 && hour < 12) {
        morningScores.push(score);
      } else if (hour >= 12 && hour < 19) {
        afternoonScores.push(score);
      } else {
        nightScores.push(score);
      }
    });

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const mAvg = avg(morningScores);
    const aAvg = avg(afternoonScores);
    const nAvg = avg(nightScores);

    statsSummary = {
      morningAvg: Math.round(mAvg * 10) / 10,
      afternoonAvg: Math.round(aAvg * 10) / 10,
      nightAvg: Math.round(nAvg * 10) / 10,
    };

    if (mAvg >= aAvg && mAvg >= nAvg) {
      bestBlockLabel = "la Mañana (06:00 - 12:00)";
    } else if (aAvg >= mAvg && aAvg >= nAvg) {
      bestBlockLabel = "la Tarde (12:00 - 19:00)";
    } else {
      bestBlockLabel = "la Noche (19:00 - 06:00)";
    }
  }

  const handleSaveEnergy = async (score: number) => {
    setSelectedRating(score);
    const now = Date.now();

    await db.fatigueTelemetry.add({
      id: `energy_${now}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      fatigueScore: (6 - score) * 20, // 1 -> 100, 5 -> 20
      keystrokeVariance: 0,
      pauseRate: 0,
      sessionDurationSec: sessionDurationMinutes * 60,
      energyScore: score as any,
    });

    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      onRecorded?.();
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-bg-secondary/20 border-border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Battery className="h-4 w-4 text-accent-primary" />
            <h4 className="font-serif text-sm font-semibold text-text-primary">
              Registro Rápido de Energía & Concentración
            </h4>
          </div>
          <Badge variant="neutral">
            {totalCount}/10 para análisis circadiano
          </Badge>
        </div>

        <p className="text-xs text-text-secondary">
          Tocá un nivel para registrar cómo sentiste tu concentración en este bloque:
        </p>

        {/* 1 a 5 Tap Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {[
            { val: 1, label: "1 (Agotado)" },
            { val: 2, label: "2 (Bajo)" },
            { val: 3, label: "3 (Neutro)" },
            { val: 4, label: "4 (Buen Foco)" },
            { val: 5, label: "5 (Máxima Energía)" },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => handleSaveEnergy(item.val)}
              disabled={justSaved}
              className={`flex-1 rounded border py-2 px-1 text-center transition-all ${
                selectedRating === item.val
                  ? "border-accent-primary bg-accent-primary/20 text-accent-primary font-bold scale-[1.02]"
                  : "border-border-subtle bg-bg-primary hover:bg-bg-secondary hover:border-accent-primary/40 text-text-secondary text-xs"
              }`}
            >
              <div className="font-mono text-sm font-bold">{item.val}</div>
              <div className="text-[10px] text-text-muted mt-0.5 truncate">{item.label}</div>
            </button>
          ))}
        </div>

        {justSaved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 justify-center pt-1 font-medium">
            <Check className="h-3.5 w-3.5" />
            <span>Nivel de energía registrado localmente con éxito.</span>
          </div>
        )}
      </Card>

      {/* Resumen Estadístico tras >= 10 Registros */}
      {isUnlocked ? (
        <div className="rounded border border-accent-primary/30 bg-accent-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-primary" />
            <h4 className="font-serif text-xs font-semibold text-text-primary">
              Patrón Circadiano de Productividad ({totalCount} sesiones registradas)
            </h4>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Según tu historial acumulado, tus sesiones mejor evaluadas ocurrieron mayormente en{" "}
            <strong className="text-text-primary">{bestBlockLabel}</strong>.
          </p>
          <div className="flex flex-wrap gap-4 text-[11px] text-text-muted pt-1">
            <span>Mañana: <strong>{statsSummary.morningAvg}/5</strong></span>
            <span>Tarde: <strong>{statsSummary.afternoonAvg}/5</strong></span>
            <span>Noche: <strong>{statsSummary.nightAvg}/5</strong></span>
          </div>
        </div>
      ) : (
        <div className="rounded border border-dashed border-border-subtle p-3 text-center text-xs text-text-muted">
          Registrá al menos 10 evaluaciones al término de tus sesiones para que el sistema identifique tu franja biológica óptima de estudio (actualmente: {totalCount}/10).
        </div>
      )}
    </div>
  );
};
