import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  Layers, 
  Eye, 
  EyeOff,
  Sparkles
} from "lucide-react";

export interface StoryMethodProps {
  onSessionFinished?: () => void;
}

interface StoryLink {
  id: string;
  stepNumber: number;
  term: string;
  narrativeScene: string;
}

const DEFAULT_STORY_LINKS: StoryLink[] = [
  {
    id: "link_1",
    stepNumber: 1,
    term: "Profase (Condensación de cromatina)",
    narrativeScene: "Un profesor estricto (Profase) enrolla con fuerza una alfombra gigantesca hasta convertirla en bastones gruesos.",
  },
  {
    id: "link_2",
    stepNumber: 2,
    term: "Metafase (Placa ecuatorial)",
    narrativeScene: "Esos bastones se alinean en la meta de una pista de carreras justo sobre la línea del ecuador.",
  },
  {
    id: "link_3",
    stepNumber: 3,
    term: "Anafase (Separación de cromátidas)",
    narrativeScene: "Una niña llamada Ana (Anafase) corta la cuerda con tijeras y los bastones salen disparados hacia polos opuestos.",
  },
  {
    id: "link_4",
    stepNumber: 4,
    term: "Telofase & Citocinesis (Reconstrucción nuclear)",
    narrativeScene: "Al llegar a los polos, toman un teléfono (Telofase) para avisar que construyeron dos castillos idénticos.",
  },
];

export const StoryMethod: React.FC<StoryMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Secuencia de la Mitosis Celular");
  const [links, setLinks] = useState<StoryLink[]>(DEFAULT_STORY_LINKS);
  const [mode, setMode] = useState<"compose" | "recall">("compose");

  // Estado para nuevo eslabón
  const [newTerm, setNewTerm] = useState("");
  const [newScene, setNewScene] = useState("");

  // Modo drill de recuerdo
  const [revealedTerms, setRevealedTerms] = useState<Record<string, boolean>>({});
  const [correctCount, setCorrectCount] = useState<number>(0);

  const handleAddLink = () => {
    if (!newTerm.trim() || !newScene.trim()) return;
    const newEntry: StoryLink = {
      id: `link_${Date.now()}`,
      stepNumber: links.length + 1,
      term: newTerm.trim(),
      narrativeScene: newScene.trim(),
    };
    setLinks([...links, newEntry]);
    setNewTerm("");
    setNewScene("");
  };

  const handleRemoveLink = (id: string) => {
    setLinks(
      links
        .filter((l) => l.id !== id)
        .map((l, idx) => ({ ...l, stepNumber: idx + 1 }))
    );
  };

  const toggleRevealTerm = (linkId: string) => {
    const isNowRevealed = !revealedTerms[linkId];
    setRevealedTerms({ ...revealedTerms, [linkId]: isNowRevealed });
    if (isNowRevealed) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `story_${Date.now()}`,
      methodId: "story-method",
      subject: "Método del Relato (Cadena Narrativa)",
      topic: topic || "Memorización Serial por Encadenamiento",
      durationMinutes: Math.max(15, links.length * 4),
      notes: `Tema: ${topic}\nEslabones Narrativos (${links.length}):\n${links
        .map((l) => `[Paso ${l.stepNumber}]: ${l.term}\n  • Escena Narrativa: ${l.narrativeScene}`)
        .join("\n\n")}`,
      completedAt: Date.now(),
    });

    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Método del Relato (Cadena Narrativa)</CardTitle>
            <Badge variant="accent">Evocación Serial (Bower & Clark, 1969)</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Encadena listas de conceptos conectándolos como hitos dramáticos absurdos y vívidos en una sola historia continua.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant={mode === "recall" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode(mode === "compose" ? "recall" : "compose")}
            className="text-xs flex items-center gap-1.5"
          >
            {mode === "compose" ? (
              <>
                <Play className="h-3.5 w-3.5 text-accent-primary" />
                <span>Iniciar Drill de Evocación</span>
              </>
            ) : (
              <>
                <Layers className="h-3.5 w-3.5" />
                <span>Volver a Composición</span>
              </>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleFinishSession}
            disabled={links.length === 0}
            className="text-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Guardar Sesión ({links.length} Escenas)</span>
          </Button>
        </div>
      </div>

      {/* Tema */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text-primary">Eje Temático o Secuencia Serial</label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Fases del Proceso Penal Ordinario"
        />
      </div>

      {/* Resumen del Relato */}
      <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-secondary/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-medium text-text-primary">
            Eslabones encadenados: <strong className="font-mono text-accent-primary">{links.length}</strong>
          </span>
        </div>

        {mode === "recall" && (
          <span className="text-xs font-mono text-emerald-400 font-semibold">
            {correctCount} de {links.length} términos revelados
          </span>
        )}
      </div>

      {/* Secuencia Narrativa */}
      <div className="space-y-3">
        {links.map((link, idx) => {
          const isRevealed = revealedTerms[link.id] || mode === "compose";

          return (
            <div
              key={link.id}
              className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/50 space-y-3 relative group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="accent" className="text-xs font-mono px-2 py-0.5">
                    Paso {link.stepNumber}
                  </Badge>

                  {mode === "compose" ? (
                    <span className="font-semibold text-xs text-text-primary">
                      {link.term}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isRevealed ? "text-text-primary" : "text-text-muted italic"}`}>
                        {isRevealed ? link.term : "[Término Oculto - Evoca mentalmente]"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleRevealTerm(link.id)}
                        className="text-text-muted hover:text-accent-primary p-1"
                        title={isRevealed ? "Ocultar" : "Revelar"}
                      >
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-accent-primary" />}
                      </button>
                    </div>
                  )}
                </div>

                {mode === "compose" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(link.id)}
                    className="text-text-muted hover:text-red-400 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Escena Narrativa */}
              <div className="p-3 rounded-lg border border-border-subtle bg-bg-tertiary/60 text-xs text-text-secondary leading-relaxed flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-accent-primary shrink-0 mt-0.5" />
                <p className="flex-1">
                  <strong className="text-text-primary font-medium">Escena de Enlace: </strong>
                  {link.narrativeScene}
                </p>
              </div>

              {idx < links.length - 1 && (
                <div className="flex justify-center -mb-6 -mt-1 relative z-10">
                  <div className="rounded-full bg-bg-primary border border-border-subtle p-1 text-text-muted">
                    <ArrowRight className="h-3 w-3 rotate-90" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Form para Agregar Nuevo Eslabón */}
      {mode === "compose" && (
        <div className="rounded-xl border border-dashed border-border-hover bg-bg-secondary/30 p-4 space-y-3">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-accent-primary" />
            <span>Encadenar Siguiente Término en la Historia</span>
          </span>

          <Input
            placeholder="Término o concepto técnico (Ej: Telofase celular)"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            className="text-xs"
          />

          <Textarea
            rows={2}
            placeholder="Describe la interacción visual exagerada o insólita con el elemento anterior..."
            value={newScene}
            onChange={(e) => setNewScene(e.target.value)}
            className="text-xs"
          />

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddLink}
              disabled={!newTerm.trim() || !newScene.trim()}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar Eslabón</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
