import React, { useEffect, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import {
  db,
  type AcademicBoundingBox,
  type AcademicChunkRecord,
  type AcademicSourceRecord,
  type CardFsrsRecord,
} from "../../../db/db";
import {
  calculateRetrievability,
  previewNextStates,
  detectCardLeech,
  type FsrsRating,
} from "../../fsrs/fsrsModel";
import { executeFsrsReview } from "../../fsrs/scheduler";
import { generateFsrsCardsFromChunk } from "../flashcardGenerator";
import { AcademicKnowledgeGraphPanel } from "./AcademicKnowledgeGraphPanel";
import { parseOcclusionCard } from "../../image-occlusion/occlusionEngine";
import { ImageOcclusionViewer } from "../../image-occlusion/ImageOcclusionViewer";
import {
  CheckCircle,
  RotateCw,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

interface MetricBarProps {
  label: string;
  value: string;
  percent: number;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, percent }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px] font-mono">
      <span className="text-[--text-secondary]">{label}</span>
      <span className="text-[--text-primary] font-medium">{value}</span>
    </div>
    <div className="w-full bg-[--bg-panel] h-1.5 rounded-full overflow-hidden">
      <div
        className="h-full bg-[--accent-ink] rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  </div>
);

interface AcademicCognitiveWidgetsProps {
  activeSource: AcademicSourceRecord | null;
  activeChunk: AcademicChunkRecord | null;
  allChunks: AcademicChunkRecord[];
  onNavigateToCitation?: (page: number, bbox?: AcademicBoundingBox) => void;
}

type WidgetTab = "fsrs" | "simulator" | "graph";

export const AcademicCognitiveWidgets: React.FC<AcademicCognitiveWidgetsProps> = ({
  activeSource,
  activeChunk,
  allChunks,
  onNavigateToCitation,
}) => {
  const [activeTab, setActiveTab] = useState<WidgetTab>("fsrs");

  // --- FSRS State ---
  const [cards, setCards] = useState<CardFsrsRecord[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [reviewCountToday, setReviewCountToday] = useState(0);

  // --- Simulator State ---
  const [selectedTrapOption, setSelectedTrapOption] = useState<number | null>(null);
  const [showTrapExplanation, setShowTrapExplanation] = useState(false);

  // Load cards for active source
  useEffect(() => {
    let isMounted = true;
    const loadCards = async () => {
      if (!activeSource) {
        if (isMounted) setCards([]);
        return;
      }
      const deckId = `deck_${activeSource.id}`;
      const foundCards = await db.cardsFsrs.where("deckId").equals(deckId).toArray();

      if (isMounted) {
        if (foundCards.length === 0 && allChunks.length > 0) {
          const generated: CardFsrsRecord[] = [];
          for (const chunk of allChunks.slice(0, 3)) {
            const chunkCards = await generateFsrsCardsFromChunk(chunk);
            generated.push(...chunkCards);
          }
          setCards(generated);
        } else {
          setCards(foundCards);
        }
        setCurrentCardIndex(0);
        setIsFlipped(false);
      }
    };

    void loadCards();
    return () => {
      isMounted = false;
    };
  }, [activeSource, allChunks]);

  const handleGenerateCardsForActiveChunk = async () => {
    if (!activeChunk) return;
    setGeneratingCards(true);
    try {
      const newCards = await generateFsrsCardsFromChunk(activeChunk);
      setCards((prev) => [...prev, ...newCards]);
    } finally {
      setGeneratingCards(false);
    }
  };

  const currentCard = cards[currentCardIndex];

  const renderMathText = (content: string) => {
    if (!content.includes("$")) {
      return <span>{content}</span>;
    }
    const parts = content.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith("$$") && part.endsWith("$$")) {
            const formula = part.slice(2, -2).trim();
            try {
              const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
              return <div key={i} dangerouslySetInnerHTML={{ __html: html }} className="my-2 overflow-x-auto" />;
            } catch {
              return <pre key={i} className="text-xs text-red-400">{part}</pre>;
            }
          } else if (part.startsWith("$") && part.endsWith("$")) {
            const formula = part.slice(1, -1).trim();
            try {
              const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
              return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch {
              return <code key={i} className="text-xs text-red-400">{part}</code>;
            }
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  const elapsedDays = currentCard?.lastReview
    ? Math.max(0, (Date.now() - currentCard.lastReview) / (1000 * 60 * 60 * 24))
    : 0;

  const currentR = currentCard
    ? currentCard.state === "new"
      ? 1.0
      : calculateRetrievability(elapsedDays, currentCard.stability)
    : 0;

  const predictions = currentCard
    ? previewNextStates(
        currentCard.stability,
        currentCard.difficulty,
        elapsedDays,
        currentCard.state === "new"
      )
    : null;

  const handleFsrsAnswer = async (rating: FsrsRating) => {
    if (!currentCard) return;

    await executeFsrsReview(currentCard.id, rating, 1200, Date.now());

    setReviewCountToday((prev) => prev + 1);
    setIsFlipped(false);

    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      if (activeSource) {
        const reloaded = await db.cardsFsrs.where("deckId").equals(`deck_${activeSource.id}`).toArray();
        setCards(reloaded);
        setCurrentCardIndex(0);
      }
    }
  };

  const isPhysics = activeSource?.subjectId.toLowerCase().includes("fis") || false;

  const examTrapQuestion = {
    title: isPhysics
      ? "Teorema de Gauss: Singularidad y Flujo"
      : "Independencia Lineal y Espacios Duales",
    prompt: isPhysics
      ? "Considere una superficie esférica S concéntrica a una carga puntual q en el origen. Si el radio de S se duplica, ¿cuál es la razón fundamental por la que el flujo eléctrico neto permanece invariante según la ley de Gauss en forma diferencial?"
      : "Dado un conjunto de vectores no nulos {v₁, v₂, ..., vₖ} linealmente dependientes en V. Si se añade una base canónica entera {e₁, ..., eₙ}, ¿es posible que el nuevo conjunto sea linealmente independiente?",
    options: isPhysics
      ? [
          { text: "El área de la esfera aumenta como r², compensando exactamente la caída del campo eléctrico como 1/r².", correct: true },
          { text: "La constante de permitividad eléctrica del vacío ε₀ aumenta proporcionalmente al volumen encerrado.", correct: false },
          { text: "El teorema de la divergencia no se aplica porque la divergencia en el origen es divergente e infinita.", correct: false },
          { text: "El flujo eléctrico solo depende de la curvatura gaussiana promedio multiplicada por la carga neta.", correct: false },
        ]
      : [
          { text: "Sí, siempre que la dimensión del espacio resultante sea superior a k+n.", correct: false },
          { text: "No, todo superconjunto de un conjunto linealmente dependiente es necesariamente linealmente dependiente.", correct: true },
          { text: "Solo si los vectores originales son ortogonales respecto al producto interno.", correct: false },
          { text: "Depende de si los escalares del cuerpo subyacente son reales o complejos.", correct: false },
        ],
    citationText: isPhysics
      ? "Física III, Cap. 2, Pág. 42 (Ecuación 2.4): ∮ E · dA = Q_enc / ε₀."
      : "Álgebra Lineal, Cap. 3, Pág. 89: Proposición 3.1.2 de Clausura Lineal.",
    page: isPhysics ? 42 : 89,
  };

  return (
    <aside
      data-tour="cognitive-widgets"
      className="w-full h-full flex flex-col bg-[--bg-panel] border-l border-[--border-hairline] text-[--text-primary] overflow-hidden"
    >
      {/* Header & Underline Tabs */}
      <div className="p-3 border-b border-[--border-hairline] flex items-center justify-between">
        <h3 className="text-xs font-serif font-semibold text-[--text-primary]">
          Cognitive Hub
        </h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("fsrs")}
            className={`pb-1 text-xs font-sans transition-colors cursor-pointer border-b-2 ${
              activeTab === "fsrs"
                ? "border-[--accent-ink] text-[--text-primary] font-medium"
                : "border-transparent text-[--text-secondary] hover:text-[--text-primary]"
            }`}
          >
            FSRS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simulator")}
            className={`pb-1 text-xs font-sans transition-colors cursor-pointer border-b-2 ${
              activeTab === "simulator"
                ? "border-[--accent-ink] text-[--text-primary] font-medium"
                : "border-transparent text-[--text-secondary] hover:text-[--text-primary]"
            }`}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("graph")}
            className={`pb-1 text-xs font-sans transition-colors cursor-pointer border-b-2 ${
              activeTab === "graph"
                ? "border-[--accent-ink] text-[--text-primary] font-medium"
                : "border-transparent text-[--text-secondary] hover:text-[--text-primary]"
            }`}
          >
            Graph
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* TAB 1: FSRS COGNITIVE REPETITION */}
        {activeTab === "fsrs" && (
          <div className="space-y-4">
            {!currentCard || cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-[--border-hairline] rounded-xl">
                <p className="text-[--text-primary] text-sm font-medium mb-1">
                  Todavía no hay tarjetas para este documento
                </p>
                <p className="text-[--text-secondary] text-xs mb-4 max-w-[260px] leading-relaxed">
                  Subí una fuente y generá tarjetas FSRS desde el Lienzo de Estudio para empezar a ver tu curva de retención acá.
                </p>
                {activeChunk && (
                  <Button
                    size="sm"
                    onClick={() => void handleGenerateCardsForActiveChunk()}
                    disabled={generatingCards}
                    className="text-xs bg-[--accent-ink] hover:bg-[--accent-ink-muted] text-white border-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {generatingCards ? "Generando tarjetas..." : "Generar tarjetas desde el texto actual →"}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="bg-[--bg-panel-raised] p-3 rounded-xl border border-[--border-hairline] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[--text-secondary] font-mono">Retención estimada R(t)</span>
                    <span className="text-sm font-bold font-mono text-[--text-primary]">
                      {Math.round(currentR * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-[--bg-panel] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[--accent-ink] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, currentR * 100))}%` }}
                    />
                  </div>
                  <div className="pt-2 border-t border-[--border-hairline] space-y-1.5">
                    <MetricBar
                      label="Estabilidad"
                      value={`${currentCard.stability.toFixed(1)}d`}
                      percent={Math.min(100, (currentCard.stability / 30) * 100)}
                    />
                    <MetricBar
                      label="Dificultad"
                      value={`${currentCard.difficulty.toFixed(1)}/10`}
                      percent={Math.min(100, (currentCard.difficulty / 10) * 100)}
                    />
                  </div>
                </div>

                <div className="bg-[--bg-panel-raised] rounded-xl border border-[--border-hairline] p-3.5 shadow-sm relative flex flex-col min-h-[260px] justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-[--border-hairline] text-[10px] font-mono text-[--text-secondary]">
                    <span className="flex items-center gap-1 text-[--accent-ink]">
                      <Sparkles className="w-3 h-3" />
                      FSRS v4.5 Active
                    </span>
                    <span>
                      Card {currentCardIndex + 1} of {cards.length}
                    </span>
                  </div>

                  {(() => {
                    const leech = detectCardLeech(currentCard.lapses || 0);
                    if (!leech.isLeech) return null;
                    return (
                      <div className="my-2 p-2.5 rounded-lg border border-rose-500/30 bg-rose-950/20 text-rose-200 text-[11px] flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Tarjeta Dificultosa (Leech · {leech.lapses} fallos)</span>
                        </div>
                        <p className="text-[10px] text-rose-300/80 leading-snug">
                          {leech.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-rose-500/20 text-[9px]">
                          <span className="font-mono text-rose-400">Acción pedagógica:</span>
                          <span className="font-bold uppercase tracking-wider text-rose-200">
                            {leech.actionRecommendation === "split"
                              ? "Dividir en dos más chicas"
                              : leech.actionRecommendation === "audit"
                              ? "Auditar con Cátedra"
                              : "Reformular"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const occlusionPayload = parseOcclusionCard(currentCard);
                    if (occlusionPayload) {
                      return (
                        <div className="my-2">
                          <ImageOcclusionViewer
                            payload={occlusionPayload}
                            isFlipped={isFlipped}
                            onReveal={() => setIsFlipped(true)}
                          />
                        </div>
                      );
                    }
                    return (
                      <div className="my-3 text-xs leading-relaxed text-[--text-primary] font-serif">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[--text-secondary] mb-1 font-sans">
                          Pregunta / Estímulo:
                        </div>
                        {renderMathText(currentCard.front)}
                      </div>
                    );
                  })()}

                  {isFlipped ? (
                    <div className="mt-2 pt-3 border-t border-[--border-hairline] bg-[--bg-panel] rounded-lg p-2.5 text-xs text-[--text-primary] animate-in fade-in duration-200 font-sans">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[--accent-ink] mb-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-[--accent-ink]" />
                        Respuesta Verificada:
                      </div>
                      {renderMathText(currentCard.back)}

                      {activeChunk && (
                        <div className="mt-2 pt-2 border-t border-[--border-hairline] flex items-center justify-between">
                          <span className="text-[9px] font-mono text-[--text-secondary]">
                            Fuente: Pág {activeChunk.pageNumber}
                          </span>
                          <button
                            onClick={() =>
                              onNavigateToCitation?.(activeChunk.pageNumber, activeChunk.boundingBox)
                            }
                            className="text-[9px] font-mono text-[--accent-ink] hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            Auditar Fuente <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsFlipped(true)}
                        className="w-full text-xs font-mono border-[--border-hairline] bg-[--bg-panel] hover:bg-[--bg-base] text-[--text-primary] cursor-pointer"
                      >
                        <RotateCw className="w-3 h-3 mr-1.5 text-[--accent-ink]" />
                        Revelar Demostración / Solución
                      </Button>
                    </div>
                  )}

                  {isFlipped && predictions && (
                    <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2 border-t border-[--border-hairline]">
                      <button
                        onClick={() => void handleFsrsAnswer(1)}
                        className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all text-center group cursor-pointer"
                      >
                        <span className="text-[10px] font-bold">Again</span>
                        <span className="text-[8px] font-mono text-rose-400/80">
                          {predictions[1].intervalDays}d
                        </span>
                      </button>

                      <button
                        onClick={() => void handleFsrsAnswer(2)}
                        className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all text-center group cursor-pointer"
                      >
                        <span className="text-[10px] font-bold">Hard</span>
                        <span className="text-[8px] font-mono text-amber-400/80">
                          {predictions[2].intervalDays}d
                        </span>
                      </button>

                      <button
                        onClick={() => void handleFsrsAnswer(3)}
                        className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-all text-center group cursor-pointer"
                      >
                        <span className="text-[10px] font-bold">Good</span>
                        <span className="text-[8px] font-mono text-emerald-400/80">
                          {predictions[3].intervalDays}d
                        </span>
                      </button>

                      <button
                        onClick={() => void handleFsrsAnswer(4)}
                        className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-[--accent-ink]/15 hover:bg-[--accent-ink]/25 border border-[--accent-ink]/40 text-[--text-primary] transition-all text-center group cursor-pointer"
                      >
                        <span className="text-[10px] font-bold">Easy</span>
                        <span className="text-[8px] font-mono text-[--accent-ink]">
                          {predictions[4].intervalDays}d
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center justify-between text-[10px] font-mono text-[--text-secondary] pt-1 border-t border-[--border-hairline]">
              <span>Repasos hoy: {reviewCountToday}</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[--signal-ok]" />
                Sincronizado localmente
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: EXAM SIMULATOR & TRAP QUESTIONS */}
        {activeTab === "simulator" && (
          <div className="space-y-3">
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-mono mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {examTrapQuestion.title}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {examTrapQuestion.prompt}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Selecciona la justificación rigurosa:
              </div>
              {examTrapQuestion.options.map((opt, i) => {
                const isSelected = selectedTrapOption === i;
                const isCorrect = opt.correct;
                let btnStyle = "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700";

                if (showTrapExplanation) {
                  if (isCorrect) {
                    btnStyle = "border-emerald-500/60 bg-emerald-950/30 text-emerald-200";
                  } else if (isSelected) {
                    btnStyle = "border-rose-500/60 bg-rose-950/30 text-rose-200";
                  }
                } else if (isSelected) {
                  btnStyle = "border-amber-500/60 bg-amber-950/30 text-amber-200";
                }

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedTrapOption(i);
                      setShowTrapExplanation(true);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs leading-relaxed transition-all ${btnStyle}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-[10px] text-slate-500">[{i + 1}]</span>
                      <span>{opt.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {showTrapExplanation && (
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-cyan-400 font-bold">
                    Auditoría de Cita Académica:
                  </span>
                  <Badge variant="accent" className="text-[9px] border-cyan-500/40 text-cyan-400">
                    Cita Certificada
                  </Badge>
                </div>
                <p className="text-slate-300 font-mono text-[11px] bg-slate-950 p-2 rounded border border-slate-800">
                  {examTrapQuestion.citationText}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToCitation?.(examTrapQuestion.page)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 p-0 h-auto font-mono flex items-center gap-1"
                >
                  Ver demostración completa en visor PDF <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PREREQUISITE & CONCEPT GRAPH (RPG MODE) */}
        {activeTab === "graph" && (
          <AcademicKnowledgeGraphPanel
            activeSubjectId={activeSource?.subjectId}
            onStartExpressStudy={() => setActiveTab("fsrs")}
          />
        )}
      </div>
    </aside>
  );
};
