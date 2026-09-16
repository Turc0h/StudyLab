import React, { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  evaluateTypedRecallAnswer,
  type TypedRecallEvaluation,
} from "../../features/study-engine/typedRecallEvaluator";
import { recordStudentError } from "../../features/study-engine/errorBank";
import {
  verifyFormulaDimensions,
  type DimensionVerificationResult,
} from "../../features/study-engine/dimensionalVerifier";
import {
  CheckCircle2,
  XCircle,
  BrainCircuit,
  BookOpen,
  Sparkles,
  Scale,
} from "lucide-react";

interface TypedRecallInputProps {
  conceptId?: string;
  conceptName?: string;
  subjectId?: string;
  promptText: string;
  expectedAnswer: string;
  citation?: {
    sourceTitle: string;
    page: number;
    snippet: string;
  };
  onEvaluated?: (evalResult: TypedRecallEvaluation, confidencePercent: number) => void;
}

export const TypedRecallInput: React.FC<TypedRecallInputProps> = ({
  conceptId = "c_general",
  conceptName = "Concepto Académico",
  subjectId,
  promptText,
  expectedAnswer,
  citation,
  onEvaluated,
}) => {
  const [studentInput, setStudentInput] = useState("");
  const [confidence, setConfidence] = useState<number>(75);
  const [evaluation, setEvaluation] = useState<TypedRecallEvaluation | null>(null);
  const [dimensionalResult, setDimensionalResult] = useState<DimensionVerificationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEvaluate = async () => {
    if (!studentInput.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const result = evaluateTypedRecallAnswer({
      studentAnswer: studentInput.trim(),
      expectedAnswer,
    });

    setEvaluation(result);

    // Auditoría dimensional si contiene ecuación o variables físicas
    let dimResult: DimensionVerificationResult | null = null;
    if (studentInput.includes("=") || /[FPvamtER]\b/.test(studentInput)) {
      dimResult = verifyFormulaDimensions(studentInput.trim());
      setDimensionalResult(dimResult);
    } else {
      setDimensionalResult(null);
    }

    // Si la respuesta fue incorrecta, registrar automáticamente en el Error Bank
    if (!result.isCorrect) {
      const errorCategory = dimResult && !dimResult.valid ? dimResult.suggestedErrorCategory || "procedure_error" : undefined;
      await recordStudentError({
        conceptId,
        conceptName,
        subjectId,
        originalExercise: promptText,
        studentAnswer: studentInput.trim(),
        expectedAnswer,
        explanation: dimResult && !dimResult.valid ? `${result.feedback} (${dimResult.explanation})` : result.feedback,
        citationProof: citation,
        category: errorCategory,
      });
    }

    onEvaluated?.(result, confidence);
    setIsSubmitting(false);
  };

  // Renderizar vista previa LaTeX si contiene fórmulas
  const renderPreview = (text: string) => {
    try {
      const html = katex.renderToString(text, { throwOnError: false, displayMode: false });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span>{text}</span>;
    }
  };

  return (
    <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface-1 flex flex-col gap-3 font-sans text-xs shadow-xs">
      {/* Question Prompt */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent-primary font-bold flex items-center gap-1">
          <BrainCircuit className="w-3.5 h-3.5" />
          Autoevaluación Escrita (Typed Recall)
        </span>
        <p className="font-serif text-sm font-semibold text-text-primary leading-snug">
          {promptText}
        </p>
      </div>

      {/* Confidence Calibration Bar */}
      {!evaluation && (
        <div className="p-2.5 rounded-lg bg-bg-surface-2/60 border border-border-subtle/70 flex flex-col gap-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-text-muted">
            <span>Metacognición: ¿Qué tan seguro/a estás?</span>
            <span className="font-bold text-accent-primary">{confidence}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={confidence}
            onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
            className="w-full accent-accent-primary cursor-pointer"
          />
        </div>
      )}

      {/* Student Typing Input Area */}
      {!evaluation ? (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              type="text"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleEvaluate()}
              placeholder="Escribe tu respuesta formal (ej. F = m*a)..."
              className="w-full rounded-lg border border-border-subtle bg-bg-surface-2 px-3 py-2 text-xs font-mono text-text-primary focus:outline-hidden focus:border-accent-primary"
            />
          </div>

          {/* Live KaTeX Preview if mathematical notation is present */}
          {studentInput.includes("^") ||
          studentInput.includes("*") ||
          studentInput.includes("\\") ||
          studentInput.includes("/") ? (
            <div className="px-3 py-1.5 rounded bg-bg-surface-2/80 text-[11px] font-mono text-text-muted flex items-center gap-2 border border-border-subtle/50">
              <span className="text-accent-primary text-[10px] font-bold">KaTeX Preview:</span>
              <span className="text-text-primary">{renderPreview(studentInput)}</span>
            </div>
          ) : null}

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={() => void handleEvaluate()}
              disabled={!studentInput.trim() || isSubmitting}
              className="gap-1.5 font-mono text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Evaluar Respuesta</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Evaluation Results Feedback Display */
        <div
          className={`p-3.5 rounded-xl border flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 ${
            evaluation.isCorrect
              ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200"
              : "border-rose-500/40 bg-rose-950/20 text-rose-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              {evaluation.isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">Respuesta Válida</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-rose-300">Discrepancia Registrada en Error Bank</span>
                </>
              )}
            </div>
            <Badge variant={evaluation.isCorrect ? "success" : "danger"}>
              Acierto: {Math.round(evaluation.similarityRatio * 100)}%
            </Badge>
          </div>

          <p className="text-[11px] leading-relaxed">{evaluation.feedback}</p>

          {/* Verificador Dimensional SI (Sección 32-TER) */}
          {dimensionalResult && (
            <div
              className={`flex items-start gap-2 p-2.5 rounded-lg border text-[11px] font-mono ${
                dimensionalResult.valid
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              <Scale className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">
                  {dimensionalResult.valid
                    ? "✓ Consistencia Dimensional Verificada (SI)"
                    : "⚠ Inconsistencia Dimensional Detectada"}
                </span>
                <span className="opacity-90">{dimensionalResult.explanation}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
            <div className="p-2 rounded bg-black/25 border border-border-subtle/40">
              <span className="text-text-muted text-[10px] block">Tu respuesta normalizada:</span>
              <span className="text-text-primary">{evaluation.normalizedStudent}</span>
            </div>
            <div className="p-2 rounded bg-black/25 border border-border-subtle/40">
              <span className="text-text-muted text-[10px] block">Fundamento oficial de cátedra:</span>
              <span className="text-text-primary">{expectedAnswer}</span>
            </div>
          </div>

          {citation && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted pt-1 border-t border-border-subtle/40">
              <BookOpen className="w-3 h-3 text-accent-primary shrink-0" />
              <span>
                {citation.sourceTitle} (Pág. {citation.page})
              </span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEvaluation(null);
                setStudentInput("");
              }}
              className="text-xs font-mono"
            >
              Reintentar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
