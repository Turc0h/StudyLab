import React, { useState, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import type { StudyMethodId } from "../types";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type StudyMethod } from "../db/db";
import { STUDY_METHODS_30_SEEDS } from "../data/studyMethodsSeed";
import { MethodPreviewModal } from "../components/study-methods/MethodPreviewModal";
import { CognitiveTriageModal } from "../components/study-methods/CognitiveTriageModal";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { ArrowLeft, ArrowRight, Eye, Play, Sparkles, Search, Layers, Cpu, CheckCircle2, Flame } from "lucide-react";
import { PanelGuide } from "../components/guide/PanelGuide";
import { useNavigate } from "react-router-dom";

// Lazy loaded method runners
const FeynmanMethod = lazy(() =>
  import("../components/study-methods/FeynmanMethod").then((m) => ({ default: m.FeynmanMethod })),
);
const PomodoroMethod = lazy(() =>
  import("../components/study-methods/PomodoroMethod").then((m) => ({ default: m.PomodoroMethod })),
);
const ActiveRecallMethod = lazy(() =>
  import("../components/study-methods/ActiveRecallMethod").then((m) => ({
    default: m.ActiveRecallMethod,
  })),
);
const SpacedRepetitionMethod = lazy(() =>
  import("../components/study-methods/SpacedRepetitionMethod").then((m) => ({
    default: m.SpacedRepetitionMethod,
  })),
);
const InterleavingMethod = lazy(() =>
  import("../components/study-methods/InterleavingMethod").then((m) => ({
    default: m.InterleavingMethod,
  })),
);
const MindMapMethod = lazy(() =>
  import("../components/study-methods/MindMapMethod").then((m) => ({ default: m.MindMapMethod })),
);
const Sq3rMethod = lazy(() =>
  import("../components/study-methods/Sq3rMethod").then((m) => ({ default: m.Sq3rMethod })),
);
const ElaborativeInterrogationMethod = lazy(() =>
  import("../components/study-methods/ElaborativeInterrogationMethod").then((m) => ({
    default: m.ElaborativeInterrogationMethod,
  })),
);
const CornellMethod = lazy(() =>
  import("../components/study-methods/CornellMethod").then((m) => ({ default: m.CornellMethod })),
);
const MockExamMethod = lazy(() =>
  import("../components/study-methods/MockExamMethod").then((m) => ({ default: m.MockExamMethod })),
);
const ZettelkastenMethod = lazy(() =>
  import("../components/study-methods/ZettelkastenMethod").then((m) => ({ default: m.ZettelkastenMethod })),
);
const BlurtingMethod = lazy(() =>
  import("../components/study-methods/BlurtingMethod").then((m) => ({ default: m.BlurtingMethod })),
);
const LeitnerMethod = lazy(() =>
  import("../components/study-methods/LeitnerMethod").then((m) => ({ default: m.LeitnerMethod })),
);
const MemoryPalaceMethod = lazy(() =>
  import("../components/study-methods/MemoryPalaceMethod").then((m) => ({ default: m.MemoryPalaceMethod })),
);
const MnemonicsMethod = lazy(() =>
  import("../components/study-methods/MnemonicsMethod").then((m) => ({ default: m.MnemonicsMethod })),
);
const KwlMethod = lazy(() =>
  import("../components/study-methods/KwlMethod").then((m) => ({ default: m.KwlMethod })),
);
const SelfExplanationMethod = lazy(() =>
  import("../components/study-methods/SelfExplanationMethod").then((m) => ({ default: m.SelfExplanationMethod })),
);
const DualCodingMethod = lazy(() =>
  import("../components/study-methods/DualCodingMethod").then((m) => ({ default: m.DualCodingMethod })),
);
const DeepWorkMethod = lazy(() =>
  import("../components/study-methods/DeepWorkMethod").then((m) => ({ default: m.DeepWorkMethod })),
);
const ConceptMapsMethod = lazy(() =>
  import("../components/study-methods/ConceptMapsMethod").then((m) => ({ default: m.ConceptMapsMethod })),
);
const ChunkingMethod = lazy(() =>
  import("../components/study-methods/ChunkingMethod").then((m) => ({ default: m.ChunkingMethod })),
);
const ProblemBasedLearningMethod = lazy(() =>
  import("../components/study-methods/ProblemBasedLearningMethod").then((m) => ({ default: m.ProblemBasedLearningMethod })),
);
const ProtegeEffectMethod = lazy(() =>
  import("../components/study-methods/ProtegeEffectMethod").then((m) => ({ default: m.ProtegeEffectMethod })),
);
const StoryMethod = lazy(() =>
  import("../components/study-methods/StoryMethod").then((m) => ({ default: m.StoryMethod })),
);
const Pq4rMethod = lazy(() =>
  import("../components/study-methods/Pq4rMethod").then((m) => ({ default: m.Pq4rMethod })),
);
const DistributedPracticeMethod = lazy(() =>
  import("../components/study-methods/DistributedPracticeMethod").then((m) => ({ default: m.DistributedPracticeMethod })),
);
const DesirableDifficultiesMethod = lazy(() =>
  import("../components/study-methods/DesirableDifficultiesMethod").then((m) => ({ default: m.DesirableDifficultiesMethod })),
);
const SegmentationPrincipleMethod = lazy(() =>
  import("../components/study-methods/SegmentationPrincipleMethod").then((m) => ({ default: m.SegmentationPrincipleMethod })),
);
const MultisensoryLearningMethod = lazy(() =>
  import("../components/study-methods/MultisensoryLearningMethod").then((m) => ({ default: m.MultisensoryLearningMethod })),
);
const SleepConsolidationMethod = lazy(() =>
  import("../components/study-methods/SleepConsolidationMethod").then((m) => ({ default: m.SleepConsolidationMethod })),
);
const CramMethod = lazy(() =>
  import("../components/study-methods/CramMethod").then((m) => ({ default: m.CramMethod })),
);

const CATEGORIES = [
  { id: "all", label: "Todas las Categorías" },
  { id: "memorizacion", label: "Memorización & Evocación" },
  { id: "comprension", label: "Comprensión & Síntesis" },
  { id: "gestion-tiempo", label: "Gestión de Tiempo" },
  { id: "escritura", label: "Toma de Notas & Escritura" },
  { id: "evaluacion", label: "Evaluación & Desafío" },
  { id: "metacognicion", label: "Metacognición & Estrategia" },
];

const CATEGORY_NAMES: Record<string, string> = {
  memorizacion: "Memorización",
  comprension: "Comprensión",
  "gestion-tiempo": "Gestión de Tiempo",
  escritura: "Escritura",
  evaluacion: "Evaluación",
  metacognicion: "Metacognición",
};

export const MethodsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const runningParam = searchParams.get("run") as StudyMethodId | null;

  const [activeRunningMethod, setActiveRunningMethod] = useState<StudyMethodId | null>(runningParam);
  const [previewMethod, setPreviewMethod] = useState<StudyMethod | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "ready" | "preview">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isTriageOpen, setIsTriageOpen] = useState<boolean>(searchParams.get("triage") === "true");

  const methodsFromDb = useLiveQuery(() => db.studyMethods.toArray(), []);
  const allMethods: StudyMethod[] = (methodsFromDb && methodsFromDb.length > 0)
    ? methodsFromDb
    : STUDY_METHODS_30_SEEDS;

  const handleStartMethod = (id: string) => {
    setActiveRunningMethod(id as StudyMethodId);
    setSearchParams({ run: id });
  };

  const handleBackToCatalog = () => {
    setActiveRunningMethod(null);
    setSearchParams({});
  };

  const handleContextualNav = (target: "fsrs" | "pomodoro-timer" | "session-engine" | "knowledge-graph", methodId: string) => {
    switch (target) {
      case "fsrs":
        navigate("/session?deck=default");
        break;
      case "knowledge-graph":
        navigate("/graph");
        break;
      case "pomodoro-timer":
        handleStartMethod("pomodoro");
        break;
      case "session-engine":
        handleStartMethod(methodId);
        break;
    }
  };

  const filteredMethods = allMethods.filter((m) => {
    if (selectedCategory !== "all" && m.category !== selectedCategory) return false;
    if (selectedStatus === "ready" && !m.implemented) return false;
    if (selectedStatus === "preview" && m.implemented) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q) || (m.nameEn && m.nameEn.toLowerCase().includes(q));
      const matchBest = m.bestFor?.some((b) => b.toLowerCase().includes(q));
      const matchDesc = m.description.toLowerCase().includes(q);
      if (!matchName && !matchBest && !matchDesc) return false;
    }
    return true;
  });

  const renderActiveMethodRunner = () => {
    if (!activeRunningMethod) return null;

    const catalogEntry = allMethods.find((m) => m.id === activeRunningMethod);

    const getRunner = () => {
      switch (activeRunningMethod) {
        case "feynman":
          return <FeynmanMethod onSessionFinished={handleBackToCatalog} />;
        case "pomodoro":
          return <PomodoroMethod onSessionFinished={handleBackToCatalog} />;
        case "active-recall":
          return <ActiveRecallMethod onSessionFinished={handleBackToCatalog} />;
        case "spaced-repetition":
          return <SpacedRepetitionMethod onSessionFinished={handleBackToCatalog} />;
        case "interleaving":
          return <InterleavingMethod onSessionFinished={handleBackToCatalog} />;
        case "mind-maps":
          return <MindMapMethod onSessionFinished={handleBackToCatalog} />;
        case "sq3r":
          return <Sq3rMethod onSessionFinished={handleBackToCatalog} />;
        case "elaborative-interrogation":
          return <ElaborativeInterrogationMethod onSessionFinished={handleBackToCatalog} />;
        case "cornell":
          return <CornellMethod onSessionFinished={handleBackToCatalog} />;
        case "practice-testing":
        case "mock-tests":
          return <MockExamMethod onSessionFinished={handleBackToCatalog} />;
        case "zettelkasten":
          return <ZettelkastenMethod onSessionFinished={handleBackToCatalog} />;
        case "blurting":
          return <BlurtingMethod onSessionFinished={handleBackToCatalog} />;
        case "leitner":
          return <LeitnerMethod onSessionFinished={handleBackToCatalog} />;
        case "method-of-loci":
          return <MemoryPalaceMethod onSessionFinished={handleBackToCatalog} />;
        case "mnemonics":
          return <MnemonicsMethod onSessionFinished={handleBackToCatalog} />;
        case "kwl-method":
          return <KwlMethod onSessionFinished={handleBackToCatalog} />;
        case "self-explanation":
          return <SelfExplanationMethod onSessionFinished={handleBackToCatalog} />;
        case "dual-coding":
          return <DualCodingMethod onSessionFinished={handleBackToCatalog} />;
        case "deep-work":
          return <DeepWorkMethod onSessionFinished={handleBackToCatalog} />;
        case "concept-maps":
          return <ConceptMapsMethod onSessionFinished={handleBackToCatalog} />;
        case "chunking":
          return <ChunkingMethod onSessionFinished={handleBackToCatalog} />;
        case "problem-based-learning":
          return <ProblemBasedLearningMethod onSessionFinished={handleBackToCatalog} />;
        case "protege-effect":
          return <ProtegeEffectMethod onSessionFinished={handleBackToCatalog} />;
        case "story-method":
          return <StoryMethod onSessionFinished={handleBackToCatalog} />;
        case "pq4r":
          return <Pq4rMethod onSessionFinished={handleBackToCatalog} />;
        case "distributed-practice":
          return <DistributedPracticeMethod onSessionFinished={handleBackToCatalog} />;
        case "desirable-difficulties":
          return <DesirableDifficultiesMethod onSessionFinished={handleBackToCatalog} />;
        case "segmentation-principle":
          return <SegmentationPrincipleMethod onSessionFinished={handleBackToCatalog} />;
        case "multisensory-learning":
          return <MultisensoryLearningMethod onSessionFinished={handleBackToCatalog} />;
        case "sleep-consolidation":
          return <SleepConsolidationMethod onSessionFinished={handleBackToCatalog} />;
        case "cram":
          return <CramMethod onSessionFinished={handleBackToCatalog} />;
        default:
          return (
            <div className="p-8 text-center space-y-4">
              <p className="text-text-secondary text-sm">Este método se encuentra en modo ficha teórica guiada.</p>
              <Button variant="outline" onClick={handleBackToCatalog}>Volver al Catálogo</Button>
            </div>
          );
      }
    };

    return (
      <div className="space-y-6">
        {/* Top bar returning to catalog */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToCatalog}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver al Catálogo de Métodos</span>
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-semibold text-text-primary">
              {catalogEntry?.name}
            </span>
            <Badge variant="success">Sesión en Curso</Badge>
            <PanelGuide
              id="active-runner-guide"
              title={`Protocolo Guiado: ${catalogEntry?.name || "Método Activo"}`}
              whatItDoes="Mantiene el foco y la estructura del método con temporizadores por bloque y pasos guiados."
              howToUse={[
                "Seguí las instrucciones específicas que aparecen en el recuadro central.",
                "Usá los botones de pausa/avance para controlar el temporizador.",
                "Al finalizar el bloque, tus minutos estudiados se sumarán al Dashboard.",
              ]}
              tip="Podés salir en cualquier momento tocando 'Volver al Catálogo de Métodos' arriba a la izquierda."
            />
          </div>
        </div>

        <Suspense fallback={<p className="p-8 text-xs text-text-muted">Cargando protocolo...</p>}>
          {getRunner()}
        </Suspense>
      </div>
    );
  };

  // If in running mode, show the active runner
  if (activeRunningMethod) {
    return <div className="pb-12">{renderActiveMethodRunner()}</div>;
  }

  // Otherwise, render the Catalog of 30 Methods with Filters and Search
  return (
    <div className="space-y-6 pb-12">
      {/* Editorial Header */}
      <div className="flex items-start justify-between border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
              Catálogo de Métodos de Estudio
            </h1>
            <Badge variant="neutral">{allMethods.length} Métodos Científicos</Badge>
          </div>
          <p className="mt-1 font-sans text-sm text-text-secondary">
            Explora 30 técnicas de estudio basadas en evidencia psicopedagógica, organizadas por objetivo cognitivo y conectadas al motor de sesiones de StudyLab.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTriageOpen(true)}
              className="text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Asistente de Triaje Cognitivo</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStartMethod("cram")}
              className="text-xs flex items-center gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Modo Repaso de Emergencia (Blitz)</span>
            </Button>
          </div>
        </div>
        <PanelGuide
          id="methods-catalog-guide"
          title="Catálogo de Métodos Cognitivos"
          whatItDoes="Catálogo integral de 30 métodos de estudio con respaldo neurocognitivo formal, fichas descriptivas y vinculación con FSRS y el grafo."
          howToUse={[
            "Usá el buscador o filtrá por categoría (Memorización, Comprensión, Tiempo, etc.).",
            "Filtrá entre 'Listos para Usar' (con runner activo) y 'Fichas Teóricas' informativas.",
            "Tocá 'Ver Ficha' para consultar los pasos accionables y respaldo científico.",
            "Usá los botones de acción rápida para saltar a FSRS, el Grafo o iniciar sesión.",
          ]}
          tip="Para asimilar demostraciones o fórmulas complejas, combiná Feynman o Autoexplicación con Repetición Espaciada."
        />
      </div>

      {/* Search Bar & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar método por nombre o materias afines..."
            className="w-full rounded border border-border-subtle bg-bg-secondary/60 pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
          {[
            { id: "all", label: `Todos (${allMethods.length})` },
            { id: "ready", label: `Listos (${allMethods.filter(m => m.implemented).length})` },
            { id: "preview", label: `Próximamente (${allMethods.filter(m => !m.implemented).length})` },
          ].map((statusTab) => (
            <button
              key={statusTab.id}
              type="button"
              onClick={() => setSelectedStatus(statusTab.id as any)}
              className={`rounded px-2.5 py-1 text-xs font-sans transition-colors ${
                selectedStatus === statusTab.id
                  ? "bg-bg-elevated text-accent-primary font-semibold border border-accent-primary/40 shadow-xs"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-secondary"
              }`}
            >
              {statusTab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((tab) => {
          const count = tab.id === "all"
            ? allMethods.length
            : allMethods.filter((m) => m.category === tab.id).length;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`rounded px-3 py-1.5 text-xs font-sans font-medium transition-colors ${
                selectedCategory === tab.id
                  ? "bg-accent-primary text-bg-elevated border border-accent-primary shadow-xs"
                  : "bg-bg-secondary text-text-secondary border border-border-subtle hover:bg-bg-elevated hover:text-text-primary"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid of Methods */}
      {filteredMethods.length === 0 ? (
        <div className="rounded border border-dashed border-border-subtle p-12 text-center">
          <p className="text-sm text-text-muted">No se encontraron métodos de estudio con los filtros seleccionados.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory("all");
              setSelectedStatus("all");
              setSearchQuery("");
            }}
            className="mt-3 text-xs"
          >
            Restablecer Filtros
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {filteredMethods.map((m) => (
            <Card
              key={m.id}
              className="flex flex-col justify-between hover:border-accent-primary/40 transition-colors cursor-pointer group"
              onClick={() => setPreviewMethod(m)}
            >
              <div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="accent">{CATEGORY_NAMES[m.category] || m.category}</Badge>
                    <div className="flex items-center gap-1.5">
                      {m.implemented ? (
                        <Badge variant="success">Listo para Usar</Badge>
                      ) : (
                        <Badge variant="neutral">Próximamente</Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="font-serif text-lg font-semibold text-text-primary mt-2 flex items-baseline justify-between gap-2">
                    <span>{m.name}</span>
                    {m.nameEn && (
                      <span className="font-sans text-xs font-normal text-text-muted truncate max-w-[200px]">
                        {m.nameEn}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <div className="px-6 py-1 space-y-2.5">
                  <p className="font-sans text-xs text-text-secondary leading-relaxed line-clamp-3">
                    {m.description}
                  </p>

                  {/* Scientific Basis Snippet */}
                  {m.scientificBasis && (
                    <div className="rounded bg-bg-secondary/70 border border-border-subtle/70 p-2 text-[11px] text-text-muted flex items-start gap-1.5">
                      <Sparkles className="h-3 w-3 text-accent-primary shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{m.scientificBasis}</span>
                    </div>
                  )}

                  {/* Best For Tags */}
                  {m.bestFor && m.bestFor.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {m.bestFor.slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded bg-bg-secondary px-2 py-0.5 text-[10px] text-text-muted border border-border-subtle/50"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5 text-accent-secondary shrink-0" />
                          <span className="truncate max-w-[130px]">{item}</span>
                        </span>
                      ))}
                      {m.bestFor.length > 3 && (
                        <span className="text-[10px] text-text-muted self-center">
                          +{m.bestFor.length - 3} más
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border-subtle px-6 py-3 flex flex-wrap items-center justify-between gap-2 bg-bg-secondary/20 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-text-secondary group-hover:text-text-primary flex items-center gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewMethod(m);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Ver Ficha Completa</span>
                </Button>

                <div className="flex items-center gap-2">
                  {/* Contextual Quick Links for non-implemented or special methods */}
                  {m.integratesWith?.includes("fsrs") && !m.implemented && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextualNav("fsrs", m.id);
                      }}
                    >
                      <Cpu className="h-3 w-3 text-accent-primary" />
                      <span>Usar con FSRS</span>
                    </Button>
                  )}

                  {m.integratesWith?.includes("knowledge-graph") && !m.implemented && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextualNav("knowledge-graph", m.id);
                      }}
                    >
                      <Layers className="h-3 w-3 text-accent-primary" />
                      <span>Ver en Grafo</span>
                    </Button>
                  )}

                  {m.implemented ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs flex items-center gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartMethod(m.id);
                      }}
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Iniciar Sesión</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <MethodPreviewModal
        method={previewMethod}
        onClose={() => setPreviewMethod(null)}
        onStartMethod={handleStartMethod}
      />

      {/* Cognitive Triage Modal */}
      <CognitiveTriageModal
        isOpen={isTriageOpen}
        onClose={() => setIsTriageOpen(false)}
        onSelectMethod={handleStartMethod}
      />
    </div>
  );
};
