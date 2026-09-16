import React, { useState } from "react";
import { recordSessionSelfReport, type SelfReportFatigueRating } from "../fatigueMonitor";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Smile, Meh, Frown, Check, Sparkles } from "lucide-react";

interface QuickFatigueCheckinProps {
  sessionDurationMinutes: number;
  onComplete?: (rating: SelfReportFatigueRating) => void;
  className?: string;
}

export const QuickFatigueCheckin: React.FC<QuickFatigueCheckinProps> = ({
  sessionDurationMinutes,
  onComplete,
  className = "",
}) => {
  const [selected, setSelected] = useState<SelfReportFatigueRating | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (rating: SelfReportFatigueRating) => {
    setSelected(rating);
    recordSessionSelfReport(rating, sessionDurationMinutes);
    setSubmitted(true);
    if (onComplete) {
      onComplete(rating);
    }
  };

  if (submitted && selected) {
    return (
      <Card elevated className={`p-4 bg-bg-surface-2 border border-border-subtle rounded-xl flex items-center justify-between gap-3 text-xs ${className}`}>
        <div className="flex items-center gap-2 text-text-primary">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">Autorreporte cognitivo registrado</p>
            <p className="text-text-muted text-[11px]">
              {selected === "well"
                ? "¡Excelente ritmo! Rendimiento sostenido sin fatiga."
                : selected === "struggling"
                ? "Tomate un vaso de agua o 5 min de descanso antes del próximo bloque."
                : "Señal de fatiga crítica. Cerrá la jornada o hacé una pausa prolongada."}
            </p>
          </div>
        </div>
        <span className="font-mono text-[10px] text-text-muted">Sección 26-BIS</span>
      </Card>
    );
  }

  return (
    <Card elevated className={`p-4 bg-bg-surface-2 border border-border-subtle rounded-xl flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-primary" />
          <h5 className="font-sans font-semibold text-xs text-text-primary">
            ¿Cómo te sentiste en este bloque de {sessionDurationMinutes} min?
          </h5>
        </div>
        <span className="font-mono text-[10px] text-text-muted">1-tap check-in</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSelect("well")}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 group cursor-pointer"
        >
          <Smile className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold">Bien</span>
          <span className="text-[9px] text-text-muted">Despejado</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSelect("struggling")}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg border-amber-500/30 hover:bg-amber-500/10 text-amber-400 group cursor-pointer"
        >
          <Meh className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold">Cuesta</span>
          <span className="text-[9px] text-text-muted">Algo lento</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSelect("exhausted")}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg border-rose-500/30 hover:bg-rose-500/10 text-rose-400 group cursor-pointer"
        >
          <Frown className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold">Fundido</span>
          <span className="text-[9px] text-text-muted">Corte ya</span>
        </Button>
      </div>
    </Card>
  );
};
