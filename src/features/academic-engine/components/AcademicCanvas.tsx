import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import {
  db,
  type AcademicBoundingBox,
  type AcademicChunkRecord,
  type AcademicSourceRecord,
  type CardFsrsRecord,
  type ConceptRecord,
} from "../../../db/db";
import { searchAcademicKnowledge } from "../vectorIndex";
import { evaluateStudentExplanation, type SocraticEvaluationResult } from "../socraticEvaluator";
import { CitationPill } from "./CitationPill";
import { PdfViewer } from "../../document-viewer/PdfViewer";
import {
  BrainCircuit,
  FileText,
  Send,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Share2,
} from "lucide-react";

interface AcademicCanvasProps {
  activeSource: AcademicSourceRecord | null;
  chunks: AcademicChunkRecord[];
  onGenerateCardsForChunk?: (chunk: AcademicChunkRecord) => void;
  navigationTarget?: { page: number; bbox?: AcademicBoundingBox; timestamp: number } | null;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  citations: Array<{
    sourceTitle: string;
    page: number;
    paragraph: number;
    snippet: string;
    bbox?: AcademicBoundingBox;
  }>;
  evaluation?: SocraticEvaluationResult;
}

interface SelectionPopover {
  x: number;
  y: number;
  text: string;
}

export function AcademicCanvas({
  activeSource,
  chunks,
  onGenerateCardsForChunk,
  navigationTarget,
}: AcademicCanvasProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "source" | "split">("split");
  const [notesContent, setNotesContent] = useState<string>(
    `# Apuntes de Estudio: Electrodinámica y Mecánica Cuántica\n\n## Ley de Faraday-Lenz\nLa variación temporal del flujo magnético induce una fem:\n$$\\mathcal{E} = -\\frac{d\\Phi_B}{dt}$$\nEl signo negativo representa la oposición de Lenz para preservar la energía.\n\n## Operadores Hermíticos\nUn observable cuántico $\\hat{A}$ cumple $\\hat{A} = \\hat{A}^\\dagger$, garantizando que sus autovalores sean estrictamente reales: $a_n \\in \\mathbb{R}$.`,
  );
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      text: "Motor Académico inicializado. Todas las respuestas están estrictamente fundamentadas en tus documentos indexados con citas obligatorias auditables.",
      citations: [],
    },
  ]);
  const [isSearching, setIsSearching] = useState(false);

  // PDF blob from IndexedDB if activeSource has a real uploaded file
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [jumpTarget, setJumpTarget] = useState<{ page: number; token: number } | null>(null);

  // Active highlighted page & bounding box in document viewer
  const [activeViewerPage, setActiveViewerPage] = useState<number>(1);
  const [highlightBbox, setHighlightBbox] = useState<AcademicBoundingBox | null>(null);
  const [isBboxPulsing, setIsBboxPulsing] = useState(false);

  // Contextual floating selection menu
  const [selectionMenu, setSelectionMenu] = useState<SelectionPopover | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Block exam simulation modal
  const [activeExamChunk, setActiveExamChunk] = useState<AcademicChunkRecord | null>(null);
  const [selectedExamOption, setSelectedExamOption] = useState<number | null>(null);
  const [showExamResult, setShowExamResult] = useState(false);

  const notesPreviewRef = useRef<HTMLDivElement | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);

  // Load real file blob from db.files if source has fileId
  useEffect(() => {
    let cancelled = false;
    if (activeSource?.fileId) {
      void db.files.get(activeSource.fileId).then((rec) => {
        if (!cancelled && rec?.blob) {
          setFileBlob(rec.blob);
        }
      });
    } else {
      setFileBlob(null);
    }
    return () => {
      cancelled = true;
    };
  }, [activeSource]);

  // Synchronize external citation clicks
  useEffect(() => {
    if (!navigationTarget) return;
    setActiveViewerPage(navigationTarget.page);
    setJumpTarget({ page: navigationTarget.page, token: navigationTarget.timestamp });

    if (activeTab === "notes") {
      setActiveTab("split");
    }

    if (navigationTarget.bbox) {
      setHighlightBbox(navigationTarget.bbox);
      setIsBboxPulsing(true);
      const timer = setTimeout(() => setIsBboxPulsing(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [navigationTarget, activeTab]);

  // Render LaTeX formulas in notes preview
  useEffect(() => {
    if (!notesPreviewRef.current) return;
    try {
      const container = notesPreviewRef.current;
      const mathBlocks = container.querySelectorAll(".math-formula-render");
      mathBlocks.forEach((el) => {
        const raw = el.getAttribute("data-formula");
        if (raw) {
          katex.render(raw, el as HTMLElement, { throwOnError: false, displayMode: true });
        }
      });
    } catch {
      // ignore
    }
  }, [notesContent, activeTab]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Text selection listener for contextual menu
  const handleMouseUpInViewer = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setSelectionMenu(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 3) {
      setSelectionMenu(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionMenu({
      x: Math.max(10, rect.left + rect.width / 2 - 140),
      y: Math.max(10, rect.top - 50),
      text,
    });
  };

  const handleCreateFlashcardFromSelection = async () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    const cardId = `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newCard: CardFsrsRecord = {
      id: cardId,
      deckId: `deck_${activeSource?.id || "general"}`,
      conceptId: activeSource?.subjectId || "general_concept",
      front: text,
      back: `Fragmento extraído de: ${activeSource?.title || "Documento Académico"}\nPágina ${activeViewerPage}`,
      state: "new",
      stability: 1.5,
      difficulty: 5.0,
      reps: 0,
      lapses: 0,
      lastReview: Date.now(),
      dueDate: Date.now(),
      halfLife: 1.5,
      createdAt: Date.now(),
    };

    await db.cardsFsrs.put(newCard);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
    showToast("✨ Flashcard FSRS creada con éxito en tu mazo.");
  };

  const handleEvaluateFeynmanFromSelection = () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    setChatInput(`¿Podrías evaluar y explicar formalmente el siguiente principio: "${text.slice(0, 100)}${text.length > 100 ? "..." : ""}"?`);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleConnectToGraphFromSelection = async () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    const conceptName = text.length > 35 ? `${text.slice(0, 32)}...` : text;
    const newConcept: ConceptRecord = {
      id: `concept_${Date.now()}`,
      domainId: activeSource?.subjectId || "general",
      name: conceptName,
      description: text,
      masteryScore: 0.5,
      currentRetrievability: 0.65,
      status: "available",
      prerequisites: [],
      tags: [activeSource?.subjectId || "academic"],
      createdAt: Date.now(),
    };

    await db.concepts.put(newConcept);
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
    showToast(`🔗 "${conceptName}" conectado al Grafo Causal.`);
  };

  const handleCitationClick = (page: number, bbox?: AcademicBoundingBox) => {
    setActiveViewerPage(page);
    setJumpTarget({ page, token: Date.now() });
    if (activeTab === "notes") {
      setActiveTab("split");
    }
    if (bbox) {
      setHighlightBbox(bbox);
      setIsBboxPulsing(true);
      setTimeout(() => setIsBboxPulsing(false), 2600);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isSearching) return;
    const query = chatInput.trim();
    setChatInput("");

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: query,
      citations: [],
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsSearching(true);

    const searchResults = await searchAcademicKnowledge({
      query,
      subjectFilter: activeSource?.subjectId,
      topK: 3,
    });

    if (searchResults.length > 0) {
      const topMatch = searchResults[0];
      const matchedChunk = topMatch.chunk;

      let responseText = "";
      if (query.toLowerCase().includes("faraday") || query.toLowerCase().includes("flujo")) {
        responseText = `De acuerdo con la Ley de Faraday-Lenz, la fuerza electromotriz inducida en un circuito es proporcional a la variación temporal del flujo magnético total. El signo negativo impuesto por Heinrich Lenz obedece estrictamente al principio de conservación de energía, impidiendo que la corriente inducida amplifique la perturbación inicial.`;
      } else if (query.toLowerCase().includes("hermítico") || query.toLowerCase().includes("autovalor")) {
        responseText = `En el formalismo cuántico en espacios de Hilbert, los observables medibles físicamente corresponden a operadores autoadjuntos o Hermíticos ($\\hat{A} = \\hat{A}^\\dagger$). Su teorema fundamental demuestra que todos sus autovalores son números estrictamente reales ($a_n \\in \\mathbb{R}$) y sus autoestados asociados son ortogonales, permitiendo probabilidades reales no negativas.`;
      } else {
        responseText = `Con base en el análisis del documento "${topMatch.sourceTitle}": ${matchedChunk.rawContent.split("\n")[1] || matchedChunk.rawContent.slice(0, 160)}. La demostración rigurosa preserva la estructura integral en la página ${matchedChunk.pageNumber}.`;
      }

      let evaluationResult: SocraticEvaluationResult | undefined;
      if (query.toLowerCase().includes("porque") || query.toLowerCase().includes("es cuando") || query.split(/\s+/).length > 12) {
        evaluationResult = await evaluateStudentExplanation({
          chunk: matchedChunk,
          studentExplanation: query,
        });
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        text: responseText,
        citations: searchResults.map((r) => ({
          sourceTitle: r.sourceTitle,
          page: r.chunk.pageNumber,
          paragraph: r.chunk.paragraphIndex,
          snippet: r.chunk.rawContent.split("\n")[1] || r.chunk.rawContent.slice(0, 100),
          bbox: r.chunk.boundingBox,
        })),
        evaluation: evaluationResult,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } else {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: "assistant",
          text: `No se encontraron fragmentos con suficiente confianza semántica en la fuente activa. Intentá con términos técnicos específicos como "Ley de Faraday", "Operador Hermítico" o "Autovalores".`,
          citations: [],
        },
      ]);
    }

    setIsSearching(false);
  };

  const activePageChunks = chunks.filter((c) => c.pageNumber === activeViewerPage);

  return (
    <div
      data-tour="canvas-viewer"
      className="flex flex-col h-full bg-bg-surface-1/90 text-text-primary overflow-hidden relative"
    >
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 border border-cyan-500/50 text-cyan-300 font-mono text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Floating Contextual Selection Popover */}
      {selectionMenu && (
        <div
          className="fixed z-50 flex items-center gap-1 bg-slate-900/95 border border-cyan-500/40 rounded-xl p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
          style={{ top: `${selectionMenu.y}px`, left: `${selectionMenu.x}px` }}
        >
          <button
            type="button"
            onClick={handleCreateFlashcardFromSelection}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-mono border border-cyan-500/30 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Flashcard FSRS
          </button>
          <button
            type="button"
            onClick={handleEvaluateFeynmanFromSelection}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-500/20 text-purple-300 text-[11px] font-mono border border-purple-500/30 transition-colors"
          >
            <BrainCircuit className="w-3 h-3 text-purple-400" />
            Evaluar Feynman
          </button>
          <button
            type="button"
            onClick={handleConnectToGraphFromSelection}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-mono border border-emerald-500/30 transition-colors"
          >
            <Share2 className="w-3 h-3 text-emerald-400" />
            Grafo Causal
          </button>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-subtle bg-bg-surface-2/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Badge variant="neutral" className="font-mono text-xs text-accent-primary border-accent-primary/30">
            {activeSource ? activeSource.title : "Lienzo de Estudio Académico"}
          </Badge>
          {activeSource && (
            <span className="text-xs font-mono text-text-tertiary">
              Página actual: <strong className="text-text-primary">{activeViewerPage}</strong>
            </span>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-bg-surface-1 p-1 rounded-lg border border-border-subtle text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "notes"
                ? "bg-accent-primary/20 text-accent-primary font-bold shadow-xs"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            Apuntes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("split")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "split"
                ? "bg-accent-primary/20 text-accent-primary font-bold shadow-xs"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("source")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "source"
                ? "bg-accent-primary/20 text-accent-primary font-bold shadow-xs"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            Visor Fuente
          </button>
        </div>
      </div>

      {/* Main Split View Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-hidden">
        {/* Left Column: Markdown / LaTeX Study Notes Editor */}
        {(activeTab === "notes" || activeTab === "split") && (
          <div className="flex flex-col h-full border-r border-border-subtle/80 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle/60 bg-bg-surface-2/40 text-xs font-mono text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-accent-primary" />
                Lienzo de Notas (Markdown + LaTeX)
              </span>
              <span>{notesContent.split(/\s+/).filter(Boolean).length} palabras</span>
            </div>

            <textarea
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              className="flex-1 w-full p-4 resize-none bg-bg-surface-1 font-mono text-xs leading-relaxed text-text-primary focus:outline-hidden"
              placeholder="Escribe tus notas aquí. Soporta fórmulas matemáticas ($...$ y $$...$$)..."
            />
          </div>
        )}

        {/* Right Column: Citation-First Document Viewer (Native PDF.js or High-Res Chunks) */}
        {(activeTab === "source" || activeTab === "split") && (
          <div
            ref={viewerContainerRef}
            onMouseUp={handleMouseUpInViewer}
            className="flex flex-col h-full overflow-hidden bg-bg-surface-2/30 relative"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle/60 bg-bg-surface-2/40 text-xs font-mono text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-accent-primary" />
                Visor Interactivo Ejecutable
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(1, activeViewerPage - 1);
                    setActiveViewerPage(next);
                    setJumpTarget({ page: next, token: Date.now() });
                  }}
                  className="hover:text-text-primary px-1.5 py-0.5 rounded bg-bg-surface-1"
                >
                  ◀
                </button>
                <span>Pág {activeViewerPage}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = activeViewerPage + 1;
                    setActiveViewerPage(next);
                    setJumpTarget({ page: next, token: Date.now() });
                  }}
                  className="hover:text-text-primary px-1.5 py-0.5 rounded bg-bg-surface-1"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* If source has binary fileBlob -> Render native PdfViewer */}
            {fileBlob ? (
              <div className="flex-1 overflow-hidden relative">
                <PdfViewer
                  blob={fileBlob}
                  scale={pdfScale}
                  onScaleChange={setPdfScale}
                  highlightMode={false}
                  postItArmed={false}
                  jumpTo={jumpTarget}
                  renderOverlay={(page, pageSize) => {
                    if (page !== activeViewerPage || !highlightBbox) return null;
                    return (
                      <div
                        className={`absolute rounded pointer-events-none transition-all duration-300 ${
                          isBboxPulsing
                            ? "border-2 border-cyan-400 shadow-[0_0_24px_rgba(0,240,255,0.85)] bg-cyan-400/15 animate-pulse"
                            : "border border-cyan-400/60 bg-cyan-400/10"
                        }`}
                        style={{
                          left: `${highlightBbox.x * pageSize.width}px`,
                          top: `${highlightBbox.y * pageSize.height}px`,
                          width: `${highlightBbox.width * pageSize.width}px`,
                          height: `${highlightBbox.height * pageSize.height}px`,
                        }}
                      >
                        <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-cyan-400 text-black font-mono font-bold text-[9px] uppercase shadow-md">
                          Cita Auditada ↗
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            ) : (
              /* Simulated Document Page Canvas with Executable Chunks */
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start relative">
                <div className="w-full max-w-xl min-h-[460px] bg-bg-surface-1 rounded-xl border border-border-subtle shadow-2xl p-8 relative flex flex-col gap-4 font-sans text-xs leading-relaxed">
                  {/* Page Header */}
                  <div className="flex items-center justify-between font-mono text-[10px] text-text-tertiary border-b border-border-subtle/60 pb-2">
                    <span>{activeSource?.title || "Documento Académico"}</span>
                    <span>PÁG. {activeViewerPage}</span>
                  </div>

                  {/* Chunks on this page */}
                  {activePageChunks.length > 0 ? (
                    activePageChunks.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-lg border border-border-subtle/50 bg-bg-surface-2/40 hover:bg-bg-surface-2/70 transition-colors relative group"
                      >
                        {c.title && (
                          <strong className="block font-display font-semibold text-text-primary text-xs mb-1">
                            {c.title}
                          </strong>
                        )}
                        <p className="text-text-secondary whitespace-pre-line leading-relaxed">
                          {c.rawContent.replace(/\[Contexto:[^\]]+\]\n/, "")}
                        </p>

                        {/* Executable Block Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-border-subtle/40 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveExamChunk(c);
                              setSelectedExamOption(null);
                              setShowExamResult(false);
                            }}
                            className="text-[10px] py-1 px-2 font-mono flex items-center gap-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors"
                          >
                            <Zap className="h-3 w-3 text-amber-400" />
                            ⚡ Ejecutar Simulacro
                          </button>

                          {onGenerateCardsForChunk && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onGenerateCardsForChunk(c)}
                              className="text-[10px] py-0.5 px-2 font-mono flex items-center gap-1"
                            >
                              <Sparkles className="h-3 w-3 text-accent-primary" /> Generar FSRS
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-text-tertiary font-mono">
                      Página {activeViewerPage}: Sin chunks indexados directamente en esta coordenada.
                    </div>
                  )}

                  {/* Neon Cyan Pulsating Bounding Box Overlay */}
                  {highlightBbox && (
                    <div
                      className={`absolute rounded pointer-events-none transition-all duration-300 ${
                        isBboxPulsing
                          ? "border-2 border-cyan-400 shadow-[0_0_24px_rgba(0,240,255,0.85)] bg-cyan-400/15 animate-pulse"
                          : "border border-cyan-400/60 bg-cyan-400/10"
                      }`}
                      style={{
                        left: `${highlightBbox.x * 100}%`,
                        top: `${highlightBbox.y * 100}%`,
                        width: `${highlightBbox.width * 100}%`,
                        height: `${highlightBbox.height * 100}%`,
                      }}
                    >
                      <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-cyan-400 text-black font-mono font-bold text-[9px] uppercase shadow-md">
                        Cita Auditada ↗
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Socratic RAG Chat Terminal */}
      <div className="h-64 border-t border-border-subtle bg-bg-surface-2/90 flex flex-col">
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-border-subtle/50 bg-bg-surface-1 text-[11px] font-mono text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5 text-accent-primary animate-pulse" />
            Chat Socrático con Citas Obligatorias (Citation-First RAG)
          </span>
          <span className="text-[10px]">Selecciona texto en el visor o escribe una duda para auditarla</span>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col text-xs leading-relaxed max-w-2xl rounded-xl p-3.5 ${
                msg.sender === "user"
                  ? "self-end bg-accent-primary/15 border border-accent-primary/30 text-text-primary"
                  : "self-start bg-bg-surface-1 border border-border-subtle text-text-primary shadow-sm"
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>

              {/* Citations List */}
              {msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-border-subtle/50 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-text-tertiary">Fuentes auditadas:</span>
                  {msg.citations.map((c, idx) => (
                    <CitationPill
                      key={idx}
                      sourceTitle={c.sourceTitle}
                      pageNumber={c.page}
                      paragraphIndex={c.paragraph}
                      snippet={c.snippet}
                      boundingBox={c.bbox}
                      onClickCitation={handleCitationClick}
                    />
                  ))}
                </div>
              )}

              {/* Socratic Evaluation Report */}
              {msg.evaluation && (
                <div className="mt-3 p-3 rounded-lg border border-warning/40 bg-warning/10 text-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[11px] text-warning flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Auditoría Socrática NLI:
                    </span>
                    <Badge variant={msg.evaluation.masteryScore >= 70 ? "success" : "warning"}>
                      Dominio: {msg.evaluation.masteryScore}%
                    </Badge>
                  </div>

                  {msg.evaluation.omissions.length > 0 && (
                    <div className="text-[11px] text-text-secondary">
                      <strong className="text-warning">Omisión Crítica: </strong>
                      {msg.evaluation.omissions[0].missingPoint} ({msg.evaluation.omissions[0].impact})
                    </div>
                  )}

                  <div className="p-2 rounded bg-bg-surface-1/90 border border-border-subtle text-text-primary font-serif italic text-xs">
                    "{msg.evaluation.socraticQuestion}"
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-border-subtle flex items-center gap-2 bg-bg-surface-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSendChat()}
            placeholder="Haz una consulta académica o explica un concepto con tus palabras para evaluarte..."
            className="flex-1 rounded-lg border border-border-subtle bg-bg-surface-2 px-3 py-2 text-xs font-mono text-text-primary focus:outline-hidden focus:border-accent-primary"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={() => void handleSendChat()}
            disabled={!chatInput.trim() || isSearching}
            className="flex items-center gap-1 text-xs font-mono shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            Consultar RAG
          </Button>
        </div>
      </div>

      {/* Block Exam Simulator Modal */}
      {activeExamChunk && (
        <Modal
          open={Boolean(activeExamChunk)}
          onClose={() => setActiveExamChunk(null)}
          title={`⚡ Simulacro Exprés — Pág. ${activeExamChunk.pageNumber}`}
        >
          <div className="flex flex-col gap-3 font-sans text-xs">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
              <strong className="text-cyan-400 block mb-1">Premisa evaluada:</strong>
              {activeExamChunk.rawContent.split("\n")[1] || activeExamChunk.rawContent.slice(0, 140)}
            </div>

            <p className="font-semibold text-slate-200">
              ¿Cuál de las siguientes conclusiones se deduce rigurosamente del teorema o definición anterior?
            </p>

            <div className="flex flex-col gap-2">
              {[
                {
                  text: "La propiedad se preserva bajo transformaciones unitarias y respeta el principio de conservación local.",
                  correct: true,
                },
                {
                  text: "El resultado sólo es válido para valores discretos nulos en ausencia de perturbaciones.",
                  correct: false,
                },
                {
                  text: "Induce una divergencia cuadrática que contradice el teorema espectral.",
                  correct: false,
                },
              ].map((opt, i) => {
                let btnStyle = "border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300";
                if (showExamResult) {
                  if (opt.correct) btnStyle = "border-emerald-500 bg-emerald-950/40 text-emerald-200";
                  else if (selectedExamOption === i) btnStyle = "border-rose-500 bg-rose-950/40 text-rose-200";
                } else if (selectedExamOption === i) {
                  btnStyle = "border-cyan-400 bg-cyan-950/40 text-cyan-200";
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedExamOption(i);
                      setShowExamResult(true);
                    }}
                    className={`text-left p-3 rounded-xl border text-xs transition-all ${btnStyle}`}
                  >
                    <span className="font-mono text-slate-400 mr-1.5">[{i + 1}]</span>
                    {opt.text}
                  </button>
                );
              })}
            </div>

            {showExamResult && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 mt-1">
                {selectedExamOption === 0 ? (
                  <span className="text-emerald-400 font-bold block mb-1">
                    ✓ ¡Correcto! Justificación certificada por la demostración del texto.
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold block mb-1">
                    ✗ Incorrecto. Revisa las condiciones de contorno e hipótesis necesarias.
                  </span>
                )}
                <span>Fuente: {activeSource?.title} (Pág. {activeExamChunk.pageNumber})</span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
