import React, { useState, useRef } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import type { OcclusionMask, OcclusionMode, OcclusionShape, OcclusionSheet } from "./types";
import { createOcclusionCardsFromSheet } from "./occlusionEngine";
import {
  Square,
  Circle,
  Trash2,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react";

interface ImageOcclusionModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl?: string;
  sourceTitle?: string;
  pageNumber?: number;
  fileId?: string;
  conceptId?: string;
  onCardsCreated?: (count: number) => void;
}

export const ImageOcclusionModal: React.FC<ImageOcclusionModalProps> = ({
  open,
  onClose,
  imageUrl,
  sourceTitle = "Lámina Académica",
  pageNumber,
  fileId,
  conceptId,
  onCardsCreated,
}) => {
  const [mode, setMode] = useState<OcclusionMode>("normal");
  const [activeTool, setActiveTool] = useState<OcclusionShape>("rect");
  const [masks, setMasks] = useState<OcclusionMask[]>([]);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraft, setCurrentDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentDraft({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const left = Math.min(drawStart.x, currentX);
    const top = Math.min(drawStart.y, currentY);
    const w = Math.abs(currentX - drawStart.x);
    const h = Math.abs(currentY - drawStart.y);

    setCurrentDraft({ x: left, y: top, w, h });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentDraft && currentDraft.w > 0.02 && currentDraft.h > 0.02) {
      const newMask: OcclusionMask = {
        id: 'mask_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        shape: activeTool,
        x: currentDraft.x,
        y: currentDraft.y,
        width: currentDraft.w,
        height: currentDraft.h,
        label: 'Elemento ' + (masks.length + 1),
        groupId: 'g1',
      };
      setMasks((prev) => [...prev, newMask]);
      setSelectedMaskId(newMask.id);
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDraft(null);
  };

  const handleDeleteMask = (id: string) => {
    setMasks((prev) => prev.filter((m) => m.id !== id));
    if (selectedMaskId === id) setSelectedMaskId(null);
  };

  const handleUpdateLabel = (id: string, label: string) => {
    setMasks((prev) => prev.map((m) => (m.id === id ? { ...m, label } : m)));
  };

  const handleUpdateGroup = (id: string, groupId: string) => {
    setMasks((prev) => prev.map((m) => (m.id === id ? { ...m, groupId } : m)));
  };

  const handleSaveCards = async () => {
    if (masks.length === 0) return;
    setSaving(true);
    try {
      const sheet: OcclusionSheet = {
        id: 'sheet_' + Date.now(),
        fileId,
        sourceTitle,
        pageNumber,
        imageUrl,
        conceptId,
        mode,
        masks,
        createdAt: Date.now(),
      };
      const created = await createOcclusionCardsFromSheet(sheet);
      if (onCardsCreated) onCardsCreated(created.length);
      onClose();
    } catch (err) {
      console.error("Error creating occlusion cards:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Editor de Oclusión de Imágenes (Image Occlusion)">
      <div className="flex flex-col gap-4 text-xs font-sans max-w-3xl">
        {/* Header toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-bg-surface-2 border border-border-subtle">
          {/* Shape selection */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-text-muted uppercase">Herramienta:</span>
            <Button
              size="sm"
              variant={activeTool === "rect" ? "primary" : "outline"}
              onClick={() => setActiveTool("rect")}
              className="py-1 px-2.5 text-xs h-auto"
            >
              <Square className="h-3.5 w-3.5 mr-1" />
              Rectángulo
            </Button>
            <Button
              size="sm"
              variant={activeTool === "ellipse" ? "primary" : "outline"}
              onClick={() => setActiveTool("ellipse")}
              className="py-1 px-2.5 text-xs h-auto"
            >
              <Circle className="h-3.5 w-3.5 mr-1" />
              Elipse
            </Button>
          </div>

          {/* Mode selection */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-text-muted uppercase">Modo Cloze:</span>
            <Button
              size="sm"
              variant={mode === "normal" ? "primary" : "outline"}
              onClick={() => setMode("normal")}
              className="py-1 px-2 text-[11px] h-auto"
            >
              Normal (1 x 1)
            </Button>
            <Button
              size="sm"
              variant={mode === "grouped" ? "primary" : "outline"}
              onClick={() => setMode("grouped")}
              className="py-1 px-2 text-[11px] h-auto"
            >
              Agrupado
            </Button>
            <Button
              size="sm"
              variant={mode === "combined" ? "primary" : "outline"}
              onClick={() => setMode("combined")}
              className="py-1 px-2 text-[11px] h-auto"
            >
              Combinado
            </Button>
          </div>
        </div>

        {/* Main interactive area: Canvas + Mask Sidebar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-h-[380px]">
          {/* Canvas container (2 cols) */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="md:col-span-2 relative rounded-xl border border-border-subtle bg-slate-950 flex items-center justify-center overflow-hidden select-none cursor-crosshair min-h-[340px]"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Document page / diagram"
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <div className="text-center p-6 text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
                <Layers className="h-8 w-8 text-cyan-400/50" />
                <span>Lámina / Esquema seleccionado (Pág. {pageNumber || 1})</span>
                <span className="text-[10px] text-slate-600">
                  Arrastrá con el mouse para dibujar una máscara sobre los rótulos o fórmulas.
                </span>
              </div>
            )}

            {/* SVG Overlay with Masks */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {masks.map((m, i) => {
                const isSelected = m.id === selectedMaskId;
                if (m.shape === "ellipse") {
                  return (
                    <g key={m.id}>
                      <ellipse
                        cx={(m.x + m.width / 2) * 100 + '%'}
                        cy={(m.y + m.height / 2) * 100 + '%'}
                        rx={(m.width / 2) * 100 + '%'}
                        ry={(m.height / 2) * 100 + '%'}
                        className={
                          isSelected
                            ? "fill-rose-500/50 stroke-rose-400 stroke-2"
                            : "fill-amber-500/40 stroke-amber-400 stroke-2"
                        }
                      />
                      <text
                        x={(m.x + m.width / 2) * 100 + '%'}
                        y={(m.y + m.height / 2) * 100 + '%'}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-white font-mono text-[10px] font-bold"
                      >
                        {i + 1}
                      </text>
                    </g>
                  );
                }

                return (
                  <g key={m.id}>
                    <rect
                      x={m.x * 100 + '%'}
                      y={m.y * 100 + '%'}
                      width={m.width * 100 + '%'}
                      height={m.height * 100 + '%'}
                      rx="4"
                      className={
                        isSelected
                          ? "fill-rose-500/50 stroke-rose-400 stroke-2"
                          : "fill-amber-500/40 stroke-amber-400 stroke-2"
                      }
                    />
                    <text
                      x={(m.x + m.width / 2) * 100 + '%'}
                      y={(m.y + m.height / 2) * 100 + '%'}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white font-mono text-[10px] font-bold"
                    >
                      {i + 1}
                    </text>
                  </g>
                );
              })}

              {/* Draft drawing rectangle */}
              {isDrawing && currentDraft && (
                <rect
                  x={currentDraft.x * 100 + '%'}
                  y={currentDraft.y * 100 + '%'}
                  width={currentDraft.w * 100 + '%'}
                  height={currentDraft.h * 100 + '%'}
                  rx="4"
                  className="fill-accent-primary/30 stroke-accent-primary stroke-2 stroke-dashed"
                />
              )}
            </svg>
          </div>

          {/* Mask labels and management sidebar (1 col) */}
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-border-subtle bg-bg-surface-2 overflow-y-auto max-h-[380px]">
            <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle font-mono text-[11px] font-bold">
              <span>Máscaras ({masks.length})</span>
              <Badge variant="accent">{masks.length} tarjetas</Badge>
            </div>

            {masks.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-[11px] flex flex-col items-center gap-1.5 my-auto">
                <HelpCircle className="h-5 w-5 text-text-muted" />
                <span>No hay máscaras dibujadas todavía.</span>
                <span className="text-[10px] text-text-tertiary">
                  Hacé clic y arrastrá sobre el diagrama para tapar un componente o fórmula.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {masks.map((m, idx) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMaskId(m.id)}
                    className={'p-2 rounded-lg border text-xs flex flex-col gap-1.5 transition-colors cursor-pointer ' + (
                      m.id === selectedMaskId
                        ? "border-accent-primary bg-accent-primary/10"
                        : "border-border-subtle bg-bg-surface-1"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-accent-primary">
                        #{idx + 1} · {m.shape.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMask(m.id);
                        }}
                        className="text-text-muted hover:text-rose-400 p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => handleUpdateLabel(m.id, e.target.value)}
                      placeholder="Respuesta esperada..."
                      className="px-2 py-1 rounded bg-bg-surface-2 border border-border-subtle text-text-primary text-[11px]"
                    />

                    {mode === "grouped" && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-text-muted">Grupo:</span>
                        <input
                          type="text"
                          value={m.groupId || "g1"}
                          onChange={(e) => handleUpdateGroup(m.id, e.target.value)}
                          className="w-12 px-1.5 py-0.5 rounded bg-bg-surface-2 border border-border-subtle text-text-primary text-[10px]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <span className="text-[11px] text-text-muted font-mono">
            {masks.length > 0 ? masks.length + ' máscara(s) configurada(s)' : 'Dibujá al menos 1 máscara'}
          </span>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={masks.length === 0 || saving}
              onClick={() => void handleSaveCards()}
              className="flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{saving ? "Generando FSRS..." : 'Crear ' + masks.length + ' Tarjetas FSRS'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
