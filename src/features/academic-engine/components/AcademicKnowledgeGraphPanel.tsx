import React, { useEffect, useState } from "react";
import { db, type ConceptRecord, type ConceptEdgeRecord } from "../../../db/db";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Sparkles,
} from "lucide-react";

interface AcademicKnowledgeGraphPanelProps {
  onStartExpressStudy?: (concept: ConceptRecord) => void;
  activeSubjectId?: string;
}

interface EvaluatedConcept extends ConceptRecord {
  isLockedByPrereq: boolean;
  unmetPrereqs: string[];
}

export const AcademicKnowledgeGraphPanel: React.FC<AcademicKnowledgeGraphPanelProps> = ({
  onStartExpressStudy,
  activeSubjectId,
}) => {
  const [concepts, setConcepts] = useState<EvaluatedConcept[]>([]);
  const [_edges, setEdges] = useState<ConceptEdgeRecord[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<EvaluatedConcept | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function loadGraph() {
      let rawConcepts = await db.concepts.toArray();
      let rawEdges = await db.conceptEdges.toArray();

      // Seed default academic concepts if empty
      if (rawConcepts.length === 0) {
        const defaultConcepts: ConceptRecord[] = [
          {
            id: "c_calculus_diff",
            domainId: "matematicas",
            name: "Cálculo Diferencial Multivariable",
            description: "Gradiente, divergencia y rotacional en campos vectoriales.",
            masteryScore: 0.92,
            currentRetrievability: 0.88,
            status: "mastered",
            prerequisites: [],
            tags: ["analisis", "vectores"],
            createdAt: Date.now(),
          },
          {
            id: "c_gauss_law",
            domainId: "fisica",
            name: "Ley de Gauss y Teorema de la Divergencia",
            description: "Flujo del campo eléctrico sobre superficies gaussianas cerradas.",
            masteryScore: 0.74,
            currentRetrievability: 0.68,
            status: "in_progress",
            prerequisites: ["c_calculus_diff"],
            tags: ["electromagnetismo"],
            createdAt: Date.now(),
          },
          {
            id: "c_faraday_lenz",
            domainId: "fisica",
            name: "Ley de Faraday-Lenz y Fuerza Electromotriz",
            description: "Inducción magnética y conservación de la energía en circuitos.",
            masteryScore: 0.38,
            currentRetrievability: 0.42,
            status: "available",
            prerequisites: ["c_gauss_law"],
            tags: ["electromagnetismo", "maxwell"],
            createdAt: Date.now(),
          },
          {
            id: "c_maxwell_eq",
            domainId: "fisica",
            name: "Ecuaciones de Maxwell (Forma Local)",
            description: "Unificación relativista y ondas electromagnéticas en el vacío.",
            masteryScore: 0.15,
            currentRetrievability: 0.2,
            status: "locked",
            prerequisites: ["c_faraday_lenz"],
            tags: ["electrodinamica"],
            createdAt: Date.now(),
          },
          {
            id: "c_hilbert_spaces",
            domainId: "cuantica",
            name: "Espacios de Hilbert y Operadores",
            description: "Formalismo cuántico, productos internos y operadores lineales.",
            masteryScore: 0.84,
            currentRetrievability: 0.82,
            status: "mastered",
            prerequisites: [],
            tags: ["cuantica", "algebra"],
            createdAt: Date.now(),
          },
          {
            id: "c_hermitian_ops",
            domainId: "cuantica",
            name: "Operadores Hermíticos y Autovalores",
            description: "Observables físicos con espectro de autovalores reales.",
            masteryScore: 0.6,
            currentRetrievability: 0.58,
            status: "in_progress",
            prerequisites: ["c_hilbert_spaces"],
            tags: ["cuantica"],
            createdAt: Date.now(),
          },
        ];

        const defaultEdges: ConceptEdgeRecord[] = [
          {
            id: "e1",
            sourceConceptId: "c_calculus_diff",
            targetConceptId: "c_gauss_law",
            type: "prerequisite",
            strength: 1.0,
          },
          {
            id: "e2",
            sourceConceptId: "c_gauss_law",
            targetConceptId: "c_faraday_lenz",
            type: "prerequisite",
            strength: 1.0,
          },
          {
            id: "e3",
            sourceConceptId: "c_faraday_lenz",
            targetConceptId: "c_maxwell_eq",
            type: "prerequisite",
            strength: 1.0,
          },
          {
            id: "e4",
            sourceConceptId: "c_hilbert_spaces",
            targetConceptId: "c_hermitian_ops",
            type: "prerequisite",
            strength: 1.0,
          },
        ];

        await db.concepts.bulkPut(defaultConcepts);
        await db.conceptEdges.bulkPut(defaultEdges);
        rawConcepts = defaultConcepts;
        rawEdges = defaultEdges;
      }

      if (cancelled) return;

      // RPG Evaluation: Calculate lock status based on prerequisites
      const conceptMap = new Map(rawConcepts.map((c) => [c.id, c]));

      const evaluated: EvaluatedConcept[] = rawConcepts.map((c) => {
        const unmetPrereqs: string[] = [];
        let isLocked = false;

        for (const prereqId of c.prerequisites) {
          const p = conceptMap.get(prereqId);
          if (p && p.currentRetrievability < 0.5) {
            isLocked = true;
            unmetPrereqs.push(p.name);
          }
        }

        return {
          ...c,
          isLockedByPrereq: isLocked,
          unmetPrereqs,
        };
      });

      setConcepts(evaluated);
      setEdges(rawEdges);
    }

    void loadGraph();
    return () => {
      cancelled = true;
    };
  }, [activeSubjectId]);

  const filteredConcepts =
    filterDomain === "all" ? concepts : concepts.filter((c) => c.domainId === filterDomain);

  const handleNodeClick = (concept: EvaluatedConcept) => {
    setSelectedConcept(concept);
    setIsModalOpen(true);
  };

  const handleStartExpress = () => {
    if (!selectedConcept) return;
    setIsModalOpen(false);
    onStartExpressStudy?.(selectedConcept);
  };

  return (
    <div className="flex flex-col h-full gap-3 font-sans">
      {/* Header with RPG Concept Purpose */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-xs uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            Mapa de Prerrequisitos Académicos
          </span>
          <span className="text-[10px] font-mono text-slate-400">Ruta Crítica RPG</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Tu árbol de desbloqueo cognitivo: cada concepto avanzado exige consolidar previamente sus bases.
        </p>

        {/* RPG Legend */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800 text-[10px] font-mono">
          <div className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Dominado (≥80%)</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Progreso (50-79%)</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Bloqueado (&lt;50%)</span>
          </div>
        </div>
      </div>

      {/* Domain Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono">
        {["all", "fisica", "matematicas", "cuantica"].map((dom) => (
          <button
            key={dom}
            type="button"
            onClick={() => setFilterDomain(dom)}
            className={`px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
              filterDomain === dom
                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-bold"
                : "border-slate-800 text-slate-400 hover:bg-slate-900"
            }`}
          >
            {dom === "all" ? "Todos los Dominios" : dom.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Nodes Interactive List / Graph Cards */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filteredConcepts.map((concept) => {
          const r = concept.currentRetrievability;
          const isMastered = r >= 0.8;
          const isInProgress = r >= 0.5 && r < 0.8;
          const isCritical = r < 0.5;
          const isLocked = concept.isLockedByPrereq;

          let cardBorder = "border-slate-800 bg-slate-900/50 hover:border-slate-700";
          let badgeVariant: "success" | "accent" | "danger" = "accent";
          let statusText = "En Progreso";

          if (isLocked) {
            cardBorder = "border-rose-900/40 bg-rose-950/10 opacity-70 hover:opacity-100";
            badgeVariant = "danger";
            statusText = "Bloqueado";
          } else if (isMastered) {
            cardBorder = "border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50";
            badgeVariant = "success";
            statusText = "Dominado";
          } else if (isCritical) {
            cardBorder = "border-rose-500/40 bg-rose-950/20 hover:border-rose-500/60";
            badgeVariant = "danger";
            statusText = "Crítico";
          }

          return (
            <div
              key={concept.id}
              onClick={() => handleNodeClick(concept)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${cardBorder}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : isMastered ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Unlock className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                  <span className="font-display font-semibold text-xs text-slate-200 truncate">
                    {concept.name}
                  </span>
                </div>

                <Badge variant={badgeVariant} className="text-[9px] font-mono shrink-0">
                  {statusText}
                </Badge>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {concept.description}
              </p>

              {/* Progress Bar and Retrievability */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                <div className="flex-1 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isMastered
                        ? "bg-emerald-400"
                        : isInProgress
                          ? "bg-cyan-400"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.round(r * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  R = {(r * 100).toFixed(0)}%
                </span>
              </div>

              {/* Unmet Prerequisites Warning */}
              {concept.isLockedByPrereq && concept.unmetPrereqs.length > 0 && (
                <div className="text-[10px] font-mono text-rose-300 flex items-center gap-1 bg-rose-950/40 p-1.5 rounded border border-rose-800/40">
                  <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>Requiere consolidar: {concept.unmetPrereqs.join(", ")}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Direct Action Modal */}
      {selectedConcept && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`⚔️ Ruta Crítica: ${selectedConcept.name}`}
        >
          <div className="flex flex-col gap-3 font-sans text-xs">
            <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              {selectedConcept.description}
            </p>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Retención Actual R(t):</span>
                <span className="text-cyan-400 text-sm font-bold">
                  {(selectedConcept.currentRetrievability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Estado de Dominio:</span>
                <span className="text-slate-200 text-sm font-bold capitalize">
                  {selectedConcept.status}
                </span>
              </div>
            </div>

            {selectedConcept.isLockedByPrereq && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Concepto Bloqueado</strong>
                  Para desbloquear este nodo con rigor académico, primero debes alcanzar R ≥ 70% en sus bases:{" "}
                  <span className="underline">{selectedConcept.unmetPrereqs.join(", ")}</span>.
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-mono"
              >
                Cerrar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartExpress}
                className="text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Estudiar este nodo ahora (Sesión FSRS Exprés)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
