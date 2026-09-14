import { useEffect, useRef, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { logSession } from "../logSession";
import {
  Shuffle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react";

interface InterleavedChallenge {
  id: string;
  domainA: string;
  domainB: string;
  question: string;
  isTrap: boolean;
  options: { text: string; correct: boolean; domainTag: string; explanation: string }[];
  trapExplanation?: string;
}

const SAMPLE_CHALLENGES: InterleavedChallenge[] = [
  {
    id: "ch-1",
    domainA: "Neurociencia Cognitiva",
    domainB: "Sistemas Distribuidos",
    isTrap: true,
    question:
      "[PREGUNTA TRAMPA] Tanto la 'Memoria de Trabajo' como un 'Buffer FIFO' almacenan datos transitorios. ¿Cuál es la diferencia limitante fundamental entre ambos?",
    options: [
      {
        text: "El buffer FIFO se satura por tiempo; la memoria de trabajo no sufre decaimiento temporal.",
        correct: false,
        domainTag: "Falsa analogía",
        explanation: "Incorrecto: la memoria de trabajo sufre interferencia y decaimiento rápido sin repaso.",
      },
      {
        text: "La memoria de trabajo está limitada por chunks conceptuales y manipulación activa (7±2), no por bytes de memoria estática lineal.",
        correct: true,
        domainTag: "Neurociencia",
        explanation: "¡Exacto! Los chunks en humanos se reorganizan semánticamente, a diferencia de los bytes fijos de un buffer.",
      },
      {
        text: "Ambos operan con el mismo principio matemático de colas con prioridad estocástica.",
        correct: false,
        domainTag: "Trampa de Dominio",
        explanation: "Error: extrapolar una estructura algorítmica a la neurobiología cortical sin considerar la interferencia retroactiva.",
      },
    ],
    trapExplanation:
      "Trampa clásica de similitud funcional superficial: confundir estructuras de datos lineales con redes de atención prefrontal.",
  },
  {
    id: "ch-2",
    domainA: "Física Cuántica",
    domainB: "Machine Learning",
    isTrap: false,
    question:
      "En optimización estocástica (SGD) se añade 'momentum'. ¿A qué principio de la mecánica clásica equivale físicamente?",
    options: [
      {
        text: "A la inercia de una partícula masiva rodando por una superficie con fricción (evita mínimos locales planos).",
        correct: true,
        domainTag: "Física",
        explanation: "Correcto: el momentum acumula vectores de gradiente pasados amortiguando oscilaciones transversales.",
      },
      {
        text: "Al principio de incertidumbre de Heisenberg que prohíbe conocer gradiente y posición.",
        correct: false,
        domainTag: "Física",
        explanation: "Falso: el principio de incertidumbre no tiene correspondencia con gradientes clásicos de descenso.",
      },
      {
        text: "A la resonancia magnética nuclear.",
        correct: false,
        domainTag: "Física",
        explanation: "No tiene relación con la optimización convexa.",
      },
    ],
  },
  {
    id: "ch-3",
    domainA: "Algoritmos FSRS",
    domainB: "Decaimiento Radiactivo",
    isTrap: true,
    question:
      "[PREGUNTA TRAMPA] Ambas curvas modelan decaimiento temporal. En FSRS v4.5 la Retención R sigue una ley de potencia (Power Law) en lugar de exponencial pura e^(-λt). ¿Por qué?",
    options: [
      {
        text: "Porque el decaimiento radiactivo tiene probabilidad constante por átomo, mientras que la memoria humana consolida heterogéneamente (componentes rápidos y lentos).",
        correct: true,
        domainTag: "Psicología Cognitiva",
        explanation: "¡Brillante discriminación! Anderson y Wixted demostraron que las trazas de memoria agregadas siguen leyes de potencia por variabilidad de estabilidad.",
      },
      {
        text: "Porque la ley de potencia es más fácil de calcular en microcontroladores que la exponencial.",
        correct: false,
        domainTag: "Ingeniería",
        explanation: "Falso: la justificación es neurobiológica y empírica (Wixted & Ebbesen).",
      },
      {
        text: "Es una trampa: el modelo FSRS v4.5 usa exactamente la ecuación exponencial de Poisson.",
        correct: false,
        domainTag: "Algoritmos",
        explanation: "Incorrecto: FSRS utiliza R(t, S) = (1 + 19 * t / S)^(-0.5), una ley potencial.",
      },
    ],
    trapExplanation:
      "Trampa de convergencia matemática: asumir que todos los decaimientos con vida media (t½) son funciones exponenciales continuas homogéneas.",
  },
];

export function DynamicInterleavingRunner({
  methodId = "interleaving",
  subjectFolderId,
}: {
  methodId?: string;
  subjectFolderId: string | null;
}) {
  const [challenges] = useState<InterleavedChallenge[]>(SAMPLE_CHALLENGES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [trapAvoidedCount, setTrapAvoidedCount] = useState(0);
  const [sessionStartTime] = useState<number>(Date.now());
  const [blockSeconds, setBlockSeconds] = useState(45);

  const timerRef = useRef<number | null>(null);

  const current = challenges[currentIndex];

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setBlockSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  const handleSelect = (optionIdx: number) => {
    if (isAnswered) return;
    setSelectedOption(optionIdx);
    setIsAnswered(true);

    const isCorrect = current.options[optionIdx].correct;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      if (current.isTrap) {
        setTrapAvoidedCount((t) => t + 1);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < challenges.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setBlockSeconds(45);
    } else {
      // Finish
      const duration = Math.max(60, Math.round((Date.now() - sessionStartTime) / 1000));
      logSession(methodId, subjectFolderId, sessionStartTime, duration).catch(console.error);
    }
  };

  const discriminationRatio =
    currentIndex > 0 || isAnswered
      ? Math.round(
          (correctCount / Math.max(1, isAnswered ? currentIndex + 1 : currentIndex)) * 100,
        )
      : 100;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-bg-surface-2/80 p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle/80 pb-4">
        <div className="flex items-center gap-2.5">
          <Shuffle className="h-5 w-5 text-accent-primary animate-spin" style={{ animationDuration: "12s" }} />
          <div>
            <h3 className="font-display font-bold text-base text-text-primary">
              Entrelazado Adaptativo &amp; Preguntas Trampa
            </h3>
            <span className="text-xs text-text-secondary">
              Rotación pseudoraleatoria entre dominios con preguntas discriminativas para romper sesgo de familiaridad.
            </span>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="flex items-center gap-2">
          <Badge variant={discriminationRatio >= 70 ? "success" : "warning"}>
            Ratio Discriminación: {discriminationRatio}%
          </Badge>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-surface-1 font-mono text-xs text-text-secondary border border-border-subtle">
            <Clock className="h-3.5 w-3.5 text-accent-primary" />
            <span>{blockSeconds}s</span>
          </div>
        </div>
      </div>

      {/* Domain tags & trap alert */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
            {current.domainA}
          </span>
          <span className="text-text-tertiary">⟷</span>
          <span className="px-2 py-0.5 rounded bg-warning/20 text-warning border border-warning/30">
            {current.domainB}
          </span>
        </div>

        {current.isTrap && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-danger/15 border border-danger/40 text-danger text-xs font-mono font-bold animate-pulse">
            <AlertOctagon className="h-3.5 w-3.5" />
            TRAMPA DISCRIMINATIVA
          </div>
        )}
      </div>

      {/* Question */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface-1 p-5 shadow-inner">
        <p className="font-display text-base font-semibold text-text-primary leading-relaxed">
          {current.question}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {current.options.map((opt, idx) => {
          let optionStyle = "border-border-subtle bg-bg-surface-1/70 hover:bg-bg-surface-1";
          if (isAnswered) {
            if (opt.correct) {
              optionStyle = "border-success/50 bg-success/15 text-success ring-1 ring-success/30";
            } else if (selectedOption === idx) {
              optionStyle = "border-danger/50 bg-danger/15 text-danger ring-1 ring-danger/30";
            } else {
              optionStyle = "opacity-50 border-border-subtle bg-bg-surface-1/40";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelect(idx)}
              className={`flex flex-col text-left p-4 rounded-xl border transition-all text-xs font-sans ${optionStyle}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium text-text-primary leading-relaxed">{opt.text}</span>
                {isAnswered && opt.correct && (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                )}
                {isAnswered && !opt.correct && selectedOption === idx && (
                  <XCircle className="h-4 w-4 text-danger shrink-0" />
                )}
              </div>

              {isAnswered && (
                <p className="mt-2 text-[11px] opacity-90 border-t border-border-subtle/50 pt-2 font-mono">
                  {opt.explanation}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Trap Explanation Reveal */}
      {isAnswered && current.trapExplanation && (
        <div className="p-3.5 rounded-lg border border-warning/40 bg-warning/10 text-xs text-warning flex items-start gap-2 animate-in fade-in">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold font-mono">
              Análisis del Sesgo de Transferencia:
            </strong>
            <span className="opacity-90">{current.trapExplanation}</span>
          </div>
        </div>
      )}

      {/* Progress & Next Button */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <span className="font-mono text-xs text-text-tertiary">
          Desafío {currentIndex + 1} de {challenges.length} · Trampas eludidas: {trapAvoidedCount}
        </span>
        {isAnswered && (
          <Button size="sm" variant="primary" onClick={handleNext}>
            {currentIndex < challenges.length - 1 ? "Siguiente Desafío" : "Finalizar Sesión"}
          </Button>
        )}
      </div>
    </div>
  );
}
