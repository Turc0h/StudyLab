import React, { useState, useMemo, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import type { StudyMethodId } from "../types";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type StudyMethod } from "../db/db";
import { STUDY_METHODS_30_SEEDS } from "../data/studyMethodsSeed";
import { MethodPreviewModal } from "../components/study-methods/MethodPreviewModal";
import { CognitiveTriageModal } from "../components/study-methods/CognitiveTriageModal";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  ArrowLeft,
  Eye,
  Play,
  Search,
  Cpu,
  Flame,
  GraduationCap,
  Scale,
  Binary,
  Compass,
  Mic,
  FileText,
  Columns3,
  Briefcase,
  CalendarDays,
  Headphones,
  Bot,
} from "lucide-react";
import { PanelGuide } from "../components/guide/PanelGuide";
import { useNavigate } from "react-router-dom";

// Lazy loaded method runners
const FinalBoardMethod = lazy(() =>
  import("../components/study-methods/FinalBoardMethod").then((m) => ({ default: m.FinalBoardMethod })),
);
const MathBlackboardMethod = lazy(() =>
  import("../components/study-methods/MathBlackboardMethod").then((m) => ({ default: m.MathBlackboardMethod })),
);
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
const OralDefenseMethod = lazy(() =>
  import("../components/study-methods/OralDefenseMethod").then((m) => ({ default: m.OralDefenseMethod })),
);
const EssayExamMethod = lazy(() =>
  import("../components/study-methods/EssayExamMethod").then((m) => ({ default: m.EssayExamMethod })),
);
const ComparativeMatrixMethod = lazy(() =>
  import("../components/study-methods/ComparativeMatrixMethod").then((m) => ({ default: m.ComparativeMatrixMethod })),
);
const CaseStudyMethod = lazy(() =>
  import("../components/study-methods/CaseStudyMethod").then((m) => ({ default: m.CaseStudyMethod })),
);
const SemesterGanttMethod = lazy(() =>
  import("../components/study-methods/SemesterGanttMethod").then((m) => ({ default: m.SemesterGanttMethod })),
);
const PastExamsMethod = lazy(() =>
  import("../components/study-methods/PastExamsMethod").then((m) => ({ default: m.PastExamsMethod })),
);
const LocalAiMethod = lazy(() =>
  import("../components/study-methods/LocalAiMethod").then((m) => ({ default: m.LocalAiMethod })),
);
const AudioFlashcardsMethod = lazy(() =>
  import("../components/study-methods/AudioFlashcardsMethod").then((m) => ({ default: m.AudioFlashcardsMethod })),
);
const SplitScreenStudyRunner = lazy(() =>
  import("../components/study-methods/SplitScreenStudyRunner").then((m) => ({ default: m.SplitScreenStudyRunner })),
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

  const fsrsCards = useLiveQuery(() => db.cardsFsrs.toArray(), []);
  const dueFsrsCount = useMemo(() => {
    if (!fsrsCards) return 0;
    const now = Date.now();
    return fsrsCards.filter((c) => c.dueDate <= now).length;
  }, [fsrsCards]);

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
        case "oral-defense":
          return <OralDefenseMethod onSessionFinished={handleBackToCatalog} />;
        case "essay-exam":
          return <EssayExamMethod onFinish={handleBackToCatalog} />;
        case "comparative-matrix":
          return <ComparativeMatrixMethod onSessionFinished={handleBackToCatalog} />;
        case "case-study":
          return <CaseStudyMethod onSessionFinished={handleBackToCatalog} />;
        case "semester-gantt":
          return <SemesterGanttMethod onSessionFinished={handleBackToCatalog} />;
        case "past-exams":
          return <PastExamsMethod onSessionFinished={handleBackToCatalog} />;
        case "local-ai":
          return <LocalAiMethod onSessionFinished={handleBackToCatalog} />;
        case "audio-flashcards":
          return <AudioFlashcardsMethod onSessionFinished={handleBackToCatalog} />;
        case "final-board":
          return <FinalBoardMethod onSessionFinished={handleBackToCatalog} />;
        case "math-blackboard":
          return <MathBlackboardMethod onSessionFinished={handleBackToCatalog} />;
        case "split-screen":
          return <SplitScreenStudyRunner onFinish={handleBackToCatalog} />;
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
    <div className="space-y-8 pb-16 font-sans">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border-subtle pb-5 gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
            Métodos de Estudio y Práctica Cognitiva
          </h1>
          <p className="mt-1 text-sm text-text-secondary max-w-2xl leading-relaxed">
            30 protocolos basados en evidencia psicopedagógica, estructurados por demanda cognitiva y conectados al motor de retención FSRS de StudyLab.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTriageOpen(true)}
            className="text-xs flex items-center gap-2 border-border-subtle hover:bg-bg-elevated"
          >
            <Compass className="h-3.5 w-3.5 text-accent-primary" />
            <span>Asistente de Triaje Cognitivo</span>
          </Button>
          <PanelGuide
            id="methods-catalog-guide"
            title="Catálogo de Métodos Cognitivos"
            whatItDoes="Catálogo integral de 30 métodos de estudio con respaldo neurocognitivo formal, fichas descriptivas y vinculación con FSRS y el grafo."
            howToUse={[
              "El bloque superior destaca el método prioritario sugerido para hoy según tu carga biológica de repaso.",
              "En 'Herramientas de Cátedra' encontrás simuladores específicos de parcial, pizarra y coloquio.",
              "En el catálogo inferior podés buscar cualquier técnica y consultar sus pasos o iniciar sesión.",
            ]}
            tip="Para asimilar demostraciones o fórmulas complejas, combiná Feynman o Autoexplicación con Repetición Espaciada."
          />
        </div>
      </div>

      {/* 1. FOCUS HERO: Spotlight Prioritario de Hoy */}
      <section aria-labelledby="focus-hero-title">
        <div className="rounded-lg border border-accent-primary/30 bg-bg-elevated p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-mono text-accent-primary">
                <span className="w-2 h-2 rounded-full bg-accent-primary" />
                <span>FOCO PRIORITARIO DE HOY</span>
              </div>
              <h2 id="focus-hero-title" className="font-serif text-xl md:text-2xl font-semibold text-text-primary">
                {dueFsrsCount > 0 ? "Repetición Espaciada (FSRS v5)" : "Asimilación Conceptual: Técnica Feynman"}
              </h2>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                {dueFsrsCount > 0
                  ? `Tenés ${dueFsrsCount} ${dueFsrsCount === 1 ? "tarjeta pendiente" : "tarjetas pendientes"} de repaso hoy según tu curva de retención R(t). Resolverlas a tiempo previene el decaimiento de memoria antes de los exámenes.`
                  : "No tenés repasos FSRS vencidos en este momento. Es el intervalo ideal para asimilar conceptos densos con explicación en lenguaje llano o abordar una unidad nueva."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {dueFsrsCount > 0 ? (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleStartMethod("spaced-repetition")}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Iniciar Repaso Diario ({dueFsrsCount})</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/session?deck=default")}
                    className="text-xs cursor-pointer border-border-subtle"
                  >
                    Ver Barajas
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleStartMethod("feynman")}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Iniciar Técnica Feynman</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. HERRAMIENTAS DE CÁTEDRA & EVALUACIÓN */}
      <section className="space-y-3" aria-labelledby="tools-section-title">
        <div className="flex items-baseline justify-between border-b border-border-subtle pb-2">
          <h2 id="tools-section-title" className="font-serif text-lg font-semibold text-text-primary">
            Formatos de Cátedra &amp; Examen
          </h2>
          <span className="text-xs text-text-muted">Simuladores troncales de evaluación universitaria</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pizarra Matemática */}
          <div
            onClick={() => handleStartMethod("math-blackboard")}
            className="group p-4 rounded-lg border border-border-subtle bg-bg-elevated hover:border-accent-primary/60 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-medium text-text-primary">Pizarra Matemática</span>
                <Binary className="h-4 w-4 text-accent-primary" />
              </div>
              <p className="text-xs text-text-secondary leading-snug">
                Demostraciones paso a paso, fórmulas KaTeX y validación deductiva.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-border-subtle flex items-center justify-between text-xs text-accent-primary font-medium">
              <span>Abrir Pizarra</span>
              <Play className="h-3 w-3 fill-current" />
            </div>
          </div>

          {/* Tribunal de Examen Final */}
          <div
            onClick={() => handleStartMethod("final-board")}
            className="group p-4 rounded-lg border border-border-subtle bg-bg-elevated hover:border-accent-primary/60 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-medium text-text-primary">Tribunal de Examen Final</span>
                <Scale className="h-4 w-4 text-accent-primary" />
              </div>
              <p className="text-xs text-text-secondary leading-snug">
                Simulación con 3 docentes, defensa oral y generación de acta oficial.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-border-subtle flex items-center justify-between text-xs text-accent-primary font-medium">
              <span>Simular Tribunal</span>
              <Play className="h-3 w-3 fill-current" />
            </div>
          </div>

          {/* Banco de Parciales */}
          <div
            onClick={() => handleStartMethod("past-exams")}
            className="group p-4 rounded-lg border border-border-subtle bg-bg-elevated hover:border-accent-primary/60 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-medium text-text-primary">Banco de Parciales & Pareto</span>
                <GraduationCap className="h-4 w-4 text-accent-primary" />
              </div>
              <p className="text-xs text-text-secondary leading-snug">
                Análisis Pareto 80/20 de temas frecuentes y simulacro con cronómetro.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-border-subtle flex items-center justify-between text-xs text-accent-primary font-medium">
              <span>Explorar Exámenes</span>
              <Play className="h-3 w-3 fill-current" />
            </div>
          </div>

          {/* Modo Blitz / Cram de Emergencia */}
          <div
            onClick={() => handleStartMethod("cram")}
            className="group p-4 rounded-lg border border-border-subtle bg-bg-elevated hover:border-accent-primary/60 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-medium text-text-primary">Modo Repaso de Emergencia (Blitz)</span>
                <Flame className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-xs text-text-secondary leading-snug">
                Triage intensivo contrarreloj para la víspera del examen parcial.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-border-subtle flex items-center justify-between text-xs text-accent-primary font-medium">
              <span>Iniciar Blitz</span>
              <Play className="h-3 w-3 fill-current" />
            </div>
          </div>
        </div>

        {/* Simuladores Especializados de Cátedra */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStartMethod("oral-defense")}
            className="text-xs flex items-center gap-1.5 border-border-subtle hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
          >
            <Mic className="h-3.5 w-3.5 text-accent-primary" />
            <span>Simulador de Coloquio Oral</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStartMethod("essay-exam")}
            className="text-xs flex items-center gap-1.5 border-border-subtle hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
          >
            <FileText className="h-3.5 w-3.5 text-accent-primary" />
            <span>Examen a Desarrollo & Ensayo</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStartMethod("comparative-matrix")}
            className="text-xs flex items-center gap-1.5 border-border-subtle hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
          >
            <Columns3 className="h-3.5 w-3.5 text-accent-primary" />
            <span>Matriz Comparativa de Cátedra</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStartMethod("case-study")}
            className="text-xs flex items-center gap-1.5 border-border-subtle hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
          >
            <Briefcase className="h-3.5 w-3.5 text-accent-primary" />
            <span>Casos Prácticos & Viñetas</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStartMethod("semester-gantt")}
            className="text-xs flex items-center gap-1.5 border-border-subtle hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
          >
            <CalendarDays className="h-3.5 w-3.5 text-accent-primary" />
            <span>Cronograma & Gantt</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStartMethod("audio-flashcards")}
            className="text-xs flex items-center gap-1.5 border-border-subtle hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
          >
            <Headphones className="h-3.5 w-3.5 text-accent-primary" />
            <span>Audio Flashcards</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStartMethod("local-ai")}
            className="text-xs flex items-center gap-1.5 border-border-subtle hover:bg-bg-elevated text-text-secondary hover:text-text-primary"
          >
            <Bot className="h-3.5 w-3.5 text-accent-primary" />
            <span>Tutor IA Local & Ollama</span>
          </Button>
        </div>
      </section>

      {/* 3. REPERTORIO METODOLÓGICO COMPLETO */}
      <section className="space-y-4" aria-labelledby="catalog-section-title">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <h2 id="catalog-section-title" className="font-serif text-lg font-semibold text-text-primary">
              Repertorio Metodológico
            </h2>
            <span className="text-xs text-text-muted">
              {filteredMethods.length} de {allMethods.length} técnicas catalogadas
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, objetivo o materia..."
              className="w-full rounded border border-border-subtle bg-bg-secondary/60 pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
            />
          </div>
        </div>

        {/* Filtros de Categoría y Estado */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((tab) => {
              const count = tab.id === "all"
                ? allMethods.length
                : allMethods.filter((m) => m.category === tab.id).length;

              const isSelected = selectedCategory === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`rounded px-2.5 py-1 text-xs font-sans transition-colors cursor-pointer border ${
                    isSelected
                      ? "bg-accent-primary text-white border-accent-primary font-medium"
                      : "bg-bg-elevated text-text-secondary border-border-subtle hover:text-text-primary hover:border-border-subtle/80"
                  }`}
                >
                  {tab.label} <span className="opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted text-[11px]">Disponibilidad:</span>
            {[
              { id: "all", label: `Todos (${allMethods.length})` },
              { id: "ready", label: `Interactivos (${allMethods.filter(m => m.implemented).length})` },
              { id: "preview", label: `Próximamente (${allMethods.filter(m => !m.implemented).length})` },
            ].map((statusTab) => (
              <button
                key={statusTab.id}
                type="button"
                onClick={() => setSelectedStatus(statusTab.id as any)}
                className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                  selectedStatus === statusTab.id
                    ? "font-semibold text-accent-primary border-b border-accent-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {statusTab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista Indexada Tipo Catálogo */}
        {filteredMethods.length === 0 ? (
          <div className="rounded border border-dashed border-border-subtle p-10 text-center">
            <p className="text-sm text-text-muted">No se encontraron métodos con los filtros actuales.</p>
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
          <div className="space-y-2">
            {filteredMethods.map((m) => (
              <div
                key={m.id}
                onClick={() => setPreviewMethod(m)}
                className="group p-4 rounded-lg border border-border-subtle bg-bg-elevated hover:border-accent-primary/50 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-serif text-base font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                      {m.name}
                    </span>
                    {m.nameEn && (
                      <span className="text-xs text-text-muted truncate max-w-[200px]">
                        {m.nameEn}
                      </span>
                    )}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border-subtle">
                      {CATEGORY_NAMES[m.category] || m.category}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                    {m.description}
                  </p>

                  {m.scientificBasis && (
                    <p className="text-[11px] text-text-muted line-clamp-1 italic">
                      Base empírica: {m.scientificBasis}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-text-secondary hover:text-text-primary"
                    onClick={() => setPreviewMethod(m)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    <span>Ver Ficha</span>
                  </Button>

                  {m.implemented ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs flex items-center gap-1.5 cursor-pointer"
                      onClick={() => handleStartMethod(m.id)}
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Iniciar Protocolo</span>
                    </Button>
                  ) : (
                    m.integratesWith?.includes("fsrs") ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs cursor-pointer"
                        onClick={() => handleContextualNav("fsrs", m.id)}
                      >
                        <Cpu className="h-3 w-3 mr-1 text-accent-primary" />
                        <span>Abrir en FSRS</span>
                      </Button>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
export default MethodsPage;
