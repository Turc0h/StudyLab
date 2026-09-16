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
import { searchAcademicKnowledgeWithEvidence } from "../vectorIndex";
import { evaluateStudentExplanation, type SocraticEvaluationResult } from "../socraticEvaluator";
import {
  generateSocraticProfessorResponse,
  resolveActiveLanguageEngine,
  type ProfessorMode,
  type HelpLevel,
} from "../socraticProfessorEngine";
import { CitationPill } from "./CitationPill";
import { PdfViewer } from "../../document-viewer/PdfViewer";
import { ImageOcclusionModal } from "../../image-occlusion/ImageOcclusionModal";
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
  Maximize2,
  Minimize2,
  ArrowLeftRight,
  Eye,
  EyeOff,
  AlertCircle,
  XCircle,
  RotateCcw,
  Cpu,
  GraduationCap,
  ShieldCheck,
  HelpCircle,
  Layers,
} from "lucide-react";

interface AcademicCanvasProps {
  activeSource: AcademicSourceRecord | null;
  chunks: AcademicChunkRecord[];
  onGenerateCardsForChunk?: (chunk: AcademicChunkRecord) => void;
  navigationTarget?: { page: number; bbox?: AcademicBoundingBox; timestamp: number } | null;
  isRagSwapped?: boolean;
  onToggleSwapRag?: () => void;
  isCognitivePanelVisible?: boolean;
  onToggleCognitivePanel?: () => void;
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
  isRagSwapped = false,
  onToggleSwapRag,
  isCognitivePanelVisible = true,
  onToggleCognitivePanel,
}: AcademicCanvasProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "source" | "split">("split");
  const [chatHeight, setChatHeight] = useState<"compact" | "expanded" | "maximized">("expanded");
  const [notesContent, setNotesContent] = useState<string>(
    activeSource
      ? `# Cuaderno de Cátedra: ${activeSource.title}\n\n*Profesor/a:* ${activeSource.professorId || "Cátedra Universitaria"}\n*Carrera:* ${activeSource.career || "Universidad"}\n\n## Síntesis Conceptual y Demostraciones\nEscriba aquí sus deducciones formales, teoremas y fórmulas en LaTeX ($...$) para contrastarlas contra la bibliografía oficial.`
      : `# Cuaderno de Estudio Universitario\n\nSeleccione o suba un documento en el Gestor de Fuentes para activar la sincronización con el visor y el Catedrático Socrático.`
  );
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      text: "Cátedra Universitaria conectada.\n\nEstimado/a estudiante: este claustro opera bajo el principio inquebrantable de Citation-First RAG. Toda afirmación, objeción y pregunta socrática proviene estrictamente de las fuentes que usted provea. No resolveré ejercicios mecánicos por usted; mi labor es auditar su rigor deductivo e interrogar las hipótesis que sustentan sus razonamientos. Formule su hipótesis o exponga su planteo inicial.",
      citations: [],
    },
  ]);
  const [isSearching, setIsSearching] = useState(false);
  const [professorMode, setProfessorMode] = useState<ProfessorMode>("consulta");
  const [helpLevel, setHelpLevel] = useState<HelpLevel>(0);
  const [activeEngineName, setActiveEngineName] = useState<string>("Catedrático · Modo reglas de cátedra");
  const [isOcclusionModalOpen, setIsOcclusionModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void resolveActiveLanguageEngine().then((res) => {
      if (isMounted) {
        setActiveEngineName(res.displayName);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const storageKey = `studylab_academic_chat_${activeSource?.id || "global"}`;

  // Restore chat messages per activeSource from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setChatMessages([
      {
        id: "msg-welcome",
        sender: "assistant",
        text: "Cátedra Universitaria conectada.\n\nEstimado/a estudiante: este claustro opera bajo el principio inquebrantable de Citation-First RAG. Toda afirmación, objeción y pregunta socrática proviene estrictamente de las fuentes que usted provea. No resolveré ejercicios mecánicos por usted; mi labor es auditar su rigor deductivo e interrogar las hipótesis que sustentan sus razonamientos. Formule su hipótesis o exponga su planteo inicial.",
        citations: [],
      },
    ]);
  }, [storageKey]);

  // Persist chat messages whenever they change
  useEffect(() => {
    if (chatMessages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(chatMessages));
      } catch {
        // quota limit
      }
    }
  }, [chatMessages, storageKey]);

  const handleClearChat = () => {
    const welcomeMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "assistant",
      text: "Historial de diálogo reiniciado.\n\nIndique qué concepto, axioma o demostración de las fuentes adjuntas desea examinar rigurosamente.",
      citations: [],
    };
    setChatMessages([welcomeMsg]);
    try {
      localStorage.setItem(storageKey, JSON.stringify([welcomeMsg]));
    } catch {
      // ignore
    }
    setFeedbackToast("Diálogo socrático reiniciado");
    setTimeout(() => setFeedbackToast(null), 2500);
  };

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

  const handleCreateClozeFromSelection = async () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;
    const cardId = `card_cloze_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Buscar contexto circundante en los chunks de la página activa
    let clozeFront = `{{c1::${text}}}`;
    const chunkWithText = activePageChunks.find((c) => c.rawContent.includes(text));
    if (chunkWithText) {
      const sentences = chunkWithText.rawContent.split(/(?<=[.?!])\s+/);
      const matchSentence = sentences.find((s) => s.includes(text));
      if (matchSentence && matchSentence.length < 250) {
        clozeFront = matchSentence.replace(text, `{{c1::${text}}}`);
      } else {
        clozeFront = `Complete la siguiente relación conceptual:\n\n"${chunkWithText.rawContent.slice(0, 160).replace(text, `{{c1::${text}}}`)}..."`;
      }
    }

    const newCard: CardFsrsRecord = {
      id: cardId,
      deckId: `deck_${activeSource?.id || "general"}`,
      conceptId: activeSource?.subjectId || "general_concept",
      front: clozeFront,
      back: `Fragmento omitido: "${text}"\n\nFuente de Cátedra: ${activeSource?.title || "Documento Académico"} (Pág. ${activeViewerPage})`,
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
    showToast("✨ Tarjeta Cloze {{c1::...}} creada en tu mazo FSRS.");
  };

  const handleCreateImageOcclusionFromSelection = () => {
    setIsOcclusionModalOpen(true);
    setSelectionMenu(null);
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

  const handleSendChat = async (overrideHelpLevel?: HelpLevel) => {
    if (!chatInput.trim() || isSearching) return;
    const query = chatInput.trim();
    setChatInput("");
    const effectiveHelp = overrideHelpLevel !== undefined ? overrideHelpLevel : helpLevel;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: query,
      citations: [],
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsSearching(true);

    const searchOutput = await searchAcademicKnowledgeWithEvidence({
      query,
      subjectFilter: activeSource?.subjectId,
      topK: 3,
    });

    let evaluationResult: SocraticEvaluationResult | undefined;
    if (searchOutput.results.length > 0) {
      const topMatch = searchOutput.results[0];
      // Run deep socratic evaluation if the query is an explanation or synthesis attempt
      if (
        query.toLowerCase().includes("porque") ||
        query.toLowerCase().includes("es cuando") ||
        query.toLowerCase().includes("significa") ||
        query.toLowerCase().includes("sucede que") ||
        query.split(/\s+/).length >= 8
      ) {
        evaluationResult = await evaluateStudentExplanation({
          chunk: topMatch.chunk,
          studentExplanation: query,
        });
      }
    }

    const professorResponse = await generateSocraticProfessorResponse({
      query,
      searchResults: searchOutput.results,
      evaluationResult,
      mode: professorMode,
      helpLevel: effectiveHelp,
      hasSufficientEvidence: searchOutput.hasSufficientEvidence,
    });

    if (professorResponse.engineDisplayName) {
      setActiveEngineName(professorResponse.engineDisplayName);
    }

    const assistantMsg: ChatMessage = {
      id: `asst-${Date.now()}`,
      sender: "assistant",
      text: professorResponse.messageText,
      citations: professorResponse.citations,
      evaluation: professorResponse.evaluation,
    };

    setChatMessages((prev) => [...prev, assistantMsg]);
    setIsSearching(false);
    if (effectiveHelp > 0) {
      setHelpLevel(0);
    }
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
            onClick={handleCreateClozeFromSelection}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-500/20 text-amber-300 text-[11px] font-mono border border-amber-500/30 transition-colors"
            title="Ocultar esta selección y crear tarjeta cloze {{c1::...}} directamente"
          >
            <EyeOff className="w-3 h-3 text-amber-400" />
            Ocultar esto (Cloze)
          </button>
          <button
            type="button"
            onClick={handleCreateImageOcclusionFromSelection}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-mono border border-indigo-500/30 transition-colors"
            title="Generar tarjeta de oclusión con coordenadas del visor PDF"
          >
            <Layers className="w-3 h-3 text-indigo-400" />
            Oclusión
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
      <div
        className={`border-t border-border-subtle bg-bg-surface-2/90 flex flex-col transition-all duration-300 ${
          chatHeight === "compact"
            ? "h-44"
            : chatHeight === "expanded"
            ? "h-96"
            : "h-[36rem]"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle/50 bg-bg-surface-1 text-[11px] font-mono text-text-tertiary">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-3.5 w-3.5 text-accent-primary animate-pulse" />
            <span className="font-semibold text-text-primary">
              Cátedra Socrática · Citation-First RAG
            </span>
            <div
              className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border border-border-subtle bg-bg-surface-2 text-text-secondary"
              title="Motor del Catedrático Socrático activo (100% honesto)"
            >
              <Cpu className="h-3 w-3 text-cyan-400 shrink-0" />
              <span>{activeEngineName}</span>
            </div>
            <span className="hidden xl:inline text-[10px] text-text-tertiary">
              (El Catedrático audita y explica con citas obligatorias)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Cognitive Hub Visibility Toggle */}
            {onToggleCognitivePanel && (
              <button
                type="button"
                onClick={onToggleCognitivePanel}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                  isCognitivePanelVisible
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-border-subtle bg-bg-surface-2 text-text-tertiary hover:text-text-primary"
                }`}
                title="Mostrar u ocultar el Cognitive Hub (FSRS, Simulacro, Grafo)"
              >
                {isCognitivePanelVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Cognitive Hub: {isCognitivePanelVisible ? "ON" : "OFF"}</span>
              </button>
            )}

            {/* Swap Position with Cognitive Hub */}
            {onToggleSwapRag && (
              <button
                type="button"
                onClick={onToggleSwapRag}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border border-accent-primary/30 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-all cursor-pointer"
                title="Intercambiar ubicación entre el Chat RAG y el Cognitive Hub"
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>{isRagSwapped ? "RAG en Centro" : "RAG en Lateral"}</span>
              </button>
            )}

            {/* Clear Chat Dialogue */}
            <button
              type="button"
              onClick={handleClearChat}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              title="Reiniciar diálogo socrático"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Limpiar</span>
            </button>

            {/* Sizing Toggles */}
            <div className="flex items-center gap-1 border-l border-border-subtle/60 pl-2">
              <button
                type="button"
                onClick={() => setChatHeight("compact")}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                  chatHeight === "compact"
                    ? "bg-accent-primary/20 text-accent-primary font-bold"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
                title="Altura compacta (176px)"
              >
                S
              </button>
              <button
                type="button"
                onClick={() => setChatHeight("expanded")}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                  chatHeight === "expanded"
                    ? "bg-accent-primary/20 text-accent-primary font-bold"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
                title="Altura ampliada (384px)"
              >
                M
              </button>
              <button
                type="button"
                onClick={() => setChatHeight("maximized")}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                  chatHeight === "maximized"
                    ? "bg-accent-primary/20 text-accent-primary font-bold"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
                title="Maximizar espacio de lectura socrática (576px)"
              >
                {chatHeight === "maximized" ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
                <span>L</span>
              </button>
            </div>
          </div>
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
              {/* Render Message Text with Inline Citations */}
              <div className="whitespace-pre-line leading-relaxed">
                {(() => {
                  const parts = msg.text.split(/(\[\[cite:[^\]]+\]\])/g);
                  return parts.map((part, pIdx) => {
                    const citeMatch = part.match(/\[\[cite:([^:]+):(\d+):(\d+)\]\]/);
                    if (citeMatch) {
                      const [, sourceTitle, pageStr, paraStr] = citeMatch;
                      const pageNum = parseInt(pageStr, 10);
                      const paraNum = parseInt(paraStr, 10);
                      const matchingCitation = msg.citations.find(
                        (c) => c.page === pageNum && c.paragraph === paraNum
                      );

                      return (
                        <CitationPill
                          key={pIdx}
                          sourceTitle={sourceTitle}
                          pageNumber={pageNum}
                          paragraphIndex={paraNum}
                          snippet={matchingCitation?.snippet}
                          boundingBox={matchingCitation?.bbox}
                          onClickCitation={handleCitationClick}
                        />
                      );
                    }
                    return <span key={pIdx}>{part}</span>;
                  });
                })()}
              </div>

              {/* Citations Summary Footer */}
              {msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-border-subtle/50 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-text-tertiary">Corpus auditado:</span>
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

                  {/* Contradiction Diff Canvas (Visual Comparison Widget) */}
                  {msg.evaluation.contradictions && msg.evaluation.contradictions.length > 0 && (
                    <div className="mt-1 flex flex-col gap-2">
                      <div className="text-[11px] font-mono font-bold text-red-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>Discrepancia Conceptual Identificada (Diff Dialéctico):</span>
                      </div>
                      {msg.evaluation.contradictions.map((contra, cIdx) => (
                        <div key={cIdx} className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          {/* Student mistaken claim */}
                          <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-200">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold mb-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Aseveración del Alumno
                            </div>
                            <p className="italic">"{contra.claim}"</p>
                          </div>
                          {/* Textbook correction */}
                          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Fundamento de Cátedra
                            </div>
                            <p>{contra.correction}</p>
                            {msg.evaluation?.citationProof && (
                              <button
                                type="button"
                                onClick={() => handleCitationClick(msg.evaluation!.citationProof.page, { x: 0, y: 0, width: 100, height: 100 })}
                                className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-300 font-mono text-[9px] border border-emerald-500/30 transition-colors cursor-pointer"
                              >
                                <span>Ver Pág. {msg.evaluation.citationProof.page}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
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

        {/* Socratic Mode & Scaffolding Toolbar */}
        <div className="px-3 py-1.5 border-t border-border-subtle/60 bg-bg-surface-2/60 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1">
            <span className="text-text-tertiary mr-1 hidden sm:inline">Modo:</span>
            <button
              type="button"
              onClick={() => setProfessorMode("consulta")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
                professorMode === "consulta"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                  : "text-text-tertiary hover:text-text-primary hover:bg-bg-surface-1"
              }`}
              title="Modo Consulta: El catedrático explica y deduce conceptos citando las fuentes"
            >
              <BookOpen className="w-3 h-3 text-cyan-400" />
              <span>Consulta</span>
            </button>
            <button
              type="button"
              onClick={() => setProfessorMode("auditoria")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
                professorMode === "auditoria"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                  : "text-text-tertiary hover:text-text-primary hover:bg-bg-surface-1"
              }`}
              title="Modo Auditoría: Audita tu razonamiento, detecta inconsistencias y no resuelve mecánicamente"
            >
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>Auditoría</span>
            </button>
            <button
              type="button"
              onClick={() => setProfessorMode("examen")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
                professorMode === "examen"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold"
                  : "text-text-tertiary hover:text-text-primary hover:bg-bg-surface-1"
              }`}
              title="Modo Examen: Bloqueado hasta presentar tu intento formal de resolución"
            >
              <GraduationCap className="w-3 h-3 text-rose-400" />
              <span>Examen</span>
            </button>
          </div>

          {/* Progressive Help Scaffolding (Levels 0-4) */}
          {professorMode !== "examen" ? (
            <div className="flex items-center gap-1">
              <span className="text-text-tertiary mr-1 flex items-center gap-0.5">
                <HelpCircle className="w-3 h-3 text-accent-primary" />
                <span className="hidden sm:inline">Pista:</span>
              </span>
              {(
                [
                  { lvl: 0 as HelpLevel, label: "L0" },
                  { lvl: 1 as HelpLevel, label: "L1 Conceptual" },
                  { lvl: 2 as HelpLevel, label: "L2 Ecuación" },
                  { lvl: 3 as HelpLevel, label: "L3 Paso" },
                  { lvl: 4 as HelpLevel, label: "L4 Desglose" },
                ] as const
              ).map((h) => (
                <button
                  key={h.lvl}
                  type="button"
                  onClick={() => setHelpLevel(h.lvl)}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    helpLevel === h.lvl
                      ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-semibold"
                      : "text-text-tertiary hover:text-text-primary hover:bg-bg-surface-1"
                  }`}
                  title={`Nivel ${h.lvl}: ${h.label}`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-rose-400/80 italic">
              Pistas deshabilitadas en Modo Examen
            </span>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 flex items-center gap-2 bg-bg-surface-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSendChat()}
            placeholder={
              professorMode === "examen"
                ? "Modo Examen activo: Escriba 'Planteo: [sus hipótesis y desarrollo]'..."
                : professorMode === "auditoria"
                ? "Modo Auditoría: Exponga su razonamiento o hipótesis para auditar..."
                : helpLevel > 0
                ? `Solicitando Pista Nivel ${helpLevel}: escriba su consulta...`
                : "Haz una consulta académica o explica un concepto con tus palabras para evaluarte..."
            }
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

      {/* Floating Contextual Selection Popover Menu */}
      {selectionMenu && (
        <div
          style={{ left: `${selectionMenu.x}px`, top: `${selectionMenu.y}px` }}
          className="fixed z-50 flex items-center gap-1.5 p-1.5 rounded-xl border border-accent-primary/40 bg-bg-surface-2/95 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            onClick={() => {
              setChatInput(`Estimado profesor: ¿podría auditar y explicar rigurosamente este pasaje: "${selectionMenu.text}"?`);
              setSelectionMenu(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-primary text-text-inverted text-[11px] font-mono hover:bg-accent-hover transition-all cursor-pointer shadow-xs"
          >
            <BrainCircuit className="h-3 w-3" />
            <span>Auditar con Catedrático</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChatInput(`Plantéeme una pregunta socrática o caso límite sobre esta proposición: "${selectionMenu.text}"`);
              setSelectionMenu(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono hover:bg-amber-500/25 transition-all cursor-pointer"
          >
            <Zap className="h-3 w-3 text-amber-400" />
            <span>Caso Límite</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCreateFlashcardFromSelection()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-surface-1 text-text-secondary hover:text-text-primary text-[11px] font-mono border border-border-subtle transition-all cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-accent-primary" />
            <span>+ FSRS</span>
          </button>

          <button
            type="button"
            onClick={() => void handleConnectToGraphFromSelection()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-surface-1 text-text-secondary hover:text-text-primary text-[11px] font-mono border border-border-subtle transition-all cursor-pointer"
          >
            <Share2 className="h-3 w-3 text-accent-secondary" />
            <span>+ Grafo</span>
          </button>
        </div>
      )}

      {/* Editor de Oclusión de Imágenes SVG (Sección 9-BIS) */}
      <ImageOcclusionModal
        open={isOcclusionModalOpen}
        onClose={() => setIsOcclusionModalOpen(false)}
        pageNumber={activeViewerPage}
        sourceTitle={activeSource?.title || "Documento Académico"}
        fileId={activeSource?.fileId}
        conceptId={activeSource?.subjectId}
        onCardsCreated={(count) => {
          showToast(`🖼️ ${count} tarjetas de oclusión FSRS generadas con éxito.`);
        }}
      />
    </div>
  );
}
