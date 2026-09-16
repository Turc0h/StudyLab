import React, { useEffect, useState } from "react";
import { db, type StudentErrorRecord, type StudentErrorCategory } from "../../../db/db";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import {
  AlertTriangle,
  CheckCircle2,
  X,
  XCircle,
  BookOpen,
  Zap,
  Sparkles,
} from "lucide-react";

interface ErrorBankModalProps {
  open: boolean;
  onClose: () => void;
  onPracticeError?: (error: StudentErrorRecord) => void;
}

const CATEGORY_LABELS: Record<StudentErrorCategory, { label: string; variant: "danger" | "warning" | "accent" | "neutral" }> = {
  misconception: { label: "Modelo Mental Erróneo", variant: "danger" },
  knowledge_gap: { label: "Laguna Conceptual", variant: "warning" },
  calculation_error: { label: "Error de Cálculo / Signo", variant: "neutral" },
  reading_error: { label: "Descuido de Enunciado", variant: "neutral" },
  procedure_error: { label: "Error Procedimental", variant: "accent" },
  prerequisite_gap: { label: "Fallo de Prerrequisito", variant: "warning" },
  careless_error: { label: "Desatención Menor", variant: "neutral" },
  overconfidence: { label: "Sobreconfianza", variant: "danger" },
};

export const ErrorBankModal: React.FC<ErrorBankModalProps> = ({
  open,
  onClose,
  onPracticeError,
}) => {
  const [errors, setErrors] = useState<StudentErrorRecord[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showResolved, setShowResolved] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadErrors = async () => {
    let list = await db.studentErrors.toArray();

    // Sembrar un ejemplo educativo si el banco está completamente vacío
    if (list.length === 0) {
      const sampleError: StudentErrorRecord = {
        id: `err_sample_${Date.now()}`,
        conceptId: "c_faraday_lenz",
        conceptName: "Ley de Faraday-Lenz y Fuerza Electromotriz",
        category: "misconception",
        originalExercise: "¿Por qué aparece el signo negativo en la ecuación fem = - dPhi/dt?",
        studentAnswer: "El signo negativo indica que la corriente inducida siempre disminuye exponencialmente con el tiempo.",
        expectedAnswer: "El signo negativo (Ley de Lenz) expresa que el sentido de la fem y la corriente inducida se opone a la variación del flujo magnético que las produce, en estricto acuerdo con la conservación de la energía.",
        explanation: "Confusión entre signo de oposición física (Ley de Lenz) y decaimiento temporal.",
        citationProof: {
          sourceTitle: "Física III: Electrodinámica de Cátedra",
          page: 42,
          snippet: "El signo menos en la ley de Faraday representa el principio de Lenz: los efectos de la inducción se oponen a su causa.",
        },
        timestamp: Date.now() - 3600000,
        repetitionCount: 2,
        resolved: false,
      };
      await db.studentErrors.put(sampleError);
      list = [sampleError];
    }

    setErrors(list);
  };

  useEffect(() => {
    if (open) {
      void loadErrors();
    }
  }, [open]);

  if (!open) return null;

  const filteredErrors = errors.filter((e) => {
    if (!showResolved && e.resolved) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    return true;
  });

  const unresolvedCount = errors.filter((e) => !e.resolved).length;

  const handleToggleResolved = async (err: StudentErrorRecord) => {
    const nextState = !err.resolved;
    await db.studentErrors.update(err.id, { resolved: nextState });
    setFeedback(nextState ? `Error en "${err.conceptName}" marcado como superado.` : `Error reabierto.`);
    setTimeout(() => setFeedback(null), 2500);
    await loadErrors();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Container (Wide for engineering comparison) */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface-1 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-text-primary">
                  Mis Errores · Error Bank
                </h2>
                <Badge variant={unresolvedCount > 0 ? "warning" : "success"}>
                  {unresolvedCount} pendiente(s)
                </Badge>
              </div>
              <p className="font-sans text-xs text-text-muted mt-0.5">
                Registro socrático de modelos mentales erróneos, fallos de cálculo y premisas a desarmar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-bg-surface-2 hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Filter and Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-surface-2/60 p-2.5 rounded-xl border border-border-subtle text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Categoría:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-1 rounded bg-bg-surface-1 border border-border-subtle text-text-primary text-xs focus:outline-hidden"
            >
              <option value="all">Todas las categorías</option>
              <option value="misconception">Modelo mental erróneo</option>
              <option value="knowledge_gap">Laguna conceptual</option>
              <option value="calculation_error">Error de cálculo</option>
              <option value="procedure_error">Error procedimental</option>
              <option value="overconfidence">Sobreconfianza</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded border-border-subtle"
              />
              <span>Mostrar superados ({errors.filter((e) => e.resolved).length})</span>
            </label>

            {unresolvedCount > 0 && onPracticeError && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const firstUnresolved = errors.find((e) => !e.resolved);
                  if (firstUnresolved) onPracticeError(firstUnresolved);
                }}
                className="gap-1.5 text-xs font-mono shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Practicar mis errores</span>
              </Button>
            )}
          </div>
        </div>

        {/* Error Cards List */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 max-h-[55vh]">
          {filteredErrors.length === 0 ? (
            <div className="text-center py-12 text-text-muted font-sans text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60" />
              <p className="font-semibold text-text-primary">¡Excelente! Sin errores pendientes en este filtro.</p>
              <p className="text-[11px] max-w-sm">
                A medida que resuelvas ejercicios o expliques teoremas al Catedrático Socrático, los fallos persistentes se guardarán aquí.
              </p>
            </div>
          ) : (
            filteredErrors.map((err) => {
              const catMeta = CATEGORY_LABELS[err.category] || { label: err.category, variant: "neutral" };
              return (
                <div
                  key={err.id}
                  className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                    err.resolved
                      ? "border-border-subtle bg-bg-surface-2/40 opacity-70"
                      : "border-rose-500/30 bg-bg-surface-1 shadow-xs"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle/50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text-primary">
                        {err.conceptName}
                      </span>
                      <Badge variant={catMeta.variant}>
                        {catMeta.label}
                      </Badge>
                      {err.repetitionCount > 1 && (
                        <Badge variant="danger" className="font-mono">
                          {err.repetitionCount}x repeticiones
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
                      <span>{new Date(err.timestamp).toLocaleDateString("es-AR")}</span>
                      <button
                        type="button"
                        onClick={() => void handleToggleResolved(err)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                          err.resolved
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-border-subtle hover:bg-bg-surface-2 text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {err.resolved ? "✓ Superado" : "Marcar resuelto"}
                      </button>
                    </div>
                  </div>

                  {/* Exercise Premise */}
                  <div className="text-xs text-text-secondary font-mono bg-bg-surface-2/50 p-2 rounded-lg border border-border-subtle/60">
                    <strong className="text-text-primary block text-[11px] mb-0.5">Problema o Premisa:</strong>
                    {err.originalExercise}
                  </div>

                  {/* Discrepancy Diff: Student vs Cátedra */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-sans">
                    {/* Student incorrect reasoning */}
                    <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold mb-1 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                          Tu Aseveración
                        </div>
                        <p className="italic text-[11px]">"{err.studentAnswer}"</p>
                      </div>
                      {err.explanation && (
                        <p className="text-[10px] text-rose-300/80 font-mono mt-2 pt-1 border-t border-rose-500/20">
                          {err.explanation}
                        </p>
                      )}
                    </div>

                    {/* Cátedra Correction & Foundation */}
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          Fundamento de Cátedra
                        </div>
                        <p className="text-[11px] leading-relaxed">{err.expectedAnswer}</p>
                      </div>

                      {err.citationProof && (
                        <div className="mt-2 pt-1 border-t border-emerald-500/20 flex items-center gap-1.5 text-[10px] font-mono text-emerald-300/90">
                          <BookOpen className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>
                            {err.citationProof.sourceTitle} (Pág. {err.citationProof.page})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  {!err.resolved && onPracticeError && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-subtle/40">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPracticeError(err)}
                        className="text-xs font-mono gap-1 text-accent-primary border-accent-primary/40 hover:bg-accent-primary/10"
                      >
                        <Sparkles className="w-3 h-3" />
                        Desarmar este error en Feynman
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
