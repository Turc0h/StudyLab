import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { logSession } from "../logSession";
import {
  BrainCircuit,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  AlertCircle,
  Send,
  Copy,
  Check,
} from "lucide-react";

interface SocraticFeynmanRunnerProps {
  methodId?: string;
  subjectFolderId: string | null;
}

const COMMON_JARGON = [
  "paradigma",
  "epistemología",
  "homeostasis",
  "concurrencia",
  "polimorfismo",
  "entropía",
  "ortogonal",
  "isomorfismo",
  "sinapsis",
  "heurística",
  "ontología",
  "determinismo",
  "holístico",
  "asintótico",
  "recursión",
  "abstracción",
];

export function SocraticFeynmanRunner({
  methodId = "feynman",
  subjectFolderId,
}: SocraticFeynmanRunnerProps) {
  const [concept, setConcept] = useState("Curva de Olvido y Retención FSRS");
  const [explanation, setExplanation] = useState("");
  const [sessionStartTime] = useState<number>(Date.now());
  const [detectedJargon, setDetectedJargon] = useState<string[]>([]);
  const [tautologyDetected, setTautologyDetected] = useState(false);
  const [socraticQuestions, setSocraticQuestions] = useState<string[]>([]);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Real-time semantic analysis
  useEffect(() => {
    const text = explanation.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);

    // 1. Detect Jargon
    const foundJargon = COMMON_JARGON.filter((j) => text.includes(j));
    setDetectedJargon(foundJargon);

    // 2. Detect Tautology / Circular Reasoning
    // Patterns like: "es X porque es X", "funciona porque funciona", or concept repeated immediately after "porque"
    const conceptWords = concept.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    let isTautological = false;
    if (text.includes("porque") || text.includes("ya que")) {
      const parts = text.split(/porque|ya que/);
      if (parts.length >= 2) {
        const left = parts[0];
        const right = parts[1];
        // If same keywords appear on both sides of "porque"
        for (const cw of conceptWords) {
          if (left.includes(cw) && right.includes(cw)) {
            isTautological = true;
            break;
          }
        }
      }
    }
    setTautologyDetected(isTautological);

    // 3. Generate Socratic Questions & Boundary Counterexamples
    if (words.length > 15) {
      const generated: string[] = [
        `¿Qué ocurriría si se invirtiera la condición inicial en ${concept}?`,
        `¿Cómo se comporta este principio cuando el tiempo tiende a infinito o a cero?`,
        `Si tuvieras que explicarle esto a un niño de 8 años sin usar la palabra "${foundJargon[0] || conceptWords[0] || "técnica"}", ¿qué analogía usarías?`,
      ];
      setSocraticQuestions(generated);
    } else {
      setSocraticQuestions([]);
    }
  }, [explanation, concept]);

  // Scores
  const wordCount = explanation.split(/\s+/).filter(Boolean).length;
  const simplicityScore = Math.max(
    10,
    Math.min(100, Math.round(100 - detectedJargon.length * 15 - (tautologyDetected ? 30 : 0))),
  );
  const clarityIndex =
    wordCount > 30 && !tautologyDetected && detectedJargon.length <= 1 ? "Alta" : wordCount > 10 ? "Media" : "En desarrollo";

  async function handleFinishSession() {
    if (sessionSaved) return;
    const duration = Math.max(60, Math.round((Date.now() - sessionStartTime) / 1000));
    await logSession(methodId, subjectFolderId, sessionStartTime, duration);
    setSessionSaved(true);
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`CONCEPTO: ${concept}\n\nEXPLICACIÓN:\n${explanation}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-bg-surface-2/80 p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle/80 pb-4">
        <div className="flex items-center gap-2.5">
          <BrainCircuit className="h-5 w-5 text-accent-primary animate-pulse" />
          <div>
            <h3 className="font-display font-bold text-base text-text-primary">
              Técnica Feynman &amp; Validación Socrática
            </h3>
            <span className="text-xs text-text-secondary">
              Explicación en lenguaje fundamental con detección de razonamiento circular y contraejemplos.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={simplicityScore > 75 ? "success" : simplicityScore > 50 ? "warning" : "danger"}>
            Simplicidad: {simplicityScore}%
          </Badge>
          <Badge variant="neutral">Claridad: {clarityIndex}</Badge>
        </div>
      </div>

      {/* Target Concept Field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-mono font-medium text-text-secondary">
          Concepto Objetivo a Descomponer:
        </label>
        <Input
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Ej: Entropía Termodinámica, Recursión, Curva de Olvido..."
        />
      </div>

      {/* Explanation Textarea */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-text-tertiary">
          <span>Explicá como si le enseñaras a alguien que no sabe nada del tema:</span>
          <span>{wordCount} palabras</span>
        </div>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Escribe tu explicación con las palabras más simples posibles. Evitá términos técnicos sin definirlos..."
          rows={7}
          className="w-full resize-none rounded-xl border border-border-subtle bg-bg-surface-1 p-4 text-sm font-sans text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-accent-primary leading-relaxed shadow-inner"
        />
      </div>

      {/* Semantic Validation Telemetry */}
      <div className="flex flex-col gap-3">
        {/* Tautology Alert */}
        {tautologyDetected && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold font-mono">
                ¡Alerta de Tautología / Razonamiento Circular!
              </strong>
              <span className="opacity-90">
                Estás definiendo el concepto usando el mismo término como causa ("X ocurre porque X...").
                Intentá aislar el mecanismo causal subyacente.
              </span>
            </div>
          </div>
        )}

        {/* Jargon Detector */}
        {detectedJargon.length > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-warning/40 bg-warning/10 text-warning text-xs">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold font-mono">
                Jerga Técnica Detectada ({detectedJargon.length})
              </strong>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {detectedJargon.map((j) => (
                  <span
                    key={j}
                    className="px-2 py-0.5 rounded bg-warning/20 border border-warning/30 font-mono text-[11px]"
                  >
                    "{j}"
                  </span>
                ))}
              </div>
              <span className="text-[11px] opacity-80 mt-1 block">
                Regla Feynman: Sustituye estas palabras por analogías cotidianas para verificar tu verdadera comprensión.
              </span>
            </div>
          </div>
        )}

        {/* Targeted Socratic Counterexamples */}
        {socraticQuestions.length > 0 && (
          <div className="flex flex-col gap-2 p-4 rounded-xl border border-accent-primary/20 bg-bg-surface-1/90">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-primary">
              <HelpCircle className="h-4 w-4" />
              Desafíos Socráticos &amp; Condiciones de Borde:
            </div>
            <ul className="flex flex-col gap-2">
              {socraticQuestions.map((q, idx) => (
                <li
                  key={idx}
                  className="text-xs text-text-secondary bg-bg-surface-2/60 p-2.5 rounded-lg border border-border-subtle/50 flex items-start gap-2"
                >
                  <span className="text-accent-primary font-mono font-bold shrink-0">#{idx + 1}</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCopy}
          disabled={!explanation.trim()}
          className="flex items-center gap-1.5 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copiar Síntesis
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="primary"
          onClick={handleFinishSession}
          disabled={!explanation.trim() || sessionSaved}
          className="flex items-center gap-1.5"
        >
          {sessionSaved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" /> Sesión Registrada
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Finalizar y Guardar Sesión
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
