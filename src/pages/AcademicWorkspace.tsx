import React, { useEffect, useState, useCallback } from "react";
import {
  db,
  type AcademicBoundingBox,
  type AcademicChunkRecord,
  type AcademicSourceRecord,
} from "../db/db";
import { seedAcademicSources } from "../features/academic-engine/vectorIndex";
import { AcademicSourceManager } from "../features/academic-engine/components/AcademicSourceManager";
import { AcademicCanvas } from "../features/academic-engine/components/AcademicCanvas";
import { AcademicCognitiveWidgets } from "../features/academic-engine/components/AcademicCognitiveWidgets";
import { AcademicTutorialOverlay } from "../features/academic-engine/components/AcademicTutorialOverlay";
import { BrainCircuit, BookOpen, HelpCircle, Compass } from "lucide-react";
import { useTutorialStore } from "../stores/useTutorialStore";

export const AcademicWorkspace: React.FC = () => {
  const openGlobalTutorial = useTutorialStore((s) => s.openTutorial);
  const [sources, setSources] = useState<AcademicSourceRecord[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<AcademicChunkRecord[]>([]);
  const [activeChunk, setActiveChunk] = useState<AcademicChunkRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Guided Tour State
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Callback to drive Canvas viewer navigation from outside
  const [targetNavigation, setTargetNavigation] = useState<{
    page: number;
    bbox?: AcademicBoundingBox;
    timestamp: number;
  } | null>(null);

  // Initialize and load sources
  const loadWorkspace = useCallback(async () => {
    try {
      await seedAcademicSources();
      const allSources = await db.academicSources.toArray();
      setSources(allSources);

      // Restore saved active source from workspaceState
      const savedState = await db.workspaceState.get("academic_active");
      const initialId = savedState?.activeSourceId || allSources[0]?.id || null;
      setActiveSourceId(initialId);

      if (initialId) {
        const sourceChunks = await db.academicChunks
          .where("sourceId")
          .equals(initialId)
          .toArray();
        setChunks(sourceChunks);
        setActiveChunk(sourceChunks[0] || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  // Check if first-time visitor for interactive tutorial
  useEffect(() => {
    const seen = localStorage.getItem("studylab_academic_tour_seen");
    if (!seen) {
      // Short delay so DOM elements are mounted and measurable
      const timer = setTimeout(() => setIsTourOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseTour = () => {
    setIsTourOpen(false);
    localStorage.setItem("studylab_academic_tour_seen", "true");
  };

  const handleStartTour = () => {
    setTourStep(0);
    setIsTourOpen(true);
  };

  // Handle source change
  const handleSelectSource = async (source: AcademicSourceRecord) => {
    setActiveSourceId(source.id);
    const sourceChunks = await db.academicChunks
      .where("sourceId")
      .equals(source.id)
      .toArray();
    setChunks(sourceChunks);
    setActiveChunk(sourceChunks[0] || null);

    // Save to workspace state conforming to WorkspaceStateRecord
    await db.workspaceState.put({
      id: "academic_active",
      activeSubjectId: source.subjectId,
      activeSourceId: source.id,
      activePage: 1,
      panel1WidthPct: 22,
      panel2WidthPct: 53,
      panel3WidthPct: 25,
      openTabs: [
        {
          id: `tab_${source.id}`,
          type: "pdf_viewer",
          title: source.title,
          sourceId: source.id,
          page: 1,
        },
      ],
      syncedAt: Date.now(),
    });
  };

  const handleNavigateToCitation = (page: number, bbox?: AcademicBoundingBox) => {
    setTargetNavigation({
      page,
      bbox,
      timestamp: Date.now(),
    });
  };

  const activeSource = sources.find((s) => s.id === activeSourceId) || null;

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="font-mono text-xs tracking-wider text-slate-400">
            INICIALIZANDO MOTOR COGNITIVO ACADÉMICO...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 overflow-hidden font-sans relative">
      {/* Top Banner Navigation Context */}
      <header className="h-10 border-b border-slate-800/80 bg-slate-900/90 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <BookOpen className="w-4 h-4" />
            <h1 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
              Personal Academic Knowledge Engine (v4.1)
            </h1>
          </div>
          <span className="text-slate-700">|</span>
          <span className="text-[11px] font-mono text-slate-400">
            {activeSource
              ? `${activeSource.title} • ${activeSource.career ?? "Universidad"} • ${activeSource.documentType.toUpperCase()}`
              : "Seleccione una fuente"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            GraphRAG Conectado
          </span>

          <span className="text-slate-500 hidden sm:inline">Local-First (Dexie v4)</span>

          {/* On-Demand Interactive Tutorial Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleStartTour}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono transition-all shadow-sm"
              title="Recorrido guiado de este espacio de trabajo"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tour Pantalla</span>
            </button>
            <button
              type="button"
              onClick={() => openGlobalTutorial(1, "tour")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-500/20 text-xs font-mono transition-all shadow-sm"
              title="Abrir la guía maestra de todos los módulos de StudyLab"
            >
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span>Guía Global (8 Módulos)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tri-Panel Layout (Contextual Academic Workspace) */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL 1: Academic Source Manager (~22% width) */}
        <div className="w-72 lg:w-80 flex-shrink-0 h-full border-r border-slate-800/80 bg-slate-950/90">
          <AcademicSourceManager
            sources={sources}
            activeSourceId={activeSourceId}
            onSelectSource={(source) => void handleSelectSource(source)}
            onUploadSource={() => void loadWorkspace()}
          />
        </div>

        {/* PANEL 2: Hybrid Canvas Split Markdown/LaTeX + PDF Viewer + RAG Chat (~53% width) */}
        <div className="flex-1 h-full min-w-0 bg-slate-950 flex flex-col overflow-hidden">
          <AcademicCanvas
            activeSource={activeSource}
            chunks={chunks}
            onGenerateCardsForChunk={(chunk) => setActiveChunk(chunk)}
            navigationTarget={targetNavigation}
          />
        </div>

        {/* PANEL 3: Cognitive Execution & Retention Widgets (~25% width) */}
        <div className="w-80 lg:w-96 flex-shrink-0 h-full border-l border-slate-800/80 bg-slate-950/90">
          <AcademicCognitiveWidgets
            activeSource={activeSource}
            activeChunk={activeChunk}
            allChunks={chunks}
            onNavigateToCitation={handleNavigateToCitation}
          />
        </div>
      </div>

      {/* Interactive Step-by-Step Tutorial Tour */}
      <AcademicTutorialOverlay
        isOpen={isTourOpen}
        onClose={handleCloseTour}
        stepIndex={tourStep}
        onStepChange={setTourStep}
      />
    </div>
  );
};
export default AcademicWorkspace;
