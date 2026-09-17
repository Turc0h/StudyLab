import React, { useState, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import type { StudyMethodId } from "../types";
import {
  STUDY_METHODS_CATALOG,
  type MethodCatalogItem,
} from "../data/studyMethodsData";
import { MethodPreviewModal } from "../components/study-methods/MethodPreviewModal";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Clock, ArrowLeft, ArrowRight, Eye, Play, Sparkles } from "lucide-react";
import { PanelGuide } from "../components/guide/PanelGuide";

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

export const MethodsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runningParam = searchParams.get("run") as StudyMethodId | null;

  const [activeRunningMethod, setActiveRunningMethod] = useState<StudyMethodId | null>(runningParam);
  const [previewMethod, setPreviewMethod] = useState<MethodCatalogItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const handleStartMethod = (id: StudyMethodId) => {
    setActiveRunningMethod(id);
    setSearchParams({ run: id });
  };

  const handleBackToCatalog = () => {
    setActiveRunningMethod(null);
    setSearchParams({});
  };

  const filteredMethods = STUDY_METHODS_CATALOG.filter((m) => {
    if (selectedCategory !== "all" && m.category !== selectedCategory) return false;
    return true;
  });

  const renderActiveMethodRunner = () => {
    if (!activeRunningMethod) return null;

    const catalogEntry = STUDY_METHODS_CATALOG.find((m) => m.id === activeRunningMethod);

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

  // Otherwise, render the initial Selection Panel with Rich Previews
  return (
    <div className="space-y-6 pb-12">
      {/* Editorial Header */}
      <div className="flex items-start justify-between border-b border-border-subtle pb-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
            Catálogo de Métodos de Estudio
          </h1>
          <p className="mt-1 font-sans text-sm text-text-secondary">
            Explora la justificación neurocognitiva, el protocolo y la vista previa de cada técnica antes de iniciar tu sesión.
          </p>
        </div>
        <PanelGuide
          id="methods-catalog-guide"
          title="Catálogo de Métodos Cognitivos"
          whatItDoes="Selección de las 8 técnicas de estudio con mayor evidencia científica, adaptadas para ingeniería, medicina y ciencias exactas."
          howToUse={[
            "Filtrá por categoría arriba (Comprensión, Retención, Estructura, etc.).",
            "Tocá 'Vista previa' en cualquier tarjeta para ver el fundamento neurocognitivo y cómo funciona.",
            "Tocá 'Iniciar Sesión' para arrancar el bloque guiado con temporizador.",
          ]}
          tip="Para estudiar fórmulas o demostraciones, la combinación recomendada es Feynman (para entender) + FSRS (para no olvidar)."
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: "Todos los Métodos (8)" },
          { id: "comprension", label: "Comprensión & Síntesis (4)" },
          { id: "memoria", label: "Evocación & Memoria (2)" },
          { id: "enfoque", label: "Enfoque & Estructuración (2)" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id)}
            className={`rounded px-3 py-1.5 text-xs font-sans font-medium transition-colors ${
              selectedCategory === tab.id
                ? "bg-accent-primary text-bg-elevated border border-accent-primary"
                : "bg-bg-secondary text-text-secondary border border-border-subtle hover:bg-bg-elevated hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Methods */}
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
                  <Badge variant="accent">{m.categoryLabel}</Badge>
                  <span className="flex items-center gap-1 font-sans text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    {m.duration}
                  </span>
                </div>
                <CardTitle className="font-serif text-lg font-semibold text-text-primary mt-2">
                  {m.name}
                </CardTitle>
              </CardHeader>
              <div className="px-6 py-1 space-y-2">
                <p className="font-sans text-xs text-text-secondary leading-relaxed">
                  {m.shortDescription}
                </p>
                <div className="rounded bg-bg-secondary/70 border border-border-subtle/70 p-2 text-[11px] text-text-muted flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-accent-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{m.scientificBasis}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border-subtle px-6 py-3 flex items-center justify-between gap-2 bg-bg-secondary/20">
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
                <span>Ver Ficha & Vista Previa</span>
              </Button>

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
                <span>Iniciar Método</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      <MethodPreviewModal
        method={previewMethod}
        onClose={() => setPreviewMethod(null)}
        onStartMethod={handleStartMethod}
      />
    </div>
  );
};
