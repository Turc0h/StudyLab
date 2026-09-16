import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ConceptRecord } from "../../../db/db";
import {
  analyzeFeynmanExplanation,
  commitFeynmanEvaluation,
  convertGapToClozeCard,
  convertGapToStudentError,
  convertGapToGraphNode,
  type FeynmanAnalysisResult,
  type FeynmanGap,
} from "../feynmanEngine";
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Plus,
  BookmarkPlus,
  GitBranch,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface Feynman2RunnerProps {
  initialConceptId?: string;
  onFinish?: () => void;
}

export function Feynman2Runner({ initialConceptId, onFinish }: Feynman2RunnerProps) {
  const concepts = useLiveQuery(() => db.concepts.toArray(), []) || [];

  const [selectedConceptId, setSelectedConceptId] = useState<string>(initialConceptId || "");
  const [customConceptName, setCustomConceptName] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FeynmanAnalysisResult | null>(null);
  const [committedMastery, setCommittedMastery] = useState<number | null>(null);

  // Track gap action status
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialConceptId) {
      setSelectedConceptId(initialConceptId);
    }
  }, [initialConceptId]);

  const activeConcept: ConceptRecord | undefined = concepts.find((c) => c.id === selectedConceptId);
  const activeConceptName = activeConcept ? activeConcept.name : customConceptName || "Concepto no seleccionado";

  const handleAnalyze = async () => {
    if (!explanation.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeFeynmanExplanation(
        activeConceptName,
        explanation,
        selectedConceptId || undefined,
      );
      setAnalysisResult(res);
      setCommittedMastery(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCommit = async () => {
    if (!analysisResult) return;
    const res = await commitFeynmanEvaluation(analysisResult, explanation);
    if (res.updated4DMastery !== undefined) {
      setCommittedMastery(res.updated4DMastery);
    } else {
      setCommittedMastery(analysisResult.comprehensionScore);
    }
  };

  const handleCreateCloze = async (gap: FeynmanGap) => {
    try {
      await convertGapToClozeCard(activeConceptName, selectedConceptId || null, gap);
      setActionFeedback((prev) => ({ ...prev, [`cloze-${gap.id}`]: "✓ Tarjeta Cloze creada en FSRS" }));
    } catch {
      setActionFeedback((prev) => ({ ...prev, [`cloze-${gap.id}`]: "Error al crear tarjeta" }));
    }
  };

  const handleCreateError = async (gap: FeynmanGap) => {
    try {
      await convertGapToStudentError(selectedConceptId || null, activeConceptName, gap);
      setActionFeedback((prev) => ({ ...prev, [`error-${gap.id}`]: "✓ Registrado en Error Bank" }));
    } catch {
      setActionFeedback((prev) => ({ ...prev, [`error-${gap.id}`]: "Error al registrar" }));
    }
  };

  const handleCreateNode = async (gap: FeynmanGap) => {
    try {
      await convertGapToGraphNode(selectedConceptId || null, gap);
      setActionFeedback((prev) => ({ ...prev, [`node-${gap.id}`]: "✓ Subconcepto añadido al Grafo" }));
    } catch {
      setActionFeedback((prev) => ({ ...prev, [`node-${gap.id}`]: "Error al crear nodo" }));
    }
  };

  const resetSession = () => {
    setExplanation("");
    setAnalysisResult(null);
    setCommittedMastery(null);
    setActionFeedback({});
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-bg-surface-2/90 p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-main">Método Feynman 2.0</h2>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Auditoría Dialéctica Cátedra
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Explicá con tus palabras sin tecnicismos. El sistema detecta jerga, omisiones de hipótesis y contradicciones axiomáticas.
            </p>
          </div>
        </div>

        {/* Concept Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-muted">Concepto:</label>
          <select
            value={selectedConceptId}
            onChange={(e) => {
              setSelectedConceptId(e.target.value);
              setAnalysisResult(null);
            }}
            className="rounded-lg border border-border-subtle bg-bg-surface-3 px-3 py-1.5 text-xs text-text-main focus:border-primary focus:outline-none"
          >
            <option value="">-- Personalizado / Libre --</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({Math.round(c.masteryScore || 0)}% 4D)
              </option>
            ))}
          </select>

          {!selectedConceptId && (
            <input
              type="text"
              placeholder="Nombre del concepto..."
              value={customConceptName}
              onChange={(e) => setCustomConceptName(e.target.value)}
              className="rounded-lg border border-border-subtle bg-bg-surface-3 px-3 py-1.5 text-xs text-text-main focus:border-primary focus:outline-none"
            />
          )}
        </div>
      </div>

      {/* Concept Info Banner */}
      {activeConcept && (
        <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface-1/70 px-4 py-2.5 text-xs text-text-muted">
          <span>
            Concepto activo: <strong className="text-text-main">{activeConcept.name}</strong>
          </span>
          <div className="flex items-center gap-3">
            <span>
              Dominio actual: <strong className="text-primary">{Math.round(activeConcept.masteryScore || 0)}%</strong>
            </span>
            <span>
              Prerrequisitos: <strong className="text-text-main">{activeConcept.prerequisites?.length || 0}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Text Area */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Tu explicación con palabras propias:</span>
          <span>{explanation.split(/\s+/).filter(Boolean).length} palabras</span>
        </div>
        <textarea
          rows={5}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder={`Explicá "${activeConceptName}" como si se lo contaras a un ingresante de primer año. Evitá muletillas y explicá las hipótesis necesarias...`}
          className="w-full resize-none rounded-xl border border-border-subtle bg-bg-surface-1 p-4 text-sm text-text-main placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-text-muted">
            💡 Regla de cátedra: Una buena explicación verbal desarma la fórmula en sus componentes causales.
          </span>
          <div className="flex gap-2">
            {analysisResult && (
              <button
                type="button"
                onClick={resetSession}
                className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-text-muted hover:bg-bg-surface-3"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reintentar
              </button>
            )}
            <button
              type="button"
              disabled={isAnalyzing || !explanation.trim()}
              onClick={handleAnalyze}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isAnalyzing ? "Auditando..." : "Analizar con Feynman 2.0"}
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Result Drawer */}
      {analysisResult && (
        <div className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-bg-surface-1 p-5">
          {/* Top Score Bar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border-subtle bg-bg-surface-2 p-3 text-center">
              <span className="text-[11px] uppercase tracking-wider text-text-muted">Comprensión Cátedra (C)</span>
              <div className="mt-1 text-2xl font-bold text-primary">{analysisResult.comprehensionScore}%</div>
              <span className="text-[10px] text-text-muted">Impacta 30% en 4D Mastery</span>
            </div>

            <div className="rounded-lg border border-border-subtle bg-bg-surface-2 p-3 text-center">
              <span className="text-[11px] uppercase tracking-wider text-text-muted">Índice de Simplicidad</span>
              <div className="mt-1 text-2xl font-bold text-amber-500">{analysisResult.simplicityScore}%</div>
              <span className="text-[10px] text-text-muted">Penaliza jerga y tautologías</span>
            </div>

            <div className="rounded-lg border border-border-subtle bg-bg-surface-2 p-3 text-center">
              <span className="text-[11px] uppercase tracking-wider text-text-muted">Diagnóstico Cualitativo</span>
              <div className="mt-1 text-sm font-semibold capitalize text-text-main">
                {analysisResult.diagnosticCategory.replace("_", " ")}
              </div>
              <span className="text-[10px] text-text-muted">
                {analysisResult.gaps.length === 0 ? "Sin brechas detectadas" : `${analysisResult.gaps.length} brecha(s) activa(s)`}
              </span>
            </div>
          </div>

          {/* Entailed Points (Aciertos) */}
          {analysisResult.entailedPoints.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs text-emerald-300">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Puntos Sólidos Validados</span>
              </div>
              <ul className="list-inside list-disc space-y-1 text-emerald-200/90">
                {analysisResult.entailedPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Citation Source Proof (si existe) */}
          {analysisResult.sourceCitationSnippet && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-blue-200">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  Cotejo Oficial: {analysisResult.sourceCitationSnippet.title}
                </span>
                {analysisResult.sourceCitationSnippet.page && <span>Pág. {analysisResult.sourceCitationSnippet.page}</span>}
              </div>
              <p className="italic text-blue-300/80">"{analysisResult.sourceCitationSnippet.snippet}"</p>
            </div>
          )}

          {/* Gaps / Brechas Detectadas */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Brechas Detectadas y Acciones Pedagógicas ({analysisResult.gaps.length})
            </h4>

            {analysisResult.gaps.length === 0 ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center text-xs text-emerald-300">
                🎉 ¡Excelente explicación! No se detectaron contradicciones ni jerga evasiva.
              </div>
            ) : (
              analysisResult.gaps.map((gap) => (
                <div
                  key={gap.id}
                  className={`flex flex-col gap-3 rounded-lg border p-4 text-xs transition-colors ${
                    gap.type === "contradiction"
                      ? "border-red-500/30 bg-red-500/5 text-red-200"
                      : gap.type === "tautology"
                        ? "border-purple-500/30 bg-purple-500/5 text-purple-200"
                        : "border-amber-500/30 bg-amber-500/5 text-amber-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {gap.type === "contradiction" ? (
                        <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                      )}
                      <strong className="text-sm font-semibold">{gap.title}</strong>
                    </div>
                    <span className="rounded bg-bg-surface-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {gap.type} · {gap.severity}
                    </span>
                  </div>

                  <p className="text-text-main/90">{gap.description}</p>

                  {gap.officialBasis && (
                    <div className="rounded border border-border-subtle bg-bg-surface-2 p-2 text-text-muted">
                      <strong>Fundamento Cátedra:</strong> {gap.officialBasis}
                    </div>
                  )}

                  {/* Socratic Question */}
                  <div className="flex items-center gap-2 rounded bg-bg-surface-2/80 p-2 text-text-main">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      <strong>Pregunta dialéctica:</strong> {gap.suggestedQuestion}
                    </span>
                  </div>

                  {/* Action Converters */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle/50 pt-2">
                    <span className="text-[11px] font-semibold text-text-muted">Convertir brecha en:</span>

                    <button
                      type="button"
                      onClick={() => handleCreateCloze(gap)}
                      className="flex items-center gap-1 rounded border border-border-subtle bg-bg-surface-3 px-2 py-1 text-[11px] font-medium text-text-main hover:bg-bg-surface-2"
                    >
                      <Plus className="h-3 w-3 text-primary" /> Flashcard Cloze FSRS
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCreateError(gap)}
                      className="flex items-center gap-1 rounded border border-border-subtle bg-bg-surface-3 px-2 py-1 text-[11px] font-medium text-text-main hover:bg-bg-surface-2"
                    >
                      <BookmarkPlus className="h-3 w-3 text-amber-500" /> Error Bank
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCreateNode(gap)}
                      className="flex items-center gap-1 rounded border border-border-subtle bg-bg-surface-3 px-2 py-1 text-[11px] font-medium text-text-main hover:bg-bg-surface-2"
                    >
                      <GitBranch className="h-3 w-3 text-blue-400" /> Nodo en Grafo
                    </button>

                    {/* Action Feedbacks */}
                    {actionFeedback[`cloze-${gap.id}`] && (
                      <span className="text-[10px] text-emerald-400 font-semibold">{actionFeedback[`cloze-${gap.id}`]}</span>
                    )}
                    {actionFeedback[`error-${gap.id}`] && (
                      <span className="text-[10px] text-amber-400 font-semibold">{actionFeedback[`error-${gap.id}`]}</span>
                    )}
                    {actionFeedback[`node-${gap.id}`] && (
                      <span className="text-[10px] text-blue-400 font-semibold">{actionFeedback[`node-${gap.id}`]}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Commit Button */}
          <div className="flex flex-wrap items-center justify-between border-t border-border-subtle pt-3">
            <span className="text-xs text-text-muted">
              {committedMastery !== null
                ? `✓ 4D Mastery actualizado a ${Math.round(committedMastery)}%`
                : "Guardá esta auditoría para impactar la dimensión de Comprensión del concepto."}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCommit}
                disabled={committedMastery !== null}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {committedMastery !== null ? "Auditoría Registrada" : "Confirmar y Actualizar 4D Mastery"}
              </button>
              {onFinish && (
                <button
                  type="button"
                  onClick={onFinish}
                  className="rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-muted hover:bg-bg-surface-2"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
