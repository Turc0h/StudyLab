import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { X, Wind, Sparkles } from "lucide-react";

interface BoxBreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BreathPhase = "inhale" | "hold-in" | "exhale" | "hold-out";

export const BoxBreathingModal: React.FC<BoxBreathingModalProps> = ({ isOpen, onClose }) => {
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [secondsLeft, setSecondsLeft] = useState<number>(4);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      setPhase("inhale");
      setSecondsLeft(4);
      setCyclesCompleted(0);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Cambio de fase cada 4 segundos
        setPhase((currentPhase) => {
          if (currentPhase === "inhale") return "hold-in";
          if (currentPhase === "hold-in") return "exhale";
          if (currentPhase === "exhale") return "hold-out";
          // hold-out completa un ciclo y vuelve a inhale
          setCyclesCompleted((c) => c + 1);
          return "inhale";
        });

        return 4;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const phaseConfig = {
    inhale: {
      title: "Inhalar",
      subtitle: "Inhala profundamente por la nariz inflando el diafragma...",
      color: "text-cyan-400",
      border: "border-cyan-500",
      scale: "scale-125",
      ringColor: "ring-cyan-500/40",
      bgColor: "bg-cyan-500/10",
    },
    "hold-in": {
      title: "Retener",
      subtitle: "Mantén el aire con serenidad sin forzar los pulmones...",
      color: "text-indigo-400",
      border: "border-indigo-500",
      scale: "scale-125",
      ringColor: "ring-indigo-500/40",
      bgColor: "bg-indigo-500/10",
    },
    exhale: {
      title: "Exhalar",
      subtitle: "Exhala suavemente por la boca liberando toda la tensión...",
      color: "text-amber-400",
      border: "border-amber-500",
      scale: "scale-90",
      ringColor: "ring-amber-500/40",
      bgColor: "bg-amber-500/10",
    },
    "hold-out": {
      title: "Vacío",
      subtitle: "Descansa en quietud absoluta antes de la próxima inhalación...",
      color: "text-emerald-400",
      border: "border-emerald-500",
      scale: "scale-90",
      ringColor: "ring-emerald-500/40",
      bgColor: "bg-emerald-500/10",
    },
  };

  const currentConfig = phaseConfig[phase];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md border-slate-700 bg-slate-900/95 shadow-2xl">
        <CardHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Wind className="h-5 w-5 text-cyan-400" />
              <CardTitle className="text-base font-bold">
                Respiración Cuadrada (Box Breathing 4-4-4-4)
              </CardTitle>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <div className="p-8 space-y-8 text-center">
          {/* Círculo Guía de Respiración */}
          <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
            {/* Anillo de pulso exterior */}
            <div
              className={`absolute inset-0 rounded-full border-2 transition-all duration-1000 ease-in-out ${currentConfig.border} ${currentConfig.scale} ${currentConfig.bgColor}`}
            />
            {/* Núcleo de respiración */}
            <div
              className={`flex h-32 w-32 flex-col items-center justify-center rounded-full bg-slate-950 shadow-xl border border-slate-700/80 transition-transform duration-1000 ${currentConfig.scale}`}
            >
              <span className={`text-3xl font-black font-mono ${currentConfig.color}`}>
                {secondsLeft}s
              </span>
              <span className={`text-xs font-bold uppercase tracking-wider mt-1 ${currentConfig.color}`}>
                {currentConfig.title}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-200">{currentConfig.subtitle}</p>
            <p className="text-[11px] text-slate-400">
              Ciclos completados: <span className="font-bold text-white">{cyclesCompleted}</span>
            </p>
          </div>

          {/* Explicación Neurobiológica */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 text-left leading-relaxed flex items-start gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Activación Vagal:</span> La respiración rítmica en 4 tiempos estimula el nervio vago, desacelera la frecuencia cardíaca y reduce la adrenalina en menos de 2 minutos.
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 text-xs"
          >
            Finalizar y Volver al Estudio
          </Button>
        </div>
      </Card>
    </div>
  );
};
