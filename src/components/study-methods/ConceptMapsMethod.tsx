import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Network, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  FileText,
  Workflow
} from "lucide-react";

export interface ConceptMapsMethodProps {
  onSessionFinished?: () => void;
}

interface ConceptNode {
  id: string;
  label: string;
  level: "cúspide" | "intermedio" | "específico";
}

interface Proposition {
  id: string;
  fromId: string;
  connector: string;
  toId: string;
}

const DEFAULT_CONCEPTS: ConceptNode[] = [
  { id: "c1", label: "Célula Eucariota", level: "cúspide" },
  { id: "c2", label: "Mitocondria", level: "intermedio" },
  { id: "c3", label: "Cloroplasto", level: "intermedio" },
  { id: "c4", label: "Respiración Celular", level: "específico" },
  { id: "c5", label: "Fotosíntesis", level: "específico" },
];

const DEFAULT_PROPOSITIONS: Proposition[] = [
  { id: "p1", fromId: "c1", connector: "posee orgánulos como", toId: "c2" },
  { id: "p1b", fromId: "c1", connector: "posee orgánulos como", toId: "c3" },
  { id: "p2", fromId: "c2", connector: "lleva a cabo la", toId: "c4" },
  { id: "p3", fromId: "c3", connector: "sintetiza glucosa mediante", toId: "c5" },
];

export const ConceptMapsMethod: React.FC<ConceptMapsMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Organización Celular y Energética");
  const [concepts, setConcepts] = useState<ConceptNode[]>(DEFAULT_CONCEPTS);
  const [propositions, setPropositions] = useState<Proposition[]>(DEFAULT_PROPOSITIONS);

  // Nuevo concepto
  const [newConceptLabel, setNewConceptLabel] = useState("");
  const [newConceptLevel, setNewConceptLevel] = useState<"cúspide" | "intermedio" | "específico">("intermedio");

  // Nueva proposición
  const [fromConceptId, setFromConceptId] = useState<string>("");
  const [connector, setConnector] = useState<string>("");
  const [toConceptId, setToConceptId] = useState<string>("");

  const handleAddConcept = () => {
    if (!newConceptLabel.trim()) return;
    const newConcept: ConceptNode = {
      id: `c_${Date.now()}`,
      label: newConceptLabel.trim(),
      level: newConceptLevel,
    };
    setConcepts([...concepts, newConcept]);
    setNewConceptLabel("");
  };

  const handleRemoveConcept = (id: string) => {
    setConcepts(concepts.filter((c) => c.id !== id));
    setPropositions(propositions.filter((p) => p.fromId !== id && p.toId !== id));
  };

  const handleAddProposition = () => {
    if (!fromConceptId || !connector.trim() || !toConceptId) return;
    if (fromConceptId === toConceptId) return;

    const newProp: Proposition = {
      id: `p_${Date.now()}`,
      fromId: fromConceptId,
      connector: connector.trim(),
      toId: toConceptId,
    };
    setPropositions([...propositions, newProp]);
    setConnector("");
  };

  const handleRemoveProposition = (id: string) => {
    setPropositions(propositions.filter((p) => p.id !== id));
  };

  const getConceptLabel = (id: string) => concepts.find((c) => c.id === id)?.label || id;

  const handleFinishSession = async () => {
    const formattedPropositions = propositions.map(
      (p) => `"${getConceptLabel(p.fromId)}" ${p.connector} "${getConceptLabel(p.toId)}"`
    );

    await saveStudySession({
      id: `concept_map_${Date.now()}`,
      methodId: "concept-maps",
      subject: "Mapas Conceptuales Novakianos",
      topic: topic || "Red de Proposiciones Semánticas",
      durationMinutes: Math.max(15, concepts.length * 4),
      notes: `Tema: ${topic}\nConceptos (${concepts.length}):\n${concepts
        .map((c) => `• [${c.level.toUpperCase()}] ${c.label}`)
        .join("\n")}\n\nProposiciones Lógicas (${propositions.length}):\n${formattedPropositions
        .map((pr) => `• ${pr}`)
        .join("\n")}`,
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
            <CardTitle>Mapas Conceptuales Novakianos</CardTitle>
            <Badge variant="accent">Proposiciones Lógicas</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Construye redes de conocimiento jerárquico uniendo conceptos mediante frases conectoras explícitas (Novak, 1984).
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinishSession}
          disabled={concepts.length < 2 || propositions.length === 0}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Guardar Sesión ({propositions.length} Proposiciones)</span>
        </Button>
      </div>

      {/* Tema del mapa */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text-primary">Eje Temático del Mapa Conceptual</label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Termodinámica de Sistemas Biológicos"
        />
      </div>

      {/* Grid: Conceptos y Creador de Proposiciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Banco de Conceptos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5 text-accent-primary" />
              <span>Nodos Conceptuales ({concepts.length})</span>
            </span>
            <span className="text-[10px] text-text-muted">Jerarquía Novakiana</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {concepts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border-subtle bg-bg-secondary/40 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    variant={
                      c.level === "cúspide"
                        ? "accent"
                        : c.level === "intermedio"
                        ? "secondary"
                        : "neutral"
                    }
                    className="text-[10px] px-1.5 py-0.5"
                  >
                    {c.level}
                  </Badge>
                  <span className="font-medium text-text-primary truncate">{c.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveConcept(c.id)}
                  className="text-text-muted hover:text-red-400 transition-colors p-1"
                  title="Eliminar concepto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Form Nuevo Concepto */}
          <div className="p-3 rounded-lg border border-dashed border-border-hover bg-bg-secondary/20 space-y-2.5">
            <div className="flex gap-2">
              <Input
                placeholder="Nuevo concepto (Ej: Ribosoma)"
                value={newConceptLabel}
                onChange={(e) => setNewConceptLabel(e.target.value)}
                className="flex-1 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleAddConcept()}
              />
              <select
                value={newConceptLevel}
                onChange={(e) => setNewConceptLevel(e.target.value as any)}
                aria-label="Nivel jerárquico del concepto"
                className="bg-bg-secondary border border-border-subtle rounded-md px-2 text-xs text-text-primary"
              >
                <option value="cúspide">Cúspide</option>
                <option value="intermedio">Intermedio</option>
                <option value="específico">Específico</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddConcept}
                disabled={!newConceptLabel.trim()}
                className="text-xs flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Agregar Concepto</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Creador de Proposiciones */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Workflow className="h-3.5 w-3.5 text-accent-primary" />
              <span>Conectar Ternas Proposicionales</span>
            </span>
            <span className="text-[10px] text-text-muted">A &rarr; Conector &rarr; B</span>
          </div>

          {/* Constructor */}
          <div className="p-3 rounded-lg border border-border-subtle bg-bg-secondary/30 space-y-3">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-text-muted">Concepto Origen (Sujeto)</label>
              <select
                value={fromConceptId}
                onChange={(e) => setFromConceptId(e.target.value)}
                aria-label="Concepto de origen"
                className="w-full bg-bg-secondary border border-border-subtle rounded-md p-2 text-xs text-text-primary"
              >
                <option value="">-- Seleccionar concepto origen --</option>
                {concepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.level.toUpperCase()}] {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium text-text-muted">Frase Conectora (Verbo / Enlace)</label>
              <Input
                placeholder="Ej: produce, inhibe, está formado por, da lugar a..."
                value={connector}
                onChange={(e) => setConnector(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium text-text-muted">Concepto Destino (Objeto)</label>
              <select
                value={toConceptId}
                onChange={(e) => setToConceptId(e.target.value)}
                aria-label="Concepto de destino"
                className="w-full bg-bg-secondary border border-border-subtle rounded-md p-2 text-xs text-text-primary"
              >
                <option value="">-- Seleccionar concepto destino --</option>
                {concepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.level.toUpperCase()}] {c.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAddProposition}
              disabled={!fromConceptId || !connector.trim() || !toConceptId || fromConceptId === toConceptId}
              className="w-full text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Enlazar Proposición</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Proposiciones Validadas */}
      <div className="space-y-3 pt-2 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-accent-primary" />
            <span>Proposiciones Semánticas Validadas ({propositions.length})</span>
          </span>
          <span className="text-[10px] text-text-muted">Oraciones con significado completo</span>
        </div>

        {propositions.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-border-subtle text-xs text-text-muted">
            No has formulado proposiciones aún. Conecta dos conceptos arriba para armar una terna Novakiana.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {propositions.map((p) => {
              const fromLabel = getConceptLabel(p.fromId);
              const toLabel = getConceptLabel(p.toId);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border-subtle bg-bg-secondary/50 hover:border-accent-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-semibold text-accent-primary px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20">
                      {fromLabel}
                    </span>
                    <span className="text-[11px] italic text-text-muted flex items-center gap-1 font-mono">
                      <span>{p.connector}</span>
                      <ArrowRight className="h-3 w-3 inline text-text-muted" />
                    </span>
                    <span className="font-semibold text-text-primary px-2 py-0.5 rounded bg-bg-tertiary border border-border-subtle">
                      {toLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveProposition(p.id)}
                    className="text-text-muted hover:text-red-400 transition-colors p-1 shrink-0"
                    title="Eliminar proposición"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
