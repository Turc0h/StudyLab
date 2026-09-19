import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { db } from "../../db/db";
import {
  calculateDeckRetentionForecast,
} from "./retentionForecast";
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Info,
} from "lucide-react";

export const RetentionForecastCard: React.FC = () => {
  const cardsFsrs = useLiveQuery(() => db.cardsFsrs.toArray(), []) || [];
  const [horizonDays, setHorizonDays] = useState<number>(90);

  const forecast = useMemo(() => {
    return calculateDeckRetentionForecast(cardsFsrs, horizonDays);
  }, [cardsFsrs, horizonDays]);

  const {
    cardsWithStability,
    averageStabilityDays,
    projectedRetentionAtHorizon,
    daysUntil80Percent,
    daysUntil70Percent,
    milestones,
    recommendation,
  } = forecast;

  const pctHorizon = Math.round(projectedRetentionAtHorizon * 100);

  // SVG Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 160;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 25;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Generate SVG path for the curve
  const points = forecast.curve.map((pt) => {
    const x = padLeft + (pt.dayOffset / 365) * chartW;
    const y = padTop + (1 - pt.averageRetention) * chartH;
    return `${x},${y}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(" L ")}` : "";

  // Helper for milestone color
  const getRetentionColor = (rate: number) => {
    if (rate >= 0.85) return "text-emerald-400";
    if (rate >= 0.70) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <Card className="border-border-subtle bg-bg-surface/80 backdrop-blur-md">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <TrendingUp size={18} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-text-primary flex items-center gap-2">
              Pronóstico de Retención a 365 Días
              <Badge variant="accent" className="text-[10px] font-mono py-0">
                FSRS v5 PREDICTOR
              </Badge>
            </CardTitle>
            <p className="text-xs text-text-tertiary">
              Simulación de decaimiento futuro de memoria R(t, S) sin repasos adicionales.
            </p>
          </div>
        </div>

        {/* Selector de Horizonte de Examen */}
        <div className="flex items-center gap-1.5 rounded-lg bg-bg-surface-2 p-1 border border-border-subtle self-start sm:self-auto">
          <span className="text-[10px] font-mono text-text-tertiary px-1.5 uppercase">Horizonte:</span>
          {[30, 60, 90, 180].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setHorizonDays(d)}
              className={`rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                horizonDays === d
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </CardHeader>

      <div className="space-y-4 p-4 pt-0">
        {/* Metric KPI Row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-bg-surface-2/60 p-2.5 border border-border-subtle/50">
            <span className="text-[10px] uppercase font-mono text-text-tertiary">
              Retención a {horizonDays} Días
            </span>
            <p className={`text-xl font-mono font-bold mt-0.5 ${getRetentionColor(projectedRetentionAtHorizon)}`}>
              {pctHorizon}%
            </p>
            <span className="text-[10px] text-text-tertiary">
              {projectedRetentionAtHorizon >= 0.85 ? "Zona Segura" : projectedRetentionAtHorizon >= 0.70 ? "Alerta Media" : "Riesgo Alto"}
            </span>
          </div>

          <div className="rounded-lg bg-bg-surface-2/60 p-2.5 border border-border-subtle/50">
            <span className="text-[10px] uppercase font-mono text-text-tertiary">
              Estabilidad Promedio (S)
            </span>
            <p className="text-xl font-mono font-bold text-text-primary mt-0.5">
              {averageStabilityDays} <span className="text-xs font-normal text-text-tertiary">días</span>
            </p>
            <span className="text-[10px] text-text-tertiary">
              {cardsWithStability} tarjetas analizadas
            </span>
          </div>

          <div className="rounded-lg bg-bg-surface-2/60 p-2.5 border border-border-subtle/50">
            <span className="text-[10px] uppercase font-mono text-text-tertiary">
              Umbral 80% (Aprobado)
            </span>
            <p className="text-xl font-mono font-bold text-amber-400 mt-0.5">
              {daysUntil80Percent ? `Día +${daysUntil80Percent}` : "> 365 días"}
            </p>
            <span className="text-[10px] text-text-tertiary">
              Límite de memoria sólida
            </span>
          </div>

          <div className="rounded-lg bg-bg-surface-2/60 p-2.5 border border-border-subtle/50">
            <span className="text-[10px] uppercase font-mono text-text-tertiary">
              Abismo Crítico 70%
            </span>
            <p className="text-xl font-mono font-bold text-rose-400 mt-0.5">
              {daysUntil70Percent ? `Día +${daysUntil70Percent}` : "> 365 días"}
            </p>
            <span className="text-[10px] text-text-tertiary">
              Pérdida acelerada
            </span>
          </div>
        </div>

        {/* Curva Matemática de Retención SVG */}
        <div className="rounded-lg bg-bg-surface-2/40 p-3 border border-border-subtle/60">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-mono text-[11px] text-text-tertiary uppercase flex items-center gap-1">
              <TrendingUp size={12} className="text-cyan-400" />
              Curva de Olvido Proyectada R(t) [0 - 365 Días]
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> &gt;85% Sólida
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> 80% Umbral
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> &lt;70% Crítico
              </span>
            </div>
          </div>

          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Threshold Lines */}
              {/* 90% */}
              <line
                x1={padLeft}
                y1={padTop + (1 - 0.9) * chartH}
                x2={svgWidth - padRight}
                y2={padTop + (1 - 0.9) * chartH}
                stroke="rgba(16, 185, 129, 0.25)"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft - 6}
                y={padTop + (1 - 0.9) * chartH + 3}
                fill="rgba(16, 185, 129, 0.7)"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                90%
              </text>

              {/* 80% */}
              <line
                x1={padLeft}
                y1={padTop + (1 - 0.8) * chartH}
                x2={svgWidth - padRight}
                y2={padTop + (1 - 0.8) * chartH}
                stroke="rgba(245, 158, 11, 0.25)"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft - 6}
                y={padTop + (1 - 0.8) * chartH + 3}
                fill="rgba(245, 158, 11, 0.7)"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                80%
              </text>

              {/* 70% */}
              <line
                x1={padLeft}
                y1={padTop + (1 - 0.7) * chartH}
                x2={svgWidth - padRight}
                y2={padTop + (1 - 0.7) * chartH}
                stroke="rgba(244, 63, 94, 0.25)"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft - 6}
                y={padTop + (1 - 0.7) * chartH + 3}
                fill="rgba(244, 63, 94, 0.7)"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                70%
              </text>

              {/* Target Horizon Vertical Line */}
              {(() => {
                const targetX = padLeft + (horizonDays / 365) * chartW;
                return (
                  <g>
                    <line
                      x1={targetX}
                      y1={padTop}
                      x2={targetX}
                      y2={svgHeight - padBottom}
                      stroke="rgba(6, 182, 212, 0.6)"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={targetX}
                      y={svgHeight - padBottom + 14}
                      fill="rgba(6, 182, 212, 0.9)"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      Día {horizonDays}
                    </text>
                  </g>
                );
              })()}

              {/* Axis Bottom */}
              <line
                x1={padLeft}
                y1={svgHeight - padBottom}
                x2={svgWidth - padRight}
                y2={svgHeight - padBottom}
                stroke="var(--color-border-subtle, #334155)"
                strokeWidth="1"
              />

              {/* X Axis Labels */}
              {[0, 90, 180, 270, 365].map((d) => {
                if (d === horizonDays) return null;
                const x = padLeft + (d / 365) * chartW;
                return (
                  <text
                    key={d}
                    x={x}
                    y={svgHeight - padBottom + 14}
                    fill="var(--color-text-tertiary, #94a3b8)"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {d === 0 ? "Hoy" : `${d}d`}
                  </text>
                );
              })}

              {/* Curve Gradient Fill */}
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {pathD && (
                <>
                  <path
                    d={`${pathD} L ${padLeft + chartW},${svgHeight - padBottom} L ${padLeft},${svgHeight - padBottom} Z`}
                    fill="url(#curveGradient)"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Hitos Temporales Clave */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 text-center text-xs">
          {[
            { label: "Hoy", val: milestones.today },
            { label: "7 Días", val: milestones.at7Days },
            { label: "30 Días", val: milestones.at30Days },
            { label: "60 Días", val: milestones.at60Days },
            { label: "90 Días", val: milestones.at90Days },
            { label: "365 Días", val: milestones.at365Days },
          ].map((m) => (
            <div key={m.label} className="rounded-lg bg-bg-surface-2/40 p-2 border border-border-subtle/50">
              <span className="font-mono text-[10px] text-text-tertiary block">{m.label}</span>
              <span className={`font-mono text-sm font-bold ${getRetentionColor(m.val)}`}>
                {Math.round(m.val * 100)}%
              </span>
            </div>
          ))}
        </div>

        {/* Recomendación Pedagógica Inteligente */}
        <div
          className={`flex items-start gap-3 rounded-lg p-3 border text-xs ${
            recommendation.severity === "critical"
              ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
              : recommendation.severity === "warning"
              ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {recommendation.severity === "critical" ? (
              <AlertTriangle size={16} className="text-rose-400" />
            ) : recommendation.severity === "warning" ? (
              <Info size={16} className="text-amber-400" />
            ) : (
              <ShieldCheck size={16} className="text-emerald-400" />
            )}
          </div>
          <div>
            <p className="font-semibold">{recommendation.title}</p>
            <p className="text-text-secondary mt-0.5 leading-relaxed">{recommendation.message}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="neutral" className="text-[10px] font-mono">
                <Zap size={10} className="mr-1 text-accent" />
                Refuerzo sugerido: Día +{recommendation.suggestedReviewDay}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
