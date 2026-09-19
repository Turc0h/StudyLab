import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Moon, 
  Sun, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";

export interface SleepConsolidationMethodProps {
  onSessionFinished?: () => void;
}

interface OvernightMemoryCue {
  id: string;
  cueQuestion: string;
  expectedAnswer: string;
  morningRecalled: boolean;
}

const DEFAULT_CUES: OvernightMemoryCue[] = [
  {
    id: "cue_1",
    cueQuestion: "¿Cuál es el cofactor esencial para la piruvato deshidrogenasa?",
    expectedAnswer: "Pirofosfato de tiamina (Vitamina B1), lipoamida, FAD, NAD+ y Coenzima A.",
    morningRecalled: false,
  },
  {
    id: "cue_2",
    cueQuestion: "¿Qué enzima cataliza el paso limitante del ciclo de Krebs?",
    expectedAnswer: "Isocitrato deshidrogenasa (inhibida alostéricamente por ATP y NADH).",
    morningRecalled: false,
  },
];

export const SleepConsolidationMethod: React.FC<SleepConsolidationMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Rutas Metabólicas de Bioquímica");
  const [targetCycles, setTargetCycles] = useState<number>(5); // 5 ciclos de 90m = 7.5h
  const [cues, setCues] = useState<OvernightMemoryCue[]>(DEFAULT_CUES);
  const [currentPhase, setCurrentPhase] = useState<"evening" | "morning">("evening");

  // Estado de revelación matutina
  const [revealedCues, setRevealedCues] = useState<Record<string, boolean>>({});

  // Higiene de sueño pre-sesión
  const [hygieneChecks, setHygieneChecks] = useState({
    noCaffeine: true,
    noBlueLight: true,
    coolRoom: true,
  });

  const [eveningNotes, setEveningNotes] = useState<string>(
    "Repaso ligero sin pantallas brillantes 30 minutos antes de acostarse. Foco en fijación de las 2 preguntas gatillo del ciclo de Krebs."
  );

  const toggleCueRecalled = (id: string) => {
    setCues(
      cues.map((c) => (c.id === id ? { ...c, morningRecalled: !c.morningRecalled } : c))
    );
  };

  const toggleRevealExpected = (id: string) => {
    setRevealedCues({ ...revealedCues, [id]: !revealedCues[id] });
  };

  const recalledCount = cues.filter((c) => c.morningRecalled).length;
  const calculatedSleepTimeHours = (targetCycles * 1.5).toFixed(1);

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `sleep_consolidation_${Date.now()}`,
      methodId: "sleep-consolidation",
      subject: "Consolidación por Sueño (NREM / REM)",
      topic: topic || "Protocolo de Fijación Sináptica Nocturna",
      durationMinutes: 45,
      notes: `Tema: ${topic}\nCiclos de sueño programados: ${targetCycles} ciclos (${calculatedSleepTimeHours} horas continuas).\n\n[Fase Nocturna Pre-Sueño]:\n${eveningNotes}\n\n[Drill de Recuerdo Matutino]:\nPrecisión: ${recalledCount} / ${cues.length} gatillos consolidados.\n${cues
        .map(
          (c) =>
            `• [Pregunta]: ${c.cueQuestion}\n  [Respuesta]: ${c.expectedAnswer} (${c.morningRecalled ? "CONSOLIDADO" : "REQUIERE REFUERZO"})`
        )
        .join("\n\n")}`,
      completedAt: Date.now(),
    });

    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Consolidación por Sueño</CardTitle>
            <Badge variant="accent">Neurofisiología Hipocampal (Diekelmann & Born, 2010)</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Aprovecha los ciclos de ondas lentas NREM y REM donde el hipocampo reproduce y transfiere las memorias a la corteza.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant={currentPhase === "morning" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCurrentPhase(currentPhase === "evening" ? "morning" : "evening")}
            className="text-xs flex items-center gap-1.5"
          >
            {currentPhase === "evening" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Modo Matutino (Despertar)</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-sky-400" />
                <span>Modo Nocturno (Pre-Sueño)</span>
              </>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleFinishSession}
            disabled={!topic.trim()}
            className="text-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Guardar Protocolo</span>
          </Button>
        </div>
      </div>

      {/* Tema */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text-primary">Materia o Unidad para Consolidar</label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Farmacología Autonómica"
        />
      </div>

      {/* Calculadora de Ciclos Ultradianos de Sueño (90 min) */}
      <div className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-primary" />
            <span className="text-xs font-semibold text-text-primary">
              Calculadora de Ciclos NREM/REM (90 minutos por ciclo)
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-accent-primary">
            {calculatedSleepTimeHours} horas continuas recomendadas
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[4, 5, 6].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setTargetCycles(num)}
              className={`p-2.5 rounded-xl border text-xs text-center transition-all ${
                targetCycles === num
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary font-bold ring-1 ring-accent-primary/40"
                  : "border-border-subtle bg-bg-secondary/60 text-text-secondary hover:text-text-primary"
              }`}
            >
              <span className="block font-mono">{num} Ciclos ({num * 1.5}h)</span>
              <span className="text-[10px] text-text-muted">
                {num === 5 ? "Óptimo cognitivo" : num === 4 ? "Mínimo biológico" : "Recuperación profunda"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fase 1: Protocolo Nocturno Pre-Sueño */}
      {currentPhase === "evening" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-semibold text-text-primary">
                Paso 1: Repaso Ligero Pre-Sueño (30-45 min antes de acostarse)
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              No hagas ejercicios complejos. Lee de forma suave los puntos clave para que el hipocampo los priorice en las ondas lentas.
            </p>
            <Textarea
              rows={3}
              value={eveningNotes}
              onChange={(e) => setEveningNotes(e.target.value)}
              placeholder="Anota los puntos clave que leerás antes de apagar la luz..."
              className="text-xs leading-relaxed"
            />
          </div>

          {/* Checklist de Higiene Circadiana */}
          <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Compuertas de Higiene de Sueño (Innegociables)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                <input
                  type="checkbox"
                  checked={hygieneChecks.noCaffeine}
                  onChange={(e) => setHygieneChecks({ ...hygieneChecks, noCaffeine: e.target.checked })}
                  className="accent-emerald-400 rounded"
                />
                <span className="text-text-secondary">Cero cafeína 6h antes</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                <input
                  type="checkbox"
                  checked={hygieneChecks.noBlueLight}
                  onChange={(e) => setHygieneChecks({ ...hygieneChecks, noBlueLight: e.target.checked })}
                  className="accent-emerald-400 rounded"
                />
                <span className="text-text-secondary">Filtro luz azul activo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                <input
                  type="checkbox"
                  checked={hygieneChecks.coolRoom}
                  onChange={(e) => setHygieneChecks({ ...hygieneChecks, coolRoom: e.target.checked })}
                  className="accent-emerald-400 rounded"
                />
                <span className="text-text-secondary">Ambiente fresco (18-20°C)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Fase 2: Protocolo Matutino al Despertar */}
      {currentPhase === "morning" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-text-primary">
                Drill de Evocación Matutina (Auditoría de Consolidación Nocturna)
              </span>
            </div>

            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {recalledCount} / {cues.length} consolidados
            </span>
          </div>

          <p className="text-xs text-text-secondary">
            Al despertar, intenta responder estas preguntas de memoria antes de tocar los apuntes para auditar qué fijó el sueño.
          </p>

          <div className="space-y-3">
            {cues.map((cue) => {
              const isRevealed = revealedCues[cue.id];

              return (
                <div
                  key={cue.id}
                  className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                    cue.morningRecalled
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border-subtle bg-bg-secondary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-xs text-text-primary leading-relaxed">
                      {cue.cueQuestion}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleCueRecalled(cue.id)}
                      className={`text-xs px-2 py-1 rounded border flex items-center gap-1 transition-colors shrink-0 ${
                        cue.morningRecalled
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold"
                          : "border-border-subtle text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{cue.morningRecalled ? "Consolidado" : "Pendiente"}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
                    <span className={isRevealed ? "text-text-secondary" : "text-text-muted italic"}>
                      {isRevealed ? cue.expectedAnswer : "[Respuesta oculta para recuerdo activo]"}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleRevealExpected(cue.id)}
                      className="text-text-muted hover:text-accent-primary p-1 shrink-0"
                    >
                      {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-accent-primary" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nota de la Evidencia Biológica */}
      <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-secondary/20 text-xs text-text-muted flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Regla de oro biológica:</strong> Pasar de largo la noche previa al examen (cramming nocturno) suprime por completo las fases NREM 3/4 y REM, borrando hasta el 60% de los datos adquiridos durante el día. El sueño no es tiempo perdido, es tiempo de escritura neuronal en la corteza.
        </p>
      </div>
    </Card>
  );
};
