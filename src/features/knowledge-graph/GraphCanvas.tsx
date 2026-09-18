import React, { useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { ConceptRecord, ConceptEdgeRecord } from "../../db/db";
import { Unlock, CheckCircle2, AlertTriangle, Play, Layers, BrainCircuit, ArrowRight } from "lucide-react";
import {
  calculateConceptGraphDetails,
  type BottleneckReport,
  type ConceptGraphDetails,
} from "./graphEngine";

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  concept: ConceptRecord;
}

interface GraphCanvasProps {
  concepts: ConceptRecord[];
  edges: ConceptEdgeRecord[];
  bottlenecks: BottleneckReport[];
  onSelectConcept: (concept: ConceptRecord) => void;
  selectedConceptId: string | null;
  onStartStudy?: (concept: ConceptRecord) => void;
}

export function GraphCanvas({
  concepts,
  edges,
  bottlenecks,
  onSelectConcept,
  selectedConceptId,
  onStartStudy,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [pan, setPan] = useState({ x: 400, y: 250 });
  const [zoom, setZoom] = useState(1.0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeIdRef = useRef<string | null>(null);

  const bottleneckIds = new Set(bottlenecks.map((b) => b.conceptId));

  // Initialize or update node layout
  useEffect(() => {
    if (concepts.length === 0) return;

    // Arrange nodes hierarchically / layered DAG
    const nodeMap = new Map<string, NodePosition>();

    // Compute topological rank / depth for layout
    const inDegree = new Map<string, number>();
    const childMap = new Map<string, string[]>();
    for (const c of concepts) {
      inDegree.set(c.id, 0);
      childMap.set(c.id, []);
    }
    for (const e of edges) {
      if (e.type === "prerequisite") {
        inDegree.set(e.targetConceptId, (inDegree.get(e.targetConceptId) || 0) + 1);
        childMap.get(e.sourceConceptId)?.push(e.targetConceptId);
      }
    }

    // Assign layers
    const layers: string[][] = [];
    const assigned = new Set<string>();
    let currentLayer = concepts.filter((c) => (inDegree.get(c.id) || 0) === 0).map((c) => c.id);
    if (currentLayer.length === 0) currentLayer = [concepts[0].id];

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      currentLayer.forEach((id) => assigned.add(id));

      const nextLayer = new Set<string>();
      for (const id of currentLayer) {
        const children = childMap.get(id) || [];
        for (const child of children) {
          if (!assigned.has(child)) {
            nextLayer.add(child);
          }
        }
      }
      currentLayer = Array.from(nextLayer);
    }

    // Add unassigned
    for (const c of concepts) {
      if (!assigned.has(c.id)) {
        if (layers.length === 0) layers.push([]);
        layers[layers.length - 1].push(c.id);
        assigned.add(c.id);
      }
    }

    const layerSpacingX = 220;
    const nodeSpacingY = 130;

    layers.forEach((layer, layerIdx) => {
      const totalH = layer.length * nodeSpacingY;
      const startY = -totalH / 2 + nodeSpacingY / 2;
      layer.forEach((id, rowIdx) => {
        const c = concepts.find((item) => item.id === id);
        if (c) {
          nodeMap.set(id, {
            id,
            x: layerIdx * layerSpacingX - ((layers.length - 1) * layerSpacingX) / 2,
            y: startY + rowIdx * nodeSpacingY,
            vx: 0,
            vy: 0,
            concept: c,
          });
        }
      });
    });

    setNodes(Array.from(nodeMap.values()));
  }, [concepts, edges]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw subtle grid
      const gridSize = 40;
      ctx.strokeStyle = "rgba(0, 240, 255, 0.04)";
      ctx.lineWidth = 1;
      const startX = -pan.x / zoom - 100;
      const endX = (width - pan.x) / zoom + 100;
      const startY = -pan.y / zoom - 100;
      const endY = (height - pan.y) / zoom + 100;

      ctx.beginPath();
      for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      const nodePosMap = new Map(nodes.map((n) => [n.id, n]));

      // Draw edges
      for (const edge of edges) {
        const src = nodePosMap.get(edge.sourceConceptId);
        const tgt = nodePosMap.get(edge.targetConceptId);
        if (!src || !tgt) continue;

        const isHighlighted =
          selectedConceptId === src.id || selectedConceptId === tgt.id;

        const isLockedEdge = tgt.concept.status === "locked";

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        // Cubic bezier curve
        const midX = (src.x + tgt.x) / 2;
        ctx.bezierCurveTo(midX, src.y, midX, tgt.y, tgt.x, tgt.y);

        if (isHighlighted) {
          ctx.strokeStyle = "#00f0ff";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "#00f0ff";
          ctx.shadowBlur = 10;
        } else if (isLockedEdge) {
          ctx.strokeStyle = "rgba(255, 59, 92, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // Draw arrow head
        const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
        const arrowDist = 42;
        const arrowX = tgt.x - Math.cos(angle) * arrowDist;
        const arrowY = tgt.y - Math.sin(angle) * arrowDist;

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-7, -4);
        ctx.lineTo(-7, 4);
        ctx.closePath();
        ctx.fillStyle = isHighlighted ? "#00f0ff" : isLockedEdge ? "#ff3b5c" : "rgba(0, 240, 255, 0.4)";
        ctx.fill();
        ctx.restore();
      }

      // Draw nodes
      for (const node of nodes) {
        const isSelected = selectedConceptId === node.id;
        const isBottleneck = bottleneckIds.has(node.id);
        const { status, currentRetrievability } = node.concept;

        let nodeColor = "#00f0ff"; // available cyan
        let glowColor = "rgba(0, 240, 255, 0.4)";
        if (status === "locked") {
          nodeColor = "#ff3b5c"; // locked rose
          glowColor = "rgba(255, 59, 92, 0.4)";
        } else if (status === "mastered") {
          nodeColor = "#00e5a3"; // mastered emerald
          glowColor = "rgba(0, 229, 163, 0.4)";
        } else if (status === "in_progress") {
          nodeColor = "#ffb020"; // amber
          glowColor = "rgba(255, 176, 32, 0.4)";
        }

        if (isBottleneck) {
          nodeColor = "#bd00ff"; // bottleneck purple
          glowColor = "rgba(189, 0, 255, 0.6)";
        }

        const radius = isSelected ? 34 : 30;

        // Glow ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + (isSelected ? 8 : 4), 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? glowColor : "rgba(0, 0, 0, 0.2)";
        ctx.fill();

        // Node circle background
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#0c1322";
        ctx.fill();
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = nodeColor;
        ctx.stroke();

        // Inner progress ring (Retrievability R)
        ctx.beginPath();
        ctx.arc(
          node.x,
          node.y,
          radius - 5,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * currentRetrievability,
        );
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Center status icon or R %
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (status === "locked") {
          ctx.fillStyle = "#ff3b5c";
          ctx.fillText("LOCK", node.x, node.y);
        } else {
          ctx.fillText(`${Math.round(currentRetrievability * 100)}%`, node.x, node.y);
        }

        // Concept Name Label below
        ctx.font = "500 12px Space Grotesk, sans-serif";
        ctx.fillStyle = isSelected ? "#ffffff" : "#c4d1db";
        let displayName = node.concept.name;
        if (displayName.length > 18) {
          displayName = displayName.substring(0, 16) + "…";
        }
        ctx.fillText(displayName, node.x, node.y + radius + 16);

        // Bottleneck badge indicator
        if (isBottleneck) {
          ctx.font = "bold 9px JetBrains Mono, monospace";
          ctx.fillStyle = "#bd00ff";
          ctx.fillText("⚠️ CUELLO DE BOTELLA", node.x, node.y + radius + 30);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [nodes, edges, pan, zoom, selectedConceptId, bottleneckIds]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mouse Interactivity
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse coords to world coords
    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    // Check if clicked a node
    const clickedNode = nodes.find((n) => {
      const dist = Math.hypot(n.x - worldX, n.y - worldY);
      return dist <= 35;
    });

    if (clickedNode) {
      draggedNodeIdRef.current = clickedNode.id;
      onSelectConcept(clickedNode.concept);
    } else {
      isDraggingRef.current = true;
      dragStartRef.current = { x: mouseX - pan.x, y: mouseY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggedNodeIdRef.current) {
      const worldX = (mouseX - pan.x) / zoom;
      const worldY = (mouseY - pan.y) / zoom;
      setNodes((prev) =>
        prev.map((n) => (n.id === draggedNodeIdRef.current ? { ...n, x: worldX, y: worldY } : n)),
      );
    } else if (isDraggingRef.current) {
      setPan({
        x: mouseX - dragStartRef.current.x,
        y: mouseY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedNodeIdRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(2.5, Math.max(0.4, prev * zoomFactor)));
  };

  const selectedNode = nodes.find((n) => n.id === selectedConceptId);
  const [conceptDetails, setConceptDetails] = useState<ConceptGraphDetails | null>(null);

  useEffect(() => {
    if (selectedNode) {
      void calculateConceptGraphDetails(selectedNode.concept.id).then(setConceptDetails);
    } else {
      setConceptDetails(null);
    }
  }, [selectedNode?.concept.id]);

  return (
    <div className="relative w-full h-[620px] rounded-2xl border border-accent-primary/20 bg-bg-surface-1/90 overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Top HUD Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-bg-surface-2/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border-subtle shadow-md">
        <Layers className="h-4 w-4 text-accent-primary animate-pulse" />
        <span className="text-xs font-mono font-semibold text-text-primary">
          Grafo de Conocimiento 2.0 ({concepts.length} Nodos · {edges.length} Enlaces)
        </span>
        <div className="flex items-center gap-2 border-l border-border-subtle pl-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3 w-3" /> Dominado
          </span>
          <span className="flex items-center gap-1 text-accent-primary">
            <Unlock className="h-3 w-3" /> Disponible
          </span>
          <span className="flex items-center gap-1 text-warning">
            <AlertTriangle className="h-3 w-3" /> Prerrequisito Flojo
          </span>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 bg-bg-surface-2/90 backdrop-blur-md p-1 rounded-lg border border-border-subtle shadow-sm font-mono text-xs">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
          className="px-2 py-1 rounded bg-bg-surface-1 text-text-primary hover:text-accent-primary"
        >
          +
        </button>
        <span className="px-2 text-text-tertiary">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))}
          className="px-2 py-1 rounded bg-bg-surface-1 text-text-primary hover:text-accent-primary"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => {
            setPan({ x: 400, y: 250 });
            setZoom(1.0);
          }}
          className="px-2 py-1 rounded bg-bg-surface-1 text-text-tertiary hover:text-text-primary"
        >
          Reset
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          transform: "translateZ(0)",
          willChange: "transform",
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute top-4 right-4 z-20 w-80 max-h-[580px] overflow-y-auto rounded-xl border border-accent-primary/30 bg-bg-surface-2/95 p-5 shadow-2xl backdrop-blur-lg flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-start justify-between">
            <Badge
              variant={
                selectedNode.concept.status === "mastered"
                  ? "success"
                  : selectedNode.concept.status === "locked"
                    ? "danger"
                    : selectedNode.concept.status === "in_progress"
                      ? "warning"
                      : "neutral"
              }
            >
              {selectedNode.concept.status === "locked"
                ? "BLOQUEADO"
                : selectedNode.concept.status === "mastered"
                  ? "DOMINADO"
                  : selectedNode.concept.status === "in_progress"
                    ? "EN PROGRESO"
                    : "DISPONIBLE"}
            </Badge>
            <span className="text-[10px] font-mono text-text-tertiary uppercase">
              {selectedNode.concept.domainId}
            </span>
          </div>

          <div>
            <h4 className="font-display text-base font-bold text-text-primary leading-tight">
              {selectedNode.concept.name}
            </h4>
            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
              {selectedNode.concept.description}
            </p>
          </div>

          {/* 4D Mastery Model (Sección 4 & 17) */}
          <div className="flex flex-col gap-1.5 bg-bg-surface-1/90 p-3 rounded-xl border border-border-subtle font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border-subtle/60 pb-1.5 mb-1">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-accent-primary" />
                Dominio 4D
              </span>
              <span className="font-bold text-accent-primary text-sm">
                {conceptDetails ? `${conceptDetails.mastery.compositeScore}%` : `${(selectedNode.concept.masteryScore * 100).toFixed(0)}%`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-text-muted text-[10px] block">Retención (R)</span>
                <span className="font-bold text-text-primary">
                  {conceptDetails ? `${Math.round(conceptDetails.mastery.retention * 100)}%` : `${(selectedNode.concept.currentRetrievability * 100).toFixed(0)}%`}
                </span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block">Comprensión (C)</span>
                <span className="font-bold text-text-primary">
                  {conceptDetails ? `${Math.round(conceptDetails.mastery.comprehension * 100)}%` : "--"}
                </span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block">Aplicación (A)</span>
                <span className="font-bold text-text-primary">
                  {conceptDetails ? `${Math.round(conceptDetails.mastery.application * 100)}%` : "--"}
                </span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block">Transferencia (T)</span>
                <span className="font-bold text-text-primary">
                  {conceptDetails ? `${Math.round(conceptDetails.mastery.transfer * 100)}%` : "--"}
                </span>
              </div>
            </div>

            {conceptDetails && (
              <div className="flex items-center justify-between pt-1.5 border-t border-border-subtle/50 text-[10px] text-text-muted mt-1">
                <span>{conceptDetails.cardsCount} tarjetas FSRS</span>
                <span>
                  {conceptDetails.unresolvedErrorsCount > 0 ? (
                    <span className="text-warning font-semibold">{conceptDetails.unresolvedErrorsCount} errores abiertos</span>
                  ) : (
                    "0 errores"
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Bottleneck Warning */}
          {bottleneckIds.has(selectedNode.id) && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Cuello de Botella Crítico</strong>
                <span className="opacity-90">
                  Bloquea conceptos avanzados debido a fallas recurrentes. Se recomienda sesión inmediata.
                </span>
              </div>
            </div>
          )}

          {/* Soft Prerequisite Warning Banner (Sección 17-BIS) */}
          {conceptDetails?.isPrereqWarning && conceptDetails.weakestPrereq && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2 text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Advertencia de Prerrequisito</strong>
                  <span className="text-[11px] opacity-90 leading-snug">
                    Depende de <strong>"{conceptDetails.weakestPrereq.name}"</strong>, que tenés al {Math.round(conceptDetails.weakestPrereq.retrievability * 100)}% de retención.
                  </span>
                </div>
              </div>

              {onStartStudy && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const prereqConcept = concepts.find((c) => c.id === conceptDetails.weakestPrereq!.id);
                      if (prereqConcept) onStartStudy(prereqConcept);
                    }}
                    className="w-full text-xs font-mono justify-between text-warning border-warning/40 hover:bg-warning/20"
                  >
                    <span>Repasar {conceptDetails.weakestPrereq.name} (4 min)</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Prerequisites tags */}
          {selectedNode.concept.prerequisites.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-2">
              <span className="text-[11px] font-mono font-medium text-text-tertiary">
                Prerrequisitos ({selectedNode.concept.prerequisites.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedNode.concept.prerequisites.map((pId) => {
                  const prereq = concepts.find((c) => c.id === pId);
                  return (
                    <span
                      key={pId}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-surface-1 border border-border-subtle text-text-secondary"
                    >
                      {prereq?.name || pId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Button: Never hard-locked! */}
          {onStartStudy && (
            <Button
              size="sm"
              variant={conceptDetails?.isPrereqWarning ? "outline" : "primary"}
              onClick={() => onStartStudy(selectedNode.concept)}
              className="w-full flex items-center justify-center gap-2 mt-1"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{conceptDetails?.isPrereqWarning ? "Entrar igual a estudiar" : "Estudiar Concepto"}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
