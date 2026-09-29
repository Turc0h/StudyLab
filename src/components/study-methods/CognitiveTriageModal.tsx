import React, { useState } from "react";
import {
  Compass,
  Calendar,
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
import { StepperShell, type StepItem } from "../shells";

interface CognitiveTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (methodId: string) => void;
}

const METHOD_REASONS: Record<string, string> = {
  "practice-testing": "Te permite practicar como en una evaluación y detectar qué temas conviene repasar.",
  blurting: "Intentás escribir lo que recordás antes de consultar los apuntes y luego completás lo que faltó.",
  "active-recall": "Practica recuperar la información de memoria en vez de limitarse a releerla.",
  feynman: "Explicar la idea con palabras simples ayuda a encontrar partes que todavía no están claras.",
  leitner: "Organiza tarjetas según cuánto te cuesta recordarlas, para dedicar más tiempo a las difíciles.",
  "spaced-repetition": "Programa repasos en distintos momentos para volver sobre lo que estás aprendiendo.",
  "distributed-practice": "Reparte el estudio en varias sesiones en lugar de concentrarlo todo en una sola.",
  "desirable-difficulties": "Combina estrategias que te obligan a recuperar y relacionar ideas, no solo reconocerlas.",
  "concept-maps": "Ordena conceptos y muestra cómo se relacionan entre sí.",
  "problem-based-learning": "Parte de un problema concreto para identificar y aplicar lo que necesitás aprender.",
  "deep-work": "Reserva un bloque largo sin interrupciones para una tarea que requiere concentración.",
  pq4r: "Guía la lectura con preguntas, reflexión y repasos para trabajar textos extensos.",
  sq3r: "Divide la lectura en pasos: explorar, preguntar, leer, recordar y repasar.",
  "story-method": "Usa una historia para enlazar datos que necesitás recordar en secuencia.",
  "method-of-loci": "Asocia conceptos con lugares conocidos para ayudarte a recordar una lista o un recorrido.",
  chunking: "Agrupa datos relacionados en unidades más fáciles de manejar y recordar.",
  "dual-coding": "Combina palabras e imágenes para representar un mismo tema.",
  "multisensory-learning": "Propone trabajar el contenido con más de un formato, como texto, audio o esquemas.",
  "segmentation-principle": "Divide un contenido largo en partes breves que podés revisar una por una.",
  cornell: "Organiza apuntes, preguntas clave y un resumen en una misma página.",
  interleaving: "Alterna temas o tipos de ejercicios para practicar cómo elegir el enfoque adecuado.",
  "protege-effect": "Preparar una explicación para otra persona te ayuda a ordenar tus propias ideas.",
  zettelkasten: "Conecta notas breves para conservar y relacionar ideas a lo largo del tiempo.",
  "kwl-method": "Te ayuda a registrar lo que ya sabés, lo que querés averiguar y lo que aprendiste.",
  "self-explanation": "Te pide explicar por qué funciona cada paso de un ejemplo o procedimiento.",
  pomodoro: "Alterna períodos de trabajo y pausas para organizar una sesión de estudio.",
  "elaborative-interrogation": "Usa preguntas como «¿por qué?» para relacionar datos con sus causas.",
  "mind-maps": "Presenta un tema de forma visual, con una idea central y sus ramificaciones.",
  mnemonics: "Crea asociaciones o frases para recordar listas y secuencias.",
  "sleep-consolidation": "Te recuerda planificar el repaso con tiempo y dejar espacio para descansar.",
};

const METHOD_CATEGORY_LABELS: Record<string, string> = {
  memorizacion: "Memoria",
  comprension: "Comprensión",
  "gestion-tiempo": "Gestión del tiempo",
  escritura: "Escritura",
  evaluacion: "Evaluación",
  metacognicion: "Estrategia",
};

const TRIAGE_STEPS: StepItem[] = [
  {
    id: "urgency",
    title: "1. Fecha",
    subtitle: "Plazo",
    description: "Elegí cuándo necesitás tener este tema preparado."
  },
  {
    id: "material",
    title: "2. Tarea",
    subtitle: "Contenido",
    description: "Contanos qué necesitás hacer con el material."
  },
  {
    id: "mastery",
    title: "3. Familiaridad",
    subtitle: "Punto de partida",
    description: "La recomendación cambia según cuánto conozcas el tema."
  },
  {
    id: "energy",
    title: "4. Tiempo y energía",
    subtitle: "Ahora",
    description: "Ajustamos la sugerencia al tiempo y la concentración que tenés hoy."
  }
];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-xl border border-border-hairline bg-bg-surface-1 shadow-md flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Superior del Modal */}
        <div className="flex items-center justify-between border-b border-border-hairline px-6 py-4 bg-bg-surface-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface-3 text-text-primary border border-border-hairline">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-text-primary">
                  Encontrá una forma de estudiar
                </h3>
                <Badge variant="neutral" className="text-xs font-mono py-0">30 Métodos</Badge>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                Respondé cuatro preguntas y te sugerimos por dónde empezar. Podés elegir otra opción si no te convence.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-hairline bg-bg-surface-1 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* FASES 1 A 4: GESTIONADAS POR STEPPER SHELL */}
          {step <= 4 ? (
            <StepperShell
              title="¿Qué necesitás estudiar?"
              badgeText={`Paso ${step} de 4: ${step === 1 ? "Fecha" : step === 2 ? "Tarea" : step === 3 ? "Familiaridad" : "Tiempo y energía"}`}
              steps={TRIAGE_STEPS}
              currentStepIndex={step - 1}
              onStepChange={(newIdx) => setStep(newIdx + 1)}
              completeLabel="Obtener Diagnóstico"
              onComplete={() => handleFinish()}
              className="border-0 p-0 bg-transparent shadow-none"
            >
              <div className="space-y-4">
                {/* STEP 1: URGENCIA */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-serif text-base font-semibold text-text-primary">
                        1. ¿Cuándo necesitás tener este tema preparado?
                      </h4>
                      <p className="text-xs text-text-tertiary mt-1">
                        Puede ser una fecha de examen, una entrega o una meta personal.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        {
                          id: "urgent" as TriageUrgency,
                          title: "Mañana o pasado",
                          desc: "Necesito priorizar lo esencial y comprobar qué recuerdo.",
                          icon: AlertTriangle,
                          badge: "Urgente"
                        },
                        {
                          id: "medium" as TriageUrgency,
                          title: "Durante esta semana",
                          desc: "Tengo algunos días para practicar y corregir dudas.",
                          icon: Calendar,
                          badge: "Esta semana"
                        },
                        {
                          id: "long" as TriageUrgency,
                          title: "Más adelante o sin fecha",
                          desc: "Quiero entender y recordar el tema a largo plazo.",
                          icon: Compass,
                          badge: "Con tiempo"
                        }
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = urgency === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setUrgency(opt.id);
                              setStep(2); // Auto-avance a paso 2
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                              isSelected
                                ? "border-border-hairline bg-bg-surface-3 ring-1 ring-border-subtle shadow-xs"
                                : "border-border-hairline bg-bg-surface-2 hover:bg-bg-surface-3 hover:border-border-subtle"
                            }`}
                          >
                            <div className={`p-2.5 rounded-lg border shrink-0 ${isSelected ? "bg-bg-surface-1 text-text-primary border-border-hairline" : "bg-bg-surface-1 border-border-hairline text-text-secondary"}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-serif text-sm font-bold text-text-primary">
                                  {opt.title}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border-hairline bg-bg-surface-1 text-text-tertiary">
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
                        2. ¿Qué necesitás hacer con el material?
                      </h4>
                      <p className="text-xs text-text-tertiary mt-1">
                        Elegí la opción que más se parece a tu tarea de hoy.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          id: "logical" as TriageMaterial,
                          title: "Resolver o aplicar",
                          desc: "Ejercicios, problemas, fórmulas o casos prácticos.",
                          icon: Cpu
                        },
                        {
                          id: "factual" as TriageMaterial,
                          title: "Recordar datos",
                          desc: "Fechas, vocabulario, definiciones, nombres o listas.",
                          icon: Bookmark
                        },
                        {
                          id: "doctrinal" as TriageMaterial,
                          title: "Leer y comprender",
                          desc: "Textos largos, teorías, argumentos o capítulos.",
                          icon: BookOpen
                        },
                        {
                          id: "multimodal" as TriageMaterial,
                          title: "Conectar ideas",
                          desc: "Temas que se relacionan y conviene ordenar en esquemas o mapas.",
                          icon: Layers
                        }
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = material === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setMaterial(opt.id);
                              setStep(3); // Auto-avance a paso 3
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? "border-border-hairline bg-bg-surface-3 ring-1 ring-border-subtle shadow-xs"
                                : "border-border-hairline bg-bg-surface-2 hover:bg-bg-surface-3 hover:border-border-subtle"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-lg border ${isSelected ? "bg-bg-surface-1 text-text-primary border-border-hairline" : "bg-bg-surface-1 border-border-hairline text-text-secondary"}`}>
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
                        3. ¿Cuánto conocés del tema?
                      </h4>
                      <p className="text-xs text-text-tertiary mt-1">
                        No hace falta saberlo con exactitud: elegí lo que mejor te describa.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        {
                          id: "initial" as TriageMastery,
                          title: "Estoy empezando",
                          desc: "Todavía no entiendo bien las ideas principales.",
                          icon: Compass
                        },
                        {
                          id: "intermediate" as TriageMastery,
                          title: "Conozco lo básico",
                          desc: "Entiendo algunas partes, pero me cuesta relacionarlas o usarlas.",
                          icon: CheckCircle2
                        },
                        {
                          id: "advanced" as TriageMastery,
                          title: "Quiero ponerme a prueba",
                          desc: "Ya estudié el tema y quiero detectar qué me falta.",
                          icon: Award
                        }
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = mastery === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setMastery(opt.id);
                              setStep(4); // Auto-avance a paso 4
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                              isSelected
                                ? "border-border-hairline bg-bg-surface-3 ring-1 ring-border-subtle shadow-xs"
                                : "border-border-hairline bg-bg-surface-2 hover:bg-bg-surface-3 hover:border-border-subtle"
                            }`}
                          >
                            <div className={`p-2.5 rounded-lg border shrink-0 ${isSelected ? "bg-bg-surface-1 text-text-primary border-border-hairline" : "bg-bg-surface-1 border-border-hairline text-text-secondary"}`}>
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
                        4. ¿Con cuánto tiempo y energía contás ahora?
                      </h4>
                      <p className="text-xs text-text-tertiary mt-1">
                        Pensá en esta sesión, no en cómo te sentís todos los días.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        {
                          id: "high" as TriageEnergy,
                          title: "Tengo tiempo y estoy con energía",
                          desc: "Puedo concentrarme en una tarea exigente.",
                          icon: Zap
                        },
                        {
                          id: "medium" as TriageEnergy,
                          title: "Tengo un rato, pero no mucho",
                          desc: "Me sirve una sesión con pausas y objetivos concretos.",
                          icon: Battery
                        },
                        {
                          id: "low" as TriageEnergy,
                          title: "Estoy cansado/a",
                          desc: "Necesito una tarea liviana o conviene dejarlo para después.",
                          icon: Moon
                        }
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = energy === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setEnergy(opt.id);
                              handleFinish(urgency, material, mastery, opt.id); // Auto-avance a resultados
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                              isSelected
                                ? "border-border-hairline bg-bg-surface-3 ring-1 ring-border-subtle shadow-xs"
                                : "border-border-hairline bg-bg-surface-2 hover:bg-bg-surface-3 hover:border-border-subtle"
                            }`}
                          >
                            <div className={`p-2.5 rounded-lg border shrink-0 ${isSelected ? "bg-bg-surface-1 text-text-primary border-border-hairline" : "bg-bg-surface-1 border-border-hairline text-text-secondary"}`}>
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
              </div>
            </StepperShell>
          ) : (
            /* STEP 5: RESULTADOS DE RECOMENDACIÓN (FUERA DEL STEPPER) */
            result && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Caution Alert */}
                {result.cautionAlert && (
                  <div className="rounded-xl border border-accent-primary/30 bg-bg-surface-2 p-4 flex items-start gap-3">
                    <Compass className="h-5 w-5 text-accent-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-text-primary leading-relaxed font-medium">
                      {result.cautionAlert}
                    </p>
                  </div>
                )}

                {/* Diagnostic Summary */}
                <div className="rounded-xl border border-border-hairline bg-bg-surface-2 p-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-text-primary">
                    <Compass className="h-3.5 w-3.5 text-accent-primary" />
                    <span>Sugerencia orientativa</span>
                  </div>
                  <p className="text-xs text-text-primary mt-1.5 leading-relaxed font-sans">
                    {result.diagnosticSummary.replace(/^Diagnóstico:\s*/, "")}
                  </p>
                </div>

                {/* Top 3 Matches Podium */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-text-primary font-serif">
                    Estas opciones pueden servirte. Elegí la que te resulte más cómoda.
                  </h4>

                  <div className="space-y-3">
                    {result.topMatches.map((match, idx) => {
                      const isGold = idx === 0;
                      return (
                        <div
                          key={match.method.id}
                          className={`rounded-xl border p-4.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isGold
                              ? "border-border-hairline bg-bg-surface-2 ring-1 ring-border-subtle shadow-xs"
                              : "border-border-hairline bg-bg-surface-2/60 hover:bg-bg-surface-2"
                          }`}
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                isGold
                                  ? "bg-bg-surface-1 text-text-primary border border-border-hairline font-semibold"
                                  : "bg-bg-surface-1 border border-border-hairline text-text-tertiary"
                              }`}>
                                {idx === 0 ? "Para empezar" : "Otra opción"}
                              </span>
                              <span className="text-[10px] font-mono text-text-tertiary">
                                {METHOD_CATEGORY_LABELS[match.method.category] ?? match.method.category}
                              </span>
                            </div>

                            <h5 className="font-serif text-base font-bold text-text-primary">
                              {match.method.name}
                            </h5>

                            <p className="text-xs text-text-secondary leading-relaxed font-sans">
                              {METHOD_REASONS[match.method.id] ?? "Puede ser una opción para tu tarea. Abrí la ficha para ver cómo se usa."}
                            </p>
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
                              <span>Empezar con este método</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer de Acciones de Resultado */}
                <div className="w-full flex items-center justify-between pt-4 border-t border-border-hairline">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Probar otras respuestas</span>
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
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

