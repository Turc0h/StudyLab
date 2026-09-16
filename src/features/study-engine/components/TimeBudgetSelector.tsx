import React, { useState } from "react";
import { Link } from "react-router-dom";
import { calculateTimeBudgetPlan, type TimeBudgetPlan, type TimeBudgetStep } from "../timeBudgetEngine";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Clock, ArrowRight, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface TimeBudgetSelectorProps {
  onPlanGenerated?: (plan: TimeBudgetPlan) => void;
  className?: string;
}

export const TimeBudgetSelector: React.FC<TimeBudgetSelectorProps> = ({
  onPlanGenerated,
  className = "",
}) => {
  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);
  const [plan, setPlan] = useState<TimeBudgetPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleSelectBudget = async (minutes: number) => {
    setSelectedBudget(minutes);
    setLoading(true);
    try {
      const generated = await calculateTimeBudgetPlan(minutes);
      setPlan(generated);
      setExpanded(true);
      if (onPlanGenerated) {
        onPlanGenerated(generated);
      }
    } catch (err) {
      console.error("Error generating time budget plan:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl bg-bg-surface-2/90 border border-border-subtle ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent-primary" />
          <span className="font-mono text-xs uppercase tracking-wider font-bold text-text-primary">
            Presupuesto de Estudio · ¿Cuánto tiempo tenés hoy?
          </span>
        </div>

        {plan && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-xs cursor-pointer"
          >
            <span>{expanded ? "Ocultar plan" : "Ver plan"}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* 3 Quick Budget Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={selectedBudget === 20 ? "primary" : "outline"}
          size="sm"
          onClick={() => void handleSelectBudget(20)}
          className="flex flex-col items-center justify-center py-2 h-auto text-center"
        >
          <span className="font-bold text-xs">Tengo 20 min</span>
          <span className="text-[10px] opacity-80">Relámpago</span>
        </Button>

        <Button
          type="button"
          variant={selectedBudget === 45 ? "primary" : "outline"}
          size="sm"
          onClick={() => void handleSelectBudget(45)}
          className="flex flex-col items-center justify-center py-2 h-auto text-center"
        >
          <span className="font-bold text-xs">Tengo 45 min</span>
          <span className="text-[10px] opacity-80">Estándar</span>
        </Button>

        <Button
          type="button"
          variant={selectedBudget === 90 ? "primary" : "outline"}
          size="sm"
          onClick={() => void handleSelectBudget(90)}
          className="flex flex-col items-center justify-center py-2 h-auto text-center"
        >
          <span className="font-bold text-xs">Tengo 90 min</span>
          <span className="text-[10px] opacity-80">Sesión Profunda</span>
        </Button>
      </div>

      {/* Generated Sequence Plan */}
      {loading && (
        <div className="p-3 text-center font-mono text-xs text-text-muted animate-pulse">
          Calculando partición óptima según el estado de tu memoria...
        </div>
      )}

      {plan && expanded && !loading && (
        <div className="flex flex-col gap-2.5 pt-2 border-t border-border-subtle/60 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-sans font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
              {plan.headline}
            </span>
            <Badge variant="accent" className="font-mono text-[10px]">
              {plan.totalMinutes} min totales
            </Badge>
          </div>

          <p className="text-[11px] text-text-muted italic">
            Foco pedagógico: {plan.targetFocus}
          </p>

          <div className="flex flex-col gap-2 mt-1">
            {plan.steps.map((step: TimeBudgetStep, idx: number) => (
              <div
                key={step.id}
                className="p-2.5 rounded-lg border border-border-subtle bg-bg-surface-1 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-start gap-2.5 flex-1">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">{step.title}</span>
                      <Badge variant="neutral" className="font-mono text-[9px]">
                        {step.badge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-tight">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                  <span className="font-mono text-[11px] text-text-muted">
                    {step.allocatedMinutes} min
                  </span>
                  <Link to={step.actionUrl}>
                    <Button size="sm" variant="outline" className="text-[11px] font-mono py-1 px-2.5 h-auto flex items-center gap-1">
                      <span>{step.actionLabel}</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
