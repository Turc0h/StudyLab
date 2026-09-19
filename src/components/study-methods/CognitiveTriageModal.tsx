import React, { useState } from "react";
import {
  Sparkles,
  Calendar,
  Compass,
  Cpu,
  Bookmark,
  BookOpen,
  Layers,
  CheckCircle2,
  Award,
  Zap,
  Battery,
  Moon,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  RotateCcw
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  calculateMethodRecommendations,
  type TriageAnswers,
  type TriageUrgency,
  type TriageMaterial,
  type TriageMastery,
  type TriageEnergy,
  type TriageResult
} from "../../features/study-methods/cognitiveTriageEngine";

interface CognitiveTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (methodId: string) => void;
}

export const CognitiveTriageModal: React.FC<CognitiveTriageModalProps> = ({
  isOpen,
  onClose,
  onSelectMethod
}) => {
  const [step, setStep] = useState<number>(1);
  const [urgency, setUrgency] = useState<TriageUrgency>("medium");
  const [material, setMaterial] = useState<TriageMaterial>("logical");
  const [mastery, setMastery] = useState<TriageMastery>("intermediate");
  const [energy, setEnergy] = useState<TriageEnergy>("medium");
  const [result, setResult] = useState<TriageResult | null>(null);

  if (!isOpen) return null;

  const handleFinish = (
    finalUrgency = urgency,
    finalMaterial = material,
    finalMastery = mastery,
    finalEnergy = energy
  ) => {
    const answers: TriageAnswers = {
      urgency: finalUrgency,
      material: finalMaterial,
      mastery: finalMastery,
      energy: finalEnergy
    };
    const res = calculateMethodRecommendations(answers);
    setResult(res);
    setStep(5);
  };

  const handleReset = () => {
    setStep(1);
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border-subtle bg-bg-elevated shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4 bg-bg-secondary/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-text-primary">
                  Asistente de Triaje Cognitivo
                </h3>
                <Badge variant="accent">30 Métodos</Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Diagnóstico en 4 pasos para identificar tu metodología óptima inmediata.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-secondary text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
            title="Cerrar (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Wizard Stepper Progress Bar */}
        {step <= 4 && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-2">
              <span>Paso {step} de 4: {step === 1 ? "Horizonte Temporal" : step === 2 ? "Tipo de Contenido" : step === 3 ? "Nivel de Dominio" : "Nivel de Energía"}</span>
              <span>{step * 25}% completado</span>
            </div>
            <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-primary transition-all duration-300"
                style={{ width: `${step * 25}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: URGENCIA */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-base font-semibold text-text-primary">
                  1. ¿Cuánto tiempo falta para tu examen o entrega?
                </h4>
                <p className="text-xs text-text-secondary mt-1">
                  El tiempo disponible determina si necesitás fijación a largo plazo o técnicas de choque de memoria inmediata.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    id: "urgent" as TriageUrgency,
                    title: "Menos de 24 horas (¡Mañana rindo!)",
                    desc: "Situación de emergencia. Necesitás detección instantánea de brechas y evocación rápida sin adornos.",
                    icon: AlertTriangle,
                    badge: "Modo Choque"
                  },
                  {
                    id: "medium" as TriageUrgency,
                    title: "2 a 7 días (Semana de parciales)",
                    desc: "Plazo intermedio. Tiempo ideal para aislar errores en cajas de estudio, intercalar temas y autoexplicar.",
                    icon: Calendar,
                    badge: "Consolidación Fina"
                  },
                  {
                    id: "long" as TriageUrgency,
                    title: "Más de 2 semanas (Cursada regular / Finales)",
                    desc: "Horizonte amplio. Máxima efectividad para práctica distribuida, FSRS y mapas conceptuales duraderos.",
                    icon: Compass,
                    badge: "Largo Plazo"
                  }
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = urgency === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setUrgency(opt.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? "border-accent-primary bg-accent-primary/10 ring-2 ring-accent-primary shadow-sm"
                          : "border-border-subtle bg-bg-secondary hover:bg-bg-elevated hover:border-border-hover"
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg border shrink-0 ${isSelected ? "bg-accent-primary text-bg-elevated border-transparent" : "bg-bg-elevated border-border-subtle text-accent-primary"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-sm font-bold text-text-primary">
                            {opt.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border-subtle bg-bg-elevated text-text-muted">
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: TIPO DE MATERIAL */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-base font-semibold text-text-primary">
                  2. ¿Qué tipo de contenido estás estudiando?
                </h4>
                <p className="text-xs text-text-secondary mt-1">
                  Cada hemisferio y red sináptica procesa de manera diferente fórmulas deductivas vs. listas taxonómicas de memoria.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: "logical" as TriageMaterial,
                    title: "Lógico-Deductivo / Fórmulas",
                    desc: "Matemáticas, física, programación, algoritmos o demostraciones de teoremas.",
                    icon: Cpu
                  },
                  {
                    id: "factual" as TriageMaterial,
                    title: "Fáctico / Memorístico Puro",
                    desc: "Anatomía, artículos de leyes, fechas históricas, términos médicos o vocabulario.",
                    icon: Bookmark
                  },
                  {
                    id: "doctrinal" as TriageMaterial,
                    title: "Doctrinal / Textos Densos",
                    desc: "Derecho, filosofía, sociología, ensayos o manuales científicos extensos.",
                    icon: BookOpen
                  },
                  {
                    id: "multimodal" as TriageMaterial,
                    title: "Integrador / Visual / Esquemas",
                    desc: "Mapas de procesos, diseño, conceptos interrelacionados con diagramas y esquemas.",
                    icon: Layers
                  }
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = material === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMaterial(opt.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "border-accent-primary bg-accent-primary/10 ring-2 ring-accent-primary shadow-sm"
                          : "border-border-subtle bg-bg-secondary hover:bg-bg-elevated hover:border-border-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg border ${isSelected ? "bg-accent-primary text-bg-elevated border-transparent" : "bg-bg-elevated border-border-subtle text-accent-primary"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-serif text-sm font-bold text-text-primary">
                          {opt.title}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: NIVEL DE DOMINIO */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-base font-semibold text-text-primary">
                  3. ¿Cuál es tu grado de familiaridad con el tema?
                </h4>
                <p className="text-xs text-text-secondary mt-1">
                  Abordar un tema nuevo requiere principios de segmentación; pulir un tema conocido requiere dificultades deseables.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    id: "initial" as TriageMastery,
                    title: "Primer contacto (Aprendiendo desde cero)",
                    desc: "Nunca viste este material o no entendés la lógica base. Necesitás despiece en tramos pequeños y analogías.",
                    icon: Compass
                  },
                  {
                    id: "intermediate" as TriageMastery,
                    title: "Intermedio (Consolidando y conectando)",
                    desc: "Entendés los conceptos sueltos pero te cuesta relacionarlos o resolver problemas cuando se mezclan.",
                    icon: CheckCircle2
                  },
                  {
                    id: "advanced" as TriageMastery,
                    title: "Avanzado (Detectando lagunas finas y puliendo)",
                    desc: "Dominás el temario general pero necesitás ponerte a prueba bajo presión de examen con rúbricas de cátedra.",
                    icon: Award
                  }
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = mastery === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMastery(opt.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? "border-accent-primary bg-accent-primary/10 ring-2 ring-accent-primary shadow-sm"
                          : "border-border-subtle bg-bg-secondary hover:bg-bg-elevated hover:border-border-hover"
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg border shrink-0 ${isSelected ? "bg-accent-primary text-bg-elevated border-transparent" : "bg-bg-elevated border-border-subtle text-accent-primary"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-serif text-sm font-bold text-text-primary">
                          {opt.title}
                        </span>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: ENERGÍA */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-base font-semibold text-text-primary">
                  4. ¿Cuál es tu nivel de energía y foco en este momento?
                </h4>
                <p className="text-xs text-text-secondary mt-1">
                  Estudiar con fatiga forzando tareas de alta carga ejecutiva genera bloqueo; los métodos biofisiológicos salvan el día.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    id: "high" as TriageEnergy,
                    title: "Alta energía / Foco pleno (Pico matutino)",
                    desc: "Mente despejada y capacidad óptima de resolución. Momento ideal para deep work, resolución de problemas y simulacros.",
                    icon: Zap
                  },
                  {
                    id: "medium" as TriageEnergy,
                    title: "Energía media / Ritmo de trabajo sostenido",
                    desc: "Nivel equilibrado estándar. Óptimo para intervalos Pomodoro, cajas de Leitner y práctica intercalada.",
                    icon: Battery
                  },
                  {
                    id: "low" as TriageEnergy,
                    title: "Fatiga mental / Noche / Cansancio",
                    desc: "Atención mermada tras el día. Es el momento para consolidación por sueño, estímulo multisensorial o repaso suave.",
                    icon: Moon
                  }
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = energy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEnergy(opt.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? "border-accent-primary bg-accent-primary/10 ring-2 ring-accent-primary shadow-sm"
                          : "border-border-subtle bg-bg-secondary hover:bg-bg-elevated hover:border-border-hover"
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg border shrink-0 ${isSelected ? "bg-accent-primary text-bg-elevated border-transparent" : "bg-bg-elevated border-border-subtle text-accent-primary"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-serif text-sm font-bold text-text-primary">
                          {opt.title}
                        </span>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: RESULTADOS */}
          {step === 5 && result && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Caution Alert */}
              {result.cautionAlert && (
                <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-text-primary leading-relaxed font-medium">
                    {result.cautionAlert}
                  </p>
                </div>
              )}

              {/* Diagnostic Summary */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/70 p-4">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-primary uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Prescripción Pedagógica</span>
                </div>
                <p className="text-xs text-text-primary mt-1.5 leading-relaxed">
                  {result.diagnosticSummary}
                </p>
              </div>

              {/* Top 3 Matches Podium */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                  Tus 3 Metodologías Óptimas Recomendadas
                </h4>

                <div className="space-y-3">
                  {result.topMatches.map((match, idx) => {
                    const isGold = idx === 0;
                    return (
                      <div
                        key={match.method.id}
                        className={`rounded-xl border p-4.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isGold
                            ? "border-accent-primary bg-accent-primary/10 ring-2 ring-accent-primary/40 shadow-sm"
                            : "border-border-subtle bg-bg-secondary hover:border-border-hover"
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              isGold
                                ? "bg-accent-primary text-bg-elevated"
                                : "bg-bg-elevated border border-border-subtle text-text-muted"
                            }`}>
                              #{idx + 1} • {match.matchPercentage}% Compatibilidad
                            </span>
                            <span className="text-[10px] font-mono text-text-muted">
                              {match.method.category}
                            </span>
                          </div>

                          <h5 className="font-serif text-base font-bold text-text-primary">
                            {match.method.name}
                          </h5>

                          <p className="text-xs text-text-secondary leading-relaxed">
                            {match.rationale}
                          </p>

                          <div className="pt-1 text-[11px] text-text-muted flex items-center gap-1.5">
                            <span className="font-semibold text-text-primary">Clave:</span>
                            <span>{match.keyBenefit}</span>
                          </div>
                        </div>

                        <div className="shrink-0 sm:self-center">
                          <Button
                            variant={isGold ? "primary" : "outline"}
                            size="sm"
                            onClick={() => {
                              onSelectMethod(match.method.id);
                              onClose();
                            }}
                            className="text-xs flex items-center gap-1.5 w-full sm:w-auto justify-center"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Iniciar Runner</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border-subtle px-6 py-4 bg-bg-secondary/40 flex items-center justify-between">
          {step <= 4 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Anterior</span>
              </Button>

              {step < 4 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setStep((s) => s + 1)}
                  className="text-xs flex items-center gap-1.5"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleFinish()}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Obtener Diagnóstico</span>
                </Button>
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reiniciar Triaje</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
