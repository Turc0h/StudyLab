import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { AudioOverviewModal } from "../features/academic-engine/components/AudioOverviewModal";
import {
  BookOpen,
  HelpCircle,
  Compass,
  ArrowLeftRight,
  Headphones,
  MoreHorizontal,
  UploadCloud,
  Loader2,
} from "lucide-react";
import { useTutorialStore } from "../stores/useTutorialStore";
import { pdfAdapter, pastedTextAdapter } from "../features/academic-engine/sourceIngestAdapters";
import { isDesktop, readFileBytes } from "../platform";

export const AcademicWorkspace: React.FC = () => {
  const openGlobalTutorial = useTutorialStore((s) => s.openTutorial);
  const [sources, setSources] = useState<AcademicSourceRecord[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<AcademicChunkRecord[]>([]);
  const [activeChunk, setActiveChunk] = useState<AcademicChunkRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Audio Overview modal state
  const [isAudioOverviewOpen, setIsAudioOverviewOpen] = useState(false);

  // Guided Tour State
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Callback to drive Canvas viewer navigation from outside
  const [targetNavigation, setTargetNavigation] = useState<{
    page: number;
    bbox?: AcademicBoundingBox;
    timestamp: number;
  } | null>(null);

  // Layout customization states: Cognitive Hub visibility & RAG position swap
  const [isCognitivePanelVisible, setIsCognitivePanelVisible] = useState(true);
  const [isRagSwapped, setIsRagSwapped] = useState(false);

  // Initialize and load sources without forcing hardcoded dummy data
  const loadWorkspace = useCallback(async () => {
    try {
      const allSources = await db.academicSources.toArray();
      setSources(allSources);

      // Restore saved active source from workspaceState
      const savedState = await db.workspaceState.get("academic_active");
      const initialId = (savedState?.activeSourceId && allSources.some((s) => s.id === savedState.activeSourceId))
        ? savedState.activeSourceId
        : allSources[0]?.id || null;
      setActiveSourceId(initialId);

      if (initialId) {
        const sourceChunks = await db.academicChunks
          .where("sourceId")
          .equals(initialId)
          .toArray();
        setChunks(sourceChunks);
        setActiveChunk(sourceChunks[0] || null);
      } else {
        setChunks([]);
        setActiveChunk(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteSource = async (sourceId: string) => {
    await db.transaction("rw", [db.academicSources, db.academicChunks, db.workspaceState], async () => {
      await db.academicSources.delete(sourceId);
      await db.academicChunks.where("sourceId").equals(sourceId).delete();
      const saved = await db.workspaceState.get("academic_active");
      if (saved?.activeSourceId === sourceId) {
        await db.workspaceState.delete("academic_active");
      }
    });
    await loadWorkspace();
  };

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      await seedAcademicSources();
      await loadWorkspace();
    } finally {
      setLoading(false);
    }
  };

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

  // Window-level Drag & Drop states
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const handleProcessFile = useCallback(async (file: File) => {
    setIsProcessingFile(true);
    setProcessingStatus(`Leyendo ${file.name}...`);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (ext === "pdf" || file.type === "application/pdf") {
        setProcessingStatus("Extrayendo texto y fórmulas LaTeX...");
        const res = await pdfAdapter({
          file,
          career: "Ingeniería / Ciencias",
          onProgress: (pct) => setProcessingStatus(`Extrayendo texto y fórmulas (${pct}%)...`),
        });

        if (res.source.fileId) {
          await db.files.put({
            id: res.source.fileId,
            folderId: "academic_sources",
            name: file.name,
            mimeType: "application/pdf",
            size: file.size,
            blob: file,
            ocrStatus: "done",
            createdAt: Date.now(),
          });
        }

        if (res.chunks.length > 0) {
          await db.academicChunks.bulkPut(res.chunks);
        }
        await db.academicSources.put(res.source);
        await loadWorkspace();
        await handleSelectSource(res.source);
      } else {
        setProcessingStatus("Procesando apunte en texto...");
        const text = await file.text();
        const res = await pastedTextAdapter({
          title: file.name.replace(/\.[^/.]+$/, ""),
          text,
        });
        if (res.chunks.length > 0) {
          await db.academicChunks.bulkPut(res.chunks);
        }
        await db.academicSources.put(res.source);
        await loadWorkspace();
        await handleSelectSource(res.source);
      }
    } catch (err) {
      console.error("Error al procesar archivo en ventana principal:", err);
      alert(err instanceof Error ? err.message : "Error al procesar el archivo");
    } finally {
      setIsProcessingFile(false);
      setProcessingStatus(null);
    }
  }, [loadWorkspace]);

  // Handle native Tauri OS drag & drop events (Windows Explorer)
  useEffect(() => {
    if (!isDesktop()) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
          if (event.payload.type === "over" || event.payload.type === "enter") {
            setIsWindowDragging(true);
          } else if (event.payload.type === "leave") {
            setIsWindowDragging(false);
          } else if (event.payload.type === "drop") {
            setIsWindowDragging(false);
            if (event.payload.paths && event.payload.paths.length > 0) {
              const filePath = event.payload.paths[0];
              const name = filePath.split(/[/\\]/).pop() || "documento.pdf";
              try {
                const bytes = await readFileBytes(filePath);
                let blob: Blob;
                if (bytes) {
                  blob = new Blob([bytes.buffer as ArrayBuffer], {
                    type: name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
                  });
                } else {
                  const { convertFileSrc } = await import("@tauri-apps/api/core");
                  const assetUrl = convertFileSrc(filePath);
                  const resp = await fetch(assetUrl);
                  blob = await resp.blob();
                }
                const file = new File([blob], name, { type: blob.type });
                void handleProcessFile(file);
              } catch (err) {
                console.error("Error al leer archivo arrastrado en Tauri:", err);
              }
            }
          }
        });
      } catch (err) {
        console.warn("Tauri drag-drop listener no pudo registrarse en workspace:", err);
      }
    })();
    return () => {
      unlisten?.();
    };
  }, [handleProcessFile]);

  const activeSource = sources.find((s) => s.id === activeSourceId) || null;

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-bg-base text-text-primary">
        <div className="flex flex-col items-center gap-3 text-center p-8">
          <BookOpen className="w-7 h-7 text-accent-primary animate-pulse" />
          <h2 className="font-serif text-base font-semibold text-text-primary">
            Cargando espacio de cátedra...
          </h2>
          <span className="text-xs text-text-secondary font-sans max-w-xs">
            Verificando fuentes locales y estado de sincronización.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        dragCounterRef.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          setIsWindowDragging(true);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCounterRef.current--;
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0;
          setIsWindowDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsWindowDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          void handleProcessFile(files[0]);
        }
      }}
      className="h-[calc(100vh-4rem)] flex flex-col bg-bg-base text-text-primary overflow-hidden font-sans relative"
    >
      {/* Visual Window Drag & Drop Overlay */}
      {(isWindowDragging || isProcessingFile) && (
        <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-xs flex flex-col items-center justify-center p-8 border-2 border-dashed border-accent-primary/60 animate-in fade-in duration-100">
          {isProcessingFile ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
              <h2 className="font-serif text-lg font-semibold text-text-primary">
                {processingStatus || "Procesando documento..."}
              </h2>
              <span className="text-xs text-text-secondary font-sans max-w-sm">
                Extrayendo teoremas, fórmulas y generando embeddings 100% en local...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
              <UploadCloud className="w-10 h-10 text-accent-primary" />
              <h2 className="font-serif text-xl font-semibold text-text-primary">
                Soltá el documento aquí
              </h2>
              <p className="text-xs text-text-secondary max-w-sm font-sans leading-relaxed">
                StudyLab procesará el texto, las fórmulas y la estructura para vincularlo a tu biblioteca de cátedra.
              </p>
            </div>
          )}
        </div>
      )}
      {/* Top Academic Context Header */}
      <header className="h-11 border-b border-border-hairline bg-bg-panel px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-accent-primary shrink-0">
            <BookOpen className="w-4 h-4" />
            <h1 className="text-xs font-serif font-semibold tracking-normal text-text-primary">
              Lienzo de Cátedra
            </h1>
          </div>
          <span className="text-border-subtle hidden sm:inline">|</span>
          <span className="text-xs font-sans text-text-secondary truncate hidden sm:inline">
            {activeSource
              ? `${activeSource.title} (${activeSource.career ?? "Universidad"})`
              : "Seleccione una fuente"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Audio Overview (NotebookLM bridge) */}
          <button
            type="button"
            onClick={() => setIsAudioOverviewOpen(true)}
            disabled={sources.length === 0}
            className="flex items-center gap-1.5 text-xs text-[--text-secondary] hover:text-[--text-primary] transition-colors cursor-pointer disabled:opacity-40"
            title="Generar Resumen Narrado de Cátedra"
          >
            <Headphones className="w-3.5 h-3.5 text-[--accent-ink]" />
            <span>Resumen Narrado</span>
          </button>

          {/* Cognitive Hub Underline Toggle */}
          <button
            type="button"
            onClick={() => setIsCognitivePanelVisible((v) => !v)}
            className={`pb-0.5 text-xs transition-colors cursor-pointer border-b-2 ${
              isCognitivePanelVisible
                ? "border-[--accent-ink] text-[--text-primary] font-medium"
                : "border-transparent text-[--text-secondary] hover:text-[--text-primary]"
            }`}
            title="Mostrar u ocultar Cognitive Hub"
          >
            Cognitive Hub
          </button>

          {/* Menú Desplegable "⋯" para Opciones Secundarias */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-1 rounded text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-panel-raised] transition-colors cursor-pointer"
              title="Más opciones de espacio de trabajo"
              aria-label="Opciones adicionales"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-[--border-hairline] bg-[--bg-panel-raised] p-1.5 shadow-lg z-40 flex flex-col gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRagSwapped((s) => !s);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[--bg-panel] text-left text-[--text-secondary] hover:text-[--text-primary] transition-colors cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-[--accent-ink]" />
                    <span>{isRagSwapped ? "RAG en Lateral" : "Invertir Paneles"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleStartTour();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[--bg-panel] text-left text-[--text-secondary] hover:text-[--text-primary] transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[--accent-ink]" />
                    <span>Tour de Pantalla</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openGlobalTutorial(1, "tour");
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[--bg-panel] text-left text-[--text-secondary] hover:text-[--text-primary] transition-colors cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-[--accent-ink]" />
                    <span>Guía Global (8 Módulos)</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Indicador de estado local */}
          <div className="flex items-center gap-2 text-xs text-text-secondary pl-2 border-l border-border-hairline">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-ok" />
            <span className="hidden md:inline font-sans text-[11px]">Sincronizado en local</span>
          </div>
        </div>
      </header>

      {/* Tri-Panel Layout con Separación Hairline */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL 1: Academic Source Manager (~22% width) */}
        <div className="w-72 lg:w-80 flex-shrink-0 h-full border-r border-[--border-hairline] bg-[--bg-panel]">
          <AcademicSourceManager
            sources={sources}
            activeSourceId={activeSourceId}
            onSelectSource={(source) => void handleSelectSource(source)}
            onDeleteSource={(sourceId) => void handleDeleteSource(sourceId)}
            onUploadSource={() => void loadWorkspace()}
            onLoadSample={() => void handleLoadSample()}
          />
        </div>

        {/* PANEL 2: Hybrid Canvas Split Markdown/LaTeX + PDF Viewer + RAG Chat */}
        <div className="flex-1 h-full min-w-0 bg-[--bg-base] flex flex-col overflow-hidden">
          <AcademicCanvas
            activeSource={activeSource}
            chunks={chunks}
            onGenerateCardsForChunk={(chunk) => setActiveChunk(chunk)}
            navigationTarget={targetNavigation}
            isRagSwapped={isRagSwapped}
            onToggleSwapRag={() => setIsRagSwapped((prev) => !prev)}
            isCognitivePanelVisible={isCognitivePanelVisible}
            onToggleCognitivePanel={() => setIsCognitivePanelVisible((prev) => !prev)}
          />
        </div>

        {/* PANEL 3: Cognitive Execution & Retention Widgets (Collapsible / Dynamic Swap) */}
        {isCognitivePanelVisible && (
          <div className="w-80 lg:w-96 flex-shrink-0 h-full border-l border-[--border-hairline] bg-[--bg-panel] transition-all duration-300">
            <AcademicCognitiveWidgets
              activeSource={activeSource}
              activeChunk={activeChunk}
              allChunks={chunks}
              onNavigateToCitation={handleNavigateToCitation}
            />
          </div>
        )}
      </div>

      {/* Audio Overview Modal (NotebookLM Bridge) */}
      <AudioOverviewModal
        isOpen={isAudioOverviewOpen}
        onClose={() => setIsAudioOverviewOpen(false)}
        sourceIds={activeSourceId ? [activeSourceId] : sources.map((s) => s.id)}
        onNavigateCitation={handleNavigateToCitation}
      />

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
