import React, { useMemo } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Award, CheckCircle2 } from "lucide-react";

export interface RubricDimension {
  id: string;
  name: string;
  description?: string;
  weight?: number; // Ponderación relativa (default 1)
  min?: number; // default 1
  max?: number; // default 5
  step?: number; // default 1
  levelLabels?: Record<number, string>;
}

export interface QualitativeThreshold {
  minScorePct: number; // Porcentaje mínimo (ej. 80 para >= 80%)
  verdict: string;
  variant: "success" | "accent" | "warning" | "danger";
  description?: string;
}

export interface RubricScorerProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  dimensions: RubricDimension[];
  scores: Record<string, number>;
  onChangeScores: (scores: Record<string, number>) => void;
  onSave?: (scores: Record<string, number>, finalScore: number, verdict: string) => void;
  scaleType?: "percentage" | "ten_point"; // 0-100% o 1-10 puntos
  qualitativeThresholds?: QualitativeThreshold[];
  isSaving?: boolean;
  saveLabel?: string;
  children?: React.ReactNode;
  actionsSlot?: (summary: { totalScore: number; scorePercentage: number; currentVerdict: QualitativeThreshold }) => React.ReactNode;
  className?: string;
}

const DEFAULT_THRESHOLDS: QualitativeThreshold[] = [
  { minScorePct: 90, verdict: "Sobresaliente con Distinción", variant: "success", description: "Dominio exhaustivo sin fisuras conceptuales." },
  { minScorePct: 75, verdict: "Aprobado con Solvencia", variant: "accent", description: "Rigor técnico adecuado con detalles menores a pulir." },
  { minScorePct: 60, verdict: "Aprobado Límite", variant: "warning", description: "Cumple los requisitos mínimos de acreditación de cátedra." },
  { minScorePct: 0, verdict: "No Acreditado / A Revisar", variant: "danger", description: "Existen lagunas críticas en conceptos nucleares." },
];

export const RubricScorer: React.FC<RubricScorerProps> = ({
  title = "Rúbrica de Autoevaluación de Cátedra",
  subtitle = "Califica honestamente cada dimensión para auditar tu rendimiento real.",
  badgeText = "Rúbrica Cualicuantitativa",
  dimensions,
  scores,
  onChangeScores,
  onSave,
  scaleType = "percentage",
  qualitativeThresholds = DEFAULT_THRESHOLDS,
  isSaving = false,
  saveLabel = "Guardar Calificación y Veredicto",
  children,
  actionsSlot,
  className = "",
}) => {
  // Cálculo ponderado normalizado
  const { totalScore, scorePercentage, currentVerdict } = useMemo(() => {
    let totalWeight = 0;
    let accumulated = 0;

    for (const dim of dimensions) {
      const weight = dim.weight ?? 1;
      const min = dim.min ?? 1;
      const max = dim.max ?? 5;
      const raw = scores[dim.id] ?? min;

      // Normalizar [min..max] a [0..1]
      const range = max - min;
      const normalizedRatio = range > 0 ? (raw - min) / range : 1;

      accumulated += normalizedRatio * weight;
      totalWeight += weight;
    }

    const pct = totalWeight > 0 ? (accumulated / totalWeight) * 100 : 0;
    const finalScore = scaleType === "percentage" ? Math.round(pct) : Number(((pct / 100) * 9 + 1).toFixed(1));

    // Determinar umbral cualitativo
    const sortedThresholds = [...qualitativeThresholds].sort((a, b) => b.minScorePct - a.minScorePct);
    const match = sortedThresholds.find((t) => pct >= t.minScorePct) || sortedThresholds[sortedThresholds.length - 1];

    return {
      totalScore: finalScore,
      scorePercentage: Math.round(pct),
      currentVerdict: match,
    };
  }, [dimensions, scores, scaleType, qualitativeThresholds]);

  const handleScoreChange = (dimId: string, val: number) => {
    onChangeScores({ ...scores, [dimId]: val });
  };

  return (
    <div className={`flex flex-col gap-6 rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-xs ${className}`}>
      {/* Header con título y resumen métrico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-semibold text-text-primary">{title}</h3>
            {badgeText && <Badge variant="accent">{badgeText}</Badge>}
          </div>
          {subtitle && <p className="text-xs text-text-secondary mt-1 max-w-xl">{subtitle}</p>}
        </div>

        {/* Tarjeta del Veredicto en Vivo */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-bg-secondary/60 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-text-primary">
                {totalScore}
                <span className="text-xs text-text-muted font-normal ml-0.5">
                  {scaleType === "percentage" ? "%" : "/10"}
                </span>
              </span>
              <Badge variant={currentVerdict.variant} className="text-[10px] font-medium">
                {currentVerdict.verdict}
              </Badge>
            </div>
            {currentVerdict.description && (
              <p className="text-[10px] text-text-muted mt-0.5 max-w-[200px] truncate">
                {currentVerdict.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dimensiones evaluadas */}
      <div className="space-y-4">
        {dimensions.map((dim) => {
          const min = dim.min ?? 1;
          const max = dim.max ?? 5;
          const currentVal = scores[dim.id] ?? min;
          const levelLabel = dim.levelLabels?.[currentVal];

          return (
            <div
              key={dim.id}
              className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/30 space-y-2.5 transition-colors hover:border-accent-primary/20"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-text-primary">{dim.name}</span>
                  {dim.description && (
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                      {dim.description}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-sm font-bold text-accent-primary">{currentVal}</span>
                  <span className="text-[10px] text-text-muted font-mono"> / {max}</span>
                  {levelLabel && (
                    <span className="block text-[10px] text-text-muted mt-0.5 font-medium">{levelLabel}</span>
                  )}
                </div>
              </div>

              {/* Slider de control y botones de salto rápido */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={dim.step ?? 1}
                    value={currentVal}
                    onChange={(e) => handleScoreChange(dim.id, Number(e.target.value))}
                    className="flex-1 accent-accent-primary cursor-pointer"
                  />

                  {max - min <= 5 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleScoreChange(dim.id, val)}
                          className={`h-7 w-7 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                            currentVal === val
                              ? "bg-accent-primary text-white"
                              : "border border-border-hairline bg-bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-bg-surface-2"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Etiquetas de escala mínima y máxima */}
                <div className="flex justify-between text-[10px] text-text-muted font-mono">
                  <span>{dim.levelLabels?.[min] || `Mínimo (${min})`}</span>
                  <span>{dim.levelLabels?.[max] || `Máximo (${max})`}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranura para contenido adicional (feedback, dictámenes pedagógicos) */}
      {children}

      {/* Botonera de Acciones Finales */}
      {(onSave || actionsSlot) && (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <div>
            {actionsSlot?.({ totalScore, scorePercentage, currentVerdict })}
          </div>

          {onSave && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSave(scores, totalScore, currentVerdict.verdict)}
              disabled={isSaving}
              className="text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isSaving ? "Guardando..." : saveLabel}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
