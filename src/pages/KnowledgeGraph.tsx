import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { db, type ConceptRecord, type ConceptEdgeRecord } from "../db/db";
import { GraphCanvas } from "../features/knowledge-graph/GraphCanvas";
import {
  evaluateNodeAvailability,
  identifyBottlenecks,
  seedDefaultKnowledgeGraph,
  wouldCreateCycle,
} from "../features/knowledge-graph/graphEngine";
import { AlertTriangle, Plus, Zap, Network, CheckCircle2 } from "lucide-react";

export function KnowledgeGraph() {
  const navigate = useNavigate();
  const [selectedConcept, setSelectedConcept] = useState<ConceptRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New concept form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDomain, setNewDomain] = useState("general");
  const [selectedPrereqIds, setSelectedPrereqIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    seedDefaultKnowledgeGraph().catch(console.error);
  }, []);

  const rawConcepts = useLiveQuery(() => db.concepts.toArray()) ?? [];
  const rawEdges = useLiveQuery(() => db.conceptEdges.toArray()) ?? [];
  const cards = useLiveQuery(() => db.cardsFsrs.toArray()) ?? [];
  const reviewLogs = useLiveQuery(() => db.reviewLogs.toArray()) ?? [];

  // Compute dynamic availability and bottlenecks
  const evaluatedConcepts = evaluateNodeAvailability(rawConcepts, rawEdges);
  const bottlenecks = identifyBottlenecks(evaluatedConcepts, rawEdges, reviewLogs, cards);

  async function handleCreateConcept() {
    if (!newName.trim()) return;
    setFormError(null);

    const newId = `concept-${Date.now()}`;
    const now = Date.now();

    // Check cycles for each prerequisite edge
    for (const prereqId of selectedPrereqIds) {
      if (wouldCreateCycle(rawEdges, prereqId, newId)) {
        setFormError("La dependencia seleccionada crearía un ciclo causal no permitido.");
        return;
      }
    }

    const newConcept: ConceptRecord = {
      id: newId,
      domainId: newDomain.trim().toLowerCase() || "general",
      name: newName.trim(),
      description: newDesc.trim() || "Concepto definido por el usuario.",
      masteryScore: 0.1,
      currentRetrievability: 1.0,
      status: selectedPrereqIds.length > 0 ? "locked" : "available",
      prerequisites: selectedPrereqIds,
      tags: [newDomain.trim().toLowerCase()],
      createdAt: now,
    };

    const newEdges: ConceptEdgeRecord[] = selectedPrereqIds.map((pId) => ({
      id: `edge-${Date.now()}-${pId}`,
      sourceConceptId: pId,
      targetConceptId: newId,
      type: "prerequisite",
      strength: 1.0,
    }));

    await db.transaction("rw", [db.concepts, db.conceptEdges], async () => {
      await db.concepts.add(newConcept);
      if (newEdges.length > 0) {
        await db.conceptEdges.bulkAdd(newEdges);
      }
    });

    setNewName("");
    setNewDesc("");
    setSelectedPrereqIds([]);
    setIsAddModalOpen(false);
  }

  function handleStartStudy(_concept: ConceptRecord) {
    navigate("/session");
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Arquitectura Causal"
          title="Grafo de Conocimiento & Árbol de Dependencias"
          description="Estructura topológica de conceptos, bloqueo dinámico por retención (R < 70%) y detección de cuellos de botella."
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto shadow-md"
        >
          <Plus className="h-4 w-4" />
          Nuevo Concepto
        </Button>
      </div>

      {/* Critical Bottlenecks Banner */}
      {bottlenecks.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-5 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-warning/20 text-warning shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-text-primary text-sm">
                  {bottlenecks.length} Cuello{bottlenecks.length > 1 ? "s" : ""} de Botella Cognitivo Detectado
                </h3>
                <Badge variant="warning">Impacto Sistémico</Badge>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                El concepto <strong>"{bottlenecks[0].name}"</strong> está frenando el avance en conceptos dependientes.
                {bottlenecks[0].reason}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const target = evaluatedConcepts.find((c) => c.id === bottlenecks[0].conceptId);
              if (target) setSelectedConcept(target);
            }}
            className="shrink-0 border-warning/50 text-warning hover:bg-warning/20"
          >
            Inspeccionar Bloqueo
          </Button>
        </div>
      )}

      {/* Main Canvas View */}
      <GraphCanvas
        concepts={evaluatedConcepts}
        edges={rawEdges}
        bottlenecks={bottlenecks}
        selectedConceptId={selectedConcept?.id ?? null}
        onSelectConcept={setSelectedConcept}
        onStartStudy={handleStartStudy}
      />

      {/* Knowledge Graph Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border-subtle bg-bg-surface-2 p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-accent-primary/10 text-accent-primary">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-mono text-text-tertiary uppercase">Nodos Activos</span>
            <p className="font-display text-2xl font-bold text-text-primary">
              {evaluatedConcepts.length}
            </p>
            <span className="text-[11px] text-text-secondary">
              {evaluatedConcepts.filter((c) => c.status === "mastered").length} dominados (≥ 80% R)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-surface-2 p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-danger/10 text-danger">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-mono text-text-tertiary uppercase">Nodos Bloqueados</span>
            <p className="font-display text-2xl font-bold text-text-primary">
              {evaluatedConcepts.filter((c) => c.status === "locked").length}
            </p>
            <span className="text-[11px] text-text-secondary">
              Requieren consolidación en prerrequisitos
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-surface-2 p-5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-mono text-text-tertiary uppercase">Retención Media del Grafo</span>
            <p className="font-display text-2xl font-bold text-text-primary">
              {evaluatedConcepts.length > 0
                ? (
                    (evaluatedConcepts.reduce((acc, c) => acc + c.currentRetrievability, 0) /
                      evaluatedConcepts.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
            <span className="text-[11px] text-text-secondary">Calculado mediante FSRS v4.5</span>
          </div>
        </div>
      </div>

      {/* Add Concept Modal */}
      <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Agregar Nuevo Concepto al Grafo">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-mono font-medium text-text-secondary block mb-1">
              Nombre del Concepto
            </label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Termodinámica Estadística, Transformada de Fourier..."
            />
          </div>

          <div>
            <label className="text-xs font-mono font-medium text-text-secondary block mb-1">
              Dominio o Área
            </label>
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="Ej: fisica, matematicas, neurociencia..."
            />
          </div>

          <div>
            <label className="text-xs font-mono font-medium text-text-secondary block mb-1">
              Descripción o Síntesis
            </label>
            <Input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Explicación fundamental o alcance del concepto..."
            />
          </div>

          <div>
            <label className="text-xs font-mono font-medium text-text-secondary block mb-1">
              Conceptos Prerrequisito (deben alcanzar R ≥ 70% para desbloquearlo)
            </label>
            <div className="max-h-40 overflow-y-auto border border-border-subtle rounded-lg p-2 bg-bg-surface-1 flex flex-col gap-1">
              {evaluatedConcepts.map((c) => {
                const isSelected = selectedPrereqIds.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedPrereqIds(selectedPrereqIds.filter((id) => id !== c.id));
                      } else {
                        setSelectedPrereqIds([...selectedPrereqIds, c.id]);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded text-xs font-mono text-left transition-colors ${
                      isSelected
                        ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                        : "text-text-secondary hover:bg-bg-surface-2"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-text-tertiary">
                      R={(c.currentRetrievability * 100).toFixed(0)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {formError && (
            <p className="text-xs text-danger font-mono bg-danger/10 p-2 rounded border border-danger/30">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateConcept}
              disabled={!newName.trim()}
            >
              Guardar en Grafo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
